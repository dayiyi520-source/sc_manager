import React from 'react';
import { BgColorsOutlined, BugOutlined, CodeOutlined, CustomerServiceOutlined, ExperimentOutlined, FileTextOutlined } from '@ant-design/icons';

export type WorkItemCategoryIconKey = 'assistance' | 'requirement' | 'design' | 'dev' | 'test' | 'bug';

const icons = {
  assistance: CustomerServiceOutlined,
  requirement: FileTextOutlined,
  design: BgColorsOutlined,
  dev: CodeOutlined,
  test: ExperimentOutlined,
  bug: BugOutlined
} satisfies Record<WorkItemCategoryIconKey, React.ComponentType<{ className?: string }>>;

export const WorkItemCategoryIcon: React.FC<{ category: string; className?: string }> = ({ category, className }) => {
  const Icon = icons[category as WorkItemCategoryIconKey] || FileTextOutlined;
  return <Icon className={className} />;
};
