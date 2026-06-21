<script setup lang="ts">
import { Scissors, CheckCircle, Volume2, Ban, Trash2, X, CheckSquare, Layers } from 'lucide-vue-next';
import type { PublishStatus } from '@/types';

defineProps<{
  selectedCount: number;
  totalVisible: number;
}>();

const emit = defineEmits<{
  'status': [status: PublishStatus];
  'delete': [];
  'clear': [];
  'select-all-visible': [];
  'add-to-plan': [];
}>();

const actions: { status: PublishStatus; icon: typeof Scissors; label: string; cls: string }[] = [
  { status: '待剪辑', icon: Scissors, label: '待剪辑', cls: 'bg-graphite-600 hover:bg-graphite-500 text-graphite-100' },
  { status: '已剪辑', icon: CheckCircle, label: '已剪辑', cls: 'bg-success/90 hover:bg-success text-white' },
  { status: '需复听', icon: Volume2, label: '需复听', cls: 'bg-warning/90 hover:bg-warning text-graphite-900' },
  { status: '暂不发布', icon: Ban, label: '暂不发布', cls: 'bg-danger/90 hover:bg-danger text-white' },
];
</script>

<template>
  <Transition name="slide-down">
    <div
      v-if="selectedCount > 0"
      class="sticky top-0 z-30 card px-4 py-3 flex items-center gap-4 animate-slide-up border-brand-400/40"
    >
      <div class="flex items-center gap-2">
        <div class="p-1.5 rounded-lg bg-brand-400/20">
          <CheckSquare class="w-4 h-4 text-brand-400" />
        </div>
        <span class="text-sm text-graphite-200">
          已选择 <span class="font-bold text-brand-400 text-base">{{ selectedCount }}</span> 个片段
        </span>
      </div>

      <div class="h-6 w-px bg-graphite-700" />

      <div class="flex items-center gap-2">
        <button
          v-for="a in actions"
          :key="a.status"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
          :class="a.cls"
          @click="emit('status', a.status)"
        >
          <component :is="a.icon" class="w-3.5 h-3.5" />
          {{ a.label }}
        </button>
      </div>

      <div class="h-6 w-px bg-graphite-700" />

      <div class="flex items-center gap-2">
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-400/90 hover:bg-brand-400 text-white transition-all"
          @click="emit('add-to-plan')"
        >
          <Layers class="w-3.5 h-3.5" />
          加入发布计划
        </button>
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-graphite-700 hover:bg-graphite-600 text-graphite-200 transition-all"
          @click="emit('select-all-visible')"
        >
          全选当前 ({{ totalVisible }})
        </button>
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium btn-danger transition-all"
          @click="emit('delete')"
        >
          <Trash2 class="w-3.5 h-3.5" />
          删除
        </button>
      </div>

      <div class="ml-auto">
        <button
          class="p-1.5 rounded-lg hover:bg-graphite-700 text-graphite-400 hover:text-graphite-200 transition-colors"
          title="取消选择"
          @click="emit('clear')"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.25s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}
</style>
