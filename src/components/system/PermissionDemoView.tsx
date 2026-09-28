import React, { useMemo, useState } from 'react';
import { Select, Tag } from 'antd';
import Card from 'antd/es/card/Card';
import { EyeOutlined, SafetyCertificateOutlined, StopOutlined } from '@ant-design/icons';

type OrganizationRole = 'admin' | 'product' | 'design' | 'development' | 'testing' | 'delivery' | 'sales' | 'other';
type ProductMemberRole = 'none' | 'creator' | '管理员' | '产品' | '设计' | '研发' | '测试' | '交付主管' | '参与人';
type ProductVisibility = 'public' | 'private';
type PermissionStatus = '查看权限' | '编辑权限' | '不可查看';

interface PermissionItem {
  name: string;
  read: string;
  write: string;
  workflow?: boolean;
}

const ORGANIZATION_ROLE_OPTIONS = [
  { value: 'admin', label: '系统管理员' },
  { value: 'product', label: '产品部门' },
  { value: 'design', label: '设计部门' },
  { value: 'development', label: '研发部门' },
  { value: 'testing', label: '测试部门' },
  { value: 'delivery', label: '交付部门' },
  { value: 'sales', label: '销售部门' },
  { value: 'other', label: '其他部门' }
] as const;

const PRODUCT_MEMBER_OPTIONS = [
  { value: 'none', label: '非成员' },
  { value: 'creator', label: '该产品创建人' },
  { value: '管理员', label: '管理员' },
  { value: '产品', label: '产品' },
  { value: '设计', label: '设计' },
  { value: '研发', label: '研发' },
  { value: '测试', label: '测试' },
  { value: '交付主管', label: '交付主管' },
  { value: '参与人', label: '参与人' }
] as const;

const PRODUCT_VISIBILITY_OPTIONS = [
  { value: 'public', label: '公开产品' },
  { value: 'private', label: '私密产品' }
] as const;

const PERMISSION_ITEMS: PermissionItem[] = [
  { name: '产品管理', read: '查看产品列表、产品详情和成员信息', write: '新建产品，维护基本信息、成员、责任人及产品设置' },
  { name: '版本迭代', read: '查看迭代列表、详情和版本规划', write: '新建、编辑或删除版本，安排工作项并调整版本状态' },
  { name: '产品任务', read: '查看产品任务列表、详情和子任务', write: '新建、编辑、分配、关联或删除任务，并按流程流转', workflow: true },
  { name: '设计任务', read: '查看设计任务列表、详情和子任务', write: '新建、编辑、分配或删除任务，并按流程流转', workflow: true },
  { name: '研发任务', read: '查看研发任务列表、详情和子任务', write: '新建、编辑、分配或删除任务，并按流程流转', workflow: true },
  { name: '测试任务', read: '查看测试任务、用例库和测试报告', write: '维护任务、用例与目录，执行测试并维护报告', workflow: true },
  { name: '缺陷管理', read: '查看缺陷列表、详情和关联信息', write: '提报、编辑、分配或删除缺陷，并按流程流转', workflow: true },
  { name: '版本评审', read: '查看版本评审列表和详情', write: '新建、编辑、提交或删除版本评审' }
];

const ALL_PRODUCT_MENUS = PERMISSION_ITEMS.map((item) => item.name);
const ORGANIZATION_EDIT_MENUS: Record<OrganizationRole, string[]> = {
  admin: ALL_PRODUCT_MENUS,
  product: ['产品管理', '版本迭代', '产品任务', '版本评审'],
  design: ['设计任务'],
  development: ['研发任务', '缺陷管理'],
  testing: ['测试任务', '缺陷管理'],
  delivery: ['版本迭代', '测试任务', '版本评审'],
  sales: [],
  other: []
};
const MEMBER_EDIT_MENUS: Record<ProductMemberRole, string[]> = {
  none: [],
  creator: ALL_PRODUCT_MENUS,
  管理员: ALL_PRODUCT_MENUS,
  产品: ['产品管理', '版本迭代', '产品任务', '版本评审'],
  设计: ['设计任务'],
  研发: ['研发任务', '缺陷管理'],
  测试: ['测试任务', '缺陷管理'],
  交付主管: ['版本迭代', '测试任务', '版本评审'],
  参与人: []
};

const statusTag = (status: PermissionStatus) => {
  if (status === '编辑权限') return <Tag color="success" icon={<SafetyCertificateOutlined />}>{status}</Tag>;
  if (status === '查看权限') return <Tag color="processing" icon={<EyeOutlined />}>{status}</Tag>;
  return <Tag icon={<StopOutlined />}>{status}</Tag>;
};

export const PermissionDemoView: React.FC = () => {
  const [organizationRole, setOrganizationRole] = useState<OrganizationRole>('product');
  const [memberRole, setMemberRole] = useState<ProductMemberRole>('none');
  const [visibility, setVisibility] = useState<ProductVisibility>('public');

  const result = useMemo(() => {
    const isProductMember = memberRole !== 'none';
    const canViewProduct = organizationRole === 'admin' || visibility === 'public' || isProductMember;
    const editableMenus = new Set([
      ...ORGANIZATION_EDIT_MENUS[organizationRole],
      ...MEMBER_EDIT_MENUS[memberRole]
    ]);
    const permissions = PERMISSION_ITEMS.map((item) => ({
      ...item,
      status: (!canViewProduct ? '不可查看' : editableMenus.has(item.name) ? '编辑权限' : '查看权限') as PermissionStatus
    }));
    const overallStatus: PermissionStatus = !canViewProduct ? '不可查看' : editableMenus.size ? '编辑权限' : '查看权限';
    const summary = visibility === 'public'
      ? '公开产品对组织成员开放查看，具体编辑范围由部门级角色和产品成员身份共同决定。'
      : organizationRole === 'admin'
        ? '私密产品仅创建人、产品成员和系统管理员可访问；当前系统管理员可以查看并管理。'
        : !isProductMember
          ? '当前身份不是该产品创建人或产品成员，因此不能查看或操作这个私密产品。'
          : '当前身份是该产品创建人或产品成员，可以查看；具体编辑范围由角色决定。';
    return { permissions, overallStatus, summary };
  }, [memberRole, organizationRole, visibility]);

  const organizationLabel = ORGANIZATION_ROLE_OPTIONS.find((item) => item.value === organizationRole)?.label;
  const memberLabel = PRODUCT_MEMBER_OPTIONS.find((item) => item.value === memberRole)?.label;
  const templateStatus: PermissionStatus = organizationRole === 'admin' ? '编辑权限' : '查看权限';

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-main)] pb-3">
        <div>
          <div className="text-[11px] text-[var(--primary)]">系统与组织 / 权限演示</div>
          <h1 className="mt-1 text-lg font-bold text-[var(--text-primary)]">角色可见与操作范围</h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">选择部门角色、产品成员身份和产品可见性，查看该身份能看到什么、能做什么。</p>
        </div>
        <Tag>权限演示</Tag>
      </header>

      <Card className="border-[var(--border-main)] bg-[var(--bg-surface)]" styles={{ body: { padding: 16 } }}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="space-y-1.5 text-xs text-[var(--text-muted)]">
            <span>部门级角色</span>
            <Select className="w-full" value={organizationRole} options={[...ORGANIZATION_ROLE_OPTIONS]} onChange={setOrganizationRole} />
          </label>
          <label className="space-y-1.5 text-xs text-[var(--text-muted)]">
            <span>产品成员身份</span>
            <Select className="w-full" value={memberRole} options={[...PRODUCT_MEMBER_OPTIONS]} onChange={setMemberRole} />
          </label>
          <label className="space-y-1.5 text-xs text-[var(--text-muted)]">
            <span>产品可见性</span>
            <Select className="w-full" value={visibility} options={[...PRODUCT_VISIBILITY_OPTIONS]} onChange={setVisibility} />
          </label>
        </div>
      </Card>

      <div className="rounded-md border border-[var(--border-main)] border-l-[3px] border-l-[var(--primary)] bg-[var(--bg-surface)] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <strong className="text-base font-medium text-[var(--text-primary)]">{organizationLabel} · {memberLabel}</strong>
          {statusTag(result.overallStatus)}
        </div>
        <p className="mt-1 text-xs text-[var(--text-body)]">{result.summary}</p>
      </div>

      <section aria-label="产研管理菜单权限" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">他可以看到什么、做什么</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">编辑权限包含查看权限；工作项状态流转仍受各自业务流程约束。</p>
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">查看权限 / 编辑权限 / 不可查看</span>
        </div>
        <div className="overflow-hidden rounded-md border border-[var(--border-main)] bg-[var(--bg-surface)]">
          {result.permissions.map((item) => (
            <div key={item.name} className="grid grid-cols-1 gap-2 border-b border-[var(--border-main)] px-4 py-3 last:border-b-0 md:grid-cols-[140px_minmax(0,1fr)_110px] md:items-start md:gap-4">
              <strong className="text-sm font-medium text-[var(--text-primary)]">{item.name}</strong>
              <div className="text-xs text-[var(--text-body)]">
                {item.status === '不可查看' ? '不能进入该菜单，也不能查看或操作该产品数据。' : item.status === '查看权限' ? item.read : `${item.read}；${item.write}。`}
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                  {item.status === '不可查看'
                    ? '私密产品仅创建人、产品成员和系统管理员可以访问。'
                    : item.status === '查看权限'
                      ? '只可查看，不显示或不可执行新增、编辑、删除等操作。'
                      : item.workflow
                        ? '可以执行工作项操作，状态变更仍遵循已配置的流程。'
                        : '可以查看并执行该菜单内的新增、修改及管理操作。'}
                </p>
              </div>
              <div className="md:text-right">{statusTag(item.status)}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-2 rounded-md border border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-4 py-3 text-xs md:flex-row md:items-center md:justify-between">
        <div>
          <strong className="font-medium text-[var(--text-primary)]">系统与组织 · 产研模板</strong>
          <p className="mt-1 text-[var(--text-muted)]">{templateStatus === '编辑权限' ? '可以查看、新增、编辑、删除子类型并维护状态流程。' : '可以查看模板配置，不能新增、编辑或删除。'}</p>
        </div>
        {statusTag(templateStatus)}
      </div>

      <p className="border-t border-[var(--border-main)] pt-3 text-[11px] text-[var(--text-muted)]">
        权限口径：公开产品对所有部门开放查看；私密产品仅创建人、产品成员和系统管理员可以查看或操作。部门级角色与产品成员身份任一具备编辑范围时，取两者编辑范围的并集。
      </p>
    </div>
  );
};
