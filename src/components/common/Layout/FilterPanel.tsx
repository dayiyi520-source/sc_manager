import React from 'react';
import { Drawer, Button, Space } from 'antd';
import type { DrawerProps } from 'antd';
import { FilterOutlined, CloseOutlined } from '@ant-design/icons';

export interface FilterPanelProps extends Omit<DrawerProps, 'title'> {
  title?: string;
  open: boolean;
  onClose: () => void;
  onReset?: () => void;
  onApply?: () => void;
  children: React.ReactNode;
}

/**
 * 筛选面板组件
 * 基于 Ant Design Drawer
 * 
 * @example
 * ```tsx
 * <FilterPanel
 *   open={filterOpen}
 *   onClose={() => setFilterOpen(false)}
 *   onReset={handleReset}
 *   onApply={handleApply}
 * >
 *   <FormSelect label="状态" options={statusOptions} />
 *   <FormSelect label="优先级" options={priorityOptions} />
 *   <FormDateRangePicker label="创建时间" />
 * </FilterPanel>
 * ```
 */
export const FilterPanel: React.FC<FilterPanelProps> = ({
  title = '筛选条件',
  open,
  onClose,
  onReset,
  onApply,
  children,
  ...drawerProps
}) => {
  return (
    <Drawer
      {...drawerProps}
      title={
        <div className="flex items-center gap-2">
          <FilterOutlined />
          <span>{title}</span>
        </div>
      }
      placement="right"
      width={400}
      open={open}
      onClose={onClose}
      footer={
        <Space className="w-full justify-end">
          {onReset && (
            <Button onClick={onReset}>重置</Button>
          )}
          {onApply && (
            <Button type="primary" onClick={onApply}>
              应用筛选
            </Button>
          )}
        </Space>
      }
    >
      <div className="space-y-4">{children}</div>
    </Drawer>
  );
};