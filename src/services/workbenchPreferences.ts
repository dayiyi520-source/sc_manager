export const FEED_TAB_KEY = 'shichuang.workbench.feedTab';
export const TODO_TAB_KEY = 'shichuang.workbench.todoTab';

export function readWorkbenchTab(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
export function rememberWorkbenchTab(key: string, value: string) {
  try { sessionStorage.setItem(key, value); } catch { /* Category restoration is optional; navigation and saved content remain usable. */ }
}
