import { Alert, Button, Empty, Tag } from 'antd';
import type { ReviewPeriod, ReviewType } from '../../../services/okrReviewRules';
import type { ReviewTemplate } from '../../../services/okrReviewTemplates';
import { reviewEditorState } from '../../../services/okrReviewTemplates';

export function ReviewTemplateGate({ template, type, period, recordStatus, onCancel }: {
  template?: ReviewTemplate; type: ReviewType; period: ReviewPeriod; recordStatus?: string; onCancel: () => void;
}) {
  const name = template === 'supervisor' ? '主管' : template === 'boss' ? '老板' : '人员';
  const reviewName = type === 'week' ? '周报' : '月报';
  const state = reviewEditorState(recordStatus);
  return <section className="review-document-container max-w-6xl mx-auto space-y-4" aria-label={`${name}${reviewName}模板`}>
    <header className="okr-review-sticky-toolbar flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-2"><h2 className="m-0 text-base font-bold">{name}{reviewName}</h2><Tag color={state.color}>{state.label}</Tag><span className="text-xs text-[var(--text-muted)]">{period.startDate} 至 {period.endDate}</span></div>
      <Button onClick={onCancel}>返回</Button>
    </header>
    <Alert type={template ? 'info' : 'warning'} showIcon title={template ? `${name}${reviewName}模板待配置` : '人员角色尚未确认'} description={template ? `${name}使用独立复盘模板，字段与填写规则尚未确定。已保存复盘可在我的复盘中查看；补交权限仍沿用统一日期设置。` : '请确认组织人员资料后重新进入。'}/>
    <Empty description={template ? `暂无已配置的${name}${reviewName}模板` : '暂无已确认的人员角色'}/>
  </section>;
}
