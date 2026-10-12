import React, { useRef, useState } from 'react';
import { Alert, Button, Drawer, Input, InputNumber, Select, Space } from 'antd';
import { PlusIcon, SearchIcon, TrashIcon } from '@primer/octicons-react';
import { validateGoalTemplate, type GoalTemplate, type GoalTemplateCategory, type GoalTemplateDraft, type GoalTemplateKr } from '../../../services/goalTemplateRepository';

interface Props {
  template?: GoalTemplate; categories: GoalTemplateCategory[];
  onClose: () => void; onSave: (draft: GoalTemplateDraft, existing?: GoalTemplate) => Promise<void>;
  onAddCategory: (name: string) => Promise<GoalTemplateCategory>;
}
const newKr = (): GoalTemplateKr => ({ id: crypto.randomUUID(), title: '', confidence: 5, weight: 100, currentValue: 0, targetValue: 100 });
export const GoalTemplateEditor: React.FC<Props> = ({ template, categories, onClose, onSave, onAddCategory }) => {
  const [draft, setDraft] = useState<GoalTemplateDraft>(() => template ? { categoryId: template.categoryId, description: template.description, title: template.title, keyResults: template.keyResults.map(kr => ({ ...kr })) } : { categoryId: 'uncategorized', description: '', title: '', keyResults: [newKr()] });
  const [categoryName, setCategoryName] = useState('');
  const [busy, setBusy] = useState(false);
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [error, setError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const lock = useRef(false);
  const categoryLock = useRef(false);
  const updateKr = (id: string, changes: Partial<GoalTemplateKr>) => setDraft(current => ({ ...current, keyResults: current.keyResults.map(kr => kr.id === id ? { ...kr, ...changes } : kr) }));
  const submit = async () => {
    if (lock.current || categoryLock.current) return;
    const validation = validateGoalTemplate(draft);
    if (validation) { setError(validation); return; }
    lock.current = true; setBusy(true); setError('');
    try { await onSave(draft, template); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '模板保存失败，请重试'); }
    finally { lock.current = false; setBusy(false); }
  };
  const addCategory = async () => {
    if (categoryLock.current || lock.current) return;
    const name = categoryName.trim();
    if (!name || name.length > 40) { setCategoryError('分类名称须为 1–40 个字符'); return; }
    if (categories.some(category => category.name.toLocaleLowerCase() === name.toLocaleLowerCase())) { setCategoryError('岗位/分类已存在'); return; }
    categoryLock.current = true; setCategoryBusy(true); setCategoryError('');
    try { const category = await onAddCategory(name); setDraft(current => ({ ...current, categoryId: category.id })); setCategoryName(''); }
    catch (reason) { setCategoryError(reason instanceof Error ? reason.message : '新增分类失败，请重试'); }
    finally { categoryLock.current = false; setCategoryBusy(false); }
  };
  const blocked = busy || categoryBusy;
  return <Drawer open title={template ? '编辑企业模板' : '新建企业模板'} placement="bottom" size="100dvh" rootClassName="goal-template-drawer" maskClosable={false} keyboard={!blocked} closable={!blocked} onClose={onClose}>
    <div className="goal-template-editor">
      <div className="goal-template-field"><label htmlFor="goal-template-category"><span className="goal-template-required">*</span> 岗位/分类：</label><Select id="goal-template-category" aria-label="岗位/分类" className="goal-template-category-select" showSearch optionFilterProp="label" suffixIcon={<SearchIcon/>} value={draft.categoryId} disabled={busy} options={categories.map(category => ({ value: category.id, label: category.name, disabled: categoryBusy }))} onChange={categoryId => setDraft(current => ({ ...current, categoryId }))} popupRender={menu => <>{menu}<div className="goal-template-category-add"><Space.Compact><Input aria-label="新增岗位/分类" placeholder="新增岗位/分类" maxLength={40} value={categoryName} disabled={blocked} onChange={event => { setCategoryName(event.target.value); setCategoryError(''); }} onKeyDown={event => { event.stopPropagation(); if (event.key === 'Enter') { event.preventDefault(); void addCategory(); } }}/><Button type="primary" icon={<PlusIcon/>} loading={categoryBusy} disabled={busy || !categoryName.trim()} onClick={() => void addCategory()}>新增</Button></Space.Compact>{categoryError && <Alert type="error" title={categoryError} showIcon/>}</div></>}/></div>
      <div className="goal-template-field"><label htmlFor="goal-template-description">使用说明：</label><Input id="goal-template-description" className="goal-template-description" placeholder="使用说明可以帮助员工更好地理解这个模板" maxLength={500} value={draft.description} disabled={blocked} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))}/></div>
      {error && <Alert role="alert" type="error" title={error} showIcon/>}
      <section className="goal-template-objective" aria-label="模板目标与关键结果">
        <div className="goal-template-metric-labels"><span/><span>信心</span><span>权重</span><span>量化结果</span><span/></div>
        <div className="goal-template-objective-heading"><div className="goal-template-title-input"><span className="goal-template-objective-badge">O1</span><Input aria-label="模板目标名称" variant="borderless" placeholder="输入目标名称：目标表达精准，确保可被上下对齐" maxLength={200} value={draft.title} disabled={blocked} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))}/></div><span>5</span><span>100%</span><span>—</span><span/></div>
        <div className="goal-template-kr-list">{draft.keyResults.map((kr, index) => <div key={kr.id} className="goal-template-kr-row"><div className="goal-template-title-input"><span className="goal-template-kr-label">KR{index + 1}</span><Input aria-label={`KR${index + 1}名称`} variant="borderless" placeholder="输入KR名称：遵循SMART原则（具体、可衡量、可达成、相关性、时效性）" maxLength={300} value={kr.title} disabled={blocked} onChange={event => updateKr(kr.id, { title: event.target.value })}/></div><InputNumber aria-label={`KR${index + 1}信心`} min={1} max={10} precision={0} value={kr.confidence} disabled={blocked} onChange={value => updateKr(kr.id, { confidence: value ?? 0 })}/><InputNumber aria-label={`KR${index + 1}权重`} min={1} max={100} precision={0} suffix="%" value={kr.weight} disabled={blocked} onChange={value => updateKr(kr.id, { weight: value ?? 0 })}/><div className="goal-template-quantified"><InputNumber aria-label={`KR${index + 1}当前值`} min={0} value={kr.currentValue} disabled={blocked} onChange={value => updateKr(kr.id, { currentValue: value ?? -1 })}/><span>/</span><InputNumber aria-label={`KR${index + 1}目标值`} min={0.01} value={kr.targetValue} disabled={blocked} onChange={value => updateKr(kr.id, { targetValue: value ?? 0 })}/></div><Button type="text" aria-label={`删除KR${index + 1}`} icon={<TrashIcon/>} disabled={blocked || draft.keyResults.length === 1} onClick={() => setDraft(current => ({ ...current, keyResults: current.keyResults.filter(item => item.id !== kr.id) }))}/></div>)}</div>
        <Button type="text" className="goal-template-add-kr" icon={<PlusIcon/>} disabled={blocked || draft.keyResults.length >= 20} onClick={() => setDraft(current => ({ ...current, keyResults: [...current.keyResults, { ...newKr(), weight: 1 }] }))}>添加关键结果</Button>
        <footer className="goal-template-editor-footer"><span>KR 权重合计：{draft.keyResults.reduce((sum, kr) => sum + kr.weight, 0)}%</span><Button onClick={onClose} disabled={blocked}>取消</Button><Button type="primary" loading={busy} disabled={categoryBusy} onClick={() => void submit()}>确定</Button></footer>
      </section>
    </div>
  </Drawer>;
};
