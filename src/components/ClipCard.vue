<script setup lang="ts">
import { computed } from 'vue';
import {
  GripVertical, Copy, Edit3, Trash2, Check, AlertTriangle, AlertCircle, Info, CopyPlus,
} from 'lucide-vue-next';
import type { Clip, QualityProblem, ProblemSeverity } from '@/types';
import {
  RISK_LEVEL_CONFIG,
  STATUS_CONFIG,
  formatDuration,
  formatTimestamp,
} from '@/types';

const props = defineProps<{
  clip: Clip;
  index: number;
  isSelected: boolean;
  problems?: QualityProblem[];
  worstSeverity?: ProblemSeverity | null;
}>();

const emit = defineEmits<{
  'toggle-select': [];
  'edit': [];
  'duplicate': [];
  'delete': [];
  'locate-problem': [problem: QualityProblem];
}>();

const duration = computed(() => Math.max(0, props.clip.endTime - props.clip.startTime));
const riskConfig = computed(() => RISK_LEVEL_CONFIG[props.clip.riskLevel]);
const statusConfig = computed(() => STATUS_CONFIG[props.clip.publishStatus]);

const severityStyles: Record<ProblemSeverity, { border: string; bg: string }> = {
  error: { border: 'border-danger/60', bg: 'bg-danger/5' },
  warning: { border: 'border-warning/60', bg: 'bg-warning/5' },
  info: { border: 'border-info/60', bg: 'bg-info/5' },
};

const SeverityIcon = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const severityColors: Record<ProblemSeverity, string> = {
  error: 'text-danger',
  warning: 'text-warning',
  info: 'text-info',
};
</script>

<template>
  <div
    class="card p-4 transition-all duration-200 group relative animate-fade-in"
    :class="[
      isSelected ? 'ring-2 ring-brand-400 border-brand-400/50' : 'hover:border-graphite-600',
      worstSeverity ? severityStyles[worstSeverity].border : '',
      worstSeverity ? severityStyles[worstSeverity].bg : '',
    ]"
  >
    <div class="flex gap-3">
      <div
        class="flex flex-col items-center gap-1 text-graphite-500 hover:text-brand-400 cursor-grab active:cursor-grabbing select-none opacity-30 group-hover:opacity-100 transition-all"
        title="拖拽排序"
      >
        <GripVertical class="w-5 h-5" />
      </div>

      <div class="flex items-start pt-1">
        <label
          class="relative inline-flex items-center cursor-pointer"
          @click.stop
        >
          <input
            type="checkbox"
            class="sr-only peer"
            :checked="isSelected"
            @change="emit('toggle-select')"
          />
          <div class="w-5 h-5 rounded-md border-2 border-graphite-500 bg-graphite-700 peer-checked:bg-brand-400 peer-checked:border-brand-400 transition-all flex items-center justify-center">
            <Check v-if="isSelected" class="w-3.5 h-3.5 text-white" :stroke-width="3" />
          </div>
        </label>
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-3 mb-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-xs font-mono text-graphite-500 bg-graphite-700/60 px-2 py-0.5 rounded-md shrink-0">
              #{{ String(index + 1).padStart(2, '0') }}
            </span>
            <h4 class="font-display font-semibold text-graphite-50 truncate">{{ clip.title }}</h4>
            <span
              v-if="clip.isAlternate"
              class="badge bg-info/15 text-info text-[10px] shrink-0"
              title="备选版本"
            >
              <CopyPlus class="w-3 h-3 mr-1" />
              备选
            </span>
          </div>
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              class="p-1.5 rounded-lg hover:bg-graphite-700 text-graphite-400 hover:text-info transition-colors"
              title="复制为备选版本"
              @click.stop="emit('duplicate')"
            >
              <Copy class="w-4 h-4" />
            </button>
            <button
              class="p-1.5 rounded-lg hover:bg-graphite-700 text-graphite-400 hover:text-brand-300 transition-colors"
              title="编辑"
              @click.stop="emit('edit')"
            >
              <Edit3 class="w-4 h-4" />
            </button>
            <button
              class="p-1.5 rounded-lg hover:bg-graphite-700 text-graphite-400 hover:text-danger transition-colors"
              title="删除"
              @click.stop="emit('delete')"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-4 mb-3">
          <div class="space-y-1">
            <div class="flex items-baseline gap-2">
              <span class="font-mono text-sm text-graphite-100">
                {{ formatTimestamp(clip.startTime) }}
              </span>
              <span class="text-graphite-500">→</span>
              <span class="font-mono text-sm text-graphite-100">
                {{ formatTimestamp(clip.endTime) }}
              </span>
            </div>
            <div class="text-xs text-graphite-400">
              时长 <span class="font-semibold text-graphite-200">{{ formatDuration(duration) }}</span>
            </div>
          </div>
          <div class="space-y-1">
            <div
              v-if="clip.topic"
              class="inline-flex items-center px-2 py-0.5 rounded-md bg-graphite-700/60 text-xs text-graphite-200"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-brand-400 mr-1.5"></span>
              {{ clip.topic }}
            </div>
            <div
              v-if="clip.speaker"
              class="text-xs text-graphite-400 truncate"
            >
              🎙 {{ clip.speaker }}
            </div>
          </div>
          <div class="space-y-1">
            <div class="text-xs text-graphite-400">剪辑: <span class="text-graphite-200 font-medium">{{ clip.editAction }}</span></div>
            <div class="flex items-center gap-2">
              <span
                class="badge"
                :class="[riskConfig.bg, riskConfig.text]"
              >
                <span class="w-1.5 h-1.5 rounded-full mr-1" :class="riskConfig.dot"></span>
                {{ clip.riskLevel }}
              </span>
              <span
                class="badge"
                :class="[statusConfig.bg, statusConfig.text]"
              >
                {{ clip.publishStatus }}
              </span>
            </div>
          </div>
        </div>

        <div
          v-if="clip.remark"
          class="text-xs text-graphite-300 bg-graphite-900/40 rounded-lg px-3 py-2 border border-graphite-700/50 whitespace-pre-wrap"
        >
          {{ clip.remark }}
        </div>

        <div v-if="problems && problems.length" class="mt-3 space-y-1.5">
          <div
            v-for="p in problems"
            :key="p.id"
            class="flex items-start gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
            :class="[
              p.severity === 'error' ? 'bg-danger/10' : '',
              p.severity === 'warning' ? 'bg-warning/10' : '',
              p.severity === 'info' ? 'bg-info/10' : '',
            ]"
            @click.stop="emit('locate-problem', p)"
          >
            <component
              :is="SeverityIcon[p.severity]"
              class="w-3.5 h-3.5 mt-0.5 shrink-0"
              :class="severityColors[p.severity]"
            />
            <span class="text-xs" :class="severityColors[p.severity]">{{ p.message }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
