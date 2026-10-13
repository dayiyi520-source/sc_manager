import React, { useMemo, useState } from 'react';
import { Alert, Button, Checkbox, Empty, Input, InputNumber, Modal, Select, Switch, Tag, message } from 'antd';
import { ArrowDownIcon, ArrowUpIcon, LinkIcon, PencilIcon, PlusIcon, TrashIcon, EyeIcon, XIcon } from '@primer/octicons-react';
import type { OkrTemplate } from '../../../services/okrRepository';
import { departmentTemplates } from '../../../services/okrTemplates';
import { KR_TEMPLATE_LABELS } from './KrTemplateConfiguration';

type DemoObjective = { id: string; title: string; guidance: string; weight: number; required: boolean; types: string[] };
type GoalTemplate = { id: string; category: string; title: string; description: string; objectives: DemoObjective[]; references: number; enabled?: boolean; allowAdd?: boolean };

const defaultObjectives = (): DemoObjective[] => [
  { id: 'o1', title: '产品方案与设计质量', guidance: '填写方案交付、原型质量及评审结果的可衡量目标', weight: 30, required: true, types: ['product'] },
  { id: 'o2', title: '产研交付与版本迭代', guidance: '填写本月版本交付范围、质量及计划节点', weight: 30, required: true, types: ['product'] },
  { id: 'o3', title: '项目支持与部门协作', guidance: '填写项目支持结果和跨部门协作的验收要求', weight: 20, required: true, types: ['delivery', 'support'] },
  { id: 'o4', title: '能力提升与改进', guidance: '填写业务改进、知识沉淀及能力提升成果', weight: 20, required: false, types: ['support'] },
];

const demoTemplates = (): GoalTemplate[] => [
  { id: 'company-1', category: '公司层面', title: '公司9月份各项产出成果为全年目标助关键之力', description: '月度OKR模板', references: 5, objectives: [
    { id: 'kr1', title: '公司内全员绩效管理和产研高效运营出高质量制度体系', guidance: '', weight: 0, required: false, types: [] },
    { id: 'kr2', title: '商机落地项目数量和渠道管控与支持取得明显收获', guidance: '', weight: 0, required: false, types: [] },
    { id: 'kr3', title: '产品需求和交互设计继续规范化加快推进', guidance: '', weight: 0, required: false, types: [] },
    { id: 'kr4', title: '充分利用AI协助提升研发效率和质量来满足公司产品布局和项目交付需要', guidance: '', weight: 0, required: false, types: [] },
    { id: 'kr5', title: '新项目规范化实施交付及老项目运维保障推进', guidance: '', weight: 0, required: false, types: [] },
  ] },
  { id: 'company-2', category: '公司层面', title: '希望在全年最为紧张的11月份为高质量完成全年目标打下坚实基础', description: '2025年11月份模板', references: 1, objectives: [
    { id: 'kr1', title: '公司内部各项管理制度进入试运行阶段', guidance: '', weight: 0, required: false, types: [] },
    { id: 'kr2', title: '顶住压力以痛并快乐着的心态走出全年目标和市场拓展探索到1的第一步', guidance: '', weight: 0, required: false, types: [] },
    { id: 'kr3', title: '集中资源聚焦公司拳头产品真正落实公司产品化战略为后续拓展全国市场助力', guidance: '', weight: 0, required: false, types: [] },
    { id: 'kr4', title: '配合做好产品高质量交付和真正做好交付用户前的走查工作', guidance: '', weight: 0, required: false, types: [] },
  ] },
  { id: 'company-3', category: '未分类', title: '在全年最为关键月份各项工作取得骄人业绩', description: '月度目标模板', references: 3, objectives: [
    { id: 'kr1', title: '公司内部各项管理制度进入试运行阶段', guidance: '', weight: 0, required: false, types: [] },
    { id: 'kr2', title: '全力冲刺支持各地伙伴落地今年项目进入商务阶段', guidance: '', weight: 0, required: false, types: [] },
    { id: 'kr3', title: '产品需求迭代设计规范化加快推进', guidance: '', weight: 0, required: false, types: [] },
    { id: 'kr4', title: '产品高质量交互设计和交付用户前的走查工作深入持续扎实推进', guidance: '', weight: 0, required: false, types: [] },
    { id: 'kr5', title: '充分利用AI协助提升研发效率和搭建测试团队提升产品质量满足项目交付需要', guidance: '', weight: 0, required: false, types: [] },
  ] },
].map(template => ({ ...template, enabled: true, allowAdd: false, objectives: template.objectives.map((item, index, rows) => ({ ...item, guidance: item.title, weight: Math.floor(100 / rows.length) + (index === rows.length - 1 ? 100 % rows.length : 0) })) }));

function GoalTemplateCard({ template, readOnly, onReference, onEdit, onDelete }: { key?: React.Key; template: GoalTemplate; readOnly?: boolean; onReference: () => void; onEdit: () => void; onDelete: () => void }) {
  return <article className="okr-department-template-card">
    <header className="okr-department-template-card-header">
      <span className="okr-department-template-badge">O</span>
      <div><h3>{template.title}</h3><p>{template.description}</p></div>
    </header>
    <div className="okr-department-template-krs" aria-label={`${template.title}关键结果列表`}>
      {template.objectives.map((objective, index) => <div className="okr-department-template-kr" key={objective.id}><span>KR{index + 1}</span><p>{objective.title}</p></div>)}
    </div>
    <footer className="okr-department-template-card-footer">
      <Button type="text" icon={<LinkIcon />} disabled={readOnly} onClick={onReference}>引用 {template.references}</Button>
      <Button type="text" icon={<PencilIcon />} disabled={readOnly} aria-label={`编辑${template.title}`} onClick={onEdit}>编辑</Button>
      <Button type="text" danger icon={<TrashIcon />} disabled={readOnly} onClick={onDelete} aria-label={`删除${template.title}`} />
    </footer>
  </article>;
}

export function DepartmentGoalTemplateDemo({ departments, templates, readOnly }: { departments: string[]; templates: OkrTemplate[]; readOnly?: boolean }) {
  const [mode, setMode] = useState<'catalog' | 'editor'>('catalog');
  const [category, setCategory] = useState('全部');
  const [department, setDepartment] = useState(departments.includes('产品规划部') ? '产品规划部' : departments[0]);
  const [name, setName] = useState('月度目标四 O 模板');
  const [description, setDescription] = useState('月度部门目标配置模板');
  const [enabled, setEnabled] = useState(true);
  const [allowAdd, setAllowAdd] = useState(false);
  const [objectives, setObjectives] = useState<DemoObjective[]>(defaultObjectives);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const [catalog, setCatalog] = useState<GoalTemplate[]>(demoTemplates);
  const configured = [...new Set(departmentTemplates({ templates } as import('../../../services/okrRepository').OkrSettings, department).map(item => item.type))];
  const categories = useMemo(() => [...new Set(['全部', '未分类', ...catalog.map(item => item.category).filter(Boolean)])], [catalog]);
  const visibleTemplates = category === '全部' ? catalog : catalog.filter(item => item.category === category);
  const total = objectives.reduce((sum, item) => sum + item.weight, 0);
  const patch = (id: string, change: Partial<DemoObjective>) => { setObjectives(rows => rows.map(row => row.id === id ? { ...row, ...change } : row)); setSaved(false); setError(''); };
  const move = (index: number, offset: number) => { setObjectives(rows => { const next = [...rows]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; return next; }); setSaved(false); };
  const openNew = () => { setEditingId(null); setEnabled(true); setAllowAdd(false); setName('月度目标四 O 模板'); setDescription('月度部门目标配置模板'); setObjectives(defaultObjectives()); setSaved(false); setError(''); setMode('editor'); };
  const openEdit = (template: GoalTemplate) => { setEditingId(template.id); setDepartment(template.category); setEnabled(template.enabled !== false); setAllowAdd(template.allowAdd === true); setName(template.title); setDescription(template.description); setObjectives(template.objectives.map(item => ({...item, types: [...item.types]}))); setSaved(false); setError(''); setMode('editor'); };
  const save = () => {
    if (!department || !name.trim() || !description.trim()) { setError('请选择部门并填写模板名称和使用说明'); return; }
    if (total !== 100 || objectives.some(item => !item.title.trim() || !item.guidance.trim() || item.weight < 1 || !Number.isInteger(item.weight))) { setError('请填写每条 O 名称与填写说明，权重须为正整数且合计 100%'); return; }
    const next: GoalTemplate = { id: editingId || crypto.randomUUID(), category: department || '未分类', title: name.trim(), description: description.trim(), objectives, enabled, allowAdd, references: editingId ? catalog.find(item => item.id === editingId)?.references || 0 : 0 };
    setCatalog(items => editingId ? items.map(item => item.id === editingId ? next : item) : [next, ...items]); setCategory('全部'); setMode('catalog'); setSaved(true); message.success(editingId ? '模板已更新' : '模板已创建');
  };
  const reference = (template: GoalTemplate) => { setCatalog(items => items.map(item => item.id === template.id ? { ...item, references: item.references + 1 } : item)); message.info('演示引用次数已增加，未创建月度目标'); };
  const remove = (template: GoalTemplate) => Modal.confirm({ title: '删除部门目标模板', content: `确定删除“${template.title}”吗？已引用的目标不会受到影响。`, okText: '删除', cancelText: '取消', okButtonProps: { danger: true }, onOk: () => { setCatalog(items => items.filter(item => item.id !== template.id)); message.success('模板已删除'); } });
  if (mode === 'catalog') return <div className="okr-department-goal-demo">
    <span className="okr-department-demo-note">前端演示 · 保存仅保留在当前设置页，暂未关联添加目标</span>
    {saved && <Alert type="success" showIcon title="模板已保存，可继续查看或编辑" closable onClose={() => setSaved(false)} />}
    <div className="okr-department-template-toolbar"><div className="okr-department-template-filters" role="tablist" aria-label="部门模板分类">{categories.map(item => <Button key={item} type="text" role="tab" aria-selected={category === item} className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>{item}</Button>)}</div><Button type="primary" icon={<PlusIcon />} disabled={readOnly} onClick={openNew}>新建模板</Button></div>
    {visibleTemplates.length === 0 ? <Empty description="暂无部门目标模板" /> : <div className="okr-department-template-grid">{visibleTemplates.map(template => <GoalTemplateCard key={template.id} template={template} readOnly={readOnly} onReference={() => reference(template)} onEdit={() => openEdit(template)} onDelete={() => remove(template)} />)}</div>}
  </div>;

  return <div className="okr-department-goal-demo okr-department-goal-editor">
    <div className="okr-department-editor-toolbar"><Button type="text" icon={<XIcon />} onClick={() => setMode('catalog')}>返回模板列表</Button><strong>{editingId ? '编辑部门目标模板' : '新建部门目标模板'}</strong></div>
    <Alert type="info" showIcon title="前端演示" description="部门目标模板仅用于本设置页演示，暂不与添加目标流程关联。" />
    <div className="okr-department-template-basics"><label><span>适用部门</span><Select aria-label="目标模板部门" value={department} disabled={readOnly} placeholder="请选择部门" options={[...new Set([...departments, ...catalog.map(item => item.category)])].map(value => ({ value, label: value }))} onChange={value => { setDepartment(value); setSaved(false); }} /></label><label><span>模板名称</span><Input aria-label="部门模板名称" maxLength={80} value={name} disabled={readOnly} onChange={event => { setName(event.target.value); setSaved(false); }} /></label><label className="okr-department-template-description"><span>使用说明</span><Input aria-label="部门模板使用说明" maxLength={200} value={description} disabled={readOnly} onChange={event => { setDescription(event.target.value); setSaved(false); }} /></label><label><span>启用模板</span><Switch aria-label="启用部门模板" checked={enabled} disabled={readOnly} onChange={setEnabled} /></label><label><span>允许追加 O</span><Switch aria-label="允许追加O" checked={allowAdd} disabled={readOnly} onChange={setAllowAdd} /></label></div>
    <div className="okr-department-editor-heading"><h2>O 结构（{objectives.length}）</h2><Tag color={total === 100 ? 'success' : 'error'}>权重合计 {total}%</Tag></div>
    <div className="okr-department-objectives">{objectives.map((item, index) => <article key={item.id}><header><Tag color="blue">O{index + 1}</Tag><Input aria-label={`O${index + 1}名称`} placeholder="目标名称或填写提示" maxLength={255} value={item.title} disabled={readOnly} onChange={event => patch(item.id, { title: event.target.value })} /><InputNumber aria-label={`O${index + 1}默认权重`} min={1} max={100} precision={0} suffix="%" value={item.weight} disabled={readOnly} onChange={weight => patch(item.id, { weight: weight ?? 0 })} /><Checkbox checked={item.required} disabled={readOnly} onChange={event => patch(item.id, { required: event.target.checked })}>必填</Checkbox><Button aria-label={`上移O${index + 1}`} type="text" icon={<ArrowUpIcon />} disabled={readOnly || index === 0} onClick={() => move(index, -1)} /><Button aria-label={`下移O${index + 1}`} type="text" icon={<ArrowDownIcon />} disabled={readOnly || index === objectives.length - 1} onClick={() => move(index, 1)} /><Button aria-label={`移除O${index + 1}`} danger type="text" icon={<TrashIcon />} disabled={readOnly || objectives.length === 1} onClick={() => { setObjectives(rows => rows.filter(row => row.id !== item.id)); setSaved(false); }} /></header><label><span>填写说明</span><Input.TextArea aria-label={`O${index + 1}填写说明`} rows={2} maxLength={500} value={item.guidance} disabled={readOnly} onChange={event => patch(item.id, { guidance: event.target.value })} /></label><label><span>默认 KR 类型</span><Select aria-label={`O${index + 1}默认KR类型`} mode="multiple" placeholder="请选择默认 KR 类型" value={item.types} disabled={readOnly} options={Object.entries(KR_TEMPLATE_LABELS).map(([value, label]) => ({ value, label, disabled: !configured.includes(value) }))} onChange={types => patch(item.id, { types })} /></label>{item.types.some(type => !configured.includes(type)) && <small>示例包含当前部门未配置的 KR 类型，可在 KR 模板中配置后使用。</small>}</article>)}</div>
    <Button icon={<PlusIcon />} disabled={readOnly || objectives.length >= 8} onClick={() => { setObjectives(rows => [...rows, { id: crypto.randomUUID(), title: '', guidance: '', weight: 0, required: false, types: [] }]); setSaved(false); }}>添加 O</Button>
    {error && <Alert type="error" title={error} showIcon />}{saved && <Alert type="success" title="演示配置已保存，可预览当前模板" showIcon />}
    <Modal open={preview} title={name} onCancel={() => setPreview(false)} footer={<Button onClick={() => setPreview(false)}>关闭预览</Button>}><p>{department} · {enabled ? '已启用' : '已停用'} · {allowAdd ? '允许追加 O' : '固定 O 结构'}</p>{objectives.map((item, index) => <section className="okr-department-template-preview" key={item.id}><h3>O{index + 1} · {item.title}<Tag>{item.weight}%</Tag></h3><p>{item.guidance}</p></section>)}</Modal>
    <footer><Button onClick={() => setMode('catalog')}>取消</Button><Button icon={<EyeIcon />} onClick={() => setPreview(true)}>预览模板</Button><Button type="primary" disabled={readOnly} onClick={save}>保存模板</Button></footer>
  </div>;
}
