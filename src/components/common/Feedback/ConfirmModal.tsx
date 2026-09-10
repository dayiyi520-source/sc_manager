import React from 'react';
import { Modal } from 'antd';
import type { ModalFuncProps } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

export interface ConfirmModalOptions extends Omit<ModalFuncProps, 'onOk' | 'onCancel'> {
  title?: string;
  content?: React.ReactNode;
  okText?: string;
  cancelText?: string;
  okType?: 'primary' | 'danger';
  onOk?: () => void | Promise<void>;
  onCancel?: () => void;
}

/**
 * 确认对话框
 * 基于 Ant Design Modal.confirm
 * 
 * @example
 * ```tsx
 * import { showConfirm } from '@/components/common/Feedback';
 * 
 * showConfirm({
 *   title: '确认删除？',
 *   content: '删除后无法恢复，确定要删除吗？',
 *   okType: 'danger',
 *   onOk: async () => {
 *     await deleteItem(id);
 *     message.success('删除成功');
 *   }
 * });
 * ```
 */
export const showConfirm = ({
  title = '确认操作',
  content,
  okText = '确定',
  cancelText = '取消',
  okType = 'primary',
  onOk,
  onCancel,
  ...modalProps
}: ConfirmModalOptions = {}) => {
  return Modal.confirm({
    title,
    icon: <ExclamationCircleOutlined />,
    content,
    okText,
    cancelText,
    okType,
    onOk,
    onCancel,
    centered: true,
    ...modalProps,
  });
};

/**
 * 删除确认对话框（快捷方式）
 */
export const showDeleteConfirm = (
  options: Omit<ConfirmModalOptions, 'okType'> = {}
) => {
  return showConfirm({
    title: '确认删除',
    content: '删除后无法恢复，确定要删除吗？',
    okType: 'danger',
    okText: '删除',
    ...options,
  });
};