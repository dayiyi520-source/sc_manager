// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KnowledgeDoc } from '../types';
import { saveKnowledgeValidation } from './knowledgeAttachments';
beforeEach(() => { localStorage.clear(); vi.resetModules(); });
describe('知识沉淀本地持久化', () => {
  it('retains multiple attachments and hidden legacy fields after reopening', async () => {
    const repository = await import('./knowledgeRepository');
    const files = ['a', 'b'].map(id => ({ id, name: `${id}.txt`, size: 1, data: 'data:text/plain;base64,YQ==' }));
    const docs = [{ id: 'legacy', title: '标题', summary: '摘要', category: '旧分类', version: 'V1', content: '历史正文', tags: ['历史'], attachments: files }] as KnowledgeDoc[];
    repository.saveKnowledgeDocs(docs);
    expect((await import('./knowledgeRepository')).loadKnowledgeDocs()).toEqual(docs);
  });
  it('preserves damaged original storage instead of overwriting it on mount', async () => {
    localStorage.setItem('workbench.knowledge.v1', '{broken');
    const repository = await import('./knowledgeRepository');
    expect(repository.loadKnowledgeDocs()).toEqual([]);
    expect(() => repository.saveKnowledgeDocs([])).toThrow('原数据读取失败');
    expect(localStorage.getItem('workbench.knowledge.v1')).toBe('{broken');
  });
  it('accepts no attachment and rejects invalid data or excessive total size', () => {
    expect(() => saveKnowledgeValidation([])).not.toThrow();
    expect(() => saveKnowledgeValidation([{ id:'a', name:'a',size:1,data:'javascript:alert(1)' }])).toThrow('无效');
    expect(() => saveKnowledgeValidation([{ id:'a', name:'a',size:1048577,data:'data:text/plain;base64,YQ==' }])).toThrow('1MB');
  });
});
