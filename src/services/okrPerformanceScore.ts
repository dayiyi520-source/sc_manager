import type { OkrKr, OkrPerson, OkrRecord } from './okrRepository';
import { personalGoalDisplayRecords } from './okrAssignments';
import { applyOkrWeightPlan } from './okrWeightPlans';

export type ScoreScope = 'personal' | 'department';
export type ScoreAdjustmentKind = 'early' | 'challenge-stage' | 'challenge-complete' | 'knowledge' | 'ai-rollout' | 'ai-training' | 'governance' | 'course' | 'quality' | 'fraud';
export interface ScoreAdjustment {
  id: string;
  month: string;
  scope: ScoreScope;
  ownerId: string;
  objectiveId?: string;
  krId?: string;
  kind: ScoreAdjustmentKind;
  points: number;
  evidence: string;
  actorId: string;
  status: 'submitted' | 'approved' | 'returned';
  createdAt: string;
  reviewerId?: string;
  reviewedAt?: string;
}
export interface ScoreKr { id: string; title: string; weight: number; progress: number }
export interface ScoreObjective { id: string; title: string; type: 'target' | 'challenge'; weight: number; progress: number; deadline?: string; actualCompletedAt?: string; krs: ScoreKr[] }

export const scoreAdjustmentLabels: Record<ScoreAdjustmentKind, string> = {
  early: '提前交付或品质超预期', 'challenge-stage': '挑战目标阶段成果', 'challenge-complete': '挑战目标如期落地',
  knowledge: '知识库超预期成果', 'ai-rollout': 'AI 工具落地', 'ai-training': 'AI 技能分享或培训',
  governance: '公司治理成果', course: '课程入库', quality: 'KR 质量问题', fraud: 'KR 成果造假',
};

const fixedPoints: Partial<Record<ScoreAdjustmentKind, number>> = { early: 1, knowledge: 0.5, 'ai-rollout': 1, 'ai-training': 2, governance: 2, course: 2 };
const round = (value: number) => Math.round(value * 100) / 100;
const percent = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

export function adjustmentError(entry: Pick<ScoreAdjustment, 'kind' | 'points' | 'objectiveId' | 'krId' | 'evidence'>, objectives: ScoreObjective[]): string | undefined {
  if (!entry.evidence.trim()) return '请填写事实依据或成果链接';
  const objective = objectives.find(item => item.id === entry.objectiveId);
  if (['early', 'challenge-stage', 'challenge-complete', 'quality', 'fraud'].includes(entry.kind) && !objective) return '请选择对应目标';
  if (['quality', 'fraud'].includes(entry.kind) && !objective?.krs.some(kr => kr.id === entry.krId)) return '请选择对应 KR';
  if (entry.kind === 'early' && objective?.type !== 'target') return '提前交付加分仅适用于承诺型目标';
  if (entry.kind.startsWith('challenge') && objective?.type !== 'challenge') return '挑战目标加分仅适用于挑战型目标';
  if (entry.kind === 'challenge-stage' && (objective?.progress ?? 0) < 60) return '挑战目标完成率未达到 60%';
  if (entry.kind === 'challenge-complete' && (objective?.progress ?? 0) < 100) return '挑战目标尚未完成 100%';
  if (entry.kind === 'challenge-complete' && (!objective?.actualCompletedAt || !objective.deadline || objective.actualCompletedAt.slice(0, 10) > objective.deadline.slice(0, 10))) return '挑战目标未在约定周期内完成';
  if (entry.kind === 'challenge-stage' && ![1, 2].includes(entry.points)) return '阶段成果加分应为 1 至 2 分';
  if (entry.kind === 'challenge-complete' && ![2, 3].includes(entry.points)) return '如期落地加分应为 2 至 3 分';
  if (entry.kind === 'quality' && (!Number.isInteger(entry.points) || entry.points < 1 || entry.points > 5)) return '质量扣分应为 1 至 5 分';
  if (entry.kind === 'fraud' && entry.points !== 0) return '成果造假按所属 O 计零分';
  if (fixedPoints[entry.kind] !== undefined && entry.points !== fixedPoints[entry.kind]) return '该加分项使用固定分值';
}

function toScoreKrs(record: OkrRecord, personal: boolean, ownerId: string): ScoreKr[] {
  return (record.payload.keyResults || []).flatMap((kr: OkrKr) => {
    if (personal && kr.details?.length) return kr.details.map(detail => ({
      id: detail.id, title: `${kr.title} · ${detail.name}`, weight: detail.weight ?? 0, progress: percent(detail.progress ?? 0),
    }));
    return [{ id: kr.id, title: kr.title, weight: kr.weight, progress: percent(personal && record.ownerId !== ownerId ? 0 : kr.progress) }];
  });
}

export function scoreObjectivesFor(records: OkrRecord[], people: OkrPerson[], ownerId: string, month: string, scope: ScoreScope): ScoreObjective[] {
  const person = people.find(item => item.id === ownerId);
  if (!person) return [];
  const source = scope === 'personal' ? applyOkrWeightPlan(personalGoalDisplayRecords(records, person, people), ownerId, month)
    : records.filter(record => record.ownerId === ownerId && record.payload.goalLevel === 'department');
  return source.filter(record => record.periodKey === month && record.kind === 'objective' && ['active', 'reviewed'].includes(record.status)
    && !(record.changeRequest?.purpose === 'initial' && record.changeRequest.status !== 'approved'))
    .map(record => {
      const krs = toScoreKrs(record, scope === 'personal', ownerId);
      const totalWeight = krs.reduce((sum, kr) => sum + kr.weight, 0);
      return { id: record.id, title: record.payload.title, type: record.payload.objectiveType === 'challenge' ? 'challenge' as const : 'target' as const,
        weight: record.payload.weight ?? 0, progress: totalWeight ? round(krs.reduce((sum, kr) => sum + kr.progress * kr.weight, 0) / totalWeight) : percent(record.payload.progress ?? 0),
        deadline: record.payload.deadline, actualCompletedAt: record.payload.actualCompletedAt, krs };
    });
}

export function calculateOkrScore(objectives: ScoreObjective[], adjustments: ScoreAdjustment[]) {
  const promised = objectives.filter(item => item.type === 'target');
  const weightTotal = promised.reduce((sum, item) => sum + item.weight, 0);
  const validWeights = promised.length > 0 && weightTotal === 100 && promised.every(item => item.weight > 0 && item.krs.length > 0 && item.krs.reduce((sum, kr) => sum + kr.weight, 0) === 100);
  const approved = adjustments.filter(entry => entry.status === 'approved' && !adjustmentError(entry, objectives));
  const objectiveRows = promised.map(objective => {
    const fraud = approved.some(entry => entry.kind === 'fraud' && entry.objectiveId === objective.id);
    const base = fraud ? 0 : 50 * objective.weight / 100 * percent(objective.progress) / 100;
    const krRows = objective.krs.map(kr => {
      const share = 50 * objective.weight / 100 * kr.weight / 100 * percent(kr.progress) / 100;
      const automatic = kr.progress < 50 ? 4 : kr.progress < 70 ? 2 : 0;
      const quality = approved.filter(entry => entry.kind === 'quality' && entry.objectiveId === objective.id && entry.krId === kr.id).reduce((sum, entry) => sum + entry.points, 0);
      return { ...kr, share: round(share), automaticDeduction: fraud ? 0 : round(Math.min(share, automatic)), qualityDeduction: fraud ? 0 : round(Math.min(Math.max(0, share - automatic), quality)) };
    });
    return { ...objective, base: round(base), fraud, krRows };
  });
  const base = round(objectiveRows.reduce((sum, row) => sum + row.base, 0));
  const automaticDeduction = round(objectiveRows.flatMap(row => row.krRows).reduce((sum, kr) => sum + kr.automaticDeduction, 0));
  const qualityDeduction = round(objectiveRows.flatMap(row => row.krRows).reduce((sum, kr) => sum + kr.qualityDeduction, 0));
  const fraudulentIds = new Set(objectiveRows.filter(row => row.fraud).map(row => row.id));
  const bonuses = approved.filter(entry => !['quality', 'fraud'].includes(entry.kind) && !fraudulentIds.has(entry.objectiveId || ''));
  const challengeBonus = new Map<string, number>();
  const awarded = bonuses.reduce((sum, entry) => {
    if (!entry.kind.startsWith('challenge')) return sum + entry.points;
    const current = challengeBonus.get(entry.objectiveId || '') || 0;
    const points = Math.min(entry.points, Math.max(0, 5 - current));
    challengeBonus.set(entry.objectiveId || '', current + points);
    return sum + points;
  }, 0);
  const bonus = round(Math.min(10, awarded));
  const redline = promised.filter(row => row.progress < 90).length >= 2 || promised.some(row => row.progress < 80);
  const beforeRedline = round(Math.min(60, Math.max(0, base - automaticDeduction - qualityDeduction) + bonus));
  return { validWeights, weightTotal, objectiveRows, base, automaticDeduction, qualityDeduction, bonus, redline,
    total: validWeights ? Math.min(beforeRedline, redline ? 30 : 60) : null };
}

const STORAGE_KEY = 'shichuang.frontend.mock.okr.performanceAdjustments.v1';
export function listScoreAdjustments(): ScoreAdjustment[] {
  try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; }
}
export function saveScoreAdjustments(entries: ScoreAdjustment[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }
