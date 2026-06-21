<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { X } from 'lucide-vue-next';
import type { Clip, ClipFormData } from '@/types';
import { EDIT_ACTIONS, RISK_LEVELS, PUBLISH_STATUSES, formatTimestamp, parseTimestamp } from '@/types';

const props = defineProps<{
  modelValue: boolean;
  clip?: Clip | null;
  existingTopics?: string[];
  existingSpeakers?: string[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'submit': [data: ClipFormData];
}>();

const form = ref<ClipFormData>({
  title: '',
  startTime: 0,
  endTime: 60,
  topic: '',
  speaker: '',
  editAction: '保留',
  riskLevel: '无风险',
  publishStatus: '待剪辑',
  remark: '',
});

const startTimeStr = ref('0:00.00');
const endTimeStr = ref('1:00.00');

const isEdit = computed(() => !!props.clip);
const title = computed(() => isEdit.value ? '编辑片段' : '新增片段');

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      if (props.clip) {
        form.value = {
          title: props.clip.title,
          startTime: props.clip.startTime,
          endTime: props.clip.endTime,
          topic: props.clip.topic,
          speaker: props.clip.speaker,
          editAction: props.clip.editAction,
          riskLevel: props.clip.riskLevel,
          publishStatus: props.clip.publishStatus,
          remark: props.clip.remark,
        };
      } else {
        form.value = {
          title: '',
          startTime: 0,
          endTime: 60,
          topic: '',
          speaker: '',
          editAction: '保留',
          riskLevel: '无风险',
          publishStatus: '待剪辑',
          remark: '',
        };
      }
      startTimeStr.value = formatTimestamp(form.value.startTime);
      endTimeStr.value = formatTimestamp(form.value.endTime);
    }
  },
  { immediate: true },
);

watch(startTimeStr, (v) => {
  form.value.startTime = parseTimestamp(v);
});
watch(endTimeStr, (v) => {
  form.value.endTime = parseTimestamp(v);
});

const duration = computed(() => Math.max(0, form.value.endTime - form.value.startTime));
const hasTimeError = computed(() => form.value.endTime < form.value.startTime);

function close() {
  emit('update:modelValue', false);
}

function handleSubmit() {
  if (!form.value.title.trim()) return;
  emit('submit', { ...form.value, title: form.value.title.trim() });
  close();
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="close"
      >
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div class="relative card w-full max-w-2xl max-h-[90vh] overflow-hidden animate-slide-up">
          <div class="flex items-center justify-between px-6 py-4 border-b border-graphite-700">
            <h3 class="font-display text-xl font-semibold text-graphite-50">{{ title }}</h3>
            <button
              class="p-2 rounded-lg hover:bg-graphite-700 text-graphite-300 transition-colors"
              @click="close"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="p-6 overflow-y-auto max-h-[calc(90vh-140px)] scrollbar-thin">
            <div class="space-y-5">
              <div>
                <label class="block text-sm font-medium text-graphite-200 mb-1.5">片段标题 *</label>
                <input
                  v-model="form.title"
                  type="text"
                  class="input-field"
                  placeholder="例如：开场介绍、嘉宾观点..."
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-graphite-200 mb-1.5">起始时间</label>
                  <input
                    v-model="startTimeStr"
                    type="text"
                    class="input-field font-mono"
                    placeholder="0:00.00 或 秒"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-graphite-200 mb-1.5">结束时间</label>
                  <input
                    v-model="endTimeStr"
                    type="text"
                    class="input-field font-mono"
                    :class="{ 'border-danger focus:ring-danger/50': hasTimeError }"
                    placeholder="1:00.00 或 秒"
                  />
                </div>
              </div>

              <div
                class="flex items-center gap-2 px-3 py-2 rounded-lg"
                :class="hasTimeError ? 'bg-danger/10 text-danger' : 'bg-graphite-700/50 text-graphite-300'"
              >
                <span class="text-sm">
                  时长: <span class="font-mono font-semibold">{{ Math.round(duration) }}秒</span>
                  <template v-if="hasTimeError">
                    <span class="ml-3 text-danger">⚠ 起止时间倒置</span>
                  </template>
                </span>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-graphite-200 mb-1.5">主题</label>
                  <input
                    v-model="form.topic"
                    type="text"
                    class="input-field"
                    placeholder="例如：行业分析、Q&A..."
                    list="topic-list"
                  />
                  <datalist id="topic-list">
                    <option v-for="t in existingTopics" :key="t" :value="t" />
                  </datalist>
                </div>
                <div>
                  <label class="block text-sm font-medium text-graphite-200 mb-1.5">说话人</label>
                  <input
                    v-model="form.speaker"
                    type="text"
                    class="input-field"
                    placeholder="例如：主持人A..."
                    list="speaker-list"
                  />
                  <datalist id="speaker-list">
                    <option v-for="s in existingSpeakers" :key="s" :value="s" />
                  </datalist>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium text-graphite-200 mb-1.5">剪辑动作</label>
                  <select v-model="form.editAction" class="select-field">
                    <option v-for="a in EDIT_ACTIONS" :key="a" :value="a">{{ a }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-graphite-200 mb-1.5">风险等级</label>
                  <select v-model="form.riskLevel" class="select-field">
                    <option v-for="r in RISK_LEVELS" :key="r" :value="r">{{ r }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-graphite-200 mb-1.5">发布状态</label>
                  <select v-model="form.publishStatus" class="select-field">
                    <option v-for="s in PUBLISH_STATUSES" :key="s" :value="s">{{ s }}</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-graphite-200 mb-1.5">备注</label>
                <textarea
                  v-model="form.remark"
                  rows="3"
                  class="input-field resize-none"
                  placeholder="记录剪辑要点、口误位置、需要确认的内容..."
                />
                <p
                  v-if="form.publishStatus === '需复听' && !form.remark.trim()"
                  class="mt-1.5 text-xs text-warning"
                >
                  ⚠ 标记为「需复听」时建议填写备注说明
                </p>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-graphite-700 bg-graphite-900/50">
            <button class="btn-secondary" @click="close">取消</button>
            <button
              class="btn-primary"
              :disabled="!form.title.trim()"
              @click="handleSubmit"
            >
              {{ isEdit ? '保存修改' : '创建片段' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
