import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Sun,
  Moon,
  Maximize,
  Minimize,
  UserCheck,
  ChevronDown,
  Layers,
  FileCheck,
  Briefcase,
  ArrowRight,
  List,
} from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { CURRENT_USERS } from '../../data/mockData';
import { useAppAuth } from '../../hooks/useAppAuth';
import { clearSession } from '../../services/session';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, setCurrentUserRole } = useAppAuth();
  const {
    theme,
    toggleTheme,
    openPageTab,
    approvals,
    requirementTasks,
    sidebarCollapsed,
    toggleMobileSidebar
  } = useApp();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const pendingApprovalsCount = approvals.filter((a) => a.status === '待审批').length;
  const pendingTasksCount = requirementTasks.filter((t) => t.status === '待处理' || t.status === '研发中').length;

  return (
    <header className="tech-header flex h-14 items-center border-b sticky top-0 z-30 select-none">
      {/* Independent brand rail aligned with the sidebar width. */}
      <div className={`tech-brand-panel flex h-full shrink-0 items-center border-r px-4 transition-[width] duration-300 ${sidebarCollapsed ? 'w-[68px]' : 'w-[188px]'}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="tech-logo w-8 h-8 rounded-md flex items-center justify-center shadow-md font-serif font-black tracking-wider text-sm shrink-0">
            SC
          </div>
          <div className={`min-w-0 ${sidebarCollapsed ? 'hidden' : 'hidden sm:block'}`}>
            <div className="font-semibold text-sm tracking-wide text-white flex items-center gap-1.5 truncate">
              师创管理后台
            </div>
          </div>
        </div>
      </div>

      {/* Right: Notifications and account controls */}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5 px-4">
        <button type="button" onClick={toggleMobileSidebar} className="mobile-menu-button mr-auto rounded-md p-2 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]" aria-label="打开导航菜单"><List className="h-4 w-4" /></button>
        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            id="btn-notifications"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-md hover:bg-[var(--bg-surface)] transition-colors"
          >
            <Bell className="w-4 h-4" />
            {pendingApprovalsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--warning)] ring-2 ring-[var(--bg-main)]" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-[var(--bg-surface)] rounded-lg shadow-2xl border border-[var(--border-main)] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-3 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-main)]">
                <span className="text-xs font-medium text-white">待办与业务通知</span>
                <span className="text-[11px] text-[var(--warning)] cursor-pointer hover:underline">
                  全部已读
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[var(--border-main)] text-xs">
                <div
                  onClick={() => {
                    setNotificationsOpen(false);
                    openPageTab('approval_center');
                  }}
                  className="p-3.5 hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">
                        您有 {pendingApprovalsCount} 笔待审批单据需要处理
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        国家电网华东分部480万合同用印审批等待技术把关
                      </p>
                      <span className="text-[10px] text-[var(--text-muted)] mt-1 block font-mono">15分钟前</span>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => {
                    setNotificationsOpen(false);
                    openPageTab('prod_req_tasks');
                  }}
                  className="p-3.5 hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-md bg-[color-mix(in_srgb,var(--warning)_10%,var(--bg-surface))] text-[var(--warning)] border border-[color-mix(in_srgb,var(--warning)_20%,var(--border-main))]">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-white">
                        信创达梦DM8高可用任务进入最后联调
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        距离 9月8日 交付封版还有 7 天，请及时勾选Todo进度
                      </p>
                      <span className="text-[10px] text-[var(--text-muted)] mt-1 block font-mono">1小时前</span>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => {
                    setNotificationsOpen(false);
                    openPageTab('crm_bidding');
                  }}
                  className="p-3.5 hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">
                        智行新能源公开招标定于 9月10日 现场述标
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">请销售与方案团队提前打印带胶装标书</p>
                      <span className="text-[10px] text-[var(--text-muted)] mt-1 block font-mono">3小时前</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fullscreen Button */}
        <button
          id="btn-toggle-fullscreen"
          onClick={toggleFullscreen}
          className="hidden sm:inline-flex p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-md hover:bg-[var(--bg-surface)] transition-colors"
          title={isFullscreen ? '退出全屏' : '进入全屏'}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>

        {/* Theme Toggle */}
        <button
          id="btn-toggle-theme"
          onClick={toggleTheme}
          className="p-2 text-[var(--text-muted)] hover:text-[var(--warning)] rounded-md hover:bg-[var(--bg-surface)] transition-colors"
          title={theme === 'light' ? '切换为暗色模式' : '切换为亮色模式'}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        <div className="h-4 w-px bg-[var(--border-main)] my-auto" />

        {/* User Role Switcher & Profile Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            id="btn-user-profile"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1 pl-1.5 rounded-md hover:bg-[var(--bg-surface)] border border-transparent hover:border-[var(--border-main)] transition-colors text-left"
          >
            <span className="tech-avatar-frame shrink-0">
              <img
                src={currentUser.avatar || undefined}
                alt={currentUser.name}
                className="block w-6 h-6 rounded-full object-cover"
              />
            </span>
            <div className="hidden lg:block text-xs leading-tight">
              <div className="font-medium text-white flex items-center gap-1">
                {currentUser.name}
                <span className="text-[9px] px-1.5 py-0.2 bg-[color-mix(in_srgb,var(--warning)_15%,var(--bg-surface))] text-[var(--warning)] border border-[color-mix(in_srgb,var(--warning)_30%,var(--border-main))] rounded font-mono">
                  {currentUser.role === 'admin'
                    ? '超管'
                    : currentUser.role === 'sales_director'
                    ? '销售'
                    : currentUser.role === 'product_manager'
                    ? '产品'
                    : '研发'}
                </span>
              </div>
              <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[130px]">{currentUser.roleTitle}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-[var(--bg-surface)] rounded-lg shadow-2xl border border-[var(--border-main)] p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-md mb-2">
                <div className="font-medium text-white flex items-center justify-between">
                  <span>{currentUser.name}</span>
                  <span className="text-[10px] text-[var(--warning)] font-mono">{currentUser.department}</span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{currentUser.roleTitle}</div>
              </div>

              <div className="px-2 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                切换角色体验视角 (交互演示)
              </div>

              <div className="space-y-1 mt-1">
                {CURRENT_USERS.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setCurrentUserRole(u.role);
                      setUserMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-colors ${
                      currentUser.role === u.role
                        ? 'bg-[color-mix(in_srgb,var(--warning)_15%,var(--bg-surface))] text-[var(--warning)] border border-[color-mix(in_srgb,var(--warning)_30%,var(--border-main))] font-medium'
                        : 'hover:bg-[var(--bg-elevated)] text-[var(--text-body)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <img src={u.avatar || undefined} alt={u.name} className="w-5 h-5 rounded-full object-cover" />
                      <div>
                        <div>{u.name}</div>
                        <div className="text-[10px] text-[var(--text-muted)]">{u.roleTitle.split(' ')[0]}</div>
                      </div>
                    </div>
                    {currentUser.role === u.role && <UserCheck className="w-4 h-4 text-[var(--warning)]" />}
                  </button>
                ))}
              </div>

              <div className="mt-2 border-t border-[var(--border-main)] pt-2">
                <button
                  type="button"
                  onClick={() => {
                    clearSession();
                    setUserMenuOpen(false);
                    navigate('/login', { replace: true });
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-[var(--text-body)] hover:bg-[var(--bg-elevated)] hover:text-[var(--danger)] transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>退出登录</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
