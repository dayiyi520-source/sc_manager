import React, { useEffect, useState } from 'react';
import { Button, Tabs } from 'antd';
import { WorkItemModuleView } from './WorkItemModuleView';
import { NotificationSettingsPanel } from '../product/NotificationSettingsPanel';
import { AutomationRulesPanel } from '../product/AutomationRulesPanel';
import { WorkItemCategoryPanel } from './WorkItemCategoryPanel';
import { WorkItemFieldConfigurationPanel } from './WorkItemFieldConfigurationPanel';
import { productRepository, type WorkItemCategoryDefinition } from '../../services/productRepository';

type Section = 'dictionary' | 'work-items' | 'roles' | 'notifications' | 'automation';
const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: 'dictionary', label: '产研字典' }, { id: 'work-items', label: '工作项模板' },
  { id: 'roles', label: '角色与职责' }, { id: 'notifications', label: '通知与提醒' },
  { id: 'automation', label: '自动化配置' }
];
const ROLES = [
  ['管理员', '管理产品成员与设置'], ['参与人', '参与产品协作'], ['产品', '负责产品需求与规划'],
  ['设计', '负责设计任务'], ['研发', '负责研发任务'], ['测试', '负责测试任务'], ['交付主管', '负责交付协作']
];

const DictionaryPanel = () => {
  const [tab, setTab] = useState<'fields' | 'categories'>('fields');
  const [categories, setCategories] = useState<WorkItemCategoryDefinition[]>([]);
  useEffect(() => { void productRepository.workItemCategories().then(setCategories).catch(() => undefined); }, []);
  return <div className="mx-auto w-full max-w-5xl space-y-5 text-xs">
    <div><h3 className="text-sm font-bold text-[var(--text-primary)]">产研字典</h3><p className="mt-1 text-[var(--text-muted)]">字段结构为只读概览；工作项分类可统一维护显示名称、图标和启用状态。</p></div>
    <Tabs activeKey={tab} onChange={(key) => setTab(key as 'fields' | 'categories')} items={[{ key: 'fields', label: '工作项字段', children: <WorkItemFieldConfigurationPanel categories={categories} /> }, { key: 'categories', label: '工作项分类', children: <WorkItemCategoryPanel /> }]} />
  </div>;
};
const RolesPanel = () => <div className="mx-auto w-full max-w-4xl space-y-4 text-xs">
  <div><h3 className="text-sm font-bold text-[var(--text-primary)]">角色与职责</h3><p className="mt-1 text-[var(--text-muted)]">当前添加产品成员时使用的角色。全局角色编辑与权限配置尚未启用。</p></div>
  <div className="overflow-hidden rounded-md border border-[var(--border-main)]"><div className="grid grid-cols-[minmax(130px,1fr)_minmax(200px,2fr)_140px] gap-4 border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-4 py-3 text-[var(--text-muted)]"><span>角色</span><span>职责</span><span className="text-right">操作</span></div>{ROLES.map(([role, duty]) => <div key={role} className="grid grid-cols-[minmax(130px,1fr)_minmax(200px,2fr)_140px] items-center gap-4 border-b border-[var(--border-main)] px-4 py-3 last:border-0"><span className="font-medium text-[var(--text-primary)]">{role}</span><span className="text-[var(--text-body)]">{duty}</span><span className="text-right"><Button size="small" disabled title="权限配置尚未启用">权限配置</Button></span></div>)}</div>
</div>;

export const ResearchTemplateView: React.FC = () => {
  const [section, setSection] = useState<Section>('work-items');
  return <div className="research-template-view space-y-5 animate-in fade-in duration-200">
    <header className="border-b border-[var(--border-main)] pb-3"><h1 className="text-lg font-bold text-[var(--text-primary)]">产研模板</h1><p className="mt-1 text-xs text-[var(--text-muted)]">预设新产品的工作项、通知和自动化配置。</p></header>
    <div className="grid min-h-[520px] grid-cols-1 border border-[var(--border-main)] bg-[var(--bg-surface)] md:grid-cols-[190px_minmax(0,1fr)]">
      <nav aria-label="产研模板菜单" className="flex gap-1 overflow-x-auto border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-3 md:block md:overflow-visible md:border-b-0 md:border-r">
        <div className="mb-4 hidden border-b border-[var(--border-main)] px-3 pb-4 select-none md:block"><h2 className="text-base font-bold text-[var(--text-primary)]">产研模板</h2><p className="mt-2 text-xs text-[var(--text-muted)]">新产品初始配置</p></div>
        {SECTIONS.map((item) => <button key={item.id} type="button" onClick={() => setSection(item.id)} aria-current={section === item.id ? 'page' : undefined} className={`mb-1 flex h-9 shrink-0 items-center rounded-md px-3 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] md:w-full ${section === item.id ? 'bg-[var(--primary)]/12 text-[var(--active-text)]' : 'text-[var(--text-body)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'}`}>{item.label}</button>)}
      </nav>
      <section className="min-w-0 p-4 md:p-6" aria-label={SECTIONS.find((item) => item.id === section)?.label}>
        {section === 'dictionary' && <DictionaryPanel />}
        {section === 'work-items' && <WorkItemModuleView />}
        {section === 'roles' && <RolesPanel />}
        {section === 'notifications' && <NotificationSettingsPanel scope="template" />}
        {section === 'automation' && <AutomationRulesPanel scope="template" />}
      </section>
    </div>
  </div>;
};
