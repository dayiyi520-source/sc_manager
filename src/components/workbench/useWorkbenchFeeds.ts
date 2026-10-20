import { useCallback, useEffect, useState } from 'react';
import { FEEDS_CHANGED, FEEDS_KEY, listWorkbenchFeeds, type WorkbenchFeed } from '../../services/workbenchFeeds';
export function useWorkbenchFeeds() {
  const [feeds, setFeeds] = useState<WorkbenchFeed[]>([]);
  const [error, setError] = useState<string>();
  const reload = useCallback(() => {
    try { setFeeds(listWorkbenchFeeds()); setError(undefined); }
    catch (error) { setError(error instanceof Error ? error.message : '动态与评价加载失败'); }
  }, []);
  useEffect(() => {
    reload();
    const changed = (event: StorageEvent) => { if (!event.key || event.key === FEEDS_KEY) reload(); };
    window.addEventListener(FEEDS_CHANGED, reload); window.addEventListener('storage', changed);
    return () => { window.removeEventListener(FEEDS_CHANGED, reload); window.removeEventListener('storage', changed); };
  }, [reload]);
  return { feeds, error, reload };
}
