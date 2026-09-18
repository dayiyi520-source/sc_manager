import React, { useMemo, useState } from 'react';
import { Alert, Avatar, Button, Empty, Form, Input, Modal, Select, Space, Spin, Table, Tag, Tooltip } from 'antd';
import { EditOutlined, MailOutlined, PhoneOutlined, PlusOutlined, ReloadOutlined, StopOutlined, UndoOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building, Shield, UserCheck, Users } from '@/components/common/octicons-compat';
import { PageHeader, SearchBar } from '@/components/common';
import { useApp } from '../../context/AppContext';
import { teamRepository, type TeamMemberInput } from '../../services/teamRepository';
import type { TeamMember } from '../../types';

type FormValues = Required<Pick<TeamMemberInput, 'name' | 'department' | 'jobTitle'>> & Pick<TeamMemberInput, 'phone' | 'email'>;

export const TeamOrgView: React.FC = () => {
  const { addToast } = useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [keyword, setKeyword] = useState('');
  const [department, setDepartment] = useState('');
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const membersQuery = useQuery({ queryKey: ['team-members'], queryFn: () => teamRepository.list(), retry: false });
  const departmentsQuery = useQuery({ queryKey: ['team-member-departments'], queryFn: teamRepository.departments, retry: false });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['team-members'] });
  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => editing
      ? teamRepository.update(editing.id, { ...values, version: editing.version })
      : teamRepository.create(values),
    onSuccess: async () => {
      await Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: ['team-member-options'] })]);
      addToast('success', editing ? '成员信息已更新' : '成员已添加');
      setFormOpen(false);
      setEditing(null);
      form.resetFields();
    },
    onError: (error) => addToast('error', editing ? '成员更新失败' : '成员添加失败', error instanceof Error ? error.message : '请稍后重试'),
  });
  const statusMutation = useMutation({
    mutationFn: (member: TeamMember) => teamRepository.updateStatus(member.id, member.status === 'enabled' ? 'disabled' : 'enabled', member.version),
    onSuccess: async (_, member) => {
      await Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: ['team-member-options'] })]);
      addToast('success', member.status === 'enabled' ? '成员已停用' : '成员已启用');
    },
    onError: (error) => addToast('error', '成员状态更新失败', error instanceof Error ? error.message : '请稍后重试'),
  });

  const members = membersQuery.data || [];
  const departments = departmentsQuery.data || [];
  const visibleMembers = useMemo(() => members.filter((member) => {
    const query = keyword.trim().toLowerCase();
    const matchesKeyword = !query || [member.name, member.jobTitle, member.department].some((value) => value.toLowerCase().includes(query));
    return matchesKeyword && (!department || member.department === department);
  }), [department, keyword, members]);
  const departmentCounts = useMemo(() => new Map(departments.map((item) => [item, members.filter((member) => member.status === 'enabled' && member.department === item).length])), [departments, members]);
  const activeCount = members.filter((member) => member.status === 'enabled').length;

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setFormOpen(true);
  };
  const openEdit = (member: TeamMember) => {
    setEditing(member);
    form.setFieldsValue({ name: member.name, department: member.department, jobTitle: member.jobTitle, phone: member.phone, email: member.email });
    setFormOpen(true);
  };
  const confirmStatus = (member: TeamMember) => {
    Modal.confirm({
      title: member.status === 'enabled' ? `确认停用“${member.name}”？` : `确认启用“${member.name}”？`,
      content: member.status === 'enabled' ? '停用后该成员将不能再被选择为新的业务负责人，历史记录仍会保留。' : '启用后该成员将重新出现在业务负责人候选列表中。',
      okText: member.status === 'enabled' ? '停用' : '启用',
      okButtonProps: { danger: member.status === 'enabled' },
      cancelText: '取消',
      onOk: () => statusMutation.mutateAsync(member),
    });
  };

  const columns = [
    { title: '成员', dataIndex: 'name', key: 'name', render: (name: string, member: TeamMember) => <div className="flex min-w-0 items-center gap-3"><Avatar className="shrink-0 bg-[var(--primary)]">{name.slice(0, 1)}</Avatar><div className="min-w-0"><div className="truncate font-semibold text-[var(--text-primary)]">{name}</div><div className="truncate text-xs text-[var(--text-muted)]">{member.jobTitle}</div></div></div> },
    { title: '部门', dataIndex: 'department', key: 'department', render: (value: string) => <span className="inline-flex items-center gap-2 text-[var(--text-body)]"><Building className="h-4 w-4 text-[var(--text-muted)]" />{value}</span> },
    { title: '联系方式', key: 'contact', render: (_: unknown, member: TeamMember) => <div className="space-y-1 text-xs text-[var(--text-muted)]"><div className="flex items-center gap-2"><PhoneOutlined />{member.phone || '未填写'}</div><div className="flex items-center gap-2"><MailOutlined />{member.email || '未填写'}</div></div> },
    { title: '状态', dataIndex: 'status', key: 'status', render: (value: TeamMember['status'], member: TeamMember) => <Space size={6}><Tag color={value === 'enabled' ? 'success' : 'default'}>{value === 'enabled' ? '在职' : '已停用'}</Tag>{member.loginEnabled && <Tooltip title="唯一登录账号"><Tag color="blue">超级管理员</Tag></Tooltip>}</Space> },
    { title: '操作', key: 'action', align: 'right' as const, render: (_: unknown, member: TeamMember) => <Space size="small"><Button type="text" icon={<EditOutlined />} aria-label={`编辑${member.name}`} onClick={() => openEdit(member)} /><Tooltip title={member.loginEnabled ? '超级管理员不能停用' : member.status === 'enabled' ? '停用' : '启用'}><Button type="text" danger={member.status === 'enabled'} disabled={member.loginEnabled || statusMutation.isPending} icon={member.status === 'enabled' ? <StopOutlined /> : <UndoOutlined />} aria-label={`${member.status === 'enabled' ? '停用' : '启用'}${member.name}`} onClick={() => confirmStatus(member)} /></Tooltip></Space> },
  ];

  return <div className="space-y-5">
    <PageHeader title="团队与组织" subtitle="统一维护业务负责人和产品线成员的员工名录" actions={[<Button key="add" type="primary" icon={<PlusOutlined />} onClick={openCreate}>添加成员</Button>]} />
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="flex items-center gap-3 border-b border-[var(--border-main)] px-1 py-3"><Users className="h-5 w-5 text-[var(--primary)]" /><div><div className="text-xs text-[var(--text-muted)]">团队成员</div><div className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{members.length} 人</div></div></div>
      <div className="flex items-center gap-3 border-b border-[var(--border-main)] px-1 py-3"><UserCheck className="h-5 w-5 text-[var(--success)]" /><div><div className="text-xs text-[var(--text-muted)]">在职人员</div><div className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{activeCount} 人</div></div></div>
      <div className="flex items-center gap-3 border-b border-[var(--border-main)] px-1 py-3"><Shield className="h-5 w-5 text-[var(--warning)]" /><div><div className="text-xs text-[var(--text-muted)]">登录账号</div><div className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{members.filter((member) => member.loginEnabled).length} 个</div></div></div>
    </div>
    {(membersQuery.isError || departmentsQuery.isError) && <Alert type="error" showIcon title="团队组织加载失败" description={(membersQuery.error || departmentsQuery.error)?.message || '请检查服务连接后重试'} action={<Button icon={<ReloadOutlined />} onClick={() => { void membersQuery.refetch(); void departmentsQuery.refetch(); }}>重试</Button>} />}
    <div className="grid min-h-0 grid-cols-1 gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="border-r border-[var(--border-main)] pr-4">
        <div className="mb-3 text-xs font-semibold text-[var(--text-muted)]">部门</div>
        <div className="space-y-1">
          <button type="button" onClick={() => setDepartment('')} className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${!department ? 'bg-[var(--primary)]/15 text-[var(--active-text)]' : 'text-[var(--text-body)] hover:bg-[var(--bg-surface-soft)]'}`}><span>全部成员</span><span className="text-xs">{activeCount}</span></button>
          {departments.map((item) => <button type="button" key={item} onClick={() => setDepartment(item)} className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${department === item ? 'bg-[var(--primary)]/15 text-[var(--active-text)]' : 'text-[var(--text-body)] hover:bg-[var(--bg-surface-soft)]'}`}><span className="truncate">{item}</span><span className="ml-2 text-xs">{departmentCounts.get(item) || 0}</span></button>)}
        </div>
      </aside>
      <section className="min-w-0 space-y-4">
        <SearchBar placeholder="搜索姓名、职位或部门" value={keyword} onChange={setKeyword} />
        {membersQuery.isLoading || departmentsQuery.isLoading ? <div className="flex min-h-72 items-center justify-center"><Spin description="正在加载团队组织" /></div> : <Table<TeamMember> rowKey="id" columns={columns} dataSource={visibleMembers} pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 名成员` }} scroll={{ x: 880 }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={keyword || department ? '没有符合条件的成员' : '暂无团队成员'} /> }} />}
      </section>
    </div>
    <Modal open={formOpen} title={editing ? '编辑团队成员' : '添加团队成员'} okText="保存" cancelText="取消" confirmLoading={saveMutation.isPending} onCancel={() => { if (!saveMutation.isPending) { setFormOpen(false); setEditing(null); form.resetFields(); } }} onOk={() => form.submit()} destroyOnHidden>
      <Form<FormValues> form={form} layout="vertical" requiredMark="optional" className="pt-3" onFinish={(values) => saveMutation.mutate(values)}>
        <Form.Item name="name" label="姓名" rules={[{ required: true, whitespace: true, message: '请输入员工姓名' }, { max: 128, message: '姓名不能超过128个字符' }]}><Input placeholder="请输入员工姓名" autoFocus /></Form.Item>
        <Form.Item name="department" label="所属部门" rules={[{ required: true, message: '请选择所属部门' }]}><Select showSearch optionFilterProp="label" placeholder="请选择所属部门" options={departments.map((item) => ({ value: item, label: item }))} /></Form.Item>
        <Form.Item name="jobTitle" label="职位" rules={[{ required: true, whitespace: true, message: '请输入职位' }, { max: 128, message: '职位不能超过128个字符' }]}><Input placeholder="例如：产品经理" /></Form.Item>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Form.Item name="phone" label="手机号" rules={[{ max: 32, message: '手机号不能超过32个字符' }]}><Input placeholder="选填" /></Form.Item>
          <Form.Item name="email" label="企业邮箱" rules={[{ type: 'email', message: '请输入有效邮箱' }]}><Input placeholder="选填" /></Form.Item>
        </div>
        {!editing && <Alert type="info" showIcon title="成员仅用于业务配置，不会创建登录账号或密码。" />}
      </Form>
    </Modal>
  </div>;
};
