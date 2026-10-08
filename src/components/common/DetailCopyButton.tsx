import React, { useState } from 'react';
import { CopyOutlined, LinkOutlined, LoadingOutlined } from '@ant-design/icons';

export function DetailCopyButton({ label, link = false, onCopy }: { label: string; link?: boolean; onCopy: () => Promise<void> }) {
  const [copying, setCopying] = useState(false);
  return <button type="button" aria-label={label} title={label} disabled={copying} aria-busy={copying}
    onClick={async () => {
      if (copying) return;
      setCopying(true);
      try { await onCopy(); } finally { setCopying(false); }
    }}
    className="shrink-0 rounded p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-wait disabled:opacity-50">
    {copying ? <LoadingOutlined spin /> : link ? <LinkOutlined /> : <CopyOutlined />}
  </button>;
}
