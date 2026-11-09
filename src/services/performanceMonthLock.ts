export const KPI_DEMO_STORAGE_KEY = 'shichuang.frontend.demo.kpiPerformance.v1';

export const isKpiMonthLocked = (month: string): boolean => {
  try {
    const raw = localStorage.getItem(KPI_DEMO_STORAGE_KEY);
    if (!raw) return month === '2026-10';
    const state = JSON.parse(raw) as { periods?: Record<string, { published?: boolean }> };
    return state.periods?.[month]?.published === true;
  } catch {
    return month === '2026-10';
  }
};
