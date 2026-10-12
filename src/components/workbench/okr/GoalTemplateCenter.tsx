import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Drawer, Empty, Modal, Spin, Tabs, Tooltip } from 'antd';
import { LinkIcon, PencilIcon, TrashIcon } from '@primer/octicons-react';
import { goalTemplatePayload, goalTemplateRepository, type GoalTemplate, type GoalTemplateDraft } from '../../../services/goalTemplateRepository';
import type { OkrPayload } from '../../../services/okrRepository';
import { GoalTemplateEditor } from './GoalTemplateEditor';
import './goalTemplates.css';

interface Props { open: boolean; viewerId: string; administrator: boolean; onClose: () => void; onUse: (payload: OkrPayload) => void }
export const GoalTemplateCenter: React.FC<Props> = ({ open, viewerId, administrator, onClose, onUse }) => {
  const catalog = useQuery({ queryKey: ['okr-goal-templates', viewerId], queryFn: goalTemplateRepository.catalog, enabled: open, refetchOnWindowFocus: false });
  const [source, setSource] = useState<'enterprise' | 'recommended'>('enterprise');
  const [categoryId, setCategoryId] = useState('all');
  const [editing, setEditing] = useState<GoalTemplate | 'new'>();
  const [deleting, setDeleting] = useState<GoalTemplate>();
  const [busyId, setBusyId] = useState('');
  const [actionError, setActionError] = useState('');
  const lock = useRef(false);
  const templates = (catalog.data?.templates || []).filter(template => template.source === source && (categoryId === 'all' || template.categoryId === categoryId));
  const save = async (draft: GoalTemplateDraft, existing?: GoalTemplate) => { await goalTemplateRepository.save(draft, viewerId, existing); setEditing(undefined); await catalog.refetch(); };
  const useTemplate = async (template: GoalTemplate) => {
    if (lock.current) return;
    lock.current = true; setBusyId(template.id); setActionError('');
    try { const used = await goalTemplateRepository.use(template); onUse(goalTemplatePayload(used)); }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : '模板使用失败，请重试'); }
    finally { lock.current = false; setBusyId(''); }
  };
  const remove = async () => {
    if (!deleting || lock.current) return;
    lock.current = true; setBusyId(deleting.id); setActionError('');
    try { await goalTemplateRepository.remove(deleting, viewerId); setDeleting(undefined); await catalog.refetch(); }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : '删除失败，请重试'); }
    finally { lock.current = false; setBusyId(''); }
  };
  return <Drawer title="模板中心" open={open} placement="bottom" size="calc(100dvh - 3rem)" rootClassName="goal-template-drawer company-copy-modal" destroyOnHidden onClose={onClose} closable={!busyId} keyboard={!busyId} maskClosable={false}>
    <div className="goal-template-center">
      <Tabs activeKey={source} onChange={key => { setSource(key as typeof source); setActionError(''); }} items={[{ key: 'enterprise', label: '企业模板' }, { key: 'recommended', label: '推荐模板' }]}/>
      <div className="goal-template-filter-row"><div className="goal-template-filters" aria-label="岗位分类筛选"><span>岗位/分类：</span>{[{ id: 'all', name: '全部' }, ...(catalog.data?.categories || [])].map(category => <Button type="text" key={category.id} aria-pressed={categoryId === category.id} className={categoryId === category.id ? 'is-active' : ''} onClick={() => setCategoryId(category.id)}>{category.name}</Button>)}</div>{source === 'enterprise' && <Button type="primary" disabled={catalog.isPending || catalog.isError || !!busyId} onClick={() => setEditing('new')}>新建模板</Button>}</div>
      {actionError && <Alert role="alert" type="error" title={actionError} showIcon action={<Button onClick={() => { setActionError(''); void catalog.refetch(); }} disabled={!!busyId}>刷新</Button>}/>}
      {catalog.isPending ? <div className="goal-template-empty"><Spin description="加载模板中"><div className="goal-template-loading-space"/></Spin></div> : catalog.isError ? <Alert type="error" title="模板加载失败" description={catalog.error.message} showIcon action={<Button loading={catalog.isFetching} onClick={() => void catalog.refetch()}>重试</Button>}/> : templates.length ? <div className="goal-template-grid">{templates.map(template => <article className="goal-template-card" key={template.id}>
        <header><span className="goal-template-card-badge">O</span><div><strong>{template.title}</strong><p>{template.description || catalog.data?.categories.find(category => category.id === template.categoryId)?.name}</p></div></header>
        <ol aria-label={`${template.title}的关键结果`}>{template.keyResults.map((kr, index) => <li key={kr.id}><span>KR{index + 1}</span><span>{kr.title}</span></li>)}</ol>
        <footer><Tooltip title="使用模板创建目标"><Button type="text" icon={<LinkIcon/>} loading={busyId === template.id && !deleting} disabled={!!busyId} onClick={() => void useTemplate(template)}>引用 {template.usageCount}</Button></Tooltip>{template.source === 'enterprise' && (administrator || template.creatorId === viewerId) && <><Tooltip title="编辑模板"><Button type="text" aria-label={`编辑模板：${template.title}`} icon={<PencilIcon/>} disabled={!!busyId} onClick={() => setEditing(template)}/></Tooltip><Tooltip title="删除模板"><Button type="text" aria-label={`删除模板：${template.title}`} icon={<TrashIcon/>} disabled={!!busyId} onClick={() => { setActionError(''); setDeleting(template); }}/></Tooltip></>}</footer>
      </article>)}</div> : <div className="goal-template-empty"><Empty description={source === 'recommended' ? '暂无推荐模板' : categoryId === 'all' ? '暂无企业模板，创建模板后可用于添加目标' : '当前岗位/分类暂无模板'}/></div>}
    </div>
    {editing && <GoalTemplateEditor template={editing === 'new' ? undefined : editing} categories={catalog.data?.categories || []} onClose={() => setEditing(undefined)} onSave={save} onAddCategory={async name => { const category = await goalTemplateRepository.addCategory(name); await catalog.refetch(); return category; }}/>}
    <Modal title="删除模板" open={!!deleting} okText="删除" cancelText="取消" confirmLoading={!!busyId} okButtonProps={{ danger: true }} cancelButtonProps={{ disabled: !!busyId }} closable={!busyId} keyboard={!busyId} mask={{ closable: false }} onCancel={() => { setDeleting(undefined); setActionError(''); }} onOk={() => void remove()}><p>确定删除模板“{deleting?.title}”吗？已使用此模板创建的目标保留。</p>{actionError && <Alert type="error" title={actionError}/>}</Modal>
  </Drawer>;
};
