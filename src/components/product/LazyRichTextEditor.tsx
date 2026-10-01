import React, { useEffect, useState } from 'react';
import type { RichTextEditorProps } from './RichTextEditor';

type EditorComponent = React.ComponentType<RichTextEditorProps>;

export const LazyRichTextEditor: React.FC<RichTextEditorProps> = (props) => {
  const [Editor, setEditor] = useState<EditorComponent | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setEditor(null);
    setError(false);
    import('./RichTextEditor')
      .then((module) => { if (active) setEditor(() => module.RichTextEditor); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [attempt]);

  if (error) return <div role="alert" className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-lg border border-[var(--danger)] bg-[var(--bg-card)] px-4 text-center text-sm text-[var(--text-muted)]"><span>编辑器加载失败，请检查网络后重试</span><button type="button" onClick={() => setAttempt((value) => value + 1)} className="rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50">重新加载编辑器</button></div>;
  if (!Editor) return <div role="status" className="flex min-h-80 items-center justify-center rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] text-sm text-[var(--text-muted)]">正在加载编辑器...</div>;
  return <Editor {...props} />;
};
