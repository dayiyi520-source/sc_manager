export interface KnowledgeAttachment { id: string; name: string; size: number; data: string }

export const KNOWLEDGE_ATTACHMENT_LIMIT = 1024 * 1024;
export const REVIEW_KNOWLEDGE_ATTACHMENT_LIMIT = 5 * KNOWLEDGE_ATTACHMENT_LIMIT;
const sizeMessage = (limit: number) => `附件总大小不能超过 ${limit / KNOWLEDGE_ATTACHMENT_LIMIT}MB`;

export function readKnowledgeAttachment(file: File, limit = KNOWLEDGE_ATTACHMENT_LIMIT): Promise<KnowledgeAttachment> {
  if (file.size > limit) return Promise.reject(new Error(sizeMessage(limit)));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取附件失败，请重新选择'));
    reader.onload = () => resolve({ id: crypto.randomUUID(), name: file.name, size: file.size, data: String(reader.result) });
    reader.readAsDataURL(file);
  });
}

export function knowledgeAttachmentUrl(file: KnowledgeAttachment) {
  return /^data:[^,]*;base64,[A-Za-z0-9+/=]*$/.test(file.data) ? file.data : undefined;
}

export function saveKnowledgeValidation(files: KnowledgeAttachment[], limit = KNOWLEDGE_ATTACHMENT_LIMIT) {
  if (files.some(file => !file.id || !file.name || !Number.isFinite(file.size) || file.size < 0 || !knowledgeAttachmentUrl(file))) throw new Error('知识附件无效');
  if (files.reduce((sum, file) => sum + file.size, 0) > limit) throw new Error(sizeMessage(limit));
}
