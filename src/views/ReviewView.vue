<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  ClipboardCheck, Volume2, Ban, Clock, Users, Tag, Scissors, AlertCircle, AlertTriangle,
  Layers, FileJson, FileSpreadsheet, Play, ArrowRight, Flag, CheckCircle2,
} from 'lucide-vue-next';
import { useClips } from '@/composables/useClips';
import { useQualityCheck } from '@/composables/useQualityCheck';
import { usePublishPlans } from '@/composables/usePublishPlans';
import { useExport } from '@/composables/useExport';
import PlanStatsPanel from '@/components/PlanStatsPanel.vue';
import type { Clip, PlanClipWithDetail } from '@/types';
import {
  RISK_LEVEL_CONFIG,
  STATUS_CONFIG,
  CHAPTER_CONFIG,
  PLAN_STATUS_CONFIG,
  formatDuration,
  formatTimestamp,
} from '@/types';

const { clips, totalDuration } = useClips();
const { getProblemsForClip } = useQualityCheck(() => clips.value);
const {
  plans,
  loadPlans,
  getPlanClips,
  calcPlanDuration,
  getChapterStats,
  getTopicDistribution,
  getRiskDistribution,
  getPublishProgress,
  getPlanWarnings,
  getQualitySnapshot,
} = usePublishPlans();
const { exportToJSON, exportToCSV, exportFullBackup, exportPlanToJSON, exportPlanToCSV } = useExport();

const selectedPlanId = ref<string>('');

const selectedPlan = computed(() =>
  plans.value.find(p => p.id === selectedPlanId.value) || null,
);

const isPlanMode = computed(() => !!selectedPlan.value);

const planClips = computed<PlanClipWithDetail[]>(() => {
  if (!selectedPlan.value) return [];
  return getPlanClips(selectedPlan.value, clips.value);
});

const planDuration = computed(() => {
  if (!selectedPlan.value) return 0;
  return calcPlanDuration(selectedPlan.value, clips.value);
});

const planProgress = computed(() => {
  if (!selectedPlan.value) return { ready: 0, total: 0, percent: 0 };
  return getPublishProgress(selectedPlan.value, clips.value);
});

const planChapterStats = computed(() => {
  if (!selectedPlan.value) return [];
  return getChapterStats(selectedPlan.value, clips.value);
});

const planTopicDistribution = computed(() => {
  if (!selectedPlan.value) return [];
  return getTopicDistribution(selectedPlan.value, clips.value);
});

const planRiskDistribution = computed(() => {
  if (!selectedPlan.value) return [];
  return getRiskDistribution(selectedPlan.value, clips.value);
});

const planWarnings = computed(() => {
  if (!selectedPlan.value) return [];
  return getPlanWarnings(selectedPlan.value, clips.value);
});

const planQualitySnapshot = computed(() => {
  if (!selectedPlan.value) {
    return {
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      totalCount: 0,
      worstSeverity: null,
      problems: [],
    };
  }
  return getQualitySnapshot(selectedPlan.value, clips.value);
});

const planHighRiskCount = computed(() =>
  planClips.value.filter(e => e.clip.riskLevel === '高风险').length,
);

const clipsSorted = computed(() =>
  [...clips.value].sort((a, b) => a.sortOrder - b.sortOrder),
);

const publishable = computed(() =>
  clipsSorted.value.filter(c => c.publishStatus === '已剪辑' && !c.isAlternate),
);

const needReview = computed(() =>
  clipsSorted.value.filter(c => c.publishStatus === '需复听' && !c.isAlternate),
);

const excluded = computed(() =>
  clipsSorted.value.filter(c =>
    c.publishStatus === '暂不发布' || c.publishStatus === '待剪辑' || c.isAlternate,
  ),
);

function calcDuration(list: Clip[]) {
  return list.reduce((s, c) => s + Math.max(0, c.endTime - c.startTime), 0);
}

const pubDuration = computed(() => calcDuration(publishable.value));
const reviewDuration = computed(() => calcDuration(needReview.value));
const excludedDuration = computed(() => calcDuration(excluded.value));

const publishableHighRisk = computed(() =>
  publishable.value.filter(c => c.riskLevel === '高风险'),
);

const reviewMissingRemark = computed(() =>
  needReview.value.filter(c => !c.remark || !c.remark.trim()),
);

interface SectionDef {
  key: string;
  title: string;
  subtitle: string;
  list: Clip[];
  accent: string;
  badge: string;
  icon: typeof ClipboardCheck;
  iconBg: string;
  iconColor: string;
  border: string;
}

const sections = computed<SectionDef[]>(() => [
  {
    key: 'pub',
    title: '可发布片段',
    subtitle: '标记为「已剪辑」的片段，按剪辑顺序排列',
    list: publishable.value,
    accent: 'text-success',
    badge: 'bg-success/15 text-success border-success/30',
    icon: ClipboardCheck,
    iconBg: 'bg-success/15',
    iconColor: 'text-success',
    border: 'border-success/30',
  },
  {
    key: 'review',
    title: '需复听片段',
    subtitle: '需要进一步审核或讨论的内容',
    list: needReview.value,
    accent: 'text-warning',
    badge: 'bg-warning/15 text-warning border-warning/30',
    icon: Volume2,
    iconBg: 'bg-warning/15',
    iconColor: 'text-warning',
    border: 'border-warning/30',
  },
  {
    key: 'excl',
    title: '被排除片段',
    subtitle: '暂不发布、待剪辑或备选版本',
    list: excluded.value,
    accent: 'text-graphite-400',
    badge: 'bg-graphite-700/60 text-graphite-300 border-graphite-600',
    icon: Ban,
    iconBg: 'bg-graphite-700',
    iconColor: 'text-graphite-300',
    border: 'border-graphite-700',
  },
]);

interface RowDef { clip: Clip; index: number; globalIndex: number; }
function buildRows(list: Clip[]): RowDef[] {
  return list.map((c, i) => ({
    clip: c,
    index: i,
    globalIndex: clipsSorted.value.findIndex(x => x.id === c.id),
  }));
}

const ChapterIcons = {
  '开场': Play,
  '主内容': Layers,
  '过渡': ArrowRight,
  '收尾': Flag,
};

function selectPlan(id: string) {
  selectedPlanId.value = id;
}

function handleExportPlanJSON() {
  if (!selectedPlan.value) return;
  exportPlanToJSON(selectedPlan.value, clips.value);
}

function handleExportPlanCSV() {
  if (!selectedPlan.value) return;
  exportPlanToCSV(selectedPlan.value, clips.value);
}

onMounted(async () => {
  await loadPlans();
});
</script>

<template>
  <div class="h-full flex flex-col gap-4">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div class="flex items-center gap-3">
        <div class="p-2.5 rounded-2xl bg-success/15">
          <ClipboardCheck class="w-6 h-6 text-success" />
        </div>
        <div>
          <h1 class="font-display text-2xl font-bold text-graphite-50">发布前核对</h1>
          <div class="text-sm text-graphite-400 flex items-center gap-3 mt-0.5">
            <span v-if="isPlanMode">
              计划：<span class="text-graphite-200 font-semibold">{{ selectedPlan?.title }}</span>
            </span>
            <span v-else>共 <span class="text-graphite-200 font-semibold">{{ clipsSorted.length }}</span> 个片段</span>
            <span>·</span>
            <span>总时长 <span class="font-mono text-graphite-200 font-semibold">{{ formatDuration(isPlanMode ? planDuration : totalDuration) }}</span></span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <div v-if="isPlanMode" class="flex items-center gap-2">
          <button class="btn-secondary flex items-center gap-2" @click="handleExportPlanJSON">
            <FileJson class="w-4 h-4 text-info" />
            导出编排
          </button>
          <button class="btn-secondary flex items-center gap-2" @click="handleExportPlanCSV">
            <FileSpreadsheet class="w-4 h-4 text-success" />
            CSV
          </button>
        </div>
        <div v-else class="relative group">
          <button class="btn-secondary flex items-center gap-2">
            <ClipboardCheck class="w-4 h-4" />
            导出清单
          </button>
          <div class="absolute right-0 top-full mt-2 w-48 card p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
            <button
              class="w-full text-left px-3 py-2 rounded-lg hover:bg-graphite-700 text-sm text-graphite-200 transition-colors"
              @click="exportToJSON(clipsSorted)"
            >
              导出为 JSON
            </button>
            <button
              class="w-full text-left px-3 py-2 rounded-lg hover:bg-graphite-700 text-sm text-graphite-200 transition-colors"
              @click="exportToCSV(clipsSorted)"
            >
              导出为 CSV
            </button>
            <div class="my-1 border-t border-graphite-700" />
            <button
              class="w-full text-left px-3 py-2 rounded-lg hover:bg-graphite-700 text-sm text-graphite-400 transition-colors"
              @click="exportFullBackup(clipsSorted)"
            >
              完整备份 (含内部字段)
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="card p-3 flex items-center gap-2 flex-wrap">
      <span class="text-xs text-graphite-400 px-2">核对范围：</span>
      <button
        class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all border"
        :class="selectedPlanId === '' ? 'bg-brand-400 text-white border-brand-400' : 'bg-graphite-700 text-graphite-200 border-graphite-600 hover:bg-graphite-600'"
        @click="selectPlan('')"
      >
        全部片段
      </button>
      <template v-if="plans.length > 0">
        <div class="w-px h-5 bg-graphite-700 mx-1"></div>
        <button
          v-for="plan in plans"
          :key="plan.id"
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all border flex items-center gap-2"
          :class="selectedPlanId === plan.id ? 'bg-brand-400 text-white border-brand-400' : 'bg-graphite-700 text-graphite-200 border-graphite-600 hover:bg-graphite-600'"
          @click="selectPlan(plan.id)"
        >
          <Layers class="w-3.5 h-3.5" />
          {{ plan.title }}
          <span
            class="badge text-[10px] px-1.5"
            :class="[PLAN_STATUS_CONFIG[plan.status].bg, PLAN_STATUS_CONFIG[plan.status].text]"
          >
            {{ plan.status }}
          </span>
        </button>
      </template>
      <span v-else class="text-xs text-graphite-500 px-2">暂无发布计划，可前往「发布计划」创建</span>
    </div>

    <template v-if="!isPlanMode">
      <div class="grid grid-cols-4 gap-4">
        <div class="card p-4 flex items-center gap-3 border-brand-400/30">
          <div class="p-2.5 rounded-xl bg-brand-400/15">
            <Clock class="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <div class="text-xs text-graphite-400">全部时长</div>
            <div class="font-mono text-lg font-bold text-graphite-50">{{ formatDuration(totalDuration) }}</div>
          </div>
        </div>
        <div class="card p-4 flex items-center gap-3 border-success/30">
          <div class="p-2.5 rounded-xl bg-success/15">
            <ClipboardCheck class="w-5 h-5 text-success" />
          </div>
          <div>
            <div class="text-xs text-graphite-400">可发布</div>
            <div class="font-mono text-lg font-bold text-success">{{ formatDuration(pubDuration) }}</div>
          </div>
        </div>
        <div class="card p-4 flex items-center gap-3 border-warning/30">
          <div class="p-2.5 rounded-xl bg-warning/15">
            <Volume2 class="w-5 h-5 text-warning" />
          </div>
          <div>
            <div class="text-xs text-graphite-400">需复听</div>
            <div class="font-mono text-lg font-bold text-warning">{{ formatDuration(reviewDuration) }}</div>
          </div>
        </div>
        <div class="card p-4 flex items-center gap-3 border-graphite-700">
          <div class="p-2.5 rounded-xl bg-graphite-700">
            <Ban class="w-5 h-5 text-graphite-300" />
          </div>
          <div>
            <div class="text-xs text-graphite-400">被排除</div>
            <div class="font-mono text-lg font-bold text-graphite-300">{{ formatDuration(excludedDuration) }}</div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4">
        <div
          v-if="publishableHighRisk.length > 0 || reviewMissingRemark.length > 0"
          class="card p-4 border-danger/40 bg-danger/5"
        >
          <div class="flex items-center gap-2 mb-3">
            <AlertCircle class="w-5 h-5 text-danger shrink-0" />
            <span class="font-semibold text-danger">发布前需要注意</span>
          </div>
          <div class="space-y-2 text-sm">
            <div
              v-if="publishableHighRisk.length > 0"
              class="flex items-start gap-2 text-danger/90"
            >
              <AlertTriangle class="w-4 h-4 mt-0.5 shrink-0" />
              <span>可发布列表中包含 <strong>{{ publishableHighRisk.length }}</strong> 个高风险片段，请再次确认内容</span>
            </div>
            <div
              v-if="reviewMissingRemark.length > 0"
              class="flex items-start gap-2 text-warning/90"
            >
              <AlertTriangle class="w-4 h-4 mt-0.5 shrink-0" />
              <span><strong>{{ reviewMissingRemark.length }}</strong> 个需复听片段缺少备注说明</span>
            </div>
          </div>
        </div>
      </div>

      <div
        v-for="sec in sections"
        :key="sec.key"
        class="card overflow-hidden"
        :class="sec.border"
      >
        <div class="flex items-center justify-between p-5 border-b border-graphite-700">
          <div class="flex items-center gap-3">
            <div class="p-2.5 rounded-xl" :class="sec.iconBg">
              <component :is="sec.icon" class="w-5 h-5" :class="sec.iconColor" />
            </div>
            <div>
              <div class="flex items-center gap-3">
                <h2 class="font-display text-lg font-semibold text-graphite-50">{{ sec.title }}</h2>
                <span class="badge border" :class="sec.badge">
                  {{ sec.list.length }} 个片段
                </span>
              </div>
              <div class="text-sm text-graphite-400 mt-0.5">{{ sec.subtitle }}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-xs text-graphite-400">合计时长</div>
            <div class="font-mono text-lg font-bold" :class="sec.accent">
              {{ formatDuration(sec.key === 'pub' ? pubDuration : sec.key === 'review' ? reviewDuration : excludedDuration) }}
            </div>
          </div>
        </div>

        <div
          v-if="sec.list.length === 0"
          class="p-10 text-center text-graphite-400"
        >
          暂无{{ sec.title }}
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-graphite-900/40 text-graphite-400">
                <th class="px-4 py-2.5 text-left font-medium w-16">#</th>
                <th class="px-4 py-2.5 text-left font-medium">片段 / 时间</th>
                <th class="px-4 py-2.5 text-left font-medium w-44">
                  <div class="flex items-center gap-1.5"><Tag class="w-3.5 h-3.5" /> 主题</div>
                </th>
                <th class="px-4 py-2.5 text-left font-medium w-44">
                  <div class="flex items-center gap-1.5"><Users class="w-3.5 h-3.5" /> 说话人</div>
                </th>
                <th class="px-4 py-2.5 text-left font-medium w-36">
                  <div class="flex items-center gap-1.5"><Scissors class="w-3.5 h-3.5" /> 剪辑</div>
                </th>
                <th class="px-4 py-2.5 text-left font-medium w-32">风险</th>
                <th class="px-4 py-2.5 text-left font-medium w-32">状态</th>
                <th class="px-4 py-2.5 text-left font-medium">备注 / 问题</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-graphite-700/50">
              <tr
                v-for="row in buildRows(sec.list)"
                :key="row.clip.id"
                class="hover:bg-graphite-700/30 transition-colors"
              >
                <td class="px-4 py-3 align-top">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-mono text-graphite-500/80 bg-graphite-700/50 px-1.5 py-0.5 rounded">
                      {{ String(row.globalIndex + 1).padStart(2, '0') }}
                    </span>
                    <span class="font-semibold" :class="sec.accent">{{ row.index + 1 }}</span>
                  </div>
                </td>
                <td class="px-4 py-3 align-top">
                  <div class="font-medium text-graphite-100 mb-0.5 flex items-center gap-2">
                    {{ row.clip.title }}
                    <span
                      v-if="row.clip.isAlternate"
                      class="text-[10px] px-1.5 py-0.5 rounded bg-info/15 text-info"
                    >备选</span>
                  </div>
                  <div class="text-xs font-mono text-graphite-400 flex items-center gap-2">
                    {{ formatTimestamp(row.clip.startTime) }}
                    <span class="text-graphite-600">→</span>
                    {{ formatTimestamp(row.clip.endTime) }}
                    <span class="text-graphite-500">
                      ({{ formatDuration(Math.max(0, row.clip.endTime - row.clip.startTime)) }})
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3 align-top">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-graphite-700/60 text-xs text-graphite-200">
                    {{ row.clip.topic || '—' }}
                  </span>
                </td>
                <td class="px-4 py-3 align-top text-graphite-300">
                  {{ row.clip.speaker || '—' }}
                </td>
                <td class="px-4 py-3 align-top text-graphite-300">
                  {{ row.clip.editAction }}
                </td>
                <td class="px-4 py-3 align-top">
                  <span
                    class="badge"
                    :class="[RISK_LEVEL_CONFIG[row.clip.riskLevel].bg, RISK_LEVEL_CONFIG[row.clip.riskLevel].text]"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full mr-1"
                      :class="RISK_LEVEL_CONFIG[row.clip.riskLevel].dot"
                    ></span>
                    {{ row.clip.riskLevel }}
                  </span>
                </td>
                <td class="px-4 py-3 align-top">
                  <span
                    class="badge"
                    :class="[STATUS_CONFIG[row.clip.publishStatus].bg, STATUS_CONFIG[row.clip.publishStatus].text]"
                  >
                    {{ row.clip.publishStatus }}
                  </span>
                </td>
                <td class="px-4 py-3 align-top min-w-[200px]">
                  <div
                    v-if="row.clip.remark"
                    class="text-xs text-graphite-300 bg-graphite-900/50 rounded-lg px-2.5 py-1.5 mb-1.5 whitespace-pre-wrap"
                  >
                    {{ row.clip.remark }}
                  </div>
                  <div
                    v-for="p in getProblemsForClip(row.clip.id)"
                    :key="p.id"
                    class="flex items-start gap-1.5 text-[11px] mt-1"
                    :class="p.severity === 'error' ? 'text-danger' : p.severity === 'warning' ? 'text-warning' : 'text-info'"
                  >
                    <AlertCircle class="w-3 h-3 mt-0.5 shrink-0" />
                    <span>{{ p.message }}</span>
                  </div>
                  <div
                    v-if="row.clip.publishStatus === '需复听' && !row.clip.remark?.trim()"
                    class="flex items-start gap-1.5 text-[11px] text-warning mt-1"
                  >
                    <AlertTriangle class="w-3 h-3 mt-0.5 shrink-0" />
                    <span>需复听但缺少备注</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="grid grid-cols-4 gap-4">
        <div class="card p-4 flex items-center gap-3 border-brand-400/30">
          <div class="p-2.5 rounded-xl bg-brand-400/15">
            <Clock class="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <div class="text-xs text-graphite-400">节目总时长</div>
            <div class="font-mono text-lg font-bold text-graphite-50">{{ formatDuration(planDuration) }}</div>
          </div>
        </div>
        <div class="card p-4 flex items-center gap-3 border-info/30">
          <div class="p-2.5 rounded-xl bg-info/15">
            <Layers class="w-5 h-5 text-info" />
          </div>
          <div>
            <div class="text-xs text-graphite-400">片段总数</div>
            <div class="font-mono text-lg font-bold text-info">{{ planClips.length }}</div>
          </div>
        </div>
        <div class="card p-4 flex items-center gap-3 border-success/30">
          <div class="p-2.5 rounded-xl bg-success/15">
            <CheckCircle2 class="w-5 h-5 text-success" />
          </div>
          <div>
            <div class="text-xs text-graphite-400">可发布进度</div>
            <div class="font-mono text-lg font-bold text-success">
              {{ planProgress.ready }}/{{ planProgress.total }} · {{ planProgress.percent }}%
            </div>
          </div>
        </div>
        <div class="card p-4 flex items-center gap-3" :class="planHighRiskCount > 0 ? 'border-danger/30' : 'border-graphite-700'">
          <div class="p-2.5 rounded-xl" :class="planHighRiskCount > 0 ? 'bg-danger/15' : 'bg-graphite-700'">
            <AlertTriangle class="w-5 h-5" :class="planHighRiskCount > 0 ? 'text-danger' : 'text-graphite-300'" />
          </div>
          <div>
            <div class="text-xs text-graphite-400">高风险片段</div>
            <div class="font-mono text-lg font-bold" :class="planHighRiskCount > 0 ? 'text-danger' : 'text-graphite-300'">
              {{ planHighRiskCount }}
            </div>
          </div>
        </div>
      </div>

      <div v-if="selectedPlan?.remark" class="card p-4">
        <div class="text-xs font-medium text-graphite-400 mb-1.5">计划备注</div>
        <div class="text-sm text-graphite-200 whitespace-pre-wrap">{{ selectedPlan.remark }}</div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-2">
          <div
            v-if="planWarnings.some(w => w.severity === 'error' || w.severity === 'warning')"
            class="card p-4 mb-4 border-warning/30 bg-warning/5"
          >
            <div class="flex items-center gap-2 mb-3">
              <AlertCircle class="w-5 h-5 text-warning shrink-0" />
              <span class="font-semibold text-warning">该计划发布前需要注意</span>
            </div>
            <div class="space-y-2 text-sm">
              <div
                v-for="w in planWarnings"
                :key="w.id"
                class="flex items-start gap-2"
                :class="w.severity === 'error' ? 'text-danger/90' : w.severity === 'warning' ? 'text-warning/90' : 'text-info/90'"
              >
                <component
                  :is="w.severity === 'error' ? AlertCircle : w.severity === 'warning' ? AlertTriangle : AlertCircle"
                  class="w-4 h-4 mt-0.5 shrink-0"
                />
                <span><strong>{{ w.type }}</strong> · {{ w.message }}</span>
              </div>
            </div>
          </div>

          <div class="card overflow-hidden">
            <div class="flex items-center justify-between p-5 border-b border-graphite-700">
              <div class="flex items-center gap-3">
                <div class="p-2.5 rounded-xl bg-brand-400/15">
                  <Layers class="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <div class="flex items-center gap-3">
                    <h2 class="font-display text-lg font-semibold text-graphite-50">节目片段编排</h2>
                    <span class="badge border bg-brand-400/15 text-brand-400 border-brand-400/30">
                      {{ planClips.length }} 个片段
                    </span>
                  </div>
                  <div class="text-sm text-graphite-400 mt-0.5">按计划内顺序与章节类型展示</div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-xs text-graphite-400">可发布</div>
                <div class="font-mono text-lg font-bold text-success">
                  {{ planProgress.ready }}/{{ planProgress.total }}
                </div>
              </div>
            </div>

            <div
              v-if="planClips.length === 0"
              class="p-10 text-center text-graphite-400"
            >
              该计划还没有添加片段
            </div>

            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-graphite-900/40 text-graphite-400">
                    <th class="px-4 py-2.5 text-left font-medium w-16">#</th>
                    <th class="px-4 py-2.5 text-left font-medium w-28">章节</th>
                    <th class="px-4 py-2.5 text-left font-medium">片段 / 时间</th>
                    <th class="px-4 py-2.5 text-left font-medium w-40">
                      <div class="flex items-center gap-1.5"><Tag class="w-3.5 h-3.5" /> 主题</div>
                    </th>
                    <th class="px-4 py-2.5 text-left font-medium w-36">
                      <div class="flex items-center gap-1.5"><Users class="w-3.5 h-3.5" /> 说话人</div>
                    </th>
                    <th class="px-4 py-2.5 text-left font-medium w-28">风险</th>
                    <th class="px-4 py-2.5 text-left font-medium w-28">状态</th>
                    <th class="px-4 py-2.5 text-left font-medium">备注 / 问题</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-graphite-700/50">
                  <tr
                    v-for="(entry, idx) in planClips"
                    :key="entry.clipId"
                    class="hover:bg-graphite-700/30 transition-colors"
                  >
                    <td class="px-4 py-3 align-top">
                      <span class="font-semibold text-brand-400">{{ idx + 1 }}</span>
                    </td>
                    <td class="px-4 py-3 align-top">
                      <span
                        class="badge"
                        :class="[CHAPTER_CONFIG[entry.chapterType].bg, CHAPTER_CONFIG[entry.chapterType].text]"
                      >
                        <component :is="ChapterIcons[entry.chapterType]" class="w-3 h-3 mr-1" />
                        {{ entry.chapterType }}
                      </span>
                    </td>
                    <td class="px-4 py-3 align-top">
                      <div class="font-medium text-graphite-100 mb-0.5 flex items-center gap-2">
                        {{ entry.clip.title }}
                        <span
                          v-if="entry.clip.isAlternate"
                          class="text-[10px] px-1.5 py-0.5 rounded bg-info/15 text-info"
                        >备选</span>
                      </div>
                      <div class="text-xs font-mono text-graphite-400 flex items-center gap-2">
                        {{ formatTimestamp(entry.clip.startTime) }}
                        <span class="text-graphite-600">→</span>
                        {{ formatTimestamp(entry.clip.endTime) }}
                        <span class="text-graphite-500">
                          ({{ formatDuration(Math.max(0, entry.clip.endTime - entry.clip.startTime)) }})
                        </span>
                      </div>
                    </td>
                    <td class="px-4 py-3 align-top">
                      <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-graphite-700/60 text-xs text-graphite-200">
                        {{ entry.clip.topic || '—' }}
                      </span>
                    </td>
                    <td class="px-4 py-3 align-top text-graphite-300">
                      {{ entry.clip.speaker || '—' }}
                    </td>
                    <td class="px-4 py-3 align-top">
                      <span
                        class="badge"
                        :class="[RISK_LEVEL_CONFIG[entry.clip.riskLevel].bg, RISK_LEVEL_CONFIG[entry.clip.riskLevel].text]"
                      >
                        <span
                          class="w-1.5 h-1.5 rounded-full mr-1"
                          :class="RISK_LEVEL_CONFIG[entry.clip.riskLevel].dot"
                        ></span>
                        {{ entry.clip.riskLevel }}
                      </span>
                    </td>
                    <td class="px-4 py-3 align-top">
                      <span
                        class="badge"
                        :class="[STATUS_CONFIG[entry.clip.publishStatus].bg, STATUS_CONFIG[entry.clip.publishStatus].text]"
                      >
                        {{ entry.clip.publishStatus }}
                      </span>
                    </td>
                    <td class="px-4 py-3 align-top min-w-[200px]">
                      <div
                        v-if="entry.clip.remark"
                        class="text-xs text-graphite-300 bg-graphite-900/50 rounded-lg px-2.5 py-1.5 mb-1.5 whitespace-pre-wrap"
                      >
                        {{ entry.clip.remark }}
                      </div>
                      <div
                        v-for="p in getProblemsForClip(entry.clip.id)"
                        :key="p.id"
                        class="flex items-start gap-1.5 text-[11px] mt-1"
                        :class="p.severity === 'error' ? 'text-danger' : p.severity === 'warning' ? 'text-warning' : 'text-info'"
                      >
                        <AlertCircle class="w-3 h-3 mt-0.5 shrink-0" />
                        <span>{{ p.message }}</span>
                      </div>
                      <div
                        v-if="entry.clip.publishStatus === '需复听' && !entry.clip.remark?.trim()"
                        class="flex items-start gap-1.5 text-[11px] text-warning mt-1"
                      >
                        <AlertTriangle class="w-3 h-3 mt-0.5 shrink-0" />
                        <span>需复听但缺少备注</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="lg:sticky lg:top-4 self-start">
          <PlanStatsPanel
            :chapter-stats="planChapterStats"
            :topic-distribution="planTopicDistribution"
            :risk-distribution="planRiskDistribution"
            :warnings="planWarnings"
            :quality-snapshot="planQualitySnapshot"
          />
        </div>
      </div>
    </template>
  </div>
</template>
