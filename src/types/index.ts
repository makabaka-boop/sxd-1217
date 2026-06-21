export type EditAction = '保留' | '剪辑' | '删除' | '合并前' | '合并后' | '调整顺序';
export type RiskLevel = '无风险' | '低风险' | '中风险' | '高风险';
export type PublishStatus = '待剪辑' | '已剪辑' | '需复听' | '暂不发布';
export type ProblemSeverity = 'error' | 'warning' | 'info';
export type ChapterType = '开场' | '主内容' | '过渡' | '收尾';
export type PlanStatus = '草稿' | '编排中' | '待发布' | '已发布';

export interface Clip {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  topic: string;
  speaker: string;
  editAction: EditAction;
  riskLevel: RiskLevel;
  publishStatus: PublishStatus;
  remark: string;
  sortOrder: number;
  isAlternate: boolean;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClipFormData extends Omit<Clip, 'id' | 'sortOrder' | 'createdAt' | 'updatedAt' | 'isAlternate' | 'parentId'> {}

export interface QualityProblem {
  id: string;
  severity: ProblemSeverity;
  type: string;
  message: string;
  clipIds: string[];
}

export interface FilterOptions {
  topic: string;
  speaker: string;
  riskLevel: RiskLevel | '';
  publishStatus: PublishStatus | '';
  minDuration: number;
  maxDuration: number;
  keyword: string;
}

export interface PlanClipEntry {
  clipId: string;
  chapterType: ChapterType;
  sortOrder: number;
}

export interface PublishPlan {
  id: string;
  title: string;
  publishTitle: string;
  remark: string;
  status: PlanStatus;
  clips: PlanClipEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface PublishPlanFormData extends Omit<PublishPlan, 'id' | 'clips' | 'createdAt' | 'updatedAt' | 'status'> {}

export interface PlanClipWithDetail extends PlanClipEntry {
  clip: Clip;
}

export interface PlanWarning {
  id: string;
  severity: ProblemSeverity;
  type: string;
  message: string;
  clipIds?: string[];
}

export interface QualitySnapshot {
  errorCount: number;
  warningCount: number;
  infoCount: number;
  totalCount: number;
  worstSeverity: ProblemSeverity | null;
  problems: QualityProblem[];
}

export interface PublishBlocker {
  type: 'high_risk' | 'review_missing_remark' | 'time_abnormal' | 'not_ready';
  severity: ProblemSeverity;
  message: string;
  clipIds: string[];
}

export interface ClipProblemInfo {
  clipId: string;
  problems: {
    severity: ProblemSeverity;
    type: string;
    message: string;
  }[];
  worstSeverity: ProblemSeverity | null;
}

export interface ChapterStats {
  type: ChapterType;
  count: number;
  duration: number;
  clips: Clip[];
}

export interface TopicDistribution {
  topic: string;
  count: number;
  duration: number;
}

export interface RiskDistribution {
  level: RiskLevel;
  count: number;
  duration: number;
}

export const EDIT_ACTIONS: EditAction[] = ['保留', '剪辑', '删除', '合并前', '合并后', '调整顺序'];
export const RISK_LEVELS: RiskLevel[] = ['无风险', '低风险', '中风险', '高风险'];
export const PUBLISH_STATUSES: PublishStatus[] = ['待剪辑', '已剪辑', '需复听', '暂不发布'];
export const CHAPTER_TYPES: ChapterType[] = ['开场', '主内容', '过渡', '收尾'];
export const PLAN_STATUSES: PlanStatus[] = ['草稿', '编排中', '待发布', '已发布'];

export const CHAPTER_CONFIG: Record<ChapterType, { bg: string; text: string; dot: string; icon: string }> = {
  '开场': { bg: 'bg-info/15', text: 'text-info', dot: 'bg-info', icon: 'Play' },
  '主内容': { bg: 'bg-brand-400/15', text: 'text-brand-400', dot: 'bg-brand-400', icon: 'Layers' },
  '过渡': { bg: 'bg-warning/15', text: 'text-warning', dot: 'bg-warning', icon: 'ArrowRight' },
  '收尾': { bg: 'bg-success/15', text: 'text-success', dot: 'bg-success', icon: 'Flag' },
};

export const PLAN_STATUS_CONFIG: Record<PlanStatus, { bg: string; text: string }> = {
  '草稿': { bg: 'bg-graphite-600/60', text: 'text-graphite-200' },
  '编排中': { bg: 'bg-info/15', text: 'text-info' },
  '待发布': { bg: 'bg-warning/15', text: 'text-warning' },
  '已发布': { bg: 'bg-success/15', text: 'text-success' },
};

export const RISK_LEVEL_CONFIG: Record<RiskLevel, { bg: string; text: string; dot: string }> = {
  '无风险': { bg: 'bg-success/15', text: 'text-success', dot: 'bg-success' },
  '低风险': { bg: 'bg-info/15', text: 'text-info', dot: 'bg-info' },
  '中风险': { bg: 'bg-warning/15', text: 'text-warning', dot: 'bg-warning' },
  '高风险': { bg: 'bg-danger/15', text: 'text-danger', dot: 'bg-danger' },
};

export const STATUS_CONFIG: Record<PublishStatus, { bg: string; text: string }> = {
  '待剪辑': { bg: 'bg-graphite-600/60', text: 'text-graphite-200' },
  '已剪辑': { bg: 'bg-success/15', text: 'text-success' },
  '需复听': { bg: 'bg-warning/15', text: 'text-warning' },
  '暂不发布': { bg: 'bg-danger/15', text: 'text-danger' },
};

export function formatDuration(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatTimestamp(seconds: number): string {
  const sign = seconds < 0 ? '-' : '';
  seconds = Math.abs(seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds - Math.floor(seconds)) * 100);
  if (h > 0) {
    return `${sign}${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }
  return `${sign}${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export function parseTimestamp(str: string): number {
  str = str.trim();
  const negative = str.startsWith('-');
  if (negative) str = str.slice(1);
  const parts = str.split(':');
  let total = 0;
  if (parts.length === 3) {
    total = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    total = parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  } else {
    total = parseFloat(str) || 0;
  }
  return negative ? -total : total;
}

export function generateId(): string {
  return 'clip_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

export function generatePlanId(): string {
  return 'plan_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}
