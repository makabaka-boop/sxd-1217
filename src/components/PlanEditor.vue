<script setup lang="ts">
import { ref, watch } from 'vue';
import { X } from 'lucide-vue-next';
import type { PublishPlan, PublishPlanFormData } from '@/types';
import { PLAN_STATUSES, PLAN_STATUS_CONFIG } from '@/types';

const props = defineProps<{
  modelValue: boolean;
  plan?: PublishPlan | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'submit': [data: PublishPlanFormData];
}>();

const title = ref('');
const publishTitle = ref('');
const remark = ref('');

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      if (props.plan) {
        title.value = props.plan.title;
        publishTitle.value = props.plan.publishTitle;
        remark.value = props.plan.remark;
      } else {
        title.value = '';
        publishTitle.value = '';
        remark.value = '';
      }
    }
  },
  { immediate: true },
);

function close() {
  emit('update:modelValue', false);
}

function handleSubmit() {
  if (!title.value.trim()) return;
  emit('submit', {
    title: title.value.trim(),
    publishTitle: publishTitle.value.trim(),
    remark: remark.value.trim(),
  });
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
        <div class="card w-full max-w-lg animate-slide-up">
          <div class="flex items-center justify-between p-5 border-b border-graphite-700">
            <h3 class="font-display text-lg font-semibold text-graphite-50">
              {{ plan ? '编辑发布计划' : '创建发布计划' }}
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
              <label class="block text-sm font-medium text-graphite-200 mb-1.5">
                计划标题 <span class="text-danger">*</span>
              </label>
              <input
                v-model="title"
                type="text"
                class="input-field"
                placeholder="例如：第12期 - AI行业深度对话"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-graphite-200 mb-1.5">
                发布标题
              </label>
              <input
                v-model="publishTitle"
                type="text"
                class="input-field"
                placeholder="对外发布时使用的标题，可留空"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-graphite-200 mb-1.5">
                计划备注
              </label>
              <textarea
                v-model="remark"
                rows="3"
                class="input-field resize-none"
                placeholder="本期节目的说明、注意事项等..."
              />
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 p-5 border-t border-graphite-700">
            <button class="btn-secondary" @click="close">
              取消
            </button>
            <button
              class="btn-primary"
              :disabled="!title.trim()"
              @click="handleSubmit"
            >
              {{ plan ? '保存修改' : '创建计划' }}
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
