import React, { useState } from 'react';
import { Button, Space } from 'antd';
import { PlusOutlined, ExportOutlined, HomeOutlined } from '@ant-design/icons';
import {
  PageHeader,
  SearchBar,
  FilterPanel,
  Toolbar,
  DataTable,
  StatusBadge,
  StatCard,
  EmptyState,
  DetailField,
  DetailFieldGroup,
  FormInput,
  FormTextarea,
  FormSelect,
  FormDatePicker,
  FormModal,
  DrawerPanel,
  showConfirm,
  showDeleteConfirm,
  message,
  UserSelector,
} from '@/components/common';

/**
 * 通用组件示例页面
 * 展示如何使用封装的 Ant Design 通用组件
 */
export const ComponentExampleView: React.FC = () => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 示例数据
  const mockData = [
    { id: '1', name: '师创管理后台', status: 'processing', owner: '张三', createDate: '2025-01-15' },
    { id: '2', name: 'CRM 系统', status: 'completed', owner: '李四', createDate: '2025-01-10' },
    { id: '3', name: '数据分析平台', status: 'pending', owner: '王五', createDate: '2025-01-20' },
  ];

  const mockUsers = [
    { id: '1', name: '张三', department: '研发部' },
    { id: '2', name: '李四', department: '产品部' },
    { id: '3', name: '王五', department: '设计部' },
  ];

  const columns = [
    { title: '项目名称', dataIndex: 'name', key: 'name' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <StatusBadge status={status as any} text={status} />,
    },
    { title: '负责人', dataIndex: 'owner', key: 'owner' },
    { title: '创建日期', dataIndex: 'createDate', key: 'createDate' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => setDrawerOpen(true)}>
            查看
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() => { showDeleteConfirm({ onOk: () => { message.success('已删除'); } }); }}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const handleSubmit = async (values: any) => {
    console.log('提交表单:', values);
    message.success('创建成功！');
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <PageHeader
        title="通用组件示例"
        subtitle="展示封装的 Ant Design 组件"
        breadcrumb={[
          { title: <HomeOutlined /> },
          { title: '组件库' },
          { title: '示例页面' },
        ]}
        actions={[
          <Button key="export" icon={<ExportOutlined />}>
            导出
          </Button>,
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            新建项目
          </Button>,
        ]}
      />

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="总项目数" value={128} suffix="个" trend="up" trendValue="+12%" description="较上月" />
        <StatCard title="进行中" value={45} suffix="个" trend="up" trendValue="+5" description="较上周" />
        <StatCard title="已完成" value={75} suffix="个" />
        <StatCard title="完成率" value={58.6} suffix="%" trend="up" trendValue="+3.2%" />
      </div>

      {/* 搜索和工具栏 */}
      <div className="dark-panel p-4 rounded-lg space-y-4">
        <SearchBar
          placeholder="搜索项目名称、负责人"
          value={searchKeyword}
          onChange={setSearchKeyword}
          showFilter
          onFilterClick={() => setFilterOpen(true)}
        />

        <Toolbar
          left={
            <>
              <Button>批量操作</Button>
              <Button>导入</Button>
            </>
          }
          right={
            <>
              <span className="text-sm text-[var(--text-muted)]">共 {mockData.length} 条</span>
            </>
          }
        />

        {/* 数据表格 */}
        <DataTable
          columns={columns}
          dataSource={mockData}
          rowKey="id"
          emptyText="暂无项目数据"
          emptyDescription="点击右上角按钮创建您的第一个项目"
        />
      </div>

      {/* 筛选面板 */}
      <FilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onReset={() => message.info('已重置筛选条件')}
        onApply={() => {
          message.success('已应用筛选');
          setFilterOpen(false);
        }}
      >
        <FormSelect
          label="状态"
          options={[
            { value: 'pending', label: '待处理' },
            { value: 'processing', label: '进行中' },
            { value: 'completed', label: '已完成' },
          ]}
          placeholder="选择状态"
        />
        <UserSelector label="负责人" users={mockUsers} placeholder="选择负责人" />
        <FormDatePicker label="创建日期" placeholder="选择日期" />
      </FilterPanel>

      {/* 创建表单弹窗 */}
      <FormModal
        title="新建项目"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      >
        <FormInput label="项目名称" name="name" required placeholder="请输入项目名称" />
        <FormTextarea label="项目描述" name="description" placeholder="请输入项目描述" rows={3} />
        <FormSelect
          label="状态"
          name="status"
          required
          options={[
            { value: 'pending', label: '待处理' },
            { value: 'processing', label: '进行中' },
          ]}
          placeholder="选择状态"
        />
        <UserSelector label="负责人" name="owner" users={mockUsers} placeholder="选择负责人" />
        <FormDatePicker label="开始日期" name="startDate" placeholder="选择日期" />
      </FormModal>

      {/* 详情抽屉 */}
      <DrawerPanel
        title="项目详情"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={720}
      >
        <div className="space-y-6">
          <DetailFieldGroup title="基本信息" columns={2}>
            <DetailField label="项目名称" value="师创管理后台" />
            <DetailField label="项目编号" value="PRJ-2025-001" />
            <DetailField label="负责人" value="张三" />
            <DetailField label="创建日期" value="2025-01-15" />
          </DetailFieldGroup>

          <DetailFieldGroup title="状态信息" columns={1}>
            <DetailField label="当前状态">
              <StatusBadge status="processing" text="进行中" />
            </DetailField>
            <DetailField label="项目描述" value="这是一个企业级管理后台系统，包含工作台、CRM、产品管理等多个模块。" />
          </DetailFieldGroup>
        </div>
      </DrawerPanel>
    </div>
  );
};