import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { PageTab, SubMenuId } from '../../types';
import type { MainMenuGroup, NavigationMenuItem } from '../AppContext';

export function useNavigationState(menuGroups: MainMenuGroup[], aliases: Partial<Record<SubMenuId, SubMenuId>>) {
  const navigate = useNavigate();
  const location = useLocation();
  const rawRouteTab = location.pathname.startsWith('/app/') ? location.pathname.slice('/app/'.length) as SubMenuId : 'wb_my_tasks';
  const routeTab = (aliases[rawRouteTab] || rawRouteTab) as SubMenuId;
  const [activeTabId, setActiveTabId] = useState<SubMenuId>(routeTab);
  const [openTabs, setOpenTabs] = useState<PageTab[]>([
    { id: 'wb_my_tasks', title: '我的任务', mainMenuId: 'workbench', iconName: 'CheckSquare', closable: false },
  ]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1200);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const syncSidebarForViewport = () => {
      if (window.innerWidth < 1200) {
        setSidebarCollapsed(true);
        if (window.innerWidth < 900) setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', syncSidebarForViewport);
    return () => window.removeEventListener('resize', syncSidebarForViewport);
  }, []);

  useEffect(() => {
    setActiveTabId(routeTab);
    setOpenTabs((previousTabs) => {
      const menuItems = menuGroups.flatMap((group) => group.subMenus);
      const normalizedTabs = previousTabs.map((tab) => {
        const normalizedId = (aliases[tab.id] || tab.id) as SubMenuId;
        const menu = menuItems.find((item) => item.id === normalizedId);
        return menu
          ? { ...tab, id: normalizedId, title: menu.title, mainMenuId: menu.mainMenuId, iconName: menu.icon }
          : { ...tab, id: normalizedId };
      });
      const dedupedTabs = normalizedTabs.filter((tab, index, tabs) => tabs.findIndex((candidate) => candidate.id === tab.id) === index);
      if (dedupedTabs.some((tab) => tab.id === routeTab)) return dedupedTabs;
      const menu = menuItems.find((item) => item.id === routeTab);
      return menu
        ? [...dedupedTabs, { id: routeTab, title: menu.title, mainMenuId: menu.mainMenuId, iconName: menu.icon, closable: routeTab !== 'wb_my_tasks' }]
        : dedupedTabs;
    });
  }, [aliases, menuGroups, routeTab]);

  const openPageTab = (menuId: string) => {
    const resolvedId = (aliases[menuId as SubMenuId] || menuId) as SubMenuId;
    let foundMenu: NavigationMenuItem | undefined;
    for (const group of menuGroups) {
      const match = group.subMenus.find((item) => item.id === resolvedId);
      if (match) { foundMenu = match; break; }
    }
    foundMenu ||= { id: resolvedId, title: menuId, mainMenuId: 'workbench', icon: 'FileText' };
    const selectedMenu = foundMenu;
    setOpenTabs((previousTabs) => previousTabs.some((tab) => tab.id === resolvedId || aliases[tab.id] === resolvedId)
      ? previousTabs
      : [...previousTabs, { id: selectedMenu.id, title: selectedMenu.title, mainMenuId: selectedMenu.mainMenuId, iconName: selectedMenu.icon, closable: selectedMenu.id !== 'wb_my_tasks' }]);
    setActiveTabId(resolvedId);
    navigate(`/app/${resolvedId}`);
  };

  const closePageTab = (id: SubMenuId) => {
    if (id === 'wb_my_tasks') return;
    const newTabs = openTabs.filter((tab) => tab.id !== id);
    setOpenTabs(newTabs);
    if (activeTabId !== id) return;
    const target = newTabs.at(-1)?.id || 'wb_my_tasks';
    setActiveTabId(target);
    navigate(`/app/${target}`);
  };

  return {
    activeTabId, setActiveTabId, openTabs, sidebarCollapsed, mobileSidebarOpen,
    openPageTab, closePageTab,
    toggleSidebar: () => setSidebarCollapsed((value) => !value),
    toggleMobileSidebar: () => setMobileSidebarOpen((value) => !value),
  };
}
