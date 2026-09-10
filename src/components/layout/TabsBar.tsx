import React from 'react';
import { X } from '@/components/common/octicons-compat';
import { ReloadOutlined, CloseOutlined } from '@ant-design/icons';
import { useApp } from '../../context/AppContext';
import { DynamicIcon } from '../common/IconHelper';

export const TabsBar: React.FC = () => {
  const { openTabs, activeTabId, setActiveTabId, closePageTab, addToast } = useApp();

  const handleCloseOthers = () => {
    // Keep workbench and current
    openTabs.forEach((tab) => {
      if (tab.id !== activeTabId && tab.id !== 'wb_my_tasks') {
        closePageTab(tab.id);
      }
    });
    addToast('info', '已关闭其他页面标签');
  };

  const handleRefresh = () => {
    addToast('success', '页面数据已刷新');
  };

  return (
    <div className="tech-tabs h-9 border-b px-3 flex items-center justify-between select-none overflow-x-auto">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 flex-1 min-w-0">
        {openTabs.map((tab) => {
          const isActive = activeTabId === tab.id;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`group flex items-center gap-1.5 px-3 py-1 rounded-t text-xs cursor-pointer border-t-2 transition-all shrink-0 ${
                isActive
                  ? 'tech-tab-active font-medium border-x'
                  : 'bg-transparent border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-body)]'
              }`}
            >
              <DynamicIcon
                name={tab.iconName}
                className={`w-3.5 h-3.5 ${isActive ? 'tech-accent-text' : 'opacity-70 text-[var(--text-muted)]'}`}
              />
              <span>{tab.title}</span>
              {tab.closable && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closePageTab(tab.id);
                  }}
                  className="p-0.5 rounded-full hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors opacity-60 group-hover:opacity-100"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Tab Context Actions */}
      <div className="flex items-center gap-1 shrink-0 pl-2">
        <button
          onClick={handleRefresh}
          title="刷新当前页面"
          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-surface)] transition-colors"
        >
          <ReloadOutlined style={{ fontSize: 14 }} />
        </button>
        <button
          onClick={handleCloseOthers}
          title="关闭其他标签页"
          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-surface)] transition-colors text-[11px] flex items-center gap-1"
        >
          <CloseOutlined style={{ fontSize: 14 }} />
        </button>
      </div>
    </div>
  );
};
