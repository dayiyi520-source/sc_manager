import { useApp } from '../../context/AppContext';
import { canViewWorkbenchFeed, FEEDS_CHANGED, FEEDS_KEY, listWorkbenchFeeds, type WorkbenchFeed } from '../../services/workbenchFeeds';
import { syncProductReleaseFeeds } from '../../services/productReleaseFeeds';
import { useCallback, useEffect, useRef, useState } from 'react';
export function useWorkbenchFeeds() {
  const { currentUser, productLines } = useApp();
  const productsRef = useRef(productLines);
  productsRef.current = productLines;
  const [feeds, setFeeds] = useState<WorkbenchFeed[]>([]);
  const [error, setError] = useState<string>();
  const reloading = useRef(false);
  const reload = useCallback(() => {
    if (reloading.current) return;
    reloading.current = true;
    try {
      if (productsRef.current) syncProductReleaseFeeds(productsRef.current);
      setFeeds(listWorkbenchFeeds()); setError(undefined);
    } catch (error) { setError(error instanceof Error ? error.message : '信息加载失败'); }
    finally { reloading.current = false; }
  }, []);
  const productReleaseKey = JSON.stringify((productLines || []).map(product => [product.id, product.name, product.ownerName, product.versions]));
  useEffect(reload, [productReleaseKey, reload]);
  useEffect(() => {
    reload();
    const changed = (event: StorageEvent) => { if (!event.key || event.key === FEEDS_KEY) reload(); };
    window.addEventListener(FEEDS_CHANGED, reload); window.addEventListener('storage', changed);
    return () => { window.removeEventListener(FEEDS_CHANGED, reload); window.removeEventListener('storage', changed); };
  }, [reload]);
  return { feeds: feeds.filter(feed => canViewWorkbenchFeed(feed, currentUser)), error, reload };
}
