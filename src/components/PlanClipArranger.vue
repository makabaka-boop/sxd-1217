<script setup lang="ts">
import { ref, watch, computed, nextTick, onMounted } from 'vue';
import draggable from 'vuedraggable';
import {
  GripVertical, X, Play, Layers, ArrowRight, Flag,
  AlertCircle, AlertTriangle, Info, Clock, Tag, Mic, Trash2,
} from 'lucide-vue-next';
import type { PlanClipWithDetail, ChapterType, QualityProblem, ProblemSeverity } from '@/types';
import {
  CHAPTER_TYPES,
  CHAPTER_CONFIG,
  RISK_LEVEL_CONFIG,
  STATUS_CONFIG,
  formatDuration,
  formatTimestamp,
} from '@/types';

const props = defineProps<{
  clips: PlanClipWithDetail[];
  highlightClipIds?: string[];
  clipProblems?: Record<string, QualityProblem[]>;
}>();

const emit = defineEmits<{
  'reorder': [clipIds: string[]];
  'remove': [clipId: string];
  'change-chapter': [clipId: string, chapterType: ChapterType];
}>();

const clipElements = ref<Record<string, HTMLElement | null>>({});

function setClipElement(clipId: string, el: any) {
  if (el && el.$el) {
    clipElements.value[clipId] = el.$el;
  } else if (el) {
    clipElements.value[clipId] = el;
  }
}

function getWorstSeverityForClip(clipId: string): ProblemSeverity | null {
  const problems = props.clipProblems?.[clipId];
  if (!problems || problems.length === 0) return null;
  if (problems.some(p => p.severity === 'error')) return 'error';
  if (problems.some(p => p.severity === 'warning')) return 'warning';
  if (problems.some(p => p.severity === 'info')) return 'info';
  return null;
}

function isHighlighted(clipId: string): boolean {
  return props.highlightClipIds?.includes(clipId) || false;
}

function getHighlightBorderClass(clipId: string): string {
  if (!isHighlighted(clipId)) return '';
  const worst = getWorstSeverityForClip(clipId);
  if (worst === 'error') return 'ring-2 ring-danger ring-offset-2 ring-offset-graphite-900';
  if (worst === 'warning') return 'ring-2 ring-warning ring-offset-2 ring-offset-graphite-900';
  if (worst === 'info') return 'ring-2 ring-info ring-offset-2 ring-offset-graphite-900';
  return 'ring-2 ring-brand-400 ring-offset-2 ring-offset-graphite-900';
}

function scrollToClip(clipId: string) {
  nextTick(() => {
    const el = clipElements.value[clipId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

watch(
  () => props.highlightClipIds,
  (newIds) => {
    if (newIds && newIds.length > 0) {
      scrollToClip(newIds[0]);
    }
  },
  { immediate: true },
);

const ChapterIcons = {
  '开场': Play,
  '主内容': Layers,
  '过渡': ArrowRight,
  '收尾': Flag,
};

const SeverityIcons = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const dragList = ref<PlanClipWithDetail[]>([]);
let isDragging = false;

function syncDragList() {
  if (isDragging) return;
  dragList.value = [...props.clips];
}

watch(
  () => props.clips,
  (newVal, oldVal) => {
    if (isDragging) return;
    const newIds = newVal.map(c => c.clipId).join(',');
    const oldIds = oldVal?.map(c => c.clipId).join(',');
    if (newIds !== oldIds) {
      dragList.value = [...newVal];
    }
  },
  { deep: true, immediate: true },
);

function onDragStart() {
  isDragging = true;
}

async function onDragEnd() {
  isDragging = false;
  const orderedIds = dragList.value.map(c => c.clipId);
  emit('reorder', orderedIds);
  await nextTick();
  syncDragList();
}

function handleChapterChange(clipId: string, event: Event) {
  const target = event.target as HTMLSelectElement;
  emit('change-chapter', clipId, target.value as ChapterType);
}

function clipDuration(clip: PlanClipWithDetail) {
  return Math.max(0, clip.clip.endTime - clip.clip.startTime);
}
</script>

<template>
  <div class="space-y-3">
    <div v-if="dragList.length === 0" class="card p-12 text-center">
      <div class="p-4 rounded-3xl bg-graphite-700/60 mb-4 mx-auto w-fit">
        <Layers class="w-12 h-12 text-graphite-400" />
      </div>
      <h3 class="font-display text-lg font-semibold text-graphite-100 mb-2">计划中还没有片段</h3>
      <p class="text-graphite-400 text-sm max-w-sm mx-auto">
        在片段管理页面，将片段加入到这个发布计划中开始编排。
      </p>
    </div>

    <draggable
      v-else
      v-model="dragList"
      item-key="clipId"
      animation="200"
      ghost-class="sortable-ghost"
      chosen-class="sortable-chosen"
      drag-class="sortable-drag"
      class="space-y-3 cursor-grab active:cursor-grabbing"
      filter="button, input, textarea, select, a, [contenteditable]"
      prevent-on-filter
      @start="onDragStart"
      @end="onDragEnd"
    >
      <template #item="{ element, index }">
        <div
          :ref="(el) => setClipElement(element.clipId, el)"
          class="card p-4 transition-all duration-300 group animate-fade-in"
          :class="[
            getHighlightBorderClass(element.clipId),
            isHighlighted(element.clipId) ? 'animate-pulse' : '',
          ]"
        >
          <div class="flex gap-3">
            <div class="flex flex-col items-center gap-1 text-graphite-500 hover:text-brand-400 cursor-grab active:cursor-grabbing select-none opacity-30 group-hover:opacity-100 transition-all">
              <GripVertical class="w-5 h-5" />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-3 mb-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-xs font-mono text-graphite-500 bg-graphite-700/60 px-2 py-0.5 rounded-md shrink-0">
                    #{{ String(index + 1).padStart(2, '0') }}
                  </span>
                  <h4 class="font-display font-semibold text-graphite-50 truncate">{{ element.clip.title }}</h4>
                  <span
                    v-if="clipProblems?.[element.clipId]?.length > 0"
                    class="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
                    :class="getWorstSeverityForClip(element.clipId) === 'error'
                      ? 'bg-danger/15 text-danger'
                      : getWorstSeverityForClip(element.clipId) === 'warning'
                        ? 'bg-warning/15 text-warning'
                        : 'bg-info/15 text-info'"
                  >
                    <component
                      :is="getWorstSeverityForClip(element.clipId) === 'error'
                        ? AlertCircle
                        : getWorstSeverityForClip(element.clipId) === 'warning'
                          ? AlertTriangle
                          : Info"
                      class="w-3 h-3"
                    />
                    {{ clipProblems[element.clipId].length }}
                  </span>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <select
                    class="select-field text-xs py-1 px-2 w-auto min-w-[100px]"
                    :value="element.chapterType"
                    @change="handleChapterChange(element.clipId, $event)"
                  >
                    <option v-for="ct in CHAPTER_TYPES" :key="ct" :value="ct">
                      {{ ct }}
                    </option>
                  </select>
                  <button
                    class="p-1.5 rounded-lg hover:bg-graphite-700 text-graphite-400 hover:text-danger transition-colors"
                    title="从计划中移除"
                    @click.stop="emit('remove', element.clipId)"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-12 gap-3">
                <div class="col-span-4 space-y-1">
                  <div class="flex items-baseline gap-2">
                    <span class="font-mono text-sm text-graphite-100">
                      {{ formatTimestamp(element.clip.startTime) }}
                    </span>
                    <span class="text-graphite-500">→</span>
                    <span class="font-mono text-sm text-graphite-100">
                      {{ formatTimestamp(element.clip.endTime) }}
                    </span>
                  </div>
                  <div class="text-xs text-graphite-400 flex items-center gap-1">
                    <Clock class="w-3 h-3" />
                    时长 <span class="font-semibold text-graphite-200">{{ formatDuration(clipDuration(element)) }}</span>
                  </div>
                </div>

                <div class="col-span-3 space-y-1">
                  <div v-if="element.clip.topic" class="inline-flex items-center px-2 py-0.5 rounded-md bg-graphite-700/60 text-xs text-graphite-200">
                    <Tag class="w-3 h-3 mr-1 text-brand-400" />
                    {{ element.clip.topic }}
                  </div>
                  <div v-if="element.clip.speaker" class="text-xs text-graphite-400 truncate flex items-center gap-1">
                    <Mic class="w-3 h-3" />
                    {{ element.clip.speaker }}
                  </div>
                </div>

                <div class="col-span-5 flex items-center gap-2 justify-end">
                  <span
                    class="badge"
                    :class="[CHAPTER_CONFIG[element.chapterType].bg, CHAPTER_CONFIG[element.chapterType].text]"
                  >
                    <component
                      :is="ChapterIcons[element.chapterType]"
                      class="w-3 h-3 mr-1"
                    />
                    {{ element.chapterType }}
                  </span>
                  <span
                    class="badge"
                    :class="[RISK_LEVEL_CONFIG[element.clip.riskLevel].bg, RISK_LEVEL_CONFIG[element.clip.riskLevel].text]"
                  >
                    <span class="w-1.5 h-1.5 rounded-full mr-1" :class="RISK_LEVEL_CONFIG[element.clip.riskLevel].dot"></span>
                    {{ element.clip.riskLevel }}
                  </span>
                  <span
                    class="badge"
                    :class="[STATUS_CONFIG[element.clip.publishStatus].bg, STATUS_CONFIG[element.clip.publishStatus].text]"
                  >
                    {{ element.clip.publishStatus }}
                  </span>
                </div>
              </div>

              <div
                v-if="clipProblems?.[element.clipId]?.length > 0"
                class="mt-2 space-y-1"
              >
                <div
                  v-for="problem in clipProblems[element.clipId]"
                  :key="problem.id"
                  class="flex items-start gap-1.5 text-[11px] p-2 rounded-lg border"
                  :class="problem.severity === 'error'
                    ? 'bg-danger/10 border-danger/30 text-danger'
                    : problem.severity === 'warning'
                      ? 'bg-warning/10 border-warning/30 text-warning'
                      : 'bg-info/10 border-info/30 text-info'"
                >
                  <component
                    :is="problem.severity === 'error' ? AlertCircle : problem.severity === 'warning' ? AlertTriangle : Info"
                    class="w-3 h-3 mt-0.5 shrink-0"
                  />
                  <div class="flex-1 min-w-0">
                    <span class="font-medium">{{ problem.type }}：</span>
                    <span class="opacity-90">{{ problem.message }}</span>
                  </div>
                </div>
              </div>

              <div
                v-if="element.clip.remark"
                class="mt-2 text-xs text-graphite-300 bg-graphite-900/40 rounded-lg px-3 py-2 border border-graphite-700/50 whitespace-pre-wrap"
              >
                {{ element.clip.remark }}
              </div>
            </div>
          </div>
        </div>
      </template>
    </draggable>
  </div>
</template>
