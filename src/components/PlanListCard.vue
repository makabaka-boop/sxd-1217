<script setup lang="ts">
import { computed } from 'vue';
import { Calendar, Clock, Layers, Edit3, Trash2, ChevronRight, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-vue-next';
import type { PublishPlan, Clip, QualitySnapshot } from '@/types';
import { PLAN_STATUS_CONFIG, formatDuration } from '@/types';

const props = defineProps<{
  plan: PublishPlan;
  allClips: Clip[];
  planDuration: number;
  progress: { ready: number; total: number; percent: number };
  qualitySnapshot: QualitySnapshot;
}>();

const worstSeverityConfig = computed(() => {
  if (props.qualitySnapshot.worstSeverity) {
    const configs: Record<string, { icon: typeof AlertCircle; color: string; label: string }> = {
      error: { icon: AlertCircle, color: 'text-danger', label: '高风险' },
      warning: { icon: AlertTriangle, color: 'text-warning', label: '中风险' },
      info: { icon: Info, color: 'text-info', label: '有提示' },
    };
    return configs[props.qualitySnapshot.worstSeverity];
  }
  return null;
});

const emit = defineEmits<{
  'edit': [];
  'delete': [];
  'open': [];
}>();

const statusConfig = computed(() => PLAN_STATUS_CONFIG[props.plan.status]);

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}
</script>

<template>
  <div
    class="card p-5 cursor-pointer transition-all duration-200 hover:border-brand-400/50 hover:shadow-lg group animate-fade-in"
    @click="emit('open')"
  >
    <div class="flex items-start justify-between gap-4 mb-3">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <h3 class="font-display font-semibold text-graphite-50 truncate">{{ plan.title }}</h3>
          <span class="badge shrink-0" :class="[statusConfig.bg, statusConfig.text]">
            {{ plan.status }}
          </span>
        </div>
        <div v-if="plan.publishTitle" class="text-sm text-graphite-400 truncate">
          {{ plan.publishTitle }}
        </div>
      </div>
      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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
        <ChevronRight class="w-5 h-5 text-graphite-500 ml-1" />
      </div>
    </div>

    <div class="grid grid-cols-3 gap-3 mb-3">
      <div class="flex items-center gap-2 text-xs text-graphite-400">
        <Layers class="w-3.5 h-3.5" />
        <span>{{ plan.clips.length }} 片段</span>
      </div>
      <div class="flex items-center gap-2 text-xs text-graphite-400">
        <Clock class="w-3.5 h-3.5" />
        <span class="font-mono">{{ formatDuration(planDuration) }}</span>
      </div>
      <div class="flex items-center gap-2 text-xs text-graphite-400">
        <Calendar class="w-3.5 h-3.5" />
        <span>{{ formatDate(plan.updatedAt) }}</span>
      </div>
    </div>

    <div class="mb-3">
      <div class="flex items-center justify-between text-xs mb-1.5">
        <span class="text-graphite-400 flex items-center gap-1.5">
          <CheckCircle2 class="w-3.5 h-3.5 text-success" />
          可发布进度
        </span>
        <span class="text-graphite-200 font-medium">
          {{ progress.ready }}/{{ progress.total }} · {{ progress.percent }}%
        </span>
      </div>
      <div class="h-2 bg-graphite-700 rounded-full overflow-hidden">
        <div
          class="h-full bg-gradient-to-r from-brand-400 to-success rounded-full transition-all duration-500"
          :style="{ width: `${progress.percent}%` }"
        />
      </div>
    </div>

    <div
      v-if="qualitySnapshot.totalCount > 0"
      class="mb-3 p-2.5 rounded-lg border"
      :class="qualitySnapshot.worstSeverity === 'error'
        ? 'border-danger/30 bg-danger/5'
        : qualitySnapshot.worstSeverity === 'warning'
          ? 'border-warning/30 bg-warning/5'
          : 'border-info/30 bg-info/5'"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <component
            v-if="worstSeverityConfig"
            :is="worstSeverityConfig.icon"
            class="w-3.5 h-3.5"
            :class="worstSeverityConfig.color"
          />
          <span class="text-xs font-medium" :class="worstSeverityConfig?.color || 'text-graphite-400'">
            质检快照
          </span>
        </div>
        <div class="flex items-center gap-2 text-xs">
          <span v-if="qualitySnapshot.errorCount > 0" class="text-danger font-semibold">
            {{ qualitySnapshot.errorCount }} 错误
          </span>
          <span v-if="qualitySnapshot.warningCount > 0" class="text-warning font-semibold">
            {{ qualitySnapshot.warningCount }} 警告
          </span>
          <span v-if="qualitySnapshot.infoCount > 0" class="text-info font-semibold">
            {{ qualitySnapshot.infoCount }} 提示
          </span>
        </div>
      </div>
    </div>

    <div
      v-else
      class="mb-3 p-2.5 rounded-lg border border-success/30 bg-success/5"
    >
      <div class="flex items-center gap-2">
        <CheckCircle2 class="w-3.5 h-3.5 text-success" />
        <span class="text-xs font-medium text-success">质检通过</span>
      </div>
    </div>

    <div
      v-if="plan.remark"
      class="text-xs text-graphite-400 bg-graphite-900/40 rounded-lg px-3 py-2 line-clamp-2"
    >
      {{ plan.remark }}
    </div>
  </div>
</template>
