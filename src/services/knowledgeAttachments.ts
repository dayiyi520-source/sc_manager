export interface KnowledgeAttachment { id: string; name: string; size: number; data: string }

export function readKnowledgeAttachment(file: File): Promise<KnowledgeAttachment> {
  if (file.size > 1024 * 1024) return Promise.reject(new Error('附件总大小不能超过 1MB'));
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

export function saveKnowledgeValidation(files: KnowledgeAttachment[]) {
  if (files.some(file => !file.id || !file.name || !Number.isFinite(file.size) || file.size < 0 || !knowledgeAttachmentUrl(file))) throw new Error('知识附件无效');
  if (files.reduce((sum, file) => sum + file.size, 0) > 1024 * 1024) throw new Error('附件总大小不能超过 1MB');
}
