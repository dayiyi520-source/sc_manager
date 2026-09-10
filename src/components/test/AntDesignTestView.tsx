import React from 'react';
import { Button, Input, Select, Table, Modal, message } from 'antd';
import { SearchOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnType } from 'antd/es/table';

/**
 * Ant Design 组件测试页面
 * 用于验证 AIEDIT 暗色主题适配是否正确
 */
export const AntDesignTestView: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();

  const showModal = () => {
    Modal.confirm({
      title: '确认操作',
      content: '这是一个使用 Ant Design Modal 的示例',
      onOk: () => {
        messageApi.success('操作成功！');
      },
    });
  };

  const dataSource = [
    { key: '1', name: '测试项目 A', status: '进行中', priority: '高' },
    { key: '2', name: '测试项目 B', status: '已完成', priority: '中' },
    { key: '3', name: '测试项目 C', status: '待开始', priority: '低' },
  ];

  const columns: ColumnType<typeof dataSource[0]>[] = [
    { title: '项目名称', dataIndex: 'name', key: 'name' },
    { title: '状态', dataIndex: 'status', key: 'status' },
    { title: '优先级', dataIndex: 'priority', key: 'priority' },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Button type="link" size="small" danger icon={<DeleteOutlined />}>
          删除
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {contextHolder}
      
      <div className="dark-panel p-6 rounded-lg">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
          Ant Design 组件测试
        </h2>

        {/* 按钮测试 */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-body)] mb-2">按钮</h3>
            <div className="flex gap-2 flex-wrap">
              <Button type="primary" icon={<PlusOutlined />}>主要按钮</Button>
              <Button>默认按钮</Button>
              <Button type="dashed">虚线按钮</Button>
              <Button type="text">文本按钮</Button>
              <Button type="link">链接按钮</Button>
              <Button danger>危险按钮</Button>
              <Button disabled>禁用按钮</Button>
            </div>
          </div>

          {/* 表单控件测试 */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-body)] mb-2">表单控件</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="请输入内容" prefix={<SearchOutlined />} />
              <Select
                placeholder="请选择"
                style={{ width: '100%' }}
                options={[
                  { value: '1', label: '选项一' },
                  { value: '2', label: '选项二' },
                  { value: '3', label: '选项三' },
                ]}
              />
            </div>
          </div>

          {/* 表格测试 */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-body)] mb-2">表格</h3>
            <Table
              dataSource={dataSource}
              columns={columns}
              pagination={false}
              size="small"
            />
          </div>

          {/* 弹窗测试 */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-body)] mb-2">弹窗与消息</h3>
            <div className="flex gap-2">
              <Button onClick={showModal}>打开 Modal</Button>
              <Button onClick={() => messageApi.info('这是一条信息提示')}>
                显示 Message
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};