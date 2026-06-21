<script setup lang="ts">
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp, X } from 'lucide-vue-next';
import type { QualityProblem, ProblemSeverity } from '@/types';

defineProps<{
  problems: QualityProblem[];
  counts: { error: number; warning: number; info: number; total: number };
  expanded: boolean;
}>();

const emit = defineEmits<{
  'toggle': [];
  'locate': [problem: QualityProblem];
  'dismiss': [];
}>();

const severityLabels: Record<ProblemSeverity, string> = {
  error: '错误',
  warning: '警告',
  info: '提示',
};

const SeverityIcon = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const severityColors: Record<ProblemSeverity, { text: string; bg: string; border: string }> = {
  error: { text: 'text-danger', bg: 'bg-danger/15', border: 'border-danger/30' },
  warning: { text: 'text-warning', bg: 'bg-warning/15', border: 'border-warning/30' },
  info: { text: 'text-info', bg: 'bg-info/15', border: 'border-info/30' },
};
</script>

<template>
  <div
    v-if="counts.total > 0"
    class="card overflow-hidden animate-slide-up"
  >
    <button
      class="w-full px-4 py-3 flex items-center justify-between hover:bg-graphite-700/30 transition-colors"
      @click="emit('toggle')"
    >
      <div class="flex items-center gap-3">
        <div
          class="relative p-2 rounded-xl"
          :class="counts.error > 0 ? 'bg-danger/15' : counts.warning > 0 ? 'bg-warning/15' : 'bg-info/15'"
        >
          <AlertCircle
            class="w-5 h-5"
            :class="counts.error > 0 ? 'text-danger' : counts.warning > 0 ? 'text-warning' : 'text-info'"
          />
          <span
            v-if="counts.total > 0"
            class="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1"
            :class="counts.error > 0 ? 'bg-danger text-white' : counts.warning > 0 ? 'bg-warning text-graphite-900' : 'bg-info text-white'"
          >
            {{ counts.total }}
          </span>
        </div>
        <div class="text-left">
          <div class="font-medium text-graphite-100">智能质检</div>
          <div class="flex items-center gap-2 text-xs mt-0.5">
            <span v-if="counts.error > 0" class="text-danger">{{ counts.error }} 错误</span>
            <span v-if="counts.warning > 0" class="text-warning">{{ counts.warning }} 警告</span>
            <span v-if="counts.info > 0" class="text-info">{{ counts.info }} 提示</span>
          </div>
        </div>
      </div>
      <component
        :is="expanded ? ChevronUp : ChevronDown"
        class="w-5 h-5 text-graphite-400"
      />
    </button>

    <Transition name="expand">
      <div v-if="expanded" class="border-t border-graphite-700 max-h-[360px] overflow-y-auto scrollbar-thin">
        <div class="p-3 space-y-2">
          <div
            v-for="p in problems"
            :key="p.id"
            class="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01] border"
            :class="[severityColors[p.severity].bg, severityColors[p.severity].border]"
            @click="emit('locate', p)"
          >
            <component
              :is="SeverityIcon[p.severity]"
              class="w-4 h-4 mt-0.5 shrink-0"
              :class="severityColors[p.severity].text"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-0.5">
                <span
                  class="text-[10px] font-medium px-1.5 py-0.5 rounded"
                  :class="[severityColors[p.severity].bg, severityColors[p.severity].text]"
                >
                  {{ severityLabels[p.severity] }}
                </span>
                <span class="text-xs text-graphite-400">{{ p.type }}</span>
              </div>
              <div class="text-sm" :class="severityColors[p.severity].text">{{ p.message }}</div>
              <div class="text-[11px] text-graphite-500 mt-1">
                涉及 {{ p.clipIds.length }} 个片段 · 点击定位
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
  <div
    v-else
    class="card p-4 flex items-center justify-center gap-3"
  >
    <div class="relative p-2 rounded-xl bg-success/15">
      <CheckIcon class="w-5 h-5 text-success" />
    </div>
    <div>
      <div class="font-medium text-success">质检通过</div>
      <div class="text-xs text-graphite-400">未发现任何问题</div>
    </div>
    <button
      class="ml-auto p-1.5 rounded-lg hover:bg-graphite-700 text-graphite-500"
      @click="emit('dismiss')"
    >
      <X class="w-4 h-4" />
    </button>
  </div>
</template>

<script lang="ts">
import { Check as CheckIcon } from 'lucide-vue-next';
export default { components: { CheckIcon } };
</script>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
