<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import draggable from 'vuedraggable';
import { Plus, Waves } from 'lucide-vue-next';
import { useClips } from '@/composables/useClips';
import { useQualityCheck } from '@/composables/useQualityCheck';
import { usePublishPlans } from '@/composables/usePublishPlans';
import FilterBar from '@/components/FilterBar.vue';
import ClipCard from '@/components/ClipCard.vue';
import ClipEditor from '@/components/ClipEditor.vue';
import QualityPanel from '@/components/QualityPanel.vue';
import BatchActionBar from '@/components/BatchActionBar.vue';
import AddToPlanDialog from '@/components/AddToPlanDialog.vue';
import PlanEditor from '@/components/PlanEditor.vue';
import type { Clip, ClipFormData, FilterOptions, PublishStatus, QualityProblem, ChapterType } from '@/types';
import { formatDuration } from '@/types';

const {
  clips,
  filteredClips,
  isLoading,
  filters,
  selectedIds,
  selectedClips,
  allTopics,
  allSpeakers,
  totalDuration,
  loadClips,
  createClip,
  saveClip,
  removeClip,
  removeSelectedClips,
  duplicateClipAsAlternate,
  reorderClips,
  toggleSelect,
  selectAll,
  clearSelection,
  setPublishStatusBulk,
  resetFilters,
  getClipById,
  insertSampleDataIfEmpty,
} = useClips();

const {
  plans,
  loadPlans,
  createPlan,
  calcPlanDuration,
  addClipToPlan,
  addClipsToPlan,
} = usePublishPlans();

const {
  problems,
  problemCounts,
  getProblemsForClip,
  getWorstSeverity,
} = useQualityCheck(() => clips.value);

const showEditor = ref(false);
const editingClip = ref<Clip | null>(null);
const qualityExpanded = ref(true);
const showEmpty = computed(() => clips.value.length === 0 && !isLoading.value);

const showAddToPlanDialog = ref(false);
const showPlanEditor = ref(false);
const addToPlanClipId = ref<string | null>(null);
const addToPlanIsBatch = ref(false);

const planDurations = computed(() => {
  const map: Record<string, number> = {};
  for (const p of plans.value) {
    map[p.id] = calcPlanDuration(p, clips.value);
  }
  return map;
});

const dragList = ref<Clip[]>([]);
let isDragging = false;

function syncDragList() {
  if (isDragging) return;
  dragList.value = [...filteredClips.value];
}

watch(filteredClips, (newVal, oldVal) => {
  if (isDragging) return;
  const newIds = newVal.map(c => c.id).join(',');
  const oldIds = oldVal?.map(c => c.id).join(',');
  if (newIds !== oldIds) {
    dragList.value = [...newVal];
  }
}, { deep: true });

function openCreate() {
  editingClip.value = null;
  showEditor.value = true;
}

function openEdit(clip: Clip) {
  editingClip.value = clip;
  showEditor.value = true;
}

async function handleEditorSubmit(data: ClipFormData) {
  if (editingClip.value) {
    await saveClip(editingClip.value.id, data);
  } else {
    await createClip(data);
  }
  await nextTick();
  syncDragList();
}

function handleDelete(id: string) {
  const clip = getClipById(id);
  if (!clip) return;
  if (confirm(`确定删除片段「${clip.title}？`)) {
    removeClip(id);
    nextTick(() => syncDragList());
  }
}

function handleDuplicate(id: string) {
  duplicateClipAsAlternate(id).then(() => {
    nextTick(() => syncDragList());
  });
}

function onDragStart() {
  isDragging = true;
}

async function onDragEnd() {
  isDragging = false;
  const orderedIds = dragList.value.map(c => c.id);
  const fullList = [...clips.value];
  
  const orderedClips = orderedIds.map(id => fullList.find(c => c.id === id)!).filter(Boolean);
  const remaining = fullList.filter(c => !orderedIds.includes(c.id));
  
  const finalList = [...orderedClips, ...remaining];
  await reorderClips(finalList);
  
  await nextTick();
  syncDragList();
}

function handleFilterUpdate<K extends keyof FilterOptions>(key: K, value: FilterOptions[K]) {
  (filters as Record<string, unknown>)[key] = value;
}

function handleBatchStatus(status: PublishStatus) {
  const ids = Array.from(selectedIds.value);
  setPublishStatusBulk(ids, status);
}

function handleBatchDelete() {
  if (confirm(`确定删除选中的 ${selectedIds.value.size} 个片段？`)) {
    removeSelectedClips();
  }
}

function handleLocateProblem(p: QualityProblem) {
  if (p.clipIds.length > 0) {
    const firstId = p.clipIds[0];
    const el = document.querySelector(`[data-clip-id="${firstId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-brand-400', 'ring-2');
      setTimeout(() => el.classList.remove('ring-brand-400', 'ring-2'), 2000);
    }
  }
}

function handleAddToPlan(clipId: string) {
  addToPlanClipId.value = clipId;
  addToPlanIsBatch.value = false;
  showAddToPlanDialog.value = true;
}

function handleBatchAddToPlan() {
  addToPlanIsBatch.value = true;
  addToPlanClipId.value = null;
  showAddToPlanDialog.value = true;
}

function handleConfirmAddToPlan(planId: string, chapterType: ChapterType) {
  if (addToPlanIsBatch.value) {
    const ids = Array.from(selectedIds.value);
    addClipsToPlan(planId, ids, chapterType);
    clearSelection();
  } else if (addToPlanClipId.value) {
    addClipToPlan(planId, addToPlanClipId.value, chapterType);
  }
}

function handlePlanEditorSubmit(data: { title: string; publishTitle: string; remark: string }) {
  createPlan(data).then(() => {
    showPlanEditor.value = false;
  });
}

onMounted(async () => {
  await loadClips();
  await loadPlans();
  await insertSampleDataIfEmpty();
  await loadClips();
  await nextTick();
  syncDragList();
});
</script>

<template>
  <div class="h-full flex flex-col gap-4">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div class="flex items-center gap-3">
        <div class="p-2.5 rounded-2xl bg-brand-400/15">
          <Waves class="w-6 h-6 text-brand-400" />
        </div>
        <div>
          <h1 class="font-display text-2xl font-bold text-graphite-50">片段管理</h1>
          <div class="text-sm text-graphite-400 flex items-center gap-3 mt-0.5">
            <span>共 <span class="text-graphite-200 font-semibold">{{ clips.length }}</span> 个片段</span>
            <span>·</span>
            <span>总时长 <span class="font-mono text-graphite-200 font-semibold">{{ formatDuration(totalDuration) }}</span></span>
          </div>
        </div>
      </div>
      <button class="btn-primary flex items-center gap-2 text-base" @click="openCreate">
        <Plus class="w-5 h-5" />
        新增片段
      </button>
    </div>

    <FilterBar
      :filters="filters"
      :topics="allTopics"
      :speakers="allSpeakers"
      :filtered-count="filteredClips.length"
      :total-count="clips.length"
      @update="handleFilterUpdate"
      @reset="resetFilters"
    />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 flex flex-col gap-3">
        <BatchActionBar
          :selected-count="selectedIds.size"
          :total-visible="filteredClips.length"
          @status="handleBatchStatus"
          @delete="handleBatchDelete"
          @clear="clearSelection"
          @select-all-visible="selectAll(true)"
          @add-to-plan="handleBatchAddToPlan"
        />

        <div v-if="showEmpty" class="card p-16 flex flex-col items-center justify-center text-center min-h-[320px]">
          <div class="p-4 rounded-3xl bg-graphite-700/60 mb-4">
            <Waves class="w-12 h-12 text-graphite-400" />
          </div>
          <h3 class="font-display text-xl font-semibold text-graphite-100 mb-2">还没有任何片段</h3>
          <p class="text-graphite-400 mb-6 max-w-sm">
            开始整理你的播客录音。点击「新增片段」开始，或者系统会自动帮你管理剪辑流程。
          </p>
          <button class="btn-primary" @click="openCreate">
            <Plus class="w-4 h-4 mr-2 inline" />
            添加第一个片段
          </button>
        </div>

        <div v-else class="space-y-3">
          <draggable
            v-model="dragList"
            item-key="id"
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
              <div :data-clip-id="element.id" class="transition-all">
                <ClipCard
                  :clip="element"
                  :index="index"
                  :is-selected="selectedIds.has(element.id)"
                  :problems="getProblemsForClip(element.id)"
                  :worst-severity="getWorstSeverity(element.id)"
                  @toggle-select="toggleSelect(element.id)"
                  @edit="openEdit(element)"
                  @duplicate="handleDuplicate(element.id)"
                  @delete="handleDelete(element.id)"
                  @locate-problem="handleLocateProblem"
                  @add-to-plan="handleAddToPlan(element.id)"
                />
              </div>
            </template>
          </draggable>
        </div>

        <div
          v-if="filteredClips.length === 0 && clips.length > 0"
          class="card p-10 text-center"
        >
          <div class="text-graphite-400 mb-2">没有符合筛选条件的片段</div>
          <button class="btn-ghost text-brand-400" @click="resetFilters">
            重置筛选条件</button>
        </div>
      </div>

      <div class="space-y-4 lg:sticky lg:top-4 self-start">
        <QualityPanel
          :problems="problems"
          :counts="problemCounts"
          :expanded="qualityExpanded"
          @toggle="qualityExpanded = !qualityExpanded"
          @locate="handleLocateProblem"
          @dismiss="qualityExpanded = false"
        />

        <div v-if="selectedClips.length > 0" class="card p-4">
          <div class="text-xs font-medium text-graphite-300 mb-3">选中摘要</div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between text-graphite-400">
              <span>片段数</span>
              <span class="text-graphite-100 font-semibold">{{ selectedClips.length }}</span>
            </div>
            <div class="flex justify-between text-graphite-400">
              <span>总时长</span>
              <span class="font-mono text-graphite-100 font-semibold">
                {{ formatDuration(selectedClips.reduce((s, c) => s + Math.max(0, c.endTime - c.startTime), 0)) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ClipEditor
      v-model="showEditor"
      :clip="editingClip"
      :existing-topics="allTopics"
      :existing-speakers="allSpeakers"
      @submit="handleEditorSubmit"
    />

    <AddToPlanDialog
      v-model="showAddToPlanDialog"
      :plans="plans"
      :plan-durations="planDurations"
      @confirm="handleConfirmAddToPlan"
      @create-new="showPlanEditor = true"
    />

    <PlanEditor
      v-model="showPlanEditor"
      @submit="handlePlanEditorSubmit"
    />
  </div>
</template>
