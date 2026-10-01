import React from 'react';
import { Drawer } from 'antd';
import type { DrawerProps } from 'antd';

export interface DrawerPanelProps extends DrawerProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * 抽屉面板组件
 * 基于 Ant Design Drawer
 * 替换原有的 DetailDrawer
 * 
 * @example
 * ```tsx
 * <DrawerPanel
 *   title="需求详情"
 *   open={drawerOpen}
 *   onClose={() => setDrawerOpen(false)}
 *   width={720}
 * >
 *   <DetailFieldGroup title="基本信息">
 *     <DetailField label="需求标题" value={requirement.title} />
 *     <DetailField label="优先级" value={requirement.priority} />
 *   </DetailFieldGroup>
 * </DrawerPanel>
 * ```
 */
export const DrawerPanel: React.FC<DrawerPanelProps> = ({
  title,
  open,
  onClose,
  children,
  footer,
  width = 640,
  ...drawerProps
}) => {
  return (
    <Drawer
      {...drawerProps}
      title={title}
      placement="right"
      width={width}
      open={open}
      onClose={onClose}
      footer={footer}
      destroyOnClose
    >
      {children}
    </Drawer>
  );
};