import { useEffect, useState } from 'react';
import { Alert, Button, Skeleton } from 'antd';
import { GoalIcon } from '@primer/octicons-react';
import dayjs from 'dayjs';
import { useApp } from '../../context/AppContext';
import { okrRepository } from '../../services/okrRepository';
import { buildMyTargetViewItems } from './okr/MyTargetMonthSection';
import { goalsWithAssignments } from '../../services/okrThreeLevelRules';
import { goalLevel } from '../../services/okrGoalRules';

export function MyGoalProgressMetric() {
  const { currentUser, openPageTab } = useApp();
  const [progress, setProgress] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    Promise.all([okrRepository.records(currentUser.id), okrRepository.people(), okrRepository.settings()]).then(([raw, people, settings]) => {
      const me = people.find(person => person.id === currentUser.id);
      const records = goalsWithAssignments(raw, me);
      const month = dayjs().format('YYYY-MM');
      const own = records.filter(record => record.ownerId === currentUser.id && record.periodKey === month && ['objective','action'].includes(record.kind) && record.status !== 'draft' && record.status !== 'archived' && record.status !== 'deleted' && !(record.changeRequest?.purpose === 'initial' && record.changeRequest.status !== 'approved') && !(goalLevel(me) === '部门级' && record.payload.goalLevel === 'department'));
      const targets = buildMyTargetViewItems(own, [], records, people, currentUser.id, settings);
      const weight = targets.reduce((total, target) => total + (target.objectiveWeight ?? target.totalWeight ?? 100), 0);
      const value = targets.length ? weight ? Math.round(targets.reduce((total, target) => total + target.progress * (target.objectiveWeight ?? target.totalWeight ?? 100), 0) / weight) : 0 : null;
      if (active) setProgress(value === null ? null : Math.min(100, Math.max(0,value)));
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : '目标进度加载失败'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentUser.id, attempt]);
  return <section aria-label="我的目标进度" className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] p-4">
    {loading ? <Skeleton active paragraph={{ rows: 1 }}/> : error ? <Alert type="error" showIcon title="目标进度加载失败" action={<Button size="small" onClick={() => setAttempt(value => value + 1)}>重试</Button>}/> : <button type="button" aria-label="我的目标进度，进入月度目标" onClick={() => openPageTab('wb_okr_perf')} className="w-full space-y-2 rounded-lg text-left transition-colors hover:bg-[var(--bg-surface-soft)] focus-visible:outline focus-visible:outline-[var(--primary)] active:opacity-70"><span className="flex justify-between gap-4 text-sm text-[var(--text-muted)]">我的目标进度<GoalIcon /></span><span className="block text-2xl font-semibold text-[var(--text-primary)]">{progress === null ? '—' : `${progress}%`}</span><span className="block text-xs text-[var(--text-muted)]">{progress === null ? '本月暂无已生效目标' : '本月目标进度'}</span></button>}
  </section>;
}
