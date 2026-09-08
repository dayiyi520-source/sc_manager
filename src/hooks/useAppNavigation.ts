import { useAppNavigationContext } from '../context/AppContext';

/** Navigation-only facade for gradual AppContext migration. */
export const useAppNavigation = () => {
  const { activeTabId, openTabs, sidebarCollapsed, toggleSidebar, openPageTab, closePageTab } = useAppNavigationContext();
  return { activeTabId, openTabs, sidebarCollapsed, toggleSidebar, openPageTab, closePageTab };
};
