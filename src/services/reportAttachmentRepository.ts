// Attachment URLs are supplied by the report record; do not forward API tokens to file hosts.
export const reportAttachmentRepository = {
  download: async (url: string): Promise<Blob> => {
    const response = await fetch(url, { credentials: 'same-origin', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('下载附件失败，请稍后重试');
    return response.blob();
  },
};
