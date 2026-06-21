<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Waves, ClipboardCheck, Download, Github, FileJson, FileSpreadsheet, Database } from 'lucide-vue-next';
import { useClips } from '@/composables/useClips';
import { useQualityCheck } from '@/composables/useQualityCheck';
import { useExport } from '@/composables/useExport';
import { formatDuration } from '@/types';

const route = useRoute();
const router = useRouter();
const { clips, totalDuration, loadClips, insertSampleDataIfEmpty } = useClips();
const { problemCounts } = useQualityCheck(() => clips.value);
const { exportToJSON, exportToCSV, exportFullBackup } = useExport();

const showExportMenu = ref(false);
const isDataLoaded = ref(false);

onMounted(async () => {
  await loadClips();
  await insertSampleDataIfEmpty();
  await loadClips();
  isDataLoaded.value = true;
});

const currentTab = computed(() => {
  return route.name === 'review' ? 'review' : 'clips';
});

function switchTab(tab: 'clips' | 'review') {
  router.push(tab === 'clips' ? '/' : '/review');
  showExportMenu.value = false;
}

function closeMenu() {
  showExportMenu.value = false;
}

async function reloadData() {
  await loadClips();
}
</script>

<template>
  <div class="min-h-screen bg-graphite-950">
    <header class="sticky top-0 z-40 bg-graphite-900/90 backdrop-blur-md border-b border-graphite-800">
      <div class="max-w-[1600px] mx-auto px-6">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center gap-8">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-soft">
                <Waves class="w-5 h-5 text-white" />
              </div>
              <div>
                <div class="font-display font-bold text-graphite-50 text-lg leading-tight">播客剪辑工作台</div>
                <div class="text-[11px] text-graphite-500 leading-tight">Podcast Post-Production Suite</div>
              </div>
            </div>

            <nav class="flex items-center gap-1 p-1 rounded-xl bg-graphite-800/60 border border-graphite-700/50">
              <button
                class="nav-tab flex items-center gap-2"
                :class="currentTab === 'clips' ? 'nav-tab-active' : 'nav-tab-inactive'"
                @click="switchTab('clips')"
              >
                <Waves class="w-4 h-4" />
                片段管理
              </button>
              <button
                class="nav-tab flex items-center gap-2"
                :class="currentTab === 'review' ? 'nav-tab-active' : 'nav-tab-inactive'"
                @click="switchTab('review')"
              >
                <ClipboardCheck class="w-4 h-4" />
                发布前核对
                <span
                  v-if="problemCounts.total > 0"
                  class="ml-0.5 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1"
                  :class="problemCounts.error > 0 ? 'bg-danger text-white' : problemCounts.warning > 0 ? 'bg-warning text-graphite-900' : 'bg-info text-white'"
                >
                  {{ problemCounts.total }}
                </span>
              </button>
            </nav>
          </div>

          <div class="flex items-center gap-4">
            <div class="hidden md:flex items-center gap-4 pr-4 mr-2 border-r border-graphite-700/50 text-xs text-graphite-400">
              <span class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                IndexedDB
              </span>
              <span>{{ clips.length }} 片段</span>
              <span class="font-mono">{{ formatDuration(totalDuration) }}</span>
            </div>

            <button
              class="btn-ghost flex items-center gap-1.5 text-sm"
              title="重新加载数据"
              @click="reloadData"
            >
              <Database class="w-4 h-4" />
            </button>

            <div class="relative">
              <button
                class="btn-secondary flex items-center gap-2"
                @click="showExportMenu = !showExportMenu"
                @click.outside="closeMenu"
              >
                <Download class="w-4 h-4" />
                导出
              </button>
              <Transition name="dropdown">
                <div
                  v-if="showExportMenu"
                  class="absolute right-0 top-full mt-2 w-56 card p-1.5 z-50 animate-slide-up"
                >
                  <button
                    class="w-full text-left px-3 py-2 rounded-lg hover:bg-graphite-700 text-sm text-graphite-100 transition-colors flex items-center gap-2.5"
                    @click="exportToJSON([...clips].sort((a,b)=>a.sortOrder-b.sortOrder)); closeMenu()"
                  >
                    <FileJson class="w-4 h-4 text-info" />
                    <div>
                      <div>导出剪辑清单</div>
                      <div class="text-[11px] text-graphite-500">JSON 格式</div>
                    </div>
                  </button>
                  <button
                    class="w-full text-left px-3 py-2 rounded-lg hover:bg-graphite-700 text-sm text-graphite-100 transition-colors flex items-center gap-2.5"
                    @click="exportToCSV([...clips].sort((a,b)=>a.sortOrder-b.sortOrder)); closeMenu()"
                  >
                    <FileSpreadsheet class="w-4 h-4 text-success" />
                    <div>
                      <div>导出剪辑清单</div>
                      <div class="text-[11px] text-graphite-500">CSV 表格格式</div>
                    </div>
                  </button>
                  <div class="my-1 border-t border-graphite-700" />
                  <button
                    class="w-full text-left px-3 py-2 rounded-lg hover:bg-graphite-700 text-sm text-graphite-300 transition-colors flex items-center gap-2.5"
                    @click="exportFullBackup([...clips].sort((a,b)=>a.sortOrder-b.sortOrder)); closeMenu()"
                  >
                    <Database class="w-4 h-4 text-graphite-500" />
                    <div>
                      <div>完整备份</div>
                      <div class="text-[11px] text-graphite-500">含内部字段，可重新导入</div>
                    </div>
                  </button>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-[1600px] mx-auto px-6 py-6">
      <router-view />
    </main>

    <footer class="max-w-[1600px] mx-auto px-6 py-6 border-t border-graphite-800 mt-8">
      <div class="flex items-center justify-between text-xs text-graphite-500">
        <div>数据存储于浏览器 IndexedDB · 导出前请不要清理浏览器数据</div>
        <div class="flex items-center gap-2">
          <Github class="w-3.5 h-3.5" />
          纯前端实现 · 无后端服务
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
