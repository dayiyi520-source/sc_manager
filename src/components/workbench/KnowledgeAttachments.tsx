import type { KnowledgeAttachment } from '../../services/knowledgeAttachments';
import { knowledgeAttachmentUrl } from '../../services/knowledgeAttachments';

export function KnowledgeAttachments({ attachments }: { attachments?: KnowledgeAttachment[] }) {
  return attachments?.length ? <span className="inline-flex flex-wrap gap-2">{attachments.map(file => <a key={file.id} href={knowledgeAttachmentUrl(file)} download={file.name}>{file.name}</a>)}</span> : <>——</>;
}
