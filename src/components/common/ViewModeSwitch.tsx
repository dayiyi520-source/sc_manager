import React from 'react';
import { Button, Tooltip } from 'antd';
import { LayoutGrid, List } from './octicons-compat';
import './ViewModeSwitch.css';

export type ViewMode = 'list' | 'card';

export const ViewModeSwitch: React.FC<{
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  ariaLabel: string;
}> = ({ value, onChange, ariaLabel }) => (
  <div className="okr-target-view-switch" role="group" aria-label={ariaLabel}>
    <Tooltip title="列表视图"><Button aria-label="列表视图" aria-pressed={value === 'list'} className={value === 'list' ? 'is-selected' : ''} icon={<List />} onClick={() => onChange('list')} /></Tooltip>
    <Tooltip title="卡片视图"><Button aria-label="卡片视图" aria-pressed={value === 'card'} className={value === 'card' ? 'is-selected' : ''} icon={<LayoutGrid />} onClick={() => onChange('card')} /></Tooltip>
  </div>
);
