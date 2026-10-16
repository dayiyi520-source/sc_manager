// Share file reads within a page's query burst, without polling in the background.
export const MOCK_READ_WINDOW_MS = 5000;
let generation = 0;
if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => { generation++; });
  window.addEventListener('pageshow', () => { generation++; });
  window.addEventListener('storage', (event) => {
    if (event.key === null || event.key.startsWith('shichuang.frontend.mock.')) generation++;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') generation++;
  });
}

export function createMockReadWindow() {
  let loadedAt = -Infinity;
  let loadedGeneration = -1;
  return {
    isFresh: () => loadedGeneration === generation && Date.now() - loadedAt < MOCK_READ_WINDOW_MS,
    markFresh: () => { loadedAt = Date.now(); loadedGeneration = generation; },
    invalidate: () => { loadedAt = -Infinity; },
  };
}
