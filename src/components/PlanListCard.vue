<script setup lang="ts">
import { computed } from 'vue';
import { Calendar, Clock, Layers, Edit3, Trash2, ChevronRight, CheckCircle2 } from 'lucide-vue-next';
import type { PublishPlan, Clip } from '@/types';
import { PLAN_STATUS_CONFIG, formatDuration } from '@/types';

const props = defineProps<{
  plan: PublishPlan;
  allClips: Clip[];
  planDuration: number;
  progress: { ready: number; total: number; percent: number };
}>();

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

    <div>
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
      v-if="plan.remark"
      class="mt-3 text-xs text-graphite-400 bg-graphite-900/40 rounded-lg px-3 py-2 line-clamp-2"
    >
      {{ plan.remark }}
    </div>
  </div>
</template>
