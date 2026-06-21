import { ref, computed, reactive, watch } from 'vue';
import type { Clip, ClipFormData, FilterOptions, PublishStatus } from '@/types';
import { generateId } from '@/types';
import {
  getAllClips,
  addClip,
  updateClip,
  updateClipsBulk,
  deleteClip,
  deleteClipsBulk,
} from './useDatabase';
import { usePublishPlans } from './usePublishPlans';

const clips = ref<Clip[]>([]);
const isLoading = ref(false);
const selectedIds = ref<Set<string>>(new Set());
const filters = reactive<FilterOptions>({
  topic: '',
  speaker: '',
  riskLevel: '',
  publishStatus: '',
  minDuration: 0,
  maxDuration: 99999,
  keyword: '',
});

let nextSortOrder = 0;

export function useClips() {
  const { removeClipFromAllPlans, removeClipsFromAllPlans } = usePublishPlans();

  const allTopics = computed(() => {
    const set = new Set<string>();
    clips.value.forEach(c => c.topic && set.add(c.topic));
    return Array.from(set).sort();
  });

  const allSpeakers = computed(() => {
    const set = new Set<string>();
    clips.value.forEach(c => c.speaker && set.add(c.speaker));
    return Array.from(set).sort();
  });

  const filteredClips = computed(() => {
    return clips.value.filter(clip => {
      if (filters.topic && clip.topic !== filters.topic) return false;
      if (filters.speaker && clip.speaker !== filters.speaker) return false;
      if (filters.riskLevel && clip.riskLevel !== filters.riskLevel) return false;
      if (filters.publishStatus && clip.publishStatus !== filters.publishStatus) return false;
      const duration = clip.endTime - clip.startTime;
      if (duration < filters.minDuration || duration > filters.maxDuration) return false;
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        const haystack = [clip.title, clip.topic, clip.speaker, clip.remark]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(kw)) return false;
      }
      return true;
    });
  });

  const totalDuration = computed(() => {
    return clips.value.reduce((sum, c) => sum + Math.max(0, c.endTime - c.startTime), 0);
  });

  const selectedClips = computed(() => {
    return clips.value.filter(c => selectedIds.value.has(c.id));
  });

  async function loadClips() {
    isLoading.value = true;
    try {
      const data = await getAllClips();
      clips.value = data.sort((a, b) => a.sortOrder - b.sortOrder);
      nextSortOrder = clips.value.length > 0
        ? Math.max(...clips.value.map(c => c.sortOrder)) + 1
        : 0;
    } finally {
      isLoading.value = false;
    }
  }

  function createClipData(data: ClipFormData, overrides: Partial<Clip> = {}): Clip {
    const now = new Date().toISOString();
    return {
      id: generateId(),
      title: data.title,
      startTime: data.startTime,
      endTime: data.endTime,
      topic: data.topic,
      speaker: data.speaker,
      editAction: data.editAction,
      riskLevel: data.riskLevel,
      publishStatus: data.publishStatus,
      remark: data.remark,
      sortOrder: nextSortOrder++,
      isAlternate: false,
      parentId: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }

  async function createClip(data: ClipFormData): Promise<Clip> {
    const clip = createClipData(data);
    await addClip(clip);
    clips.value.push(clip);
    sortClipsByOrder();
    return clip;
  }

  async function saveClip(id: string, data: Partial<ClipFormData>): Promise<void> {
    const idx = clips.value.findIndex(c => c.id === id);
    if (idx === -1) return;
    const updated: Clip = {
      ...clips.value[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await updateClip(updated);
    clips.value[idx] = updated;
  }

  async function removeClip(id: string): Promise<void> {
    await deleteClip(id);
    clips.value = clips.value.filter(c => c.id !== id);
    selectedIds.value.delete(id);
    await removeClipFromAllPlans(id);
  }

  async function removeSelectedClips(): Promise<void> {
    const ids = Array.from(selectedIds.value);
    if (ids.length === 0) return;
    await deleteClipsBulk(ids);
    clips.value = clips.value.filter(c => !selectedIds.value.has(c.id));
    selectedIds.value.clear();
    await removeClipsFromAllPlans(ids);
  }

  async function duplicateClipAsAlternate(id: string): Promise<Clip | null> {
    const original = clips.value.find(c => c.id === id);
    if (!original) return null;
    const newClip = createClipData(
      {
        title: original.title + ' (备选)',
        startTime: original.startTime,
        endTime: original.endTime,
        topic: original.topic,
        speaker: original.speaker,
        editAction: original.editAction,
        riskLevel: original.riskLevel,
        publishStatus: original.publishStatus,
        remark: original.remark + (original.remark ? '\n' : '') + '[备选版本]',
      },
      {
        sortOrder: original.sortOrder + 0.5,
        isAlternate: true,
        parentId: original.id,
      },
    );
    await addClip(newClip);
    clips.value.push(newClip);
    sortClipsByOrder();
    renormalizeSortOrder();
    return newClip;
  }

  function sortClipsByOrder() {
    clips.value.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async function renormalizeSortOrder(): Promise<void> {
    clips.value.forEach((c, i) => {
      c.sortOrder = i;
    });
    await updateClipsBulk(clips.value);
  }

  async function reorderClips(newList: Clip[]): Promise<void> {
    clips.value = newList.map((c, i) => ({ ...c, sortOrder: i }));
    await updateClipsBulk(clips.value);
  }

  function toggleSelect(id: string) {
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id);
    } else {
      selectedIds.value.add(id);
    }
    selectedIds.value = new Set(selectedIds.value);
  }

  function selectAll(filtered: boolean = true) {
    const target = filtered ? filteredClips.value : clips.value;
    target.forEach(c => selectedIds.value.add(c.id));
    selectedIds.value = new Set(selectedIds.value);
  }

  function clearSelection() {
    selectedIds.value.clear();
  }

  async function setPublishStatusBulk(ids: string[], status: PublishStatus): Promise<void> {
    const now = new Date().toISOString();
    const updated = clips.value.map(c => {
      if (ids.includes(c.id)) {
        return { ...c, publishStatus: status, updatedAt: now };
      }
      return c;
    });
    clips.value = updated;
    await updateClipsBulk(updated.filter(c => ids.includes(c.id)));
  }

  function resetFilters() {
    filters.topic = '';
    filters.speaker = '';
    filters.riskLevel = '';
    filters.publishStatus = '';
    filters.minDuration = 0;
    filters.maxDuration = 99999;
    filters.keyword = '';
  }

  function getClipById(id: string): Clip | undefined {
    return clips.value.find(c => c.id === id);
  }

  async function insertSampleDataIfEmpty(): Promise<void> {
    if (clips.value.length > 0) return;
    const samples: ClipFormData[] = [
      { title: '开场介绍', startTime: 0, endTime: 45, topic: '开场白', speaker: '主持人A', editAction: '保留', riskLevel: '无风险', publishStatus: '已剪辑', remark: '注意开头音量' },
      { title: '话题引入 - 行业现状', startTime: 45, endTime: 210, topic: '行业分析', speaker: '主持人A', editAction: '保留', riskLevel: '无风险', publishStatus: '已剪辑', remark: '' },
      { title: '嘉宾观点 1', startTime: 210, endTime: 480, topic: '行业分析', speaker: '嘉宾B', editAction: '保留', riskLevel: '低风险', publishStatus: '已剪辑', remark: '有一处口误，注意2:30' },
      { title: '深入讨论 - 核心观点', startTime: 480, endTime: 720, topic: '核心观点', speaker: '主持人A & 嘉宾B', editAction: '保留', riskLevel: '中风险', publishStatus: '需复听', remark: '需要确认部分数据准确性' },
      { title: '案例讨论 (备选)', startTime: 720, endTime: 900, topic: '案例分析', speaker: '嘉宾B', editAction: '剪辑', riskLevel: '高风险', publishStatus: '暂不发布', remark: '涉及未公开信息' },
      { title: '互动问答环节', startTime: 900, endTime: 1050, topic: 'Q&A', speaker: '主持人A', editAction: '保留', riskLevel: '无风险', publishStatus: '待剪辑', remark: '' },
      { title: '总结与收尾', startTime: 1050, endTime: 1110, topic: '收尾', speaker: '主持人A', editAction: '保留', riskLevel: '无风险', publishStatus: '已剪辑', remark: '' },
    ];
    for (const sample of samples) {
      await createClip(sample);
    }
  }

  return {
    clips,
    filteredClips,
    isLoading,
    filters,
    selectedIds,
    selectedClips,
    allTopics,
    allSpeakers,
    totalDuration,
    loadClips,
    createClip,
    saveClip,
    removeClip,
    removeSelectedClips,
    duplicateClipAsAlternate,
    reorderClips,
    toggleSelect,
    selectAll,
    clearSelection,
    setPublishStatusBulk,
    resetFilters,
    getClipById,
    insertSampleDataIfEmpty,
  };
}
