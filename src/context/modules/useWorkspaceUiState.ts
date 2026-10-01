import { useEffect, useRef, useState } from 'react';

export interface WorkspaceToast {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
}

export function useWorkspaceUiState() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const storedTheme = window.localStorage.getItem('sc-admin-theme');
    return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'light';
  });
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [toasts, setToasts] = useState<WorkspaceToast[]>([]);
  const toastTimers = useRef(new Map<string, number>());

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem('sc-admin-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setGlobalSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => () => {
    toastTimers.current.forEach((timer) => window.clearTimeout(timer));
    toastTimers.current.clear();
  }, []);

  const removeToast = (id: string) => {
    const timer = toastTimers.current.get(id);
    if (timer) window.clearTimeout(timer);
    toastTimers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const addToast = (type: WorkspaceToast['type'], title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((current) => [...current, { id, type, title, message }]);
    toastTimers.current.set(id, window.setTimeout(() => removeToast(id), 4000));
  };

  return {
    theme,
    globalSearchOpen,
    setGlobalSearchOpen,
    toasts,
    addToast,
    removeToast,
    toggleTheme: () => setTheme((current) => current === 'light' ? 'dark' : 'light'),
  };
}
