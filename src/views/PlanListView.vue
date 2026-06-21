<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, Layers, FileJson, FileSpreadsheet } from 'lucide-vue-next';
import { useClips } from '@/composables/useClips';
import { usePublishPlans } from '@/composables/usePublishPlans';
import { useExport } from '@/composables/useExport';
import PlanListCard from '@/components/PlanListCard.vue';
import PlanEditor from '@/components/PlanEditor.vue';
import type { PublishPlan, PublishPlanFormData } from '@/types';
import { formatDuration } from '@/types';

const router = useRouter();
const { clips, loadClips } = useClips();
const {
  plans,
  isLoadingPlans,
  loadPlans,
  createPlan,
  savePlan,
  removePlan,
  calcPlanDuration,
  getPublishProgress,
  getQualitySnapshot,
} = usePublishPlans();
const { exportPlanToJSON, exportPlanToCSV } = useExport();

const showPlanEditor = ref(false);
const editingPlan = ref<PublishPlan | null>(null);
const showExportMenu = ref<string | null>(null);

function planDurations(plan: PublishPlan): number {
  return calcPlanDuration(plan, clips.value);
}

function planProgress(plan: PublishPlan) {
  return getPublishProgress(plan, clips.value);
}

function planQualitySnapshot(plan: PublishPlan) {
  return getQualitySnapshot(plan, clips.value);
}

function openCreatePlan() {
  editingPlan.value = null;
  showPlanEditor.value = true;
}

function openEditPlan(plan: PublishPlan) {
  editingPlan.value = plan;
  showPlanEditor.value = true;
}

async function handlePlanEditorSubmit(data: PublishPlanFormData) {
  if (editingPlan.value) {
    await savePlan(editingPlan.value.id, data);
  } else {
    await createPlan(data);
  }
  showPlanEditor.value = false;
}

function handleDeletePlan(plan: PublishPlan) {
  if (confirm(`确定删除发布计划「${plan.title}」？片段不会被删除。`)) {
    removePlan(plan.id);
  }
}

function openPlanDetail(plan: PublishPlan) {
  router.push(`/plans/${plan.id}`);
}

function closeExportMenu() {
  showExportMenu.value = null;
}

function handleExportJSON(plan: PublishPlan) {
  exportPlanToJSON(plan, clips.value);
  closeExportMenu();
}

function handleExportCSV(plan: PublishPlan) {
  exportPlanToCSV(plan, clips.value);
  closeExportMenu();
}

onMounted(async () => {
  await loadClips();
  await loadPlans();
});
</script>

<template>
  <div class="h-full flex flex-col gap-4">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div class="flex items-center gap-3">
        <div class="p-2.5 rounded-2xl bg-brand-400/15">
          <Layers class="w-6 h-6 text-brand-400" />
        </div>
        <div>
          <h1 class="font-display text-2xl font-bold text-graphite-50">发布计划</h1>
          <div class="text-sm text-graphite-400 flex items-center gap-3 mt-0.5">
            <span>共 <span class="text-graphite-200 font-semibold">{{ plans.length }}</span> 个计划</span>
          </div>
        </div>
      </div>
      <button class="btn-primary flex items-center gap-2 text-base" @click="openCreatePlan">
        <Plus class="w-5 h-5" />
        新建计划
      </button>
    </div>

    <div v-if="plans.length === 0 && !isLoadingPlans" class="card p-16 flex flex-col items-center justify-center text-center min-h-[400px]">
      <div class="p-4 rounded-3xl bg-graphite-700/60 mb-4">
        <Layers class="w-12 h-12 text-graphite-400" />
      </div>
      <h3 class="font-display text-xl font-semibold text-graphite-100 mb-2">还没有任何发布计划</h3>
      <p class="text-graphite-400 mb-6 max-w-md">
        创建一期节目发布计划，将多个片段按「开场 / 主内容 / 过渡 / 收尾」进行编排，并自动汇总总时长、主题分布、风险分布与可发布进度。
      </p>
      <button class="btn-primary" @click="openCreatePlan">
        <Plus class="w-4 h-4 mr-2 inline" />
        创建第一个发布计划
      </button>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="relative"
      >
        <PlanListCard
          :plan="plan"
          :all-clips="clips"
          :plan-duration="planDurations(plan)"
          :progress="planProgress(plan)"
          :quality-snapshot="planQualitySnapshot(plan)"
          @edit="openEditPlan(plan)"
          @delete="handleDeletePlan(plan)"
          @open="openPlanDetail(plan)"
        />
        <div class="absolute top-5 right-5">
          <div class="relative">
            <button
              class="p-1.5 rounded-lg hover:bg-graphite-700 text-graphite-400 hover:text-graphite-200 transition-colors"
              @click.stop="showExportMenu = showExportMenu === plan.id ? null : plan.id"
              @click.outside="closeExportMenu"
            >
              <FileSpreadsheet class="w-4 h-4" />
            </button>
            <Transition name="dropdown">
              <div
                v-if="showExportMenu === plan.id"
                class="absolute right-0 top-full mt-1 w-48 card p-1.5 z-20 animate-slide-up"
              >
                <button
                  class="w-full text-left px-3 py-2 rounded-lg hover:bg-graphite-700 text-sm text-graphite-100 transition-colors flex items-center gap-2.5"
                  @click.stop="handleExportJSON(plan)"
                >
                  <FileJson class="w-4 h-4 text-info" />
                  <div>
                    <div>导出编排清单</div>
                    <div class="text-[11px] text-graphite-500">JSON 格式</div>
                  </div>
                </button>
                <button
                  class="w-full text-left px-3 py-2 rounded-lg hover:bg-graphite-700 text-sm text-graphite-100 transition-colors flex items-center gap-2.5"
                  @click.stop="handleExportCSV(plan)"
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
    </div>

    <PlanEditor
      v-model="showPlanEditor"
      :plan="editingPlan"
      @submit="handlePlanEditorSubmit"
    />
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
</style>
