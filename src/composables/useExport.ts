import type {
  Clip,
  PublishPlan,
  PlanClipWithDetail,
  QualityProblem,
  QualitySnapshot,
  ClipProblemInfo,
  ProblemSeverity,
} from '@/types';
import { formatDuration } from '@/types';
import { useQualityCheck } from './useQualityCheck';

function escapeCsvValue(val: unknown): string {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function useExport() {
  function toClipExportData(clip: Clip, index: number) {
    const duration = Math.max(0, clip.endTime - clip.startTime);
    return {
      序号: index + 1,
      标题: clip.title,
      起始时间: clip.startTime,
      结束时间: clip.endTime,
      时长秒: Math.round(duration * 100) / 100,
      时长: formatDuration(duration),
      主题: clip.topic,
      说话人: clip.speaker,
      剪辑动作: clip.editAction,
      风险等级: clip.riskLevel,
      发布状态: clip.publishStatus,
      是否备选: clip.isAlternate ? '是' : '否',
      备注: clip.remark,
    };
  }

  function exportToJSON(clips: Clip[], filename = 'podcast-clips.json') {
    const data = clips.map((c, i) => toClipExportData(c, i));
    const full = {
      exportedAt: new Date().toISOString(),
      totalClips: clips.length,
      totalDuration: formatDuration(
        clips.reduce((sum, c) => sum + Math.max(0, c.endTime - c.startTime), 0),
      ),
      clips: data,
    };
    const blob = new Blob([JSON.stringify(full, null, 2)], { type: 'application/json' });
    triggerDownload(blob, filename);
  }

  function exportToCSV(clips: Clip[], filename = 'podcast-clips.csv') {
    if (clips.length === 0) {
      triggerDownload(new Blob([''], { type: 'text/csv;charset=utf-8;' }), filename);
      return;
    }
    const headerKeys = Object.keys(toClipExportData(clips[0], 0));
    const rows = [
      headerKeys.map(escapeCsvValue).join(','),
      ...clips.map((c, i) => {
        const row = toClipExportData(c, i);
        return headerKeys.map(k => escapeCsvValue(row[k as keyof typeof row])).join(',');
      }),
    ];
    const csvContent = '\uFEFF' + rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, filename);
  }

  function exportFullBackup(clips: Clip[], filename = 'podcast-clips-backup.json') {
    const full = {
      version: 1,
      exportedAt: new Date().toISOString(),
      clips: clips,
    };
    const blob = new Blob([JSON.stringify(full, null, 2)], { type: 'application/json' });
    triggerDownload(blob, filename);
  }

  function getPlanClipsWithDetail(plan: PublishPlan, allClips: Clip[]): PlanClipWithDetail[] {
    return plan.clips
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(entry => {
        const clip = allClips.find(c => c.id === entry.clipId);
        if (!clip) return null;
        return { ...entry, clip };
      })
      .filter((e): e is PlanClipWithDetail => e !== null);
  }

  function toPlanExportRow(
    entry: PlanClipWithDetail,
    index: number,
    cumulativeStart: number,
    clipProblems?: Record<string, QualityProblem[]>,
  ) {
    const duration = Math.max(0, entry.clip.endTime - entry.clip.startTime);
    const problems = clipProblems?.[entry.clipId] || [];
    const problemTypes = problems.map(p => p.type).join('；');
    const problemMessages = problems.map(p => `[${p.severity}] ${p.type}：${p.message}`).join('；');
    const worstSeverity = problems.length > 0
      ? (problems.some(p => p.severity === 'error')
          ? 'error'
          : problems.some(p => p.severity === 'warning')
            ? 'warning'
            : 'info')
      : null;

    const severityLabels: Record<ProblemSeverity, string> = {
      error: '错误',
      warning: '警告',
      info: '提示',
    };

    return {
      序号: index + 1,
      章节: entry.chapterType,
      标题: entry.clip.title,
      原始起始: entry.clip.startTime,
      原始结束: entry.clip.endTime,
      时长秒: Math.round(duration * 100) / 100,
      时长: formatDuration(duration),
      节目内起始: formatDuration(cumulativeStart),
      节目内结束: formatDuration(cumulativeStart + duration),
      主题: entry.clip.topic,
      说话人: entry.clip.speaker,
      剪辑动作: entry.clip.editAction,
      风险等级: entry.clip.riskLevel,
      发布状态: entry.clip.publishStatus,
      问题数量: problems.length,
      最高问题等级: worstSeverity ? severityLabels[worstSeverity] : '',
      问题类型: problemTypes,
      问题详情: problemMessages,
      备注: entry.clip.remark,
    };
  }

  function exportPlanToJSON(plan: PublishPlan, allClips: Clip[], filename?: string) {
    const entries = getPlanClipsWithDetail(plan, allClips);
    const planClips = entries.map(e => e.clip);
    const { problems, problemCounts, clipProblemMap, getWorstSeverity } = useQualityCheck(() => planClips);

    let worstSeverity: ProblemSeverity | null = null;
    for (const clip of planClips) {
      const clipWorst = getWorstSeverity(clip.id);
      if (clipWorst === 'error') {
        worstSeverity = 'error';
        break;
      }
      if (clipWorst === 'warning' && worstSeverity !== 'error') {
        worstSeverity = 'warning';
      }
      if (clipWorst === 'info' && worstSeverity === null) {
        worstSeverity = 'info';
      }
    }

    const severityLabels: Record<ProblemSeverity, string> = {
      error: '错误',
      warning: '警告',
      info: '提示',
    };

    let cumulative = 0;
    const rows = entries.map((e, i) => {
      const row = toPlanExportRow(e, i, cumulative, clipProblemMap.value);
      cumulative += Math.max(0, e.clip.endTime - e.clip.startTime);
      return row;
    });
    const totalDuration = entries.reduce((s, e) => s + Math.max(0, e.clip.endTime - e.clip.startTime), 0);

    const chapterStats: Record<string, { count: number; duration: number }> = {};
    for (const e of entries) {
      if (!chapterStats[e.chapterType]) {
        chapterStats[e.chapterType] = { count: 0, duration: 0 };
      }
      chapterStats[e.chapterType].count++;
      chapterStats[e.chapterType].duration += Math.max(0, e.clip.endTime - e.clip.startTime);
    }

    const qualitySummary = {
      错误数: problemCounts.value.error,
      警告数: problemCounts.value.warning,
      提示数: problemCounts.value.info,
      问题总数: problemCounts.value.total,
      最高风险等级: worstSeverity ? severityLabels[worstSeverity] : '无风险',
      问题列表: problems.value.map(p => ({
        严重程度: severityLabels[p.severity],
        问题类型: p.type,
        问题描述: p.message,
        涉及片段数: p.clipIds.length,
        涉及片段ID: p.clipIds,
      })),
    };

    const full = {
      exportedAt: new Date().toISOString(),
      plan: {
        id: plan.id,
        标题: plan.title,
        发布标题: plan.publishTitle,
        计划状态: plan.status,
        备注: plan.remark,
        创建时间: plan.createdAt,
        更新时间: plan.updatedAt,
      },
      summary: {
        总片段数: entries.length,
        总时长: formatDuration(totalDuration),
        总时长秒: Math.round(totalDuration * 100) / 100,
        章节统计: chapterStats,
        质检摘要: qualitySummary,
      },
      clips: rows,
    };
    const finalName = filename || `plan-${plan.title.replace(/[^\w\u4e00-\u9fa5]/g, '_')}.json`;
    const blob = new Blob([JSON.stringify(full, null, 2)], { type: 'application/json' });
    triggerDownload(blob, finalName);
  }

  function exportPlanToCSV(plan: PublishPlan, allClips: Clip[], filename?: string) {
    const entries = getPlanClipsWithDetail(plan, allClips);
    const planClips = entries.map(e => e.clip);
    const { problems, problemCounts, clipProblemMap, getWorstSeverity } = useQualityCheck(() => planClips);

    let worstSeverity: ProblemSeverity | null = null;
    for (const clip of planClips) {
      const clipWorst = getWorstSeverity(clip.id);
      if (clipWorst === 'error') {
        worstSeverity = 'error';
        break;
      }
      if (clipWorst === 'warning' && worstSeverity !== 'error') {
        worstSeverity = 'warning';
      }
      if (clipWorst === 'info' && worstSeverity === null) {
        worstSeverity = 'info';
      }
    }

    const severityLabels: Record<ProblemSeverity, string> = {
      error: '错误',
      warning: '警告',
      info: '提示',
    };

    let cumulative = 0;
    const rows = entries.map((e, i) => {
      const row = toPlanExportRow(e, i, cumulative, clipProblemMap.value);
      cumulative += Math.max(0, e.clip.endTime - e.clip.startTime);
      return row;
    });

    const totalDuration = entries.reduce((s, e) => s + Math.max(0, e.clip.endTime - e.clip.startTime), 0);
    const finalName = filename || `plan-${plan.title.replace(/[^\w\u4e00-\u9fa5]/g, '_')}.csv`;

    if (entries.length === 0) {
      triggerDownload(new Blob([''], { type: 'text/csv;charset=utf-8;' }), finalName);
      return;
    }

    const headerKeys = Object.keys(rows[0]);
    const metaRows = [
      ['节目编排清单'],
      ['计划标题', plan.title],
      ['发布标题', plan.publishTitle || ''],
      ['计划状态', plan.status],
      ['总片段数', String(entries.length)],
      ['总时长', formatDuration(totalDuration)],
      ['质检摘要'],
      ['  错误数', String(problemCounts.value.error)],
      ['  警告数', String(problemCounts.value.warning)],
      ['  提示数', String(problemCounts.value.info)],
      ['  问题总数', String(problemCounts.value.total)],
      ['  最高风险等级', worstSeverity ? severityLabels[worstSeverity] : '无风险'],
      ['问题列表'],
      ...problems.value.map(p => [
        `  [${severityLabels[p.severity]}] ${p.type}`,
        p.message,
        `涉及 ${p.clipIds.length} 个片段`,
      ]),
      ['备注', plan.remark || ''],
      ['导出时间', new Date().toLocaleString()],
      [''],
    ];
    const csvRows = [
      ...metaRows.map(r => r.map(escapeCsvValue).join(',')),
      headerKeys.map(escapeCsvValue).join(','),
      ...rows.map(row => headerKeys.map(k => escapeCsvValue(row[k as keyof typeof row])).join(',')),
    ];
    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, finalName);
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  return {
    exportToJSON,
    exportToCSV,
    exportFullBackup,
    exportPlanToJSON,
    exportPlanToCSV,
  };
}
