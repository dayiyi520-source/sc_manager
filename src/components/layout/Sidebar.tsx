import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Command
} from '@/components/common/octicons-compat';
import { useApp, MENU_GROUPS } from '../../context/AppContext';
import { getAntdIcon } from '../common/AntdIconMap';
import { SubMenuId } from '../../types';

export const Sidebar: React.FC = () => {
  const {
    activeTabId,
    openPageTab,
    sidebarCollapsed,
    toggleSidebar,
    mobileSidebarOpen,
    toggleMobileSidebar
  } = useApp();
  const [viewportCollapsed, setViewportCollapsed] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia('(max-width: 1199px)');
    const syncViewport = () => setViewportCollapsed(media.matches);
    syncViewport();
    media.addEventListener('change', syncViewport);
    return () => media.removeEventListener('change', syncViewport);
  }, []);
  const visuallyCollapsed = (sidebarCollapsed || viewportCollapsed) && !mobileSidebarOpen;

  // Keep all groups expanded by default
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    workbench: true,
    crm: true,
    product: true,
    approval: true,
    project: true,
    operations: true
  });

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  return (
    <aside
      className={`tech-sidebar h-full text-[var(--text-body)] border-r flex flex-col transition-all duration-300 shrink-0 select-none z-40 ${
        visuallyCollapsed ? 'w-16' : 'w-60'
      } ${mobileSidebarOpen ? 'mobile-sidebar-open' : ''}`}
    >
      {/* Navigation Menu List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1.5 text-xs custom-scrollbar">
        {MENU_GROUPS.map((group) => {
          const isExpanded = expandedGroups[group.id] ?? true;
          const isAnyChildActive = group.subMenus.some((m) => m.id === activeTabId);

          return (
            <div key={group.id} className="space-y-0.5">
              {!visuallyCollapsed ? (
                /* 国内中后台标准一级主菜单：13px 中等加粗，层级鲜明，高可辨识度 */
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg transition-all ${
                    isAnyChildActive
                      ? 'text-[var(--text-primary)] bg-[var(--bg-surface)] font-semibold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`flex items-center justify-center w-4 h-4 shrink-0 transition-colors ${
                        isAnyChildActive ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'
                      }`} style={{ fontSize: 16 }}>
                      {getAntdIcon(group.icon)}
                    </span>
                    <span className="text-[13px] font-medium tracking-normal text-slate-200">
                      {group.title}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 ${
                      isExpanded ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                </button>
              ) : (
                <div
                  title={group.title}
                  className="w-full text-center py-1.5 text-[11px] text-[var(--text-muted)] font-medium border-b border-[var(--border-main)] pb-1 truncate"
                >
                  {group.title.slice(0, 2)}
                </div>
              )}

              {/* 二级子菜单：具有明显的层级缩进 (pl-8) 和引导视觉线 */}
              {(isExpanded || visuallyCollapsed) && (
                <div
                  className={`space-y-0.5 ${
                    !visuallyCollapsed ? 'relative ml-3.5 pl-3 border-l border-[var(--border-main)] my-1' : ''
                  }`}
                >
                  {group.subMenus.map((sub) => {
                    const isActive = activeTabId === sub.id;

                    return (
                      <button
                        key={sub.id}
                        id={`menu-${sub.id}`}
                        onClick={() => { openPageTab(sub.id as SubMenuId); if (mobileSidebarOpen) toggleMobileSidebar(); }}
                        title={visuallyCollapsed ? `${group.title} · ${sub.title}` : undefined}
                        className={`w-full flex items-center rounded-md transition-all text-left ${
                          visuallyCollapsed
                            ? 'justify-center p-2.5 my-1'
                            : 'px-2.5 py-1.5'
                        } ${
                          isActive
                            ? 'tech-nav-active font-medium'
                            : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`flex items-center justify-center w-3.5 h-3.5 shrink-0 transition-colors ${
                              isActive ? 'tech-accent-text' : 'text-[var(--text-muted)]'
                            }`} style={{ fontSize: 14 }}>
                            {getAntdIcon(sub.icon)}
                          </span>
                          {!visuallyCollapsed && (
                            <span className="text-[13px] truncate">{sub.title}</span>
                          )}
                        </div>

                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Collapse Toggle Footer */}
      <div className="p-3 border-t border-[var(--border-main)] shrink-0 bg-[var(--bg-main)]">
        <button
          id="btn-collapse-sidebar"
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
        >
          {visuallyCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <>
              <PanelLeftClose className="w-4 h-4" />
              <span>收起侧边栏</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
