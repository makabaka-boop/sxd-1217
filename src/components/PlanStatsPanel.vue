<script setup lang="ts">
import { computed } from 'vue';
import { Play, Layers, ArrowRight, Flag, Tag, AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-vue-next';
import type { ChapterStats, TopicDistribution, RiskDistribution, PlanWarning, QualitySnapshot, QualityProblem } from '@/types';
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

const SeverityBadgeColors = {
  error: 'bg-danger/15 border-danger/30 text-danger',
  warning: 'bg-warning/15 border-warning/30 text-warning',
  info: 'bg-info/15 border-info/30 text-info',
};

const props = defineProps<{
  chapterStats: ChapterStats[];
  topicDistribution: TopicDistribution[];
  riskDistribution: RiskDistribution[];
  warnings: PlanWarning[];
  qualitySnapshot: QualitySnapshot;
}>();

const emit = defineEmits<{
  'locate-problem': [problem: QualityProblem];
  'locate-clip': [clipId: string];
}>();

const worstSeverityLabel = computed(() => {
  if (props.qualitySnapshot.worstSeverity === 'error') return '高风险';
  if (props.qualitySnapshot.worstSeverity === 'warning') return '中风险';
  if (props.qualitySnapshot.worstSeverity === 'info') return '有提示';
  return '无风险';
});

const worstSeverityColor = computed(() => {
  if (props.qualitySnapshot.worstSeverity === 'error') return SeverityBadgeColors.error;
  if (props.qualitySnapshot.worstSeverity === 'warning') return SeverityBadgeColors.warning;
  if (props.qualitySnapshot.worstSeverity === 'info') return SeverityBadgeColors.info;
  return 'bg-success/15 border-success/30 text-success';
});

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
    <div
      class="card p-5 border"
      :class="qualitySnapshot.worstSeverity === 'error'
        ? 'border-danger/30 bg-danger/5'
        : qualitySnapshot.worstSeverity === 'warning'
          ? 'border-warning/30 bg-warning/5'
          : qualitySnapshot.worstSeverity === 'info'
            ? 'border-info/30 bg-info/5'
            : 'border-success/30 bg-success/5'"
    >
      <h3 class="font-display font-semibold text-graphite-50 mb-3 flex items-center gap-2">
        <component
          :is="qualitySnapshot.totalCount > 0 ? AlertCircle : CheckCircle2"
          class="w-4 h-4"
          :class="qualitySnapshot.worstSeverity === 'error'
            ? 'text-danger'
            : qualitySnapshot.worstSeverity === 'warning'
              ? 'text-warning'
              : qualitySnapshot.worstSeverity === 'info'
                ? 'text-info'
                : 'text-success'"
        />
        质检摘要
      </h3>

      <div class="flex items-center gap-3 mb-3">
        <span class="badge px-3 py-1 border" :class="worstSeverityColor">
          {{ worstSeverityLabel }}
        </span>
        <span class="text-xs text-graphite-400">
          共 {{ qualitySnapshot.totalCount }} 个问题
        </span>
      </div>

      <div class="grid grid-cols-3 gap-2 mb-3">
        <div
          class="p-2.5 rounded-lg text-center border"
          :class="qualitySnapshot.errorCount > 0
            ? 'border-danger/30 bg-danger/10'
            : 'border-graphite-700 bg-graphite-800/50'"
        >
          <div
            class="text-lg font-bold font-mono"
            :class="qualitySnapshot.errorCount > 0 ? 'text-danger' : 'text-graphite-500'"
          >
            {{ qualitySnapshot.errorCount }}
          </div>
          <div
            class="text-[11px]"
            :class="qualitySnapshot.errorCount > 0 ? 'text-danger/80' : 'text-graphite-500'"
          >
            错误
          </div>
        </div>
        <div
          class="p-2.5 rounded-lg text-center border"
          :class="qualitySnapshot.warningCount > 0
            ? 'border-warning/30 bg-warning/10'
            : 'border-graphite-700 bg-graphite-800/50'"
        >
          <div
            class="text-lg font-bold font-mono"
            :class="qualitySnapshot.warningCount > 0 ? 'text-warning' : 'text-graphite-500'"
          >
            {{ qualitySnapshot.warningCount }}
          </div>
          <div
            class="text-[11px]"
            :class="qualitySnapshot.warningCount > 0 ? 'text-warning/80' : 'text-graphite-500'"
          >
            警告
          </div>
        </div>
        <div
          class="p-2.5 rounded-lg text-center border"
          :class="qualitySnapshot.infoCount > 0
            ? 'border-info/30 bg-info/10'
            : 'border-graphite-700 bg-graphite-800/50'"
        >
          <div
            class="text-lg font-bold font-mono"
            :class="qualitySnapshot.infoCount > 0 ? 'text-info' : 'text-graphite-500'"
          >
            {{ qualitySnapshot.infoCount }}
          </div>
          <div
            class="text-[11px]"
            :class="qualitySnapshot.infoCount > 0 ? 'text-info/80' : 'text-graphite-500'"
          >
            提示
          </div>
        </div>
      </div>

      <div v-if="qualitySnapshot.totalCount > 0" class="space-y-1.5 max-h-[200px] overflow-y-auto scrollbar-thin">
        <div
          v-for="problem in qualitySnapshot.problems"
          :key="problem.id"
          class="flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all hover:scale-[1.01] border"
          :class="SeverityBadgeColors[problem.severity]"
          @click="emit('locate-problem', problem)"
        >
          <component
            :is="SeverityIcons[problem.severity]"
            class="w-3.5 h-3.5 mt-0.5 shrink-0"
          />
          <div class="flex-1 min-w-0">
            <div class="text-xs font-medium mb-0.5">{{ problem.type }}</div>
            <div class="text-[11px] opacity-90">{{ problem.message }}</div>
            <div class="text-[10px] opacity-70 mt-0.5">
              涉及 {{ problem.clipIds.length }} 个片段 · 点击定位
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-2 text-xs text-success">
        <CheckCircle2 class="w-4 h-4 inline mr-1" />
        所有片段质检通过，无任何问题
      </div>
    </div>

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
