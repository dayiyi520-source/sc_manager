const ended = new Set(['已完成', '已关闭', '已取消', '已驳回']);
export const canUpdateMyTaskProgress = (status: string) => !ended.has(status);
export function myTaskProgress(value: unknown, status: string) {
  if (status === '已完成' || status === '已关闭') return 100;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : 0;
}
export function validateMyTaskProgress(value: unknown): asserts value is number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 100) throw new Error('进度须为 0 至 100 的整数');
}
