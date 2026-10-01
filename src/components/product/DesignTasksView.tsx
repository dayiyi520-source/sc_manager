import React, { useState } from 'react';
import { Tabs } from 'antd';
import { Layers, ListTodo } from '@/components/common/octicons-compat';
import { RequirementTasksView } from './RequirementTasksView';
import { ProductNavigation } from './ProductNavigation';

type DesignTasksViewProps = {
  productLineFilter?: string;
  productLines?: Array<{ id: string; name: string; code?: string }>;
  onProductLineChange?: (value: string) => void;
};

export const DesignTasksView: React.FC<DesignTasksViewProps> = ({ productLineFilter = 'all', productLines = [], onProductLineChange }) => {
  const [activeTab, setActiveTab] = useState('design');
  const withProductNavigation = (workspace: React.ReactNode) => (
    <div className="grid min-h-[520px] grid-cols-[auto_minmax(0,1fr)] gap-3">
      <ProductNavigation productLines={productLines} value={productLineFilter} onChange={onProductLineChange || (() => undefined)} />
      <div className="min-w-0">{workspace}</div>
    </div>
  );

  return (
    <div className="design-tasks-view">
      <Tabs
        className="test-and-defect-tabs"
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'design',
            label: <span className="inline-flex items-center gap-2"><Layers size={16} />设计任务</span>,
            children: withProductNavigation(<RequirementTasksView key="design" productLineFilter={productLineFilter} itemLabel="设计任务" taskKind="design" />)
          },
          {
            key: 'todo-design',
            label: <span className="inline-flex items-center gap-2"><ListTodo size={16} />待办设计</span>,
            children: <div className="flex min-h-[520px] items-center justify-center rounded-lg border border-dashed border-[var(--border-main)] bg-[var(--bg-surface)] text-sm text-[var(--text-muted)]">待办设计暂无内容</div>
          }
        ]}
      />
    </div>
  );
};

export default DesignTasksView;
