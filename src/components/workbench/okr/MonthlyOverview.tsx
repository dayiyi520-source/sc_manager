import { Alert, Button, Skeleton } from 'antd';
import type { MonthlyReviewMetrics } from '../../../services/monthlyReviewMetrics';
import type { MonthlyProgressPoint } from '../../../services/monthlyProgress';
import { FileIcon, GoalIcon } from '@primer/octicons-react';

export function MonthlyOverview({ progress, points = [], metrics, loading, error, department, onRetry }: {
  progress?: number; points?: MonthlyProgressPoint[]; metrics?: MonthlyReviewMetrics; loading?: boolean; error?: boolean; department?: boolean; onRetry?: () => void;
}) {
  const value = (number?: number, hours = false) => loading ? <Skeleton.Input active size="small"/> : error || number == null ? '—' : `${number}${hours ? ' 小时' : ''}`;
  const coordinates = points.map((point, index) => ({ ...point, x: points.length > 1 ? 8 + index * 144 / (points.length - 1) : 80, y: 52 - point.progress * .44 }));
  const totalHours = department ? metrics?.departmentTotalHours : metrics?.totalHours;
  return <>
    <section className="okr-monthly-metrics" aria-label="月度概览" aria-busy={loading}>
      <div className="okr-monthly-trend-metric"><span><strong>本月整体进度</strong><b>{progress == null ? '—' : `${progress}%`}</b></span>
        {coordinates.length > 0 && <svg className="okr-monthly-sparkline" viewBox="0 0 160 60" role="img" aria-label="本月周报与月报进度趋势">
          {coordinates.slice(1).map((point, index) => <line key={`line:${point.id}`} className={point.monthly ? 'is-monthly' : undefined} x1={coordinates[index].x} y1={coordinates[index].y} x2={point.x} y2={point.y}/>)}
          {coordinates.map(point => <circle key={point.id} className={point.monthly ? 'is-monthly' : undefined} cx={point.x} cy={point.y} r="3"><title>{point.date}：{point.progress}%</title></circle>)}
        </svg>}
      </div>
      <div><GoalIcon/><span><strong>本月任务</strong><b>{value(department ? metrics?.departmentTaskCount : metrics?.taskCount)}</b></span></div>
      <div><FileIcon/><span><strong>协同事项</strong><b>{value(department ? metrics?.departmentCollaborationCount : metrics?.collaborationCount)}</b></span></div>
      <div><FileIcon/><span><strong>总工时</strong><b>{value(totalHours, true)}</b><small>部门人均 {value(metrics?.departmentAverageHours, true)}</small></span></div>
      <div><FileIcon/><span><strong>加班时长</strong><b>{value(metrics?.overtimeHours, true)}</b><small>部门人均 {value(metrics?.departmentAverageOvertimeHours, true)}</small></span></div>
    </section>
    {!loading && (error || metrics?.departmentUnavailable) && <Alert type="error" showIcon title={error ? '月度统计加载失败' : '部门对比数据暂不可用'} action={onRetry && <Button onClick={onRetry}>重试</Button>}/>}
  </>;
}
