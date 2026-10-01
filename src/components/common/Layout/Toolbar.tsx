import React from 'react';
import { Space, Button } from 'antd';
import type { SpaceProps } from 'antd';

export interface ToolbarProps extends Omit<SpaceProps, 'children'> {
  left?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * 工具栏组件
 * 用于页面操作按钮的布局
 * 
 * @example
 * ```tsx
 * <Toolbar
 *   left={
 *     <>
 *       <Button icon={<FilterOutlined />}>筛选</Button>
 *       <Button icon={<SortAscendingOutlined />}>排序</Button>
 *     </>
 *   }
 *   right={
 *     <>
 *       <Button icon={<ExportOutlined />}>导出</Button>
 *       <Button type="primary" icon={<PlusOutlined />}>新建</Button>
 *     </>
 *   }
 * />
 * ```
 */
export const Toolbar: React.FC<ToolbarProps> = ({
  left,
  right,
  children,
  ...spaceProps
}) => {
  if (children) {
    return (
      <Space {...spaceProps} className={`toolbar ${spaceProps.className || ''}`}>
        {children}
      </Space>
    );
  }

  return (
    <div className="flex items-center justify-between">
      {left && (
        <Space {...spaceProps} className={`toolbar-left ${spaceProps.className || ''}`}>
          {left}
        </Space>
      )}
      {right && (
        <Space {...spaceProps} className={`toolbar-right ${spaceProps.className || ''}`}>
          {right}
        </Space>
      )}
    </div>
  );
};