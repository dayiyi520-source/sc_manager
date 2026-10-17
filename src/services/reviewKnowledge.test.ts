// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { reviewKnowledgeConclusion, reviewKnowledgeLink, reviewKnowledgeScenario, validateReviewKnowledge } from './reviewKnowledge';
import { readKnowledgeAttachment, saveKnowledgeValidation, REVIEW_KNOWLEDGE_ATTACHMENT_LIMIT } from './knowledgeAttachments';
const entry = { formatVersion: 2 as const, title: '发布回滚经验', scenarioAndPain: '发布后出现异常', actionsAndConclusion: '验证后回滚并补充检查', reusePlan: '在团队分享', category: '应知应会', id: 'k' };
const file = (id: string, size: number) => ({ id, name: id + '.txt', size, data: 'data:text/plain;base64,YQ==' });
describe('review knowledge validation and historical compatibility', () => {
 it('enforces title and section limits while accepting empty optional fields', () => {
  expect(() => validateReviewKnowledge({ ...entry, title: '题'.repeat(50), scenarioAndPain: '景'.repeat(500), actionsAndConclusion: '做'.repeat(500), reusePlan: '用'.repeat(500) })).not.toThrow();
  expect(() => validateReviewKnowledge({ ...entry, reusePlan: undefined, linkUrl: undefined })).not.toThrow();
  for (const patch of [{ title: ' ' }, { title: '题'.repeat(51) }, { scenarioAndPain: ' ' }, { scenarioAndPain: '景'.repeat(501) }, { actionsAndConclusion: '' }, { actionsAndConclusion: '做'.repeat(501) }, { reusePlan: '用'.repeat(501) }]) expect(() => validateReviewKnowledge({ ...entry, ...patch })).toThrow();
 });
 it('validates safe HTTP links and preserves historical summary/content', () => {
  for (const linkUrl of ['javascript:alert(1)', 'https://', 'not-a-url']) expect(() => validateReviewKnowledge({ ...entry, linkUrl })).toThrow('链接');
  expect(reviewKnowledgeLink(' https://example.com/path ')).toBe('https://example.com/path');
  expect(reviewKnowledgeLink('file:///tmp/a')).toBeUndefined();
  const old = { id:'old', category:'旧分类', title:'旧标题', summary:'原摘要', content:'原正文' };
  expect(() => validateReviewKnowledge(old)).not.toThrow();
  expect(reviewKnowledgeScenario(old)).toBe('原摘要');
  expect(reviewKnowledgeConclusion(old)).toBe('原正文');
 });
 it('accepts exactly 5MB across multiple attachments, rejects an excess and preserves the library limit', async () => {
  const attachments=[file('a',3*1024*1024),file('b',2*1024*1024)];
  expect(() => validateReviewKnowledge({ ...entry, attachments })).not.toThrow();
  expect(() => validateReviewKnowledge({ ...entry, attachments:[...attachments,file('c',1)] })).toThrow('5MB');
  expect(() => saveKnowledgeValidation(attachments)).toThrow('1MB');
  await expect(readKnowledgeAttachment(new File([new Uint8Array(REVIEW_KNOWLEDGE_ATTACHMENT_LIMIT+1)],'large.bin'),REVIEW_KNOWLEDGE_ATTACHMENT_LIMIT)).rejects.toThrow('5MB');
  await expect(readKnowledgeAttachment(new File(['abc'],'a.txt'),REVIEW_KNOWLEDGE_ATTACHMENT_LIMIT)).resolves.toMatchObject({ name:'a.txt',size:3 });
 });
});
