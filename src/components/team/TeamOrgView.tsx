import React, { useState } from 'react';
import { Button, Space, Avatar } from 'antd';
import { PlusOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { Users, Building, Shield, UserCheck, Briefcase } from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import {
  PageHeader,
  SearchBar,
  FilterPanel,
  DataTable,
  StatusBadge,
  FormModal,
  FormInput,
  FormSelect,
  message,
} from '@/components/common';
import { StatCard } from '@/components/common/UIComponents';

interface TeamMember {
  id: string;
  name: string;
  title: string;
  dept: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive';
}

export const TeamOrgView: React.FC = () => {
  const { addToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    dept: '',
    phone: '',
    email: '',
  });

  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: 'm-1',
      name: '陈志远',
      title: '华东区商务总经理',
      dept: '商务大区与市场部',
      phone: '138-0011-8899',
      email: 'chen.zhiyuan@shichuang.com',
      status: 'active'
    },
    {
      id: 'm-2',
      name: '王雪琴',
      title: '交付副总监',
      dept: '工程交付与运维部',
      phone: '139-2233-4455',
      email: 'wang.xueqin@shichuang.com',
      status: 'active'
    },
    {
      id: 'm-3',
      name: '李天成',
      title: '首席架构师',
      dept: '产品研发与技术中心',
      phone: '186-5566-7788',
      email: 'li.tiancheng@shichuang.com',
      status: 'active'
    },
    {
      id: 'm-4',
      name: '张美玲',
      title: '高级产品经理',
      dept: '产品研发与技术中心',
      phone: '151-9988-7766',
      email: 'zhang.meiling@shichuang.com',
      status: 'active'
    },
    {
      id: 'm-5',
      name: '刘建国',
      title: '财务经理',
      dept: '财务与资金管理部',
      phone: '136-7788-5544',
      email: 'liu.jianguo@shichuang.com',
      status: 'active'
    },
    {
      id: 'm-6',
      name: '赵敏',
      title: '人力资源主管',
      dept: '综合行政与人事部',
      phone: '158-3344-2211',
      email: 'zhao.min@shichuang.com',
      status: 'active'
    }
  ]);

  // 部门列表
  const departments = [
    { value: 'all', label: '全部部门' },
    { value: '商务大区与市场部', label: '商务大区与市场部' },
    { value: '工程交付与运维部', label: '工程交付与运维部' },
    { value: '产品研发与技术中心', label: '产品研发与技术中心' },
    { value: '财务与资金管理部', label: '财务与资金管理部' },
    { value: '综合行政与人事部', label: '综合行政与人事部' },
  ];

  // 职位选项
  const titleOptions = [
    { value: '总监', label: '总监' },
    { value: '经理', label: '经理' },
    { value: '主管', label: '主管' },
    { value: '架构师', label: '架构师' },
    { value: '产品经理', label: '产品经理' },
    { value: '工程师', label: '工程师' },
  ];

  // 筛选逻辑
  const filteredMembers = members.filter((m) => {
    const matchesSearch = !searchQuery || 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = deptFilter === 'all' || m.dept === deptFilter;
    return matchesSearch && matchesDept;
  });

  // 统计数据
  const stats = {
    total: members.length,
    active: members.filter((m) => m.status === 'active').length,
    departments: new Set(members.map((m) => m.dept)).size,
  };

  // 表格列定义
  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <div className="flex items-center gap-2">
          <Avatar size="small" style={{ backgroundColor: '#2F66F6' }}>
            {name.charAt(0)}
          </Avatar>
          <span className="font-medium">{name}</span>
        </div>
      ),
    },
    {
      title: '职位',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '部门',
      dataIndex: 'dept',
      key: 'dept',
      render: (dept: string) => (
        <div className="flex items-center gap-1.5 text-[var(--text-body)]">
          <Building size={14} />
          <span>{dept}</span>
        </div>
      ),
    },
    {
      title: '联系方式',
      key: 'contact',
      render: (_: any, record: TeamMember) => (
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
            <PhoneOutlined />
            <span>{record.phone}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
            <MailOutlined />
            <span>{record.email}</span>
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <StatusBadge
          status={status === 'active' ? 'success' : 'default'}
          text={status === 'active' ? '在职' : '离职'}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space size="small">
          <Button type="link" size="small">编辑</Button>
          <Button type="link" size="small" danger>删除</Button>
        </Space>
      ),
    },
  ];

  // 提交表单
  const handleSubmit = async (values: any) => {
    const newMember: TeamMember = {
      id: `m-${Date.now()}`,
      name: values.name,
      title: values.title,
      dept: values.dept,
      phone: values.phone,
      email: values.email,
      status: 'active',
    };
    setMembers([...members, newMember]);
    message.success('成员添加成功');
    addToast('success', '成员添加成功', `${values.name} 已加入团队`);
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <PageHeader
        title="团队与组织"
        subtitle={`共 ${stats.total} 名成员，${stats.departments} 个部门`}
        actions={[
          <Button
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
          >
            添加成员
          </Button>,
        ]}
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="团队总人数"
          value={stats.total}
          suffix="人"
          prefix={<Users className="w-4 h-4" />}
        />
        <StatCard
          title="在职人员"
          value={stats.active}
          suffix="人"
          prefix={<UserCheck className="w-4 h-4" />}
        />
        <StatCard
          title="部门数量"
          value={stats.departments}
          suffix="个"
          prefix={<Building className="w-4 h-4" />}
        />
        <StatCard
          title="权限角色"
          value={5}
          suffix="个"
          prefix={<Shield className="w-4 h-4" />}
        />
      </div>

      {/* 搜索和表格 */}
      <div className="bg-[var(--bg-surface)] p-4 rounded-lg space-y-4">
        <SearchBar
          placeholder="搜索成员姓名、职位"
          value={searchQuery}
          onChange={setSearchQuery}
          showFilter
          onFilterClick={() => setFilterOpen(true)}
          filterActive={deptFilter !== 'all'}
        />

        <DataTable
          columns={columns}
          dataSource={filteredMembers}
          rowKey="id"
          emptyText="暂无团队成员"
          emptyDescription="点击右上角按钮添加团队成员"
        />
      </div>

      {/* 筛选面板 */}
      <FilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onReset={() => {
          setDeptFilter('all');
          message.info('已重置筛选条件');
        }}
        onApply={() => {
          setFilterOpen(false);
          message.success('已应用筛选');
        }}
      >
        <FormSelect
          label="部门"
          value={deptFilter}
          onChange={(value) => setDeptFilter(value as string)}
          options={departments}
          placeholder="选择部门"
        />
      </FilterPanel>

      {/* 添加成员弹窗 */}
      <FormModal
        title="添加团队成员"
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      >
        <FormInput
          label="姓名"
          name="name"
          required
          placeholder="请输入姓名"
        />
        <FormInput
          label="职位"
          name="title"
          required
          placeholder="请输入职位"
        />
        <FormSelect
          label="所属部门"
          name="dept"
          required
          options={departments.filter(d => d.value !== 'all')}
          placeholder="选择部门"
        />
        <FormInput
          label="手机号"
          name="phone"
          required
          placeholder="138-xxxx-xxxx"
        />
        <FormInput
          label="企业邮箱"
          name="email"
          required
          placeholder="xxx@shichuang.com"
        />
      </FormModal>
    </div>
  );
};