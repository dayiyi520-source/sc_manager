import type { KnowledgeDoc } from '../types';
const key = 'workbench.knowledge.v1';
let unreadableStorage = false;
export function loadKnowledgeDocs(): KnowledgeDoc[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(value)) throw new Error('知识库数据格式异常');
    unreadableStorage = false;
    return value;
  } catch { unreadableStorage = true; return []; }
}
/** Local demo persistence; preserve legacy fields when saving. */
export function saveKnowledgeDocs(docs: KnowledgeDoc[]) {
  if (unreadableStorage) throw new Error('知识库原数据读取失败，已保留原数据，请先恢复存储');
  for (const doc of docs) {
    if (doc.attachments?.some(file => !file.id || !file.name || !Number.isFinite(file.size) || file.size < 0 || !/^data:[^,]*;base64,[A-Za-z0-9+/=]*$/.test(file.data))) throw new Error('知识附件无效');
    if ((doc.attachments || []).reduce((sum, file) => sum + file.size, 0) > 1024 * 1024) throw new Error('附件总大小不能超过 1MB');
  }
  localStorage.setItem(key, JSON.stringify(docs));
}
