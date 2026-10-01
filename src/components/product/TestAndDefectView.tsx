import React, { useState } from 'react';
import { Tabs } from 'antd';
import { TestCaseLibraryView } from './TestCaseLibraryView';
import { TestTaskWorkspace } from './TestTaskWorkspace';
import { TestPlanWorkspace } from './TestPlanWorkspace';
import { VersionTestReportWorkspace } from './VersionTestReportWorkspace';
import { Beaker, BookOpen, FileText } from '@/components/common/octicons-compat';
import { ProductNavigation } from './ProductNavigation';

type TestAndDefectViewProps = {
  productLineFilter?: string;
  productLines?: Array<{ id: string; name: string; code?: string }>;
  onProductLineChange?: (value: string) => void;
};

export const TestAndDefectView: React.FC<TestAndDefectViewProps> = ({ productLineFilter = 'all', productLines = [], onProductLineChange }) => {
  const [activeTab, setActiveTab] = useState('test');
  const withProductNavigation = (workspace: React.ReactNode) => (
    <div className="grid min-h-[520px] grid-cols-[auto_minmax(0,1fr)] gap-3">
      <ProductNavigation productLines={productLines} value={productLineFilter} onChange={onProductLineChange || (() => undefined)} />
      <div className="min-w-0">{workspace}</div>
    </div>
  );

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
            children: withProductNavigation(<TestTaskWorkspace productLineFilter={productLineFilter} />)
          },
          {
            key: 'test-plan',
            label: <span className="inline-flex items-center gap-2"><FileText size={16} />测试计划</span>,
            children: withProductNavigation(<TestPlanWorkspace productLineFilter={productLineFilter} />)
          },
          {
            key: 'case-library',
            label: <span className="inline-flex items-center gap-2"><BookOpen size={16} />用例库</span>,
            children: <TestCaseLibraryView productLineFilter={productLineFilter} />
          },
          {
            key: 'report',
            label: <span className="inline-flex items-center gap-2"><FileText size={16} />测试报告</span>,
            children: withProductNavigation(<VersionTestReportWorkspace productLineFilter={productLineFilter} />)
          }
        ]}
      />
    </div>
  );
};
