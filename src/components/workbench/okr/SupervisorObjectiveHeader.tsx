import { Tag } from 'antd';
import { CircleIcon, MeterIcon, GoalIcon } from '@primer/octicons-react';
import type { OKRItem } from '../../../types';
import type { OkrKrReview } from '../../../services/okrRepository';
import { supervisorObjectiveSummary } from '../../../services/supervisorSupportPanels';
import dayjs from 'dayjs';
import './supervisorReview.css';
const labels = { ahead: '超预期', normal: '正常', risk: '风险', overdue: '逾期' };

export function SupervisorObjectiveHeader({ objective, reviews, index }: { objective: OKRItem; reviews: OkrKrReview[]; index: number }) {
  const summary = supervisorObjectiveSummary(objective, reviews, dayjs().format('YYYY-MM-DD'));
  return <div className="okr-supervisor-objective-header">
    <Tag color="blue" className="m-0">O{index + 1}</Tag>
    <div className="okr-supervisor-objective-info">
      <strong className="okr-supervisor-objective-title" title={objective.objective}>{objective.objective}</strong>
      <div className="okr-supervisor-objective-metrics">
        <span aria-label={`目标权重 ${summary.weight}%`} title="目标权重"><GoalIcon/>{summary.weight}%</span>
        <span aria-label={`目标进度 ${summary.previousProgress}% → ${summary.currentProgress}%`} title="根据 KR 权重自动计算"><MeterIcon/>{summary.previousProgress}%<span aria-hidden="true">→</span><MeterIcon/>{summary.currentProgress}%</span>
        <span className={`okr-supervisor-execution-state is-${summary.status}`} aria-label={`目标状态：${labels[summary.status]}`}><CircleIcon/>{labels[summary.status]}</span>
      </div>
    </div>
  </div>;
}
