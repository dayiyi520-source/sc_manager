import type { OkrReviewKnowledge } from './okrRepository';
import { REVIEW_KNOWLEDGE_ATTACHMENT_LIMIT, saveKnowledgeValidation } from './knowledgeAttachments';

export type ReviewKnowledgeDraft = Pick<OkrReviewKnowledge, 'title' | 'scenarioAndPain' | 'actionsAndConclusion' | 'reusePlan' | 'linkUrl' | 'attachments'> & { formatVersion: 2 };
export const reviewKnowledgeScenario = (entry: OkrReviewKnowledge) => entry.scenarioAndPain ?? entry.summary;
export const reviewKnowledgeConclusion = (entry: OkrReviewKnowledge) => entry.actionsAndConclusion ?? entry.content;
export function reviewKnowledgeLink(value?: string) {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try { const url = new URL(value.trim()); return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined; }
  catch { return undefined; }
}

/** Historical entries retain their original fields and do not require backfilling. */
export function validateReviewKnowledge(entry: Omit<OkrReviewKnowledge, 'id' | 'category'>) {
  saveKnowledgeValidation(entry.attachments || [], REVIEW_KNOWLEDGE_ATTACHMENT_LIMIT);
  const structured = entry.formatVersion === 2 || entry.scenarioAndPain !== undefined || entry.actionsAndConclusion !== undefined || entry.reusePlan !== undefined;
  if (!structured) return;
  if (typeof entry.title !== 'string' || !entry.title.trim() || entry.title.trim().length > 50) throw new Error('知识沉淀标题必填，且不能超过50字');
  for (const [label, value] of [['场景与痛点', entry.scenarioAndPain], ['执行动作与复盘结论', entry.actionsAndConclusion]] as const) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 500) throw new Error(`${label}必填，且不能超过500字`);
  }
  if (entry.reusePlan !== undefined && (typeof entry.reusePlan !== 'string' || entry.reusePlan.trim().length > 500)) throw new Error('复用范围与推广计划不能超过500字');
  if (entry.linkUrl !== undefined && (typeof entry.linkUrl !== 'string' || entry.linkUrl.trim() && !reviewKnowledgeLink(entry.linkUrl))) throw new Error('请输入有效的 http 或 https 链接');
}
