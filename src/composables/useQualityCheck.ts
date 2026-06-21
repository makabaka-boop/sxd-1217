import { computed } from 'vue';
import type { Clip, QualityProblem, ProblemSeverity } from '@/types';

const SAME_TOPIC_THRESHOLD = 5;

function pid(prefix: string, key: string): string {
  return `${prefix}_${key}`;
}

export function useQualityCheck(clipsGetter: () => Clip[]) {
  const problems = computed<QualityProblem[]>(() => {
    const clips = clipsGetter();
    const result: QualityProblem[] = [];
    const sortedByTime = [...clips].sort((a, b) => a.startTime - b.startTime);

    for (const clip of clips) {
      if (clip.endTime < clip.startTime) {
        result.push({
          id: pid('time_inv', clip.id),
          severity: 'error',
          type: '起止时间倒置',
          message: `片段「${clip.title}」结束时间早于起始时间`,
          clipIds: [clip.id],
        });
      }
    }

    for (let i = 0; i < sortedByTime.length - 1; i++) {
      const curr = sortedByTime[i];
      const next = sortedByTime[i + 1];
      if (curr.endTime > next.startTime) {
        result.push({
          id: pid('overlap', `${curr.id}_${next.id}`),
          severity: 'warning',
          type: '时间重叠',
          message: `片段「${curr.title}」与「${next.title}」时间重叠`,
          clipIds: [curr.id, next.id],
        });
      }
    }

    const topicGroups: Record<string, Clip[]> = {};
    for (const c of clips) {
      if (!c.topic) continue;
      if (!topicGroups[c.topic]) topicGroups[c.topic] = [];
      topicGroups[c.topic].push(c);
    }
    for (const [topic, group] of Object.entries(topicGroups)) {
      if (group.length >= SAME_TOPIC_THRESHOLD) {
        result.push({
          id: pid('topic_many', topic),
          severity: 'info',
          type: '同主题过多',
          message: `主题「${topic}」包含 ${group.length} 个片段，建议精简合并`,
          clipIds: group.map(c => c.id),
        });
      }
    }

    for (const clip of clips) {
      if (clip.publishStatus === '需复听' && (!clip.remark || clip.remark.trim().length === 0)) {
        result.push({
          id: pid('review_note', clip.id),
          severity: 'warning',
          type: '需复听缺备注',
          message: `片段「${clip.title}」标记为需复听但缺少备注说明`,
          clipIds: [clip.id],
        });
      }
    }

    for (const clip of clips) {
      if (clip.riskLevel === '高风险' && (clip.publishStatus === '已剪辑')) {
        result.push({
          id: pid('risk_publish', clip.id),
          severity: 'error',
          type: '高风险待发布',
          message: `片段「${clip.title}」为高风险但已处于「已剪辑」状态，发布前请确认`,
          clipIds: [clip.id],
        });
      }
    }

    result.sort((a, b) => {
      const sevOrder: Record<ProblemSeverity, number> = { error: 0, warning: 1, info: 2 };
      return sevOrder[a.severity] - sevOrder[b.severity];
    });

    return result;
  });

  const problemCounts = computed(() => ({
    error: problems.value.filter(p => p.severity === 'error').length,
    warning: problems.value.filter(p => p.severity === 'warning').length,
    info: problems.value.filter(p => p.severity === 'info').length,
    total: problems.value.length,
  }));

  const clipProblemMap = computed(() => {
    const map: Record<string, QualityProblem[]> = {};
    for (const p of problems.value) {
      for (const cid of p.clipIds) {
        if (!map[cid]) map[cid] = [];
        map[cid].push(p);
      }
    }
    return map;
  });

  function getProblemsForClip(clipId: string): QualityProblem[] {
    return clipProblemMap.value[clipId] || [];
  }

  function hasProblemOfSeverity(clipId: string, severity: ProblemSeverity): boolean {
    return (clipProblemMap.value[clipId] || []).some(p => p.severity === severity);
  }

  function getWorstSeverity(clipId: string): ProblemSeverity | null {
    const list = clipProblemMap.value[clipId] || [];
    if (list.some(p => p.severity === 'error')) return 'error';
    if (list.some(p => p.severity === 'warning')) return 'warning';
    if (list.some(p => p.severity === 'info')) return 'info';
    return null;
  }

  return {
    problems,
    problemCounts,
    clipProblemMap,
    getProblemsForClip,
    hasProblemOfSeverity,
    getWorstSeverity,
  };
}
