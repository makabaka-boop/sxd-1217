import { ref, computed } from 'vue';
import type {
  PublishPlan,
  PublishPlanFormData,
  PlanClipEntry,
  Clip,
  ChapterType,
  PlanClipWithDetail,
  ChapterStats,
  TopicDistribution,
  RiskDistribution,
  PlanWarning,
  PlanStatus,
} from '@/types';
import {
  generatePlanId,
  CHAPTER_TYPES,
  RISK_LEVELS,
} from '@/types';
import {
  getAllPlans,
  getPlanById as dbGetPlanById,
  addPlan,
  updatePlan,
  deletePlan,
} from './useDatabase';

const plans = ref<PublishPlan[]>([]);
const isLoadingPlans = ref(false);
const currentPlan = ref<PublishPlan | null>(null);

const MIN_RECOMMENDED_DURATION = 600;
const MAX_RECOMMENDED_DURATION = 5400;

export function usePublishPlans() {
  async function loadPlans() {
    isLoadingPlans.value = true;
    try {
      plans.value = await getAllPlans();
    } finally {
      isLoadingPlans.value = false;
    }
  }

  async function loadPlan(id: string) {
    const plan = await dbGetPlanById(id);
    currentPlan.value = plan || null;
    return currentPlan.value;
  }

  function createPlanData(data: PublishPlanFormData): PublishPlan {
    const now = new Date().toISOString();
    return {
      id: generatePlanId(),
      title: data.title,
      publishTitle: data.publishTitle,
      remark: data.remark,
      status: '草稿',
      clips: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  async function createPlan(data: PublishPlanFormData): Promise<PublishPlan> {
    const plan = createPlanData(data);
    await addPlan(plan);
    plans.value.unshift(plan);
    return plan;
  }

  async function savePlan(id: string, data: Partial<PublishPlanFormData>): Promise<void> {
    const idx = plans.value.findIndex(p => p.id === id);
    if (idx === -1) return;
    const updated: PublishPlan = {
      ...plans.value[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await updatePlan(updated);
    plans.value[idx] = updated;
    if (currentPlan.value?.id === id) {
      currentPlan.value = updated;
    }
  }

  async function setPlanStatus(id: string, status: PlanStatus): Promise<void> {
    const idx = plans.value.findIndex(p => p.id === id);
    if (idx === -1) return;
    const updated: PublishPlan = {
      ...plans.value[idx],
      status,
      updatedAt: new Date().toISOString(),
    };
    await updatePlan(updated);
    plans.value[idx] = updated;
    if (currentPlan.value?.id === id) {
      currentPlan.value = updated;
    }
  }

  async function removePlan(id: string): Promise<void> {
    await deletePlan(id);
    plans.value = plans.value.filter(p => p.id !== id);
    if (currentPlan.value?.id === id) {
      currentPlan.value = null;
    }
  }

  function getPlanClips(plan: PublishPlan, allClips: Clip[]): PlanClipWithDetail[] {
    return plan.clips
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(entry => {
        const clip = allClips.find(c => c.id === entry.clipId);
        if (!clip) return null;
        return { ...entry, clip };
      })
      .filter((e): e is PlanClipWithDetail => e !== null);
  }

  function calcPlanDuration(plan: PublishPlan, allClips: Clip[]): number {
    return getPlanClips(plan, allClips).reduce(
      (sum, e) => sum + Math.max(0, e.clip.endTime - e.clip.startTime),
      0,
    );
  }

  function getChapterStats(plan: PublishPlan, allClips: Clip[]): ChapterStats[] {
    const entries = getPlanClips(plan, allClips);
    return CHAPTER_TYPES.map(type => {
      const clipsOfType = entries.filter(e => e.chapterType === type).map(e => e.clip);
      return {
        type,
        count: clipsOfType.length,
        duration: clipsOfType.reduce((s, c) => s + Math.max(0, c.endTime - c.startTime), 0),
        clips: clipsOfType,
      };
    });
  }

  function getTopicDistribution(plan: PublishPlan, allClips: Clip[]): TopicDistribution[] {
    const entries = getPlanClips(plan, allClips);
    const map: Record<string, TopicDistribution> = {};
    for (const e of entries) {
      const key = e.clip.topic || '未分类';
      if (!map[key]) {
        map[key] = { topic: key, count: 0, duration: 0 };
      }
      map[key].count++;
      map[key].duration += Math.max(0, e.clip.endTime - e.clip.startTime);
    }
    return Object.values(map).sort((a, b) => b.duration - a.duration);
  }

  function getRiskDistribution(plan: PublishPlan, allClips: Clip[]): RiskDistribution[] {
    const entries = getPlanClips(plan, allClips);
    return RISK_LEVELS.map(level => {
      const clipsOfLevel = entries.filter(e => e.clip.riskLevel === level).map(e => e.clip);
      return {
        level,
        count: clipsOfLevel.length,
        duration: clipsOfLevel.reduce((s, c) => s + Math.max(0, c.endTime - c.startTime), 0),
      };
    });
  }

  function getPublishProgress(plan: PublishPlan, allClips: Clip[]): { ready: number; total: number; percent: number } {
    const entries = getPlanClips(plan, allClips);
    const total = entries.length;
    const ready = entries.filter(e => e.clip.publishStatus === '已剪辑').length;
    return {
      ready,
      total,
      percent: total === 0 ? 0 : Math.round((ready / total) * 100),
    };
  }

  function getPlanWarnings(plan: PublishPlan, allClips: Clip[]): PlanWarning[] {
    const warnings: PlanWarning[] = [];
    const entries = getPlanClips(plan, allClips);
    const chapterStats = getChapterStats(plan, allClips);

    for (const cs of chapterStats) {
      if (cs.count === 0) {
        warnings.push({
          id: `missing_chapter_${cs.type}`,
          severity: 'warning',
          type: '缺失章节',
          message: `计划缺少「${cs.type}」章节，建议补充该类型片段`,
        });
      }
    }

    const duration = calcPlanDuration(plan, allClips);
    if (entries.length > 0) {
      if (duration < MIN_RECOMMENDED_DURATION) {
        warnings.push({
          id: 'duration_too_short',
          severity: 'info',
          type: '时长偏短',
          message: `节目总时长较短（${Math.round(duration / 60)} 分钟），建议不低于 ${Math.round(MIN_RECOMMENDED_DURATION / 60)} 分钟`,
        });
      }
      if (duration > MAX_RECOMMENDED_DURATION) {
        warnings.push({
          id: 'duration_too_long',
          severity: 'warning',
          type: '时长过长',
          message: `节目总时长较长（${Math.round(duration / 60)} 分钟），建议不超过 ${Math.round(MAX_RECOMMENDED_DURATION / 60)} 分钟`,
        });
      }
    }

    const highRiskClips = entries.filter(e => e.clip.riskLevel === '高风险');
    if (highRiskClips.length > 0) {
      warnings.push({
        id: 'high_risk_clips',
        severity: 'error',
        type: '高风险片段',
        message: `计划中包含 ${highRiskClips.length} 个高风险片段，发布前请再次确认`,
        clipIds: highRiskClips.map(e => e.clip.id),
      });
    }

    const needReviewClips = entries.filter(
      e => e.clip.publishStatus === '需复听' && (!e.clip.remark || !e.clip.remark.trim()),
    );
    if (needReviewClips.length > 0) {
      warnings.push({
        id: 'review_missing_remark',
        severity: 'warning',
        type: '需复听未处理',
        message: `${needReviewClips.length} 个需复听片段缺少备注说明`,
        clipIds: needReviewClips.map(e => e.clip.id),
      });
    }

    const notReadyClips = entries.filter(e => e.clip.publishStatus !== '已剪辑');
    if (notReadyClips.length > 0) {
      warnings.push({
        id: 'not_ready_clips',
        severity: 'info',
        type: '未就绪片段',
        message: `${notReadyClips.length} 个片段尚未标记为「已剪辑」`,
        clipIds: notReadyClips.map(e => e.clip.id),
      });
    }

    if (entries.length === 0) {
      warnings.push({
        id: 'empty_plan',
        severity: 'warning',
        type: '空计划',
        message: '该发布计划还没有添加任何片段',
      });
    }

    const sevOrder: Record<string, number> = { error: 0, warning: 1, info: 2 };
    return warnings.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);
  }

  async function addClipToPlan(planId: string, clipId: string, chapterType: ChapterType = '主内容'): Promise<void> {
    const idx = plans.value.findIndex(p => p.id === planId);
    if (idx === -1) return;
    const plan = plans.value[idx];
    if (plan.clips.some(c => c.clipId === clipId)) return;

    const newEntry: PlanClipEntry = {
      clipId,
      chapterType,
      sortOrder: plan.clips.length,
    };
    const updated: PublishPlan = {
      ...plan,
      clips: [...plan.clips, newEntry],
      updatedAt: new Date().toISOString(),
    };
    await updatePlan(updated);
    plans.value[idx] = updated;
    if (currentPlan.value?.id === planId) {
      currentPlan.value = updated;
    }
  }

  async function addClipsToPlan(planId: string, clipIds: string[], chapterType: ChapterType = '主内容'): Promise<void> {
    const idx = plans.value.findIndex(p => p.id === planId);
    if (idx === -1) return;
    const plan = plans.value[idx];
    const existingIds = new Set(plan.clips.map(c => c.clipId));
    let nextOrder = plan.clips.length;
    const newEntries: PlanClipEntry[] = [];
    for (const id of clipIds) {
      if (!existingIds.has(id)) {
        newEntries.push({ clipId: id, chapterType, sortOrder: nextOrder++ });
      }
    }
    if (newEntries.length === 0) return;

    const updated: PublishPlan = {
      ...plan,
      clips: [...plan.clips, ...newEntries],
      updatedAt: new Date().toISOString(),
    };
    await updatePlan(updated);
    plans.value[idx] = updated;
    if (currentPlan.value?.id === planId) {
      currentPlan.value = updated;
    }
  }

  async function removeClipFromPlan(planId: string, clipId: string): Promise<void> {
    const idx = plans.value.findIndex(p => p.id === planId);
    if (idx === -1) return;
    const plan = plans.value[idx];
    const filtered = plan.clips.filter(c => c.clipId !== clipId);
    const reindexed = filtered.map((c, i) => ({ ...c, sortOrder: i }));
    const updated: PublishPlan = {
      ...plan,
      clips: reindexed,
      updatedAt: new Date().toISOString(),
    };
    await updatePlan(updated);
    plans.value[idx] = updated;
    if (currentPlan.value?.id === planId) {
      currentPlan.value = updated;
    }
  }

  async function removeClipFromAllPlans(clipId: string): Promise<void> {
    const affected: PublishPlan[] = [];
    for (let i = 0; i < plans.value.length; i++) {
      const plan = plans.value[i];
      if (!plan.clips.some(c => c.clipId === clipId)) continue;
      const filtered = plan.clips.filter(c => c.clipId !== clipId);
      const reindexed = filtered.map((c, idx) => ({ ...c, sortOrder: idx }));
      const updated: PublishPlan = {
        ...plan,
        clips: reindexed,
        updatedAt: new Date().toISOString(),
      };
      await updatePlan(updated);
      plans.value[i] = updated;
      if (currentPlan.value?.id === plan.id) {
        currentPlan.value = updated;
      }
      affected.push(updated);
    }
    return;
  }

  async function removeClipsFromAllPlans(clipIds: string[]): Promise<void> {
    const idSet = new Set(clipIds);
    for (let i = 0; i < plans.value.length; i++) {
      const plan = plans.value[i];
      if (!plan.clips.some(c => idSet.has(c.clipId))) continue;
      const filtered = plan.clips.filter(c => !idSet.has(c.clipId));
      const reindexed = filtered.map((c, idx) => ({ ...c, sortOrder: idx }));
      const updated: PublishPlan = {
        ...plan,
        clips: reindexed,
        updatedAt: new Date().toISOString(),
      };
      await updatePlan(updated);
      plans.value[i] = updated;
      if (currentPlan.value?.id === plan.id) {
        currentPlan.value = updated;
      }
    }
  }

  async function updateClipChapter(planId: string, clipId: string, chapterType: ChapterType): Promise<void> {
    const idx = plans.value.findIndex(p => p.id === planId);
    if (idx === -1) return;
    const plan = plans.value[idx];
    const updatedClips = plan.clips.map(c =>
      c.clipId === clipId ? { ...c, chapterType } : c,
    );
    const updated: PublishPlan = {
      ...plan,
      clips: updatedClips,
      updatedAt: new Date().toISOString(),
    };
    await updatePlan(updated);
    plans.value[idx] = updated;
    if (currentPlan.value?.id === planId) {
      currentPlan.value = updated;
    }
  }

  async function reorderPlanClips(planId: string, newClipIds: string[]): Promise<void> {
    const idx = plans.value.findIndex(p => p.id === planId);
    if (idx === -1) return;
    const plan = plans.value[idx];
    const idToEntry = new Map(plan.clips.map(c => [c.clipId, c]));
    const reordered: PlanClipEntry[] = newClipIds
      .map((id, i) => {
        const entry = idToEntry.get(id);
        return entry ? { ...entry, sortOrder: i } : null;
      })
      .filter((e): e is PlanClipEntry => e !== null);
    const updated: PublishPlan = {
      ...plan,
      clips: reordered,
      updatedAt: new Date().toISOString(),
    };
    await updatePlan(updated);
    plans.value[idx] = updated;
    if (currentPlan.value?.id === planId) {
      currentPlan.value = updated;
    }
  }

  function isClipInAnyPlan(clipId: string): boolean {
    return plans.value.some(p => p.clips.some(c => c.clipId === clipId));
  }

  function getPlansForClip(clipId: string): PublishPlan[] {
    return plans.value.filter(p => p.clips.some(c => c.clipId === clipId));
  }

  const planCount = computed(() => plans.value.length);

  return {
    plans,
    isLoadingPlans,
    currentPlan,
    planCount,
    loadPlans,
    loadPlan,
    createPlan,
    savePlan,
    setPlanStatus,
    removePlan,
    getPlanClips,
    calcPlanDuration,
    getChapterStats,
    getTopicDistribution,
    getRiskDistribution,
    getPublishProgress,
    getPlanWarnings,
    addClipToPlan,
    addClipsToPlan,
    removeClipFromPlan,
    removeClipFromAllPlans,
    removeClipsFromAllPlans,
    updateClipChapter,
    reorderPlanClips,
    isClipInAnyPlan,
    getPlansForClip,
  };
}
