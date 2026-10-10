import React, { useState } from 'react';
import { Alert, Button, Dropdown, Empty, Popover, Spin } from 'antd';
import { BugOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { productRepository } from '../../services/productRepository';
import type { TestPlanCase } from '../../types/testManagement';
import { PersonIdentity } from '../common/PersonIdentity';
import { StatusTag } from '../common/UIComponents';

export const TestPlanCaseDefects: React.FC<{ item: TestPlanCase; productLineId: string; saving: boolean; onAdd: (mode: 'create' | 'link') => void; onRemove: (id: string) => Promise<boolean> }> = ({ item, productLineId, saving, onAdd, onRemove }) => {
  const [open, setOpen] = useState(false);
  const ids = item.defectIds || [];
  const details = useQuery({ queryKey: ['test-plan-linked-defects', productLineId, ids.join(',')], enabled: open && ids.length > 0, retry: false, queryFn: async () => Promise.all(ids.map(async (id) => {
    const detail = await productRepository.workItemDetail(productLineId, id);
    return { id, detail };
  })) });
  const content = <div className="test-plan-defect-preview">
    <div className="test-plan-defect-preview-header"><span>缺陷标题</span><span>状态</span><span>负责人</span><span /></div>
    {details.isError ? <Alert type="error" showIcon title="缺陷加载失败" action={<Button size="small" onClick={() => void details.refetch()}>重试</Button>} /> : details.isLoading ? <Spin /> : details.data?.length ? details.data.map(({ id, detail }) => <div className="test-plan-defect-preview-row" key={id}>
      <span className="test-plan-defect-title" title={detail?.title}>{detail?.title || '缺陷已删除或无权查看'}</span>
      <span>{detail && <StatusTag status={detail.status?.name || detail.statusName || '未设置'} />}</span>
      <PersonIdentity name={detail?.assigneeName || detail?.assignee} emptyLabel="未设置" variant="list" />
      <Button type="text" danger size="small" className="test-plan-defect-unlink" icon={<DeleteOutlined />} aria-label={`解除关联${detail?.title || id}`} title="解除关联" disabled={saving} onClick={() => void onRemove(id)} />
    </div>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无缺陷" />}
  </div>;
  return <div className={`test-plan-case-defects${ids.length ? ' has-defects' : ''}`}>
    {ids.length > 0 && <Popover content={content} trigger={['hover', 'focus']} placement="bottomRight" open={open} onOpenChange={setOpen}><button type="button" className="test-plan-defect-count"><BugOutlined /> 缺陷 {ids.length}</button></Popover>}
    <Dropdown trigger={['click']} menu={{ items: [{ key: 'create', label: '新建缺陷' }, { key: 'link', label: '关联缺陷' }], onClick: ({ key }) => onAdd(key as 'create' | 'link') }}><Button type="text" className="test-plan-defect-add" icon={<PlusOutlined />} disabled={saving} aria-label={`${item.title}添加缺陷`} /></Dropdown>
  </div>;
};
