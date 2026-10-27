import { useEffect, useState } from 'react';
import { Alert, Button, Empty, Progress, Skeleton } from 'antd';
import { GoalIcon } from '@primer/octicons-react';
import dayjs from 'dayjs';
import { useApp } from '../../context/AppContext';
import { okrRepository, type OkrRecord } from '../../services/okrRepository';
import { personalAssignedObjectives } from '../../services/okrAssignments';
import { ownerGoalLevel } from '../../services/okrGoalRules';
import { krDetails, supervisorKrTitle } from '../../services/okrKrDetails';

const percent = (value?: number) => Math.min(100, Math.max(0, Number.isFinite(value) ? value! : 0));
const objectiveProgress = (record: OkrRecord) => {
  const results = record.payload.keyResults || [];
  const weight = results.reduce((sum, kr) => sum + kr.weight, 0);
  return weight ? Math.round(results.reduce((sum, kr) => sum + percent(kr.progress) * kr.weight, 0) / weight) : 0;
};

export function MyGoalProgressMetric() {
  const { currentUser, openPageTab } = useApp();
  const [goals, setGoals] = useState<Array<{ record: OkrRecord; progress: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    Promise.all([okrRepository.records(currentUser.id), okrRepository.people()]).then(([records, people]) => {
      const me = people.find(person => person.id === currentUser.id);
      const month = dayjs().format('YYYY-MM');
      const departmentGoals = records.filter(record => record.kind === 'objective' && record.periodKey === month && ownerGoalLevel(people.find(person => person.id === record.ownerId), record.payload) === '部门级' && ['active', 'submitted', 'reviewed'].includes(record.status) && !(record.changeRequest?.purpose === 'initial' && record.changeRequest.status !== 'approved'));
      const assigned = personalAssignedObjectives(departmentGoals, me, people);
      const related = departmentGoals.flatMap(record => {
        const visible = record.ownerId === currentUser.id ? record : assigned.find(item => item.id === record.id);
        return visible ? [{ record: visible, progress: objectiveProgress(record) }] : [];
      });
      if (active) setGoals(related);
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : '目标进度加载失败'); }).finally(() => { if (active) setLoading(false); });
    const reload = () => setAttempt(value => value + 1);
    window.addEventListener('focus', reload);
    window.addEventListener('storage', reload);
    return () => { active = false; window.removeEventListener('focus', reload); window.removeEventListener('storage', reload); };
  }, [currentUser.id, attempt]);
  return <section aria-label="我的目标进度" className="lg:col-span-6 overflow-hidden rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)]">
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border-main)] px-4 py-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]"><GoalIcon />我的目标进度</h2>
      <Button type="link" size="small" aria-label="查看更多我的目标进度" onClick={() => openPageTab('wb_okr_perf')}>查看更多</Button>
    </div>
    <div className="max-h-80 space-y-6 overflow-y-auto p-4">
      {loading ? <Skeleton active paragraph={{ rows: 3 }}/> : error ? <Alert type="error" showIcon title="目标进度加载失败" description={error} action={<Button size="small" onClick={() => setAttempt(value => value + 1)}>重试</Button>}/> : !goals.length ? <Empty description="本月暂无与我有关的部门目标"/> : goals.map(({ record, progress }) => <article key={record.id} className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2"><h3 className="break-words text-sm font-semibold text-[var(--text-primary)]">O：{record.payload.title}</h3><p className="text-xs text-[var(--text-muted)]">周期：{record.periodKey} · 截止：{record.payload.deadline || '未设置'}</p></div>
          <div className="shrink-0 text-right"><span className="text-2xl font-semibold text-[var(--primary)]">{progress}%</span><p className="text-xs text-[var(--text-muted)]">整体进度</p></div>
        </div>
        {(record.payload.keyResults || []).map((kr, index) => <section key={kr.id} aria-label={`KR${index + 1}`} className="space-y-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4">
          <div className="flex items-start justify-between gap-4 text-sm"><h4 className="min-w-0 break-words font-medium">KR{index + 1}：{supervisorKrTitle(kr)}</h4><span className="shrink-0 font-semibold">{percent(kr.progress)}%</span></div>
          <Progress percent={percent(kr.progress)} showInfo={false} size="small"/>
          <div className="flex flex-wrap justify-between gap-2 text-xs text-[var(--text-muted)]"><span>权重：{kr.weight}%</span><span>截止：{kr.deadline || '未设置'}</span></div>
          {krDetails(kr).map((detail, detailIndex) => <div key={detail.id} className="space-y-2 border-t border-[var(--border-main)] pt-3">
            <div className="flex items-start justify-between gap-4 text-xs"><span className="min-w-0 break-words">子 KR{index + 1}.{detailIndex + 1}：{[detail.name, detail.version, detail.targetStage || detail.stage].filter(Boolean).join(' · ')}</span><span className="shrink-0">{percent(detail.progress)}%</span></div>
            <Progress percent={percent(detail.progress)} showInfo={false} size="small"/>
            <p className="text-xs text-[var(--text-muted)]">截止：{detail.plannedEndDate || kr.deadline || '未设置'}</p>
          </div>)}
        </section>)}
      </article>)}
    </div>
  </section>;
}
