<script setup lang="ts">
import { computed } from 'vue';
import { Play, Layers, ArrowRight, Flag, Tag, AlertCircle, AlertTriangle, Info } from 'lucide-vue-next';
import type { ChapterStats, TopicDistribution, RiskDistribution, PlanWarning } from '@/types';
import { CHAPTER_CONFIG, RISK_LEVEL_CONFIG, formatDuration } from '@/types';

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

const SeverityColors = {
  error: 'text-danger bg-danger/10',
  warning: 'text-warning bg-warning/10',
  info: 'text-info bg-info/10',
};

const props = defineProps<{
  chapterStats: ChapterStats[];
  topicDistribution: TopicDistribution[];
  riskDistribution: RiskDistribution[];
  warnings: PlanWarning[];
}>();

const totalChapterDuration = computed(() =>
  props.chapterStats.reduce((s, c) => s + c.duration, 0),
);

const totalRiskDuration = computed(() =>
  props.riskDistribution.reduce((s, r) => s + r.duration, 0),
);

const totalTopicDuration = computed(() =>
  props.topicDistribution.reduce((s, t) => s + t.duration, 0),
);

function percent(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}
</script>

<template>
  <div class="space-y-4">
    <div class="card p-5">
      <h3 class="font-display font-semibold text-graphite-50 mb-4 flex items-center gap-2">
        <Layers class="w-4 h-4 text-brand-400" />
        章节分布
      </h3>
      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="cs in chapterStats"
          :key="cs.type"
          class="p-3 rounded-xl border transition-all"
          :class="cs.count > 0 ? 'border-graphite-700 bg-graphite-900/30' : 'border-graphite-700/50 bg-graphite-900/10 opacity-60'"
        >
          <div class="flex items-center gap-2 mb-2">
            <div class="p-1.5 rounded-lg" :class="CHAPTER_CONFIG[cs.type].bg">
              <component :is="ChapterIcons[cs.type]" class="w-3.5 h-3.5" :class="CHAPTER_CONFIG[cs.type].text" />
            </div>
            <span class="text-sm font-medium text-graphite-200">{{ cs.type }}</span>
          </div>
          <div class="space-y-1">
            <div class="flex justify-between text-xs">
              <span class="text-graphite-400">片段数</span>
              <span class="text-graphite-100 font-semibold">{{ cs.count }}</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-graphite-400">时长</span>
              <span class="font-mono text-graphite-100 font-semibold">{{ formatDuration(cs.duration) }}</span>
            </div>
            <div class="h-1.5 bg-graphite-700 rounded-full overflow-hidden mt-2">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="CHAPTER_CONFIG[cs.type].dot"
                :style="{ width: `${percent(cs.duration, totalChapterDuration)}%` }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card p-5">
      <h3 class="font-display font-semibold text-graphite-50 mb-4 flex items-center gap-2">
        <AlertCircle class="w-4 h-4 text-danger" />
        风险分布
      </h3>
      <div class="space-y-3">
        <div v-for="rd in riskDistribution" :key="rd.level" class="space-y-1.5">
          <div class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full" :class="RISK_LEVEL_CONFIG[rd.level].dot"></span>
              <span class="text-graphite-200">{{ rd.level }}</span>
            </div>
            <div class="text-xs text-graphite-400">
              <span class="text-graphite-100 font-semibold">{{ rd.count }}</span> 片段 ·
              <span class="font-mono text-graphite-100 font-semibold">{{ formatDuration(rd.duration) }}</span>
            </div>
          </div>
          <div class="h-1.5 bg-graphite-700 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="RISK_LEVEL_CONFIG[rd.level].dot"
              :style="{ width: `${percent(rd.duration, totalRiskDuration)}%` }"
            />
          </div>
        </div>
      </div>
    </div>

    <div v-if="topicDistribution.length > 0" class="card p-5">
      <h3 class="font-display font-semibold text-graphite-50 mb-4 flex items-center gap-2">
        <Tag class="w-4 h-4 text-info" />
        主题分布
      </h3>
      <div class="space-y-3">
        <div v-for="td in topicDistribution" :key="td.topic" class="space-y-1.5">
          <div class="flex items-center justify-between text-sm">
            <span class="text-graphite-200 truncate">{{ td.topic }}</span>
            <div class="text-xs text-graphite-400 shrink-0 ml-2">
              <span class="text-graphite-100 font-semibold">{{ td.count }}</span> ·
              <span class="font-mono text-graphite-100 font-semibold">{{ formatDuration(td.duration) }}</span>
            </div>
          </div>
          <div class="h-1.5 bg-graphite-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-brand-400 rounded-full transition-all duration-500"
              :style="{ width: `${percent(td.duration, totalTopicDuration)}%` }"
            />
          </div>
        </div>
      </div>
    </div>

    <div v-if="warnings.length > 0" class="card p-5 border-warning/30 bg-warning/5">
      <h3 class="font-display font-semibold text-graphite-50 mb-3 flex items-center gap-2">
        <AlertTriangle class="w-4 h-4 text-warning" />
        发布前检查
      </h3>
      <div class="space-y-2">
        <div
          v-for="w in warnings"
          :key="w.id"
          class="flex items-start gap-2 p-2.5 rounded-lg"
          :class="SeverityColors[w.severity]"
        >
          <component :is="SeverityIcons[w.severity]" class="w-4 h-4 mt-0.5 shrink-0" />
          <div class="flex-1 min-w-0">
            <div class="text-xs font-medium mb-0.5">{{ w.type }}</div>
            <div class="text-xs opacity-90">{{ w.message }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
