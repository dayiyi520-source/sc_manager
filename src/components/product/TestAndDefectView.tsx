import React, { useState } from 'react';
import { Tabs } from 'antd';
import { TestCaseLibraryView } from './TestCaseLibraryView';
import { TestTaskWorkspace } from './TestTaskWorkspace';
import { TestPlanWorkspace } from './TestPlanWorkspace';
import { VersionTestReportWorkspace } from './VersionTestReportWorkspace';
import { BookOpen, FileText } from '@/components/common/octicons-compat';
import { ProductNavigation } from './ProductNavigation';

type TestAndDefectViewProps = {
  mode?: 'all' | 'tasks' | 'management';
  productLineFilter?: string;
  productLines?: Array<{ id: string; name: string; code?: string }>;
  onProductLineChange?: (value: string) => void;
};

export const TestAndDefectView: React.FC<TestAndDefectViewProps> = ({ mode = 'all', productLineFilter = 'all', productLines = [], onProductLineChange }) => {
  const [activeTab, setActiveTab] = useState(mode === 'management' ? 'test-plan' : 'test');
  const [testPlanDetailOpen, setTestPlanDetailOpen] = useState(false);
  const withProductNavigation = (workspace: React.ReactNode) => (
    <div className="grid min-h-[520px] grid-cols-[auto_minmax(0,1fr)] gap-3">
      <ProductNavigation productLines={productLines} value={productLineFilter} onChange={onProductLineChange || (() => undefined)} />
      <div className="min-w-0">{workspace}</div>
    </div>
  );

  if (mode === 'tasks') {
    return (
      <div className="test-and-defect-view">
        {withProductNavigation(<TestTaskWorkspace productLineFilter={productLineFilter} />)}
      </div>
    );
  }

  return (
    <div className="test-and-defect-view">
      <Tabs
        className="test-and-defect-tabs"
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          mode !== 'management' && {
            key: 'test',
            label: <span className="inline-flex items-center gap-2">测试任务</span>,
            children: withProductNavigation(<TestTaskWorkspace productLineFilter={productLineFilter} />)
          },
          mode !== 'tasks' && {
            key: 'test-plan',
            label: <span className="inline-flex items-center gap-2"><FileText size={16} />测试计划</span>,
            children: <div className={testPlanDetailOpen ? 'test-plan-detail-shell' : undefined}>{withProductNavigation(<TestPlanWorkspace productLineFilter={productLineFilter} onDetailChange={setTestPlanDetailOpen} />)}</div>
          },
          mode !== 'tasks' && {
            key: 'case-library',
            label: <span className="inline-flex items-center gap-2"><BookOpen size={16} />用例库</span>,
            children: <TestCaseLibraryView productLineFilter={productLineFilter} />
          },
          mode !== 'tasks' && {
            key: 'report',
            label: <span className="inline-flex items-center gap-2"><FileText size={16} />测试报告</span>,
            children: withProductNavigation(<VersionTestReportWorkspace productLineFilter={productLineFilter} />)
          }
        ].filter(Boolean) as NonNullable<React.ComponentProps<typeof Tabs>['items']>}
      />
    </div>
  );
};
