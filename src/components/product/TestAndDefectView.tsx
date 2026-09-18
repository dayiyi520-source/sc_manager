import React, { useState } from 'react';
import { Tabs } from 'antd';
import { RequirementTasksView } from './RequirementTasksView';
import { TestCaseLibraryView } from './TestCaseLibraryView';
import { TestTaskWorkspace } from './TestTaskWorkspace';
import { Beaker, BookOpen, Bug } from '@/components/common/octicons-compat';

type TestAndDefectViewProps = {
  productLineFilter?: string;
};

export const TestAndDefectView: React.FC<TestAndDefectViewProps> = ({ productLineFilter = 'all' }) => {
  const [activeTab, setActiveTab] = useState('test');

  return (
    <div className="test-and-defect-view">
      <Tabs
        className="test-and-defect-tabs"
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'test',
            label: <span className="inline-flex items-center gap-2"><Beaker size={16} />测试任务</span>,
            children: (
              <TestTaskWorkspace productLineFilter={productLineFilter} />
            )
          },
          {
            key: 'case-library',
            label: <span className="inline-flex items-center gap-2"><BookOpen size={16} />用例库</span>,
            children: <TestCaseLibraryView productLineFilter={productLineFilter} />
          },
          {
            key: 'bug',
            label: <span className="inline-flex items-center gap-2"><Bug size={16} />缺陷管理</span>,
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
