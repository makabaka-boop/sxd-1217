import type { Clip } from '@/types';
import { formatDuration } from '@/types';

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
  };
}
