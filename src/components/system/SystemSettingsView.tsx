import React, { useState } from 'react';
import { Button, Tabs, Space, Switch } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  Settings,
  Shield,
  Key,
  Lock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Server,
  Database,
  Sliders
} from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import {
  PageHeader,
  DataTable,
  StatusBadge,
  FormInput,
  FormSelect,
  DetailField,
  DetailFieldGroup,
  showConfirm,
  message,
} from '@/components/common';
import { StatCard } from '@/components/common/UIComponents';

export const SystemSettingsView: React.FC = () => {
  const { addToast } = useApp();

  const [activeTab, setActiveTab] = useState<'basic' | 'rbac' | 'audit'>('basic');

  // Basic Settings State
  const [platformName, setPlatformName] = useState('师创全流程数字化中枢管理平台');
  const [cryptoMode, setCryptoMode] = useState('国密 SM2/SM3/SM4 混合加密');
  const [sessionTimeout, setSessionTimeout] = useState('30 分钟无操作自动登出');
  const [dataBackup, setDataBackup] = useState('每日凌晨 03:00 自动备份');

  // RBAC State
  const [roles] = useState([
    { id: 'r-1', name: '超级管理员', permissions: 128, users: 3, status: 'active' },
    { id: 'r-2', name: '商务总监', permissions: 56, users: 8, status: 'active' },
    { id: 'r-3', name: '产品经理', permissions: 42, users: 12, status: 'active' },
    { id: 'r-4', name: '技术负责人', permissions: 48, users: 15, status: 'active' },
    { id: 'r-5', name: '普通成员', permissions: 18, users: 45, status: 'active' },
  ]);

  // Audit Logs State
  const [auditLogs] = useState([
    {
      id: 'l-1',
      time: '2025-01-20 14:32:18',
      user: '林志豪（超管）',
      ip: '192.168.1.105',
      action: '修改角色权限',
      detail: '为「商务总监」角色新增「删除客户」权限',
      status: '成功'
    },
    {
      id: 'l-2',
      time: '2025-01-20 10:15:42',
      user: '陈雅婷（销售总监）',
      ip: '192.168.1.87',
      action: '导出数据',
      detail: '导出客户列表 Excel（包含 328 条记录）',
      status: '成功'
    },
    {
      id: 'l-3',
      time: '2025-01-19 16:48:05',
      user: '张瑞（产品经理）',
      ip: '192.168.1.92',
      action: '修改需求状态',
      detail: '将需求 REQ-2025-0045 状态修改为「已发布」',
      status: '成功'
    },
    {
      id: 'l-4',
      time: '2025-01-19 09:22:31',
      user: '王浩然（技术负责人）',
      ip: '192.168.1.110',
      action: '系统配置变更',
      detail: '修改会话超时时间为 30 分钟',
      status: '成功'
    },
    {
      id: 'l-5',
      time: '2025-01-18 18:05:12',
      user: '林志豪（超管）',
      ip: '192.168.1.105',
      action: '新增用户',
      detail: '创建用户账号「李明」，分配角色「普通成员」',
      status: '成功'
    },
  ]);

  // 保存基础设置
  const handleSaveBasic = () => {
    showConfirm({
      title: '确认保存设置',
      content: '确定要保存当前的系统基础设置吗？',
      onOk: () => {
        message.success('系统设置已保存');
        addToast('success', '系统设置已保存', '配置将在下次重启后生效');
      }
    });
  };

  // 角色表格列定义
  const roleColumns = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-[var(--primary)]" />
          <span className="font-medium">{name}</span>
        </div>
      ),
    },
    {
      title: '权限数量',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions: number) => (
        <span className="text-[var(--text-body)]">{permissions} 项</span>
      ),
    },
    {
      title: '用户数量',
      dataIndex: 'users',
      key: 'users',
      render: (users: number) => (
        <span className="text-[var(--text-body)]">{users} 人</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <StatusBadge
          status={status === 'active' ? 'success' : 'default'}
          text={status === 'active' ? '启用' : '禁用'}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space size="small">
          <Button type="link" size="small">编辑</Button>
          <Button type="link" size="small">权限</Button>
          <Button type="link" size="small" danger>删除</Button>
        </Space>
      ),
    },
  ];

  // 审计日志表格列定义
  const auditColumns = [
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      width: 180,
      render: (time: string) => (
        <span className="font-mono text-xs text-[var(--text-muted)]">{time}</span>
      ),
    },
    {
      title: '操作人',
      dataIndex: 'user',
      key: 'user',
      render: (user: string) => (
        <span className="font-medium text-[var(--text-primary)]">{user}</span>
      ),
    },
    {
      title: 'IP 地址',
      dataIndex: 'ip',
      key: 'ip',
      render: (ip: string) => (
        <span className="font-mono text-xs text-[var(--text-muted)]">{ip}</span>
      ),
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => (
        <span className="font-semibold text-[var(--primary)]">{action}</span>
      ),
    },
    {
      title: '操作详情',
      dataIndex: 'detail',
      key: 'detail',
      render: (detail: string) => (
        <span className="text-[var(--text-body)]">{detail}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <StatusBadge status="success" text={status} />
      ),
    },
  ];

  // Tab 标签页配置
  const tabItems = [
    {
      key: 'basic',
      label: (
        <div className="flex items-center gap-2">
          <Settings size={16} />
          <span>基础设置</span>
        </div>
      ),
      children: (
        <div className="space-y-6">
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="系统运行时间"
              value="156"
              suffix="天"
              prefix={<Clock className="w-4 h-4" />}
            />
            <StatCard
              title="数据库大小"
              value="2.8"
              suffix="GB"
              prefix={<Database className="w-4 h-4" />}
            />
            <StatCard
              title="在线用户"
              value={45}
              suffix="人"
              prefix={<UserCheck className="w-4 h-4" />}
            />
            <StatCard
              title="API 调用"
              value="1.2K"
              suffix="/min"
              prefix={<Server className="w-4 h-4" />}
            />
          </div>

          {/* 基础配置 */}
          <div className="bg-[var(--bg-surface)] p-6 rounded-lg space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-4">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                系统基础配置
              </h3>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSaveBasic}
              >
                保存设置
              </Button>
            </div>

            <DetailFieldGroup columns={1}>
              <DetailField label="平台名称">
                <FormInput
                  value={platformName}
                  onChange={setPlatformName}
                  placeholder="请输入平台名称"
                />
              </DetailField>

              <DetailField label="加密模式">
                <FormSelect
                  value={cryptoMode}
                  onChange={(value) => setCryptoMode(value as string)}
                  options={[
                    { value: '国密 SM2/SM3/SM4 混合加密', label: '国密 SM2/SM3/SM4 混合加密' },
                    { value: 'AES-256-GCM', label: 'AES-256-GCM' },
                    { value: 'RSA-2048', label: 'RSA-2048' },
                  ]}
                />
              </DetailField>

              <DetailField label="会话超时">
                <FormSelect
                  value={sessionTimeout}
                  onChange={(value) => setSessionTimeout(value as string)}
                  options={[
                    { value: '15 分钟无操作自动登出', label: '15 分钟' },
                    { value: '30 分钟无操作自动登出', label: '30 分钟' },
                    { value: '60 分钟无操作自动登出', label: '60 分钟' },
                  ]}
                />
              </DetailField>

              <DetailField label="数据备份">
                <FormSelect
                  value={dataBackup}
                  onChange={(value) => setDataBackup(value as string)}
                  options={[
                    { value: '每日凌晨 03:00 自动备份', label: '每日凌晨 03:00' },
                    { value: '每周日凌晨 03:00 自动备份', label: '每周日凌晨 03:00' },
                    { value: '手动备份', label: '手动备份' },
                  ]}
                />
              </DetailField>
            </DetailFieldGroup>
          </div>

          {/* 系统状态 */}
          <div className="bg-[var(--bg-surface)] p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              系统状态
            </h3>
            <DetailFieldGroup columns={2}>
              <DetailField label="服务状态">
                <StatusBadge status="success" text="正常运行" />
              </DetailField>
              <DetailField label="数据库状态">
                <StatusBadge status="success" text="连接正常" />
              </DetailField>
              <DetailField label="缓存服务">
                <StatusBadge status="success" text="运行中" />
              </DetailField>
              <DetailField label="消息队列">
                <StatusBadge status="success" text="运行中" />
              </DetailField>
            </DetailFieldGroup>
          </div>
        </div>
      ),
    },
    {
      key: 'rbac',
      label: (
        <div className="flex items-center gap-2">
          <Shield size={16} />
          <span>权限管理</span>
        </div>
      ),
      children: (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                角色与权限
              </h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                管理系统角色和权限分配
              </p>
            </div>
            <Button type="primary" icon={<Shield className="w-4 h-4" />}>
              新建角色
            </Button>
          </div>

          <div className="bg-[var(--bg-surface)] p-4 rounded-lg">
            <DataTable
              columns={roleColumns}
              dataSource={roles}
              rowKey="id"
              pagination={false}
              emptyText="暂无角色数据"
            />
          </div>
        </div>
      ),
    },
    {
      key: 'audit',
      label: (
        <div className="flex items-center gap-2">
          <Key size={16} />
          <span>审计日志</span>
        </div>
      ),
      children: (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                操作审计日志
              </h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                记录所有敏感操作和系统变更
              </p>
            </div>
            <Button icon={<ReloadOutlined />}>刷新</Button>
          </div>

          <div className="bg-[var(--bg-surface)] p-4 rounded-lg">
            <DataTable
              columns={auditColumns}
              dataSource={auditLogs}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              emptyText="暂无审计日志"
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <PageHeader
        title="系统设置"
        subtitle="系统配置、权限管理和审计日志"
      />

      {/* 标签页 */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as any)}
        items={tabItems}
        size="large"
      />
    </div>
  );
};