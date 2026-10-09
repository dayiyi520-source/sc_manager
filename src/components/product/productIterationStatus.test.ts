import { describe, expect, it } from 'vitest';
import { latestReleasedVersion, normalizeVersionStatus, productLineDisplayStatus } from './productLinePresentation';
import type { VersionIteration } from '../../types';

const version = (status: string, statusPhase?: string): VersionIteration => ({ id: status, name: status, status, statusPhase });

describe('fixed iteration lifecycle', () => {
  it('shows idle for no iterations and completed or published history', () => {
    expect(productLineDisplayStatus({ status: '启用中', versions: [] })).toBe('空闲中');
    expect(productLineDisplayStatus({ versions: [version('已完成'), version('已发布'), version('已取消')] })).toBe('空闲中');
  });

  it.each(['待开始', '进行中', '未开始'])('counts %s as an active iteration', (status) => {
    expect(productLineDisplayStatus({ status: '已停用', versions: [version('已完成'), version(status)] })).toBe('迭代中');
  });

  it('follows creation, start and completion while other pending iterations keep the product active', () => {
    const current = version('待开始');
    expect(productLineDisplayStatus({ versions: [current] })).toBe('迭代中');
    current.status = '进行中';
    expect(productLineDisplayStatus({ versions: [current] })).toBe('迭代中');
    current.status = '已完成';
    expect(productLineDisplayStatus({ versions: [current] })).toBe('空闲中');
    expect(productLineDisplayStatus({ versions: [current, version('待开始')] })).toBe('迭代中');
  });

  it('uses fixed states ahead of stale phases and maps historical custom states by phase', () => {
    expect(normalizeVersionStatus('已完成', '处理中')).toBe('已完成');
    expect(normalizeVersionStatus('进行中', '待开始')).toBe('进行中');
    expect(normalizeVersionStatus('研发阶段', '处理中')).toBe('进行中');
    expect(normalizeVersionStatus('历史终止', '已结束')).toBe('已完成');
    expect(normalizeVersionStatus('未开始', '待开始')).toBe('待开始');
  });

  it('does not turn completion or a planned end date into publication', () => {
    expect(latestReleasedVersion({ versions: [{ ...version('已完成', '已完成'), endDate: '2026-10-09' }] })).toBeUndefined();
  });
});
