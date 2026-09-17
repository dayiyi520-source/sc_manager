import React, { useState } from 'react';
import { Tabs } from 'antd';
import { RequirementTasksView } from './RequirementTasksView';

type TestAndDefectViewProps = {
  productLineFilter?: string;
};

export const TestAndDefectView: React.FC<TestAndDefectViewProps> = ({ productLineFilter = 'all' }) => {
  const [activeTab, setActiveTab] = useState('test');

  return (
    <div className="test-and-defect-view px-6 pt-4">
      <Tabs
        className="test-and-defect-tabs"
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'test',
            label: '测试任务',
            children: (
              <RequirementTasksView
                productLineFilter={productLineFilter}
                itemLabel="测试任务"
                taskKind="test"
              />
            )
          },
          {
            key: 'bug',
            label: '缺陷管理',
            children: (
              <RequirementTasksView
                productLineFilter={productLineFilter}
                itemLabel="缺陷管理"
                taskKind="bug"
              />
            )
          }
        ]}
      />
    </div>
  );
};
