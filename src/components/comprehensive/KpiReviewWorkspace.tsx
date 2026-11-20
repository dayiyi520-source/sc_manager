import React, { useState } from 'react';
import { Button, Input, message } from 'antd';
import { KpiPublishedResult } from './KpiPublishedResult';
import { gradeForScore, scoreForEmployee, type KpiEmployee, type KpiPeriod } from '../../services/kpiPerformanceDemo';
import { summarizeDepartmentPerformance } from '../../services/kpiPerformancePublication';
import { blankAdjustments, reviewBookFor, type ModuleAdjustments, type ReviewActor } from '../../services/kpiReviewModel';
import { approveModuleReview, canAdjustModules, saveModuleReview, type ReviewContext } from '../../services/kpiModuleReview';

export const KpiReviewWorkspace: React.FC<{ employee: KpiEmployee; period: KpiPeriod; context: ReviewContext; onChange: (next: KpiPeriod) => void }> = ({ employee, period, context, onChange }) => {
  const actor = context.role as ReviewActor;
  const book = reviewBookFor(employee);
  const [values, setValues] = useState<ModuleAdjustments>(() => structuredClone(book.drafts[actor] || book.active[actor] || blankAdjustments()));
  const [performanceComment, setPerformanceComment] = useState(() => book.commentDrafts?.主管?.text ?? book.comments?.主管?.text ?? '');
  const [revision, setRevision] = useState(book.revision);
  const [saving, setSaving] = useState(false);
  const [api, holder] = message.useMessage();
  const editable = canAdjustModules(period, employee, context);
  const previewBook = reviewBookFor(employee);
  if (actor === 'HR' && employee.reviewStatus === '待HR复审' && previewBook.drafts.主管) previewBook.active.主管 = previewBook.drafts.主管;
  if (editable) previewBook.active[actor] = values;
  if (editable && actor === '主管') previewBook.commentDrafts = { ...previewBook.commentDrafts, 主管: { text: performanceComment, name: context.name, at: '' } };
  const preview = editable || employee.reviewBook ? { ...employee, reviewBook: previewBook } : employee;
  const save = (action: 'draft' | 'submit' | 'apply') => {
    setSaving(true);
    try {
      const next = saveModuleReview(period, employee.id, context, values, action, revision, performanceComment);
      onChange(next);
      setRevision([...next.employees, ...(next.supervisors || [])].find(e => e.id === employee.id)?.reviewBook?.revision ?? revision);
      api.success(action === 'submit' ? '已提交 HR 复审' : action === 'apply' ? '评分已生效' : '草稿已保存');
    } catch (error) { api.error(error instanceof Error ? error.message : '保存失败'); }
    finally { setSaving(false); }
  };
  const [returnReason, setReturnReason] = useState('');
  const approve = (decision: 'approve' | 'return' = 'approve') => {
    try { onChange(approveModuleReview(period, employee.id, context, decision, returnReason)); api.success(decision === 'approve' ? '审核通过' : '已退回主管修改'); }
    catch (error) { api.error(error instanceof Error ? error.message : '审核失败'); }
  };
  const summary = summarizeDepartmentPerformance([employee], period.departmentCoefficients)[0];
  const dirty = JSON.stringify(values) !== JSON.stringify(book.drafts[actor] || book.active[actor] || blankAdjustments());
  return <section className="kpi-unified-review" aria-label={`${employee.name}评分复核`}>
    {holder}
    <KpiPublishedResult employee={preview} month={context.month} departmentSummary={summary} finalCoefficient={gradeForScore(scoreForEmployee(preview)).coefficient} published={period.published} editor={editable ? { actor, values, onChange: setValues } : undefined} commentEditor={editable && actor === '主管' ? { value: performanceComment, onChange: setPerformanceComment } : undefined} />
    <div className="kpi-review-actions">
      {editable && actor === '主管' && <><Button loading={saving} onClick={() => save('draft')}>保存草稿</Button><Button type="primary" loading={saving} onClick={() => save('submit')}>提交当前员工给 HR 复审</Button></>}
      {editable && actor !== '主管' && <Button type="primary" loading={saving} onClick={() => save('apply')}>{actor === '老板' ? '确认主管绩效评定' : '保存 HR 调分'}</Button>}
      {context.role === 'HR' && !period.published && employee.reviewStatus === '待HR复审' && <><Button disabled={dirty} onClick={() => approve()}>审核通过</Button><Input aria-label="退回说明" placeholder="退回原因" value={returnReason} onChange={event => setReturnReason(event.target.value)} /><Button disabled={!returnReason.trim() || dirty} onClick={() => approve('return')}>退回主管修改</Button></>}
    </div>
    {!!employee.reviewBook?.history.length && <details className="kpi-review-audit"><summary>评分操作记录</summary>{employee.reviewBook.history.slice().reverse().map(record => <p key={record.id}>{record.actor} · {record.name} · {record.action} · {record.at}</p>)}</details>}
  </section>;
}
