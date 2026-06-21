<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ArrowLeft, Edit3, Clock, Layers, CheckCircle2,
  FileJson, FileSpreadsheet, ChevronDown, Play, Flag,
  AlertCircle, AlertTriangle, Info, X,
} from 'lucide-vue-next';
import { useClips } from '@/composables/useClips';
import { usePublishPlans } from '@/composables/usePublishPlans';
import { useExport } from '@/composables/useExport';
import PlanStatsPanel from '@/components/PlanStatsPanel.vue';
import PlanClipArranger from '@/components/PlanClipArranger.vue';
import PlanEditor from '@/components/PlanEditor.vue';
import type {
  PublishPlan,
  ChapterType,
  PlanStatus,
  QualityProblem,
  PublishBlocker,
} from '@/types';
import {
  formatDuration,
  PLAN_STATUSES,
  PLAN_STATUS_CONFIG,
} from '@/types';

const route = useRoute();
const router = useRouter();

const { clips, loadClips } = useClips();
const {
  plans,
  currentPlan,
  loadPlans,
  loadPlan,
  savePlan,
  setPlanStatus,
  getPlanClips,
  calcPlanDuration,
  getChapterStats,
  getTopicDistribution,
  getRiskDistribution,
  getPublishProgress,
  getPlanWarnings,
  getQualitySnapshot,
  getClipProblemMap,
  getPublishBlockers,
  removeClipFromPlan,
  updateClipChapter,
  reorderPlanClips,
} = usePublishPlans();
const { exportPlanToJSON, exportPlanToCSV } = useExport();

const showPlanEditor = ref(false);
const showStatusMenu = ref(false);
const showExportMenu = ref(false);
const showPublishConfirmDialog = ref(false);
const pendingStatus = ref<PlanStatus | null>(null);
const highlightClipIds = ref<string[]>([]);

const planId = computed(() => route.params.id as string);

const planClips = computed(() => {
  if (!currentPlan.value) return [];
  return getPlanClips(currentPlan.value, clips.value);
});

const planDuration = computed(() => {
  if (!currentPlan.value) return 0;
  return calcPlanDuration(currentPlan.value, clips.value);
});

const chapterStats = computed(() => {
  if (!currentPlan.value) return [];
  return getChapterStats(currentPlan.value, clips.value);
});

const topicDistribution = computed(() => {
  if (!currentPlan.value) return [];
  return getTopicDistribution(currentPlan.value, clips.value);
});

const riskDistribution = computed(() => {
  if (!currentPlan.value) return [];
  return getRiskDistribution(currentPlan.value, clips.value);
});

const publishProgress = computed(() => {
  if (!currentPlan.value) return { ready: 0, total: 0, percent: 0 };
  return getPublishProgress(currentPlan.value, clips.value);
});

const planWarnings = computed(() => {
  if (!currentPlan.value) return [];
  return getPlanWarnings(currentPlan.value, clips.value);
});

const qualitySnapshot = computed(() => {
  if (!currentPlan.value) {
    return {
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      totalCount: 0,
      worstSeverity: null,
      problems: [],
    };
  }
  return getQualitySnapshot(currentPlan.value, clips.value);
});

const clipProblemMap = computed(() => {
  if (!currentPlan.value) return {};
  return getClipProblemMap(currentPlan.value, clips.value);
});

const publishBlockers = computed((): PublishBlocker[] => {
  if (!currentPlan.value) return [];
  return getPublishBlockers(currentPlan.value, clips.value);
});

const hasCriticalBlockers = computed(() => {
  return publishBlockers.value.some(b => b.severity === 'error');
});

function handleLocateProblem(problem: QualityProblem) {
  highlightClipIds.value = [...problem.clipIds];
  setTimeout(() => {
    highlightClipIds.value = [];
  }, 3000);
}

function handleLocateClip(clipId: string) {
  highlightClipIds.value = [clipId];
  setTimeout(() => {
    highlightClipIds.value = [];
  }, 3000);
}

async function handleReorder(clipIds: string[]) {
  if (!currentPlan.value) return;
  await reorderPlanClips(currentPlan.value.id, clipIds);
}

async function handleRemoveClip(clipId: string) {
  if (!currentPlan.value) return;
  await removeClipFromPlan(currentPlan.value.id, clipId);
}

async function handleChangeChapter(clipId: string, chapterType: ChapterType) {
  if (!currentPlan.value) return;
  await updateClipChapter(currentPlan.value.id, clipId, chapterType);
}

async function handlePlanEditorSubmit(data: { title: string; publishTitle: string; remark: string }) {
  if (!currentPlan.value) return;
  await savePlan(currentPlan.value.id, data);
  showPlanEditor.value = false;
}

async function handleStatusChange(status: PlanStatus) {
  if (!currentPlan.value) return;

  if (status === '待发布' || status === '已发布') {
    const blockers = getPublishBlockers(currentPlan.value, clips.value);
    if (blockers.length > 0) {
      pendingStatus.value = status;
      showPublishConfirmDialog.value = true;
      showStatusMenu.value = false;
      return;
    }
  }

  await setPlanStatus(currentPlan.value.id, status);
  showStatusMenu.value = false;
}

async function confirmStatusChange() {
  if (!currentPlan.value || !pendingStatus.value) return;
  await setPlanStatus(currentPlan.value.id, pendingStatus.value);
  showPublishConfirmDialog.value = false;
  pendingStatus.value = null;
}

function cancelStatusChange() {
  showPublishConfirmDialog.value = false;
  pendingStatus.value = null;
}

function handleBlockerLocate(clipIds: string[]) {
  highlightClipIds.value = [...clipIds];
  setTimeout(() => {
    highlightClipIds.value = [];
  }, 3000);
}

function handleExportJSON() {
  if (!currentPlan.value) return;
  exportPlanToJSON(currentPlan.value, clips.value);
  showExportMenu.value = false;
}

function handleExportCSV() {
  if (!currentPlan.value) return;
  exportPlanToCSV(currentPlan.value, clips.value);
  showExportMenu.value = false;
}

function closeMenus() {
  showStatusMenu.value = false;
  showExportMenu.value = false;
}

onMounted(async () => {
  await loadClips();
  await loadPlans();
  await loadPlan(planId.value);
});

watch(planId, async (newId) => {
  if (newId) {
    await loadPlan(newId);
  }
});
</script>

<template>
  <div class="h-full flex flex-col gap-4" @click="closeMenus">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div class="flex items-center gap-3">
        <button
          class="p-2 rounded-xl hover:bg-graphite-700 text-graphite-400 hover:text-graphite-100 transition-colors"
          @click="router.push('/plans')"
        >
          <ArrowLeft class="w-5 h-5" />
        </button>
        <div class="p-2.5 rounded-2xl bg-brand-400/15">
          <Layers class="w-6 h-6 text-brand-400" />
        </div>
        <div v-if="currentPlan">
          <div class="flex items-center gap-3">
            <h1 class="font-display text-2xl font-bold text-graphite-50">{{ currentPlan.title }}</h1>
            <div class="relative">
              <button
                class="badge py-1 px-3 flex items-center gap-1.5 text-xs"
                :class="[PLAN_STATUS_CONFIG[currentPlan.status].bg, PLAN_STATUS_CONFIG[currentPlan.status].text]"
                @click.stop="showStatusMenu = !showStatusMenu"
              >
                {{ currentPlan.status }}
                <ChevronDown class="w-3 h-3" />
              </button>
              <Transition name="dropdown">
                <div
                  v-if="showStatusMenu"
                  class="absolute left-0 top-full mt-1.5 w-32 card p-1 z-30 animate-slide-up"
                >
                  <button
                    v-for="st in PLAN_STATUSES"
                    :key="st"
                    class="w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors"
                    :class="currentPlan.status === st
                      ? 'bg-brand-400/15 text-brand-400'
                      : 'text-graphite-200 hover:bg-graphite-700'"
                    @click.stop="handleStatusChange(st)"
                  >
                    {{ st }}
                  </button>
                </div>
              </Transition>
            </div>
          </div>
          <div class="text-sm text-graphite-400 flex items-center gap-3 mt-0.5">
            <span v-if="currentPlan.publishTitle">发布标题：{{ currentPlan.publishTitle }}</span>
          </div>
        </div>
      </div>

      <div v-if="currentPlan" class="flex items-center gap-2">
        <button
          class="btn-secondary flex items-center gap-2"
          @click="showPlanEditor = true"
        >
          <Edit3 class="w-4 h-4" />
          编辑信息
        </button>
        <div class="relative">
          <button
            class="btn-secondary flex items-center gap-2"
            @click.stop="showExportMenu = !showExportMenu"
          >
            <FileSpreadsheet class="w-4 h-4" />
            导出编排
          </button>
          <Transition name="dropdown">
            <div
              v-if="showExportMenu"
              class="absolute right-0 top-full mt-2 w-48 card p-1.5 z-30 animate-slide-up"
            >
              <button
                class="w-full text-left px-3 py-2 rounded-lg hover:bg-graphite-700 text-sm text-graphite-100 transition-colors flex items-center gap-2.5"
                @click.stop="handleExportJSON"
              >
                <FileJson class="w-4 h-4 text-info" />
                <div>
                  <div>导出编排清单</div>
                  <div class="text-[11px] text-graphite-500">JSON 格式</div>
                </div>
              </button>
              <button
                class="w-full text-left px-3 py-2 rounded-lg hover:bg-graphite-700 text-sm text-graphite-100 transition-colors flex items-center gap-2.5"
                @click.stop="handleExportCSV"
              >
                <FileSpreadsheet class="w-4 h-4 text-success" />
                <div>
                  <div>导出编排清单</div>
                  <div class="text-[11px] text-graphite-500">CSV 表格格式</div>
                </div>
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <div v-if="currentPlan" class="grid grid-cols-4 gap-4">
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
            {{ publishProgress.ready }}/{{ publishProgress.total }} · {{ publishProgress.percent }}%
          </div>
        </div>
      </div>
      <div class="card p-4">
        <div class="text-xs text-graphite-400 mb-2">进度条</div>
        <div class="h-3 bg-graphite-700 rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-brand-400 to-success rounded-full transition-all duration-500"
            :style="{ width: `${publishProgress.percent}%` }"
          />
        </div>
        <div class="text-[11px] text-graphite-500 mt-1">
          <Play class="w-3 h-3 inline mr-1 text-info" />
          {{ chapterStats[0]?.count || 0 }} 开场
          <span class="mx-2">·</span>
          <Layers class="w-3 h-3 inline mr-1 text-brand-400" />
          {{ chapterStats[1]?.count || 0 }} 主内容
          <span class="mx-2">·</span>
          <Flag class="w-3 h-3 inline mr-1 text-success" />
          {{ chapterStats[3]?.count || 0 }} 收尾
        </div>
      </div>
    </div>

    <div v-if="currentPlan && currentPlan.remark" class="card p-4">
      <div class="text-xs font-medium text-graphite-400 mb-1.5">计划备注</div>
      <div class="text-sm text-graphite-200 whitespace-pre-wrap">{{ currentPlan.remark }}</div>
    </div>

    <div v-if="currentPlan" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2">
        <div class="card p-5 mb-4">
          <h3 class="font-display font-semibold text-graphite-50 mb-4 flex items-center gap-2">
            <Layers class="w-4 h-4 text-brand-400" />
            节目片段编排
            <span class="text-xs font-normal text-graphite-400 ml-2">拖拽调整顺序 · 修改章节类型 · 移除片段</span>
          </h3>
          <PlanClipArranger
            :clips="planClips"
            :highlight-clip-ids="highlightClipIds"
            :clip-problems="clipProblemMap"
            @reorder="handleReorder"
            @remove="handleRemoveClip"
            @change-chapter="handleChangeChapter"
          />
        </div>
      </div>

      <div class="lg:sticky lg:top-4 self-start">
        <PlanStatsPanel
          :chapter-stats="chapterStats"
          :topic-distribution="topicDistribution"
          :risk-distribution="riskDistribution"
          :warnings="planWarnings"
          :quality-snapshot="qualitySnapshot"
          @locate-problem="handleLocateProblem"
          @locate-clip="handleLocateClip"
        />
      </div>
    </div>

    <div v-else class="card p-16 text-center">
      <div class="text-graphite-400">加载中...</div>
    </div>

    <PlanEditor
      v-model="showPlanEditor"
      :plan="currentPlan"
      @submit="handlePlanEditorSubmit"
    />

    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showPublishConfirmDialog"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-graphite-900/80 backdrop-blur-sm"
          @click.self="cancelStatusChange"
        >
          <div class="card p-6 w-full max-w-lg animate-fade-in">
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center gap-3">
                <div
                  class="p-2.5 rounded-xl"
                  :class="hasCriticalBlockers ? 'bg-danger/15' : 'bg-warning/15'"
                >
                  <component
                    :is="hasCriticalBlockers ? AlertCircle : AlertTriangle"
                    class="w-6 h-6"
                    :class="hasCriticalBlockers ? 'text-danger' : 'text-warning'"
                  />
                </div>
                <div>
                  <h3 class="font-display text-lg font-semibold text-graphite-50">
                    {{ hasCriticalBlockers ? '存在严重问题' : '发布前检查' }}
                  </h3>
                  <p class="text-sm text-graphite-400">
                    将状态切换为「{{ pendingStatus }}」前请注意以下问题
                  </p>
                </div>
              </div>
              <button
                class="p-1.5 rounded-lg hover:bg-graphite-700 text-graphite-400 hover:text-graphite-100 transition-colors"
                @click="cancelStatusChange"
              >
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="space-y-2 mb-6 max-h-[320px] overflow-y-auto scrollbar-thin">
              <div
                v-for="blocker in publishBlockers"
                :key="blocker.type"
                class="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:scale-[1.01]"
                :class="blocker.severity === 'error'
                  ? 'bg-danger/10 border-danger/30'
                  : blocker.severity === 'warning'
                    ? 'bg-warning/10 border-warning/30'
                    : 'bg-info/10 border-info/30'"
                @click="handleBlockerLocate(blocker.clipIds)"
              >
                <component
                  :is="blocker.severity === 'error' ? AlertCircle : blocker.severity === 'warning' ? AlertTriangle : Info"
                  class="w-5 h-5 mt-0.5 shrink-0"
                  :class="blocker.severity === 'error'
                    ? 'text-danger'
                    : blocker.severity === 'warning'
                      ? 'text-warning'
                      : 'text-info'"
                />
                <div class="flex-1 min-w-0">
                  <div
                    class="text-sm font-medium mb-0.5"
                    :class="blocker.severity === 'error'
                      ? 'text-danger'
                      : blocker.severity === 'warning'
                        ? 'text-warning'
                        : 'text-info'"
                  >
                    {{ blocker.type === 'high_risk'
                      ? '高风险片段'
                      : blocker.type === 'review_missing_remark'
                        ? '需复听未备注'
                        : blocker.type === 'time_abnormal'
                          ? '时间异常'
                          : '未就绪片段' }}
                  </div>
                  <div class="text-xs text-graphite-300">{{ blocker.message }}</div>
                  <div class="text-[11px] text-graphite-500 mt-1">
                    涉及 {{ blocker.clipIds.length }} 个片段 · 点击定位
                  </div>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3">
              <button
                class="btn-secondary"
                @click="cancelStatusChange"
              >
                取消
              </button>
              <button
                class="btn-primary"
                :class="hasCriticalBlockers ? 'bg-danger hover:bg-danger/90' : ''"
                @click="confirmStatusChange"
              >
                {{ hasCriticalBlockers ? '确认继续（有风险）' : '确认切换' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95) translateY(10px);
}
</style>
