<script setup lang="ts">
import { Search, Filter, X } from 'lucide-vue-next';
import type { FilterOptions, RiskLevel, PublishStatus } from '@/types';
import { RISK_LEVELS, PUBLISH_STATUSES, formatDuration } from '@/types';

const props = defineProps<{
  filters: FilterOptions;
  topics: string[];
  speakers: string[];
  filteredCount: number;
  totalCount: number;
}>();

const emit = defineEmits<{
  'update': [key: keyof FilterOptions, value: unknown];
  'reset': [];
}>();

function update<K extends keyof FilterOptions>(key: K, value: FilterOptions[K]) {
  emit('update', key, value);
}

const hasAnyFilter = () => {
  return (
    props.filters.topic ||
    props.filters.speaker ||
    props.filters.riskLevel ||
    props.filters.publishStatus ||
    props.filters.minDuration > 0 ||
    props.filters.maxDuration < 99999 ||
    props.filters.keyword
  );
};
</script>

<template>
  <div class="card p-4">
    <div class="flex flex-wrap items-end gap-4">
      <div class="flex-1 min-w-[240px] relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite-400" />
        <input
          :value="filters.keyword"
          type="text"
          class="input-field pl-10"
          placeholder="搜索标题、主题、说话人、备注..."
          @input="update('keyword', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div class="min-w-[160px]">
        <label class="block text-xs font-medium text-graphite-400 mb-1">主题</label>
        <select
          :value="filters.topic"
          class="select-field"
          @change="update('topic', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">全部主题</option>
          <option v-for="t in topics" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>

      <div class="min-w-[160px]">
        <label class="block text-xs font-medium text-graphite-400 mb-1">说话人</label>
        <select
          :value="filters.speaker"
          class="select-field"
          @change="update('speaker', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">全部说话人</option>
          <option v-for="s in speakers" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>

      <div class="min-w-[140px]">
        <label class="block text-xs font-medium text-graphite-400 mb-1">风险等级</label>
        <select
          :value="filters.riskLevel"
          class="select-field"
          @change="update('riskLevel', ($event.target as HTMLSelectElement).value as RiskLevel | '')"
        >
          <option value="">全部</option>
          <option v-for="r in RISK_LEVELS" :key="r" :value="r">{{ r }}</option>
        </select>
      </div>

      <div class="min-w-[140px]">
        <label class="block text-xs font-medium text-graphite-400 mb-1">发布状态</label>
        <select
          :value="filters.publishStatus"
          class="select-field"
          @change="update('publishStatus', ($event.target as HTMLSelectElement).value as PublishStatus | '')"
        >
          <option value="">全部</option>
          <option v-for="s in PUBLISH_STATUSES" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>

      <div class="min-w-[200px]">
        <label class="block text-xs font-medium text-graphite-400 mb-1">
          时长范围 (秒)
        </label>
        <div class="flex items-center gap-2">
          <input
            type="number"
            min="0"
            :value="filters.minDuration"
            class="input-field !py-1.5 text-sm"
            placeholder="最小"
            @input="update('minDuration', Number(($event.target as HTMLInputElement).value) || 0)"
          />
          <span class="text-graphite-500">~</span>
          <input
            type="number"
            min="0"
            :value="filters.maxDuration === 99999 ? '' : filters.maxDuration"
            class="input-field !py-1.5 text-sm"
            placeholder="最大"
            @input="update('maxDuration', Number(($event.target as HTMLInputElement).value) || 99999)"
          />
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1.5 text-sm text-graphite-300">
          <Filter class="w-4 h-4" />
          <span>{{ filteredCount }}</span>
          <span class="text-graphite-500">/</span>
          <span>{{ totalCount }}</span>
        </div>
        <button
          v-if="hasAnyFilter()"
          class="btn-ghost flex items-center gap-1.5 text-sm"
          @click="emit('reset')"
        >
          <X class="w-3.5 h-3.5" />
          重置
        </button>
      </div>
    </div>
  </div>
</template>
