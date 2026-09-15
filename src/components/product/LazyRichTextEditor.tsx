import React, { Suspense, lazy } from 'react';
import type { RichTextEditorProps } from './RichTextEditor';

const Editor = lazy(async () => {
  const module = await import('./RichTextEditor');
  return { default: module.RichTextEditor };
});

export const LazyRichTextEditor: React.FC<RichTextEditorProps> = (props) => (
  <Suspense fallback={<div role="status" className="flex min-h-80 items-center justify-center rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-sm text-[var(--text-muted)]">正在加载编辑器...</div>}>
    <Editor {...props} />
  </Suspense>
);
