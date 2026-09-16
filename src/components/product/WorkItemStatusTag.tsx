import React from 'react';
import { Tag } from 'antd';

const STATUS_COLOR_TOKENS: Record<string, string> = {
  neutral: 'var(--text-muted)',
  blue: 'var(--primary)',
  cyan: 'var(--cam-cyan)',
  green: 'var(--success)',
  yellow: 'var(--warning)',
  red: 'var(--danger)',
  purple: 'var(--accent-purple)'
};

export const WorkItemStatusTag: React.FC<{ name: string; color?: string }> = ({ name, color = 'neutral' }) => {
  const token = STATUS_COLOR_TOKENS[color] || STATUS_COLOR_TOKENS.neutral;
  return <Tag style={{ color: token, borderColor: token, background: `color-mix(in srgb, ${token} 12%, var(--bg-surface))` }}>{name}</Tag>;
};
