import React, { useEffect, useRef, useState } from 'react';
import { Button, DatePicker, Input, InputNumber, Select, Tabs } from 'antd';
import dayjs from 'dayjs';
import { RequirementTasksView, type WorkItemDetailContext } from './RequirementTasksView';
import { CollapsibleDescription } from './CollapsibleDescription';
import { LazyRichTextEditor as RichTextEditor } from './LazyRichTextEditor';
import { employeeSelectOptions } from '../common/PersonIdentity';

const truncateTitle = (value: string, maxLength = 30) => value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;

const TestTaskDetail: React.FC<WorkItemDetailContext> = ({ task, parent, onOpenParent, editing, onUpdate, employeeOptions, versions, statusControl }) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [descriptionHtml, setDescriptionHtml] = useState(task.descriptionHtml || '');
  const descriptionEditor = useRef<HTMLDivElement | null>(null);
  useEffect(() => { setTitle(task.title); setDescription(task.description || ''); setDescriptionHtml(task.descriptionHtml || ''); }, [task.id, task.title, task.description, task.descriptionHtml]);
  const productTaskTitle = task.requirementTitle || task.sourceWorkOrderTitles?.[0] || '未关联';
  const lineVersions = versions.filter((version) => !version.productLineName || version.productLineName === task.productLineName);
  const basicInfo = <div className="test-task-basic-info">
    <div className="test-task-basic-grid">
      <label><span>负责人</span><Select disabled={!editing} showSearch optionFilterProp="label" value={task.ownerName || undefined} options={employeeSelectOptions(employeeOptions, 'name')} onChange={(ownerName) => onUpdate({ ownerName })} placeholder="未设置" /></label>
      <label><span>状态</span><div>{statusControl}</div></label>
      <label><span>优先级</span><Select disabled={!editing} value={task.priority || undefined} options={['P0', 'P1', 'P2', 'P3'].map((value) => ({ value, label: value }))} onChange={(priority) => onUpdate({ priority })} placeholder="未设置" /></label>
      <label><span>迭代版本</span><Select disabled={!editing} allowClear showSearch optionFilterProp="label" value={task.versionId || undefined} options={lineVersions.map((version) => ({ label: version.name, value: version.id }))} onChange={(versionId) => onUpdate({ versionId, versionName: lineVersions.find((version) => version.id === versionId)?.name || '' })} placeholder="未设置" /></label>
      <label><span>产品</span><Input disabled value={task.productLineName || '未设置'} /></label>
      <label><span>计划开始时间</span><DatePicker disabled={!editing} value={task.plannedStartDate ? dayjs(task.plannedStartDate) : null} onChange={(date) => onUpdate({ plannedStartDate: date?.format('YYYY-MM-DD') || '' })} placeholder="未设置" /></label>
      <label><span>计划完成时间</span><DatePicker disabled={!editing} value={task.dueDate ? dayjs(task.dueDate) : null} onChange={(date) => onUpdate({ dueDate: date?.format('YYYY-MM-DD') || '' })} placeholder="未设置" /></label>
      <label><span>预计工时（小时）</span><InputNumber disabled={!editing} min={0} precision={2} value={task.estimatedHours || 0} onChange={(estimatedHours) => onUpdate({ estimatedHours: estimatedHours || 0 })} /></label>
      <label><span>实际工时（小时）</span><InputNumber disabled={!editing} min={0} precision={2} value={task.actualHours || 0} onChange={(actualHours) => onUpdate({ actualHours: actualHours || 0 })} /></label>
    </div>
    <section className="test-task-basic-description"><h3>任务描述</h3>{editing ? <RichTextEditor key={`test-detail-${task.id}`} editor={descriptionEditor} value={description} htmlValue={descriptionHtml} onInput={(text, html) => { setDescription(text); setDescriptionHtml(html); }} onBlur={() => onUpdate({ description, descriptionHtml })} placeholder="详细记录测试范围、环境和验收标准..." /> : <CollapsibleDescription value={description} emptyText="未填写任务描述" />}</section>
  </div>;
  return <div className="test-task-detail-page"><header className="test-task-detail-header">{editing ? <Input className="test-task-detail-title-input" value={title} onChange={(event) => setTitle(event.target.value)} onBlur={() => { const nextTitle = title.trim(); if (nextTitle && nextTitle !== task.title) onUpdate({ title: nextTitle }); else setTitle(task.title); }} /> : <h2 className="test-task-detail-title">{task.title}</h2>}<div className="test-task-detail-meta"><span title={productTaskTitle}>产品任务：{truncateTitle(productTaskTitle)}</span><i /> <span>产品/版本号：{task.productLineName || '未设置'} / {task.versionName || '未设置'}</span><i /> <span>负责人：{task.ownerName || '未设置'}</span></div>{parent && <div className="test-task-parent-reference"><span>父级任务</span><button type="button" onClick={onOpenParent} title={String(parent.title || '')}><span className="test-task-parent-code font-mono">{String(parent.code || '')}</span><span className="test-task-parent-title">{String(parent.title || '')}</span></button></div>}</header><Tabs className="test-task-detail-tabs" items={[{ key: 'basic', label: '基本信息', children: basicInfo }]} /></div>;
};

export const TestTaskWorkspace: React.FC<{ productLineFilter?: string }> = ({ productLineFilter = 'all' }) => <RequirementTasksView productLineFilter={productLineFilter} itemLabel="测试任务" taskKind="test" createPolicy={{ allowedChildTypeNames: ['用例编写', '测试任务', '测试验收', '安全测试', '回归测试'] }} renderDetail={(context) => <TestTaskDetail {...context} />} />;
