import { useEffect, useState } from 'react';
import { Alert, Button, Empty, Progress } from 'antd';
import { BookIcon } from '@primer/octicons-react';
import { useApp } from '../../context/AppContext';
import { loadTraining, trainingSummary } from '../../services/trainingRepository';

export function WorkbenchLearningCard() {
  const { currentUser, openPageTab } = useApp();
  const [rows, setRows] = useState<Array<{ id: string; title: string; progress: number; status: string }>>([]);
  const [error, setError] = useState('');
  const reload = () => {
    try {
      const summary = trainingSummary(loadTraining(currentUser.id));
      setRows(summary.courses.map(course => {
        const records = summary.records.filter(row => row.course.id === course.id);
        const completed = records.filter(row => row.record?.status === '已完成').length;
        const status = records.some(row => row.record?.status === '需重学') ? '需重学' : records.length && completed === records.length ? '已完成' : records.some(row => row.record && row.record.status !== '未开始') ? '学习中' : '未开始';
        return { id: course.id, title: course.title, progress: records.length ? Math.round(completed / records.length * 100) : 0, status };
      }).sort((a, b) => ['需重学','学习中','未开始','已完成'].indexOf(a.status) - ['需重学','学习中','未开始','已完成'].indexOf(b.status)));
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '培训数据加载失败'); }
  };
  useEffect(() => {
    reload();
    window.addEventListener('focus', reload); window.addEventListener('storage', reload); window.addEventListener('shichuang.training.changed', reload);
    return () => { window.removeEventListener('focus', reload); window.removeEventListener('storage', reload); window.removeEventListener('shichuang.training.changed', reload); };
  }, [currentUser.id]);
  return <section aria-label="我的学习" className="lg:col-span-6 overflow-hidden rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)]">
    <div className="flex items-center justify-between border-b border-[var(--border-main)] px-4 py-4"><h2 className="flex items-center gap-2 text-sm font-semibold"><BookIcon />我的学习</h2><Button size="small" type="link" onClick={() => openPageTab('training_learning')}>查看更多</Button></div>
    <div className="max-h-80 space-y-4 overflow-y-auto p-4">{error ? <Alert type="error" showIcon title="学习记录加载失败" description={error} action={<Button onClick={reload}>重试</Button>}/> : !rows.length ? <Empty description="暂无学习课程"/> : rows.slice(0,5).map(row => <article key={row.id} className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4"><div className="flex justify-between gap-4"><span className="min-w-0 break-words text-sm font-semibold">{row.title}</span><span className="shrink-0 text-xs text-[var(--text-muted)]">{row.status}</span></div><Progress percent={row.progress} size="small"/><Button size="small" type="link" onClick={() => { sessionStorage.setItem('shichuang.training.openCourse', row.id); openPageTab('training_learning'); }}>{row.status === '未开始' ? '开始学习' : row.status === '已完成' ? '查看课程' : '继续学习'}</Button></article>)}</div>
  </section>;
}
