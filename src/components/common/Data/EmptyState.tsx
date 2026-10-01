import React from 'react';
import { Empty } from 'antd';
import type { EmptyProps } from 'antd';

export interface EmptyStateProps extends EmptyProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * 空状态占位组件
 * 基于 Ant Design Empty
 * 
 * @example
 * ```tsx
 * <EmptyState
 *   title="暂无项目"
 *   description="创建您的第一个项目"
 *   action={
 *     <Button type="primary" icon={<PlusOutlined />}>
 *       新建项目
 *     </Button>
 *   }
 * />
 * ```
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title = '暂无数据',
  description,
  action,
  image = Empty.PRESENTED_IMAGE_SIMPLE,
  ...emptyProps
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Empty
        {...emptyProps}
        image={image}
        description={
          <div className="space-y-2">
            <div className="text-sm font-medium text-[var(--text-primary)]">
              {title}
            </div>
            {description && (
              <div className="text-xs text-[var(--text-muted)]">
                {description}
              </div>
            )}
          </div>
        }
      />
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};