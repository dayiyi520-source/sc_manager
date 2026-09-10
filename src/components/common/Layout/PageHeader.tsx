import React from 'react';
import { Breadcrumb, Space, Button } from 'antd';
import type { BreadcrumbProps } from 'antd';
import { HomeOutlined } from '@ant-design/icons';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: BreadcrumbProps['items'];
  extra?: React.ReactNode;
  actions?: React.ReactNode[];
}

/**
 * 页面头部组件
 * 包含面包屑、标题、副标题和操作按钮
 * 
 * @example
 * ```tsx
 * <PageHeader
 *   title="需求管理"
 *   subtitle="共 128 条需求"
 *   breadcrumb={[
 *     { title: <HomeOutlined /> },
 *     { title: '产品中心' },
 *     { title: '需求管理' }
 *   ]}
 *   actions={[
 *     <Button key="export">导出</Button>,
 *     <Button key="create" type="primary" icon={<PlusOutlined />}>新建需求</Button>
 *   ]}
 * />
 * ```
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumb,
  extra,
  actions,
}) => {
  return (
    <div className="space-y-4 mb-6">
      {breadcrumb && (
        <Breadcrumb
          items={breadcrumb}
          separator="/"
        />
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {title}
          </h1>
          {subtitle && (
            <span className="text-sm text-[var(--text-muted)]">
              {subtitle}
            </span>
          )}
        </div>
        
        {(extra || actions) && (
          <Space size="middle">
            {extra}
            {actions}
          </Space>
        )}
      </div>
    </div>
  );
};