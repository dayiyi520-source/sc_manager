import { reportAttachmentRepository } from '../services/reportAttachmentRepository';
import type { VersionTestReport } from '../types/testManagement';

// Download the uploaded bytes; reports are no longer generated from plan statistics.
export async function downloadTestReport(report: VersionTestReport) {
  const attachments = report.attachments || [];
  if (!attachments.length) throw new Error('该报告没有可下载的附件');
  const files = attachments.map((attachment) => {
    const url = new URL(attachment.url || '', window.location.origin);
    if (!attachment.url || !(['http:', 'https:'].includes(url.protocol) || /^data:(?:image\/[a-z0-9.+-]+|application\/pdf);base64,/i.test(attachment.url))) throw new Error('附件链接无效，请重新上传');
    return { ...attachment, url: url.href };
  });
  const downloads = await Promise.all(files.map(async (file) => ({ ...file, blob: file.url.startsWith('data:') ? undefined : await reportAttachmentRepository.download(file.url) })));
  downloads.forEach((file) => {
    const link = document.createElement('a');
    const objectUrl = file.blob ? URL.createObjectURL(file.blob) : undefined;
    link.href = objectUrl || file.url;
    link.download = file.name;
    link.rel = 'noopener';
    document.body.appendChild(link);
    try { link.click(); } finally { link.remove(); if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 1000); }
  });
}
