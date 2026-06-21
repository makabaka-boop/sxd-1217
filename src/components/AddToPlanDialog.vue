<script setup lang="ts">
import { ref, watch } from 'vue';
import { X, Layers, Plus, Check } from 'lucide-vue-next';
import type { PublishPlan, ChapterType } from '@/types';
import { CHAPTER_TYPES, PLAN_STATUS_CONFIG, formatDuration } from '@/types';

const props = defineProps<{
  modelValue: boolean;
  plans: PublishPlan[];
  planDurations: Record<string, number>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'confirm': [planId: string, chapterType: ChapterType];
  'create-new': [];
}>();

const selectedPlanId = ref('');
const selectedChapter = ref<ChapterType>('主内容');

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      if (props.plans.length > 0 && !selectedPlanId.value) {
        selectedPlanId.value = props.plans[0].id;
      }
    }
  },
);

function close() {
  emit('update:modelValue', false);
}

function handleConfirm() {
  if (!selectedPlanId.value) return;
  emit('confirm', selectedPlanId.value, selectedChapter.value);
  close();
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-graphite-950/80 backdrop-blur-sm"
        @click.self="close"
      >
        <div class="card w-full max-w-md animate-slide-up">
          <div class="flex items-center justify-between p-5 border-b border-graphite-700">
            <h3 class="font-display text-lg font-semibold text-graphite-50 flex items-center gap-2">
              <Layers class="w-5 h-5 text-brand-400" />
              加入发布计划
            </h3>
            <button
              class="p-1.5 rounded-lg hover:bg-graphite-700 text-graphite-400 transition-colors"
              @click="close"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="p-5 space-y-4">
            <div>
              <label class="block text-sm font-medium text-graphite-200 mb-2">
                选择发布计划
              </label>
              <div class="space-y-2 max-h-60 overflow-y-auto scrollbar-thin pr-1">
                <div
                  v-if="plans.length === 0"
                  class="text-center py-6 text-graphite-400 text-sm"
                >
                  暂无发布计划
                </div>
                <label
                  v-for="plan in plans"
                  :key="plan.id"
                  class="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border"
                  :class="selectedPlanId === plan.id
                    ? 'border-brand-400/50 bg-brand-400/10'
                    : 'border-graphite-700 hover:border-graphite-600 bg-graphite-900/30 hover:bg-graphite-800'"
                  @click="selectedPlanId = plan.id"
                >
                  <div
                    class="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all"
                    :class="selectedPlanId === plan.id
                      ? 'bg-brand-400 border-brand-400'
                      : 'border-graphite-500'"
                  >
                    <Check v-if="selectedPlanId === plan.id" class="w-3 h-3 text-white" :stroke-width="3" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-graphite-100 truncate">{{ plan.title }}</span>
                      <span
                        class="badge text-[10px]"
                        :class="[PLAN_STATUS_CONFIG[plan.status].bg, PLAN_STATUS_CONFIG[plan.status].text]"
                      >
                        {{ plan.status }}
                      </span>
                    </div>
                    <div class="text-xs text-graphite-400 mt-0.5">
                      {{ plan.clips.length }} 片段 · {{ formatDuration(planDurations[plan.id] || 0) }}
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <button
              v-if="plans.length === 0"
              class="w-full btn-secondary flex items-center justify-center gap-2 text-sm"
              @click="emit('create-new')"
            >
              <Plus class="w-4 h-4" />
              创建新计划
            </button>

            <div>
              <label class="block text-sm font-medium text-graphite-200 mb-2">
                章节类型
              </label>
              <div class="grid grid-cols-4 gap-2">
                <button
                  v-for="ct in CHAPTER_TYPES"
                  :key="ct"
                  class="py-2 px-3 rounded-lg text-sm font-medium transition-all border"
                  :class="selectedChapter === ct
                    ? 'bg-brand-400 text-white border-brand-400'
                    : 'bg-graphite-700 text-graphite-200 border-graphite-600 hover:bg-graphite-600'"
                  @click="selectedChapter = ct"
                >
                  {{ ct }}
                </button>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 p-5 border-t border-graphite-700">
            <button class="btn-secondary" @click="close">
              取消
            </button>
            <button
              class="btn-primary"
              :disabled="!selectedPlanId"
              @click="handleConfirm"
            >
              确认加入
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
