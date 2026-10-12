import React from 'react';
import { BgColorsOutlined, BugOutlined, CodeOutlined, CustomerServiceOutlined, ExperimentOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';

export type WorkItemCategoryIconKey = 'assistance' | 'requirement' | 'design' | 'dev' | 'test' | 'bug' | 'case' | 'ops' | 'presales' | 'delivery';

const icons = {
  assistance: CustomerServiceOutlined,
  requirement: FileTextOutlined,
  design: BgColorsOutlined,
  dev: CodeOutlined,
  test: ExperimentOutlined,
  bug: BugOutlined,
  case: ExperimentOutlined,
  ops: CustomerServiceOutlined,
  presales: FileTextOutlined,
  delivery: CheckCircleOutlined
} satisfies Record<WorkItemCategoryIconKey, React.ComponentType<{ className?: string }>>;

export const WorkItemCategoryIcon: React.FC<{ category: string; className?: string }> = ({ category, className }) => {
  const Icon = icons[category as WorkItemCategoryIconKey] || FileTextOutlined;
  return <Icon className={className} />;
};
