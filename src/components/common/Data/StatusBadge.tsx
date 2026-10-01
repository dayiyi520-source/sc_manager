import React from 'react';
import { Tag } from 'antd';
import type { TagProps } from 'antd';

export type StatusType = 'success' | 'processing' | 'error' | 'warning' | 'default';

export interface StatusBadgeProps extends Omit<TagProps, 'color'> {
  status?: StatusType;
  text: string;
  dot?: boolean;
}

/**
 * 状态徽章组件
 * 基于 Ant Design Tag，适配 AIEDIT 暗色主题
 * 替换原有的 StatusTag
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status = 'default',
  text,
  dot = false,
  ...tagProps
}) => {
  const colorMap: Record<StatusType, string> = {
    success: 'success',
    processing: 'processing',
    error: 'error',
    warning: 'warning',
    default: 'default',
  };

  return (
    <Tag
      {...tagProps}
      color={colorMap[status]}
      icon={dot ? <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1" /> : undefined}
    >
      {text}
    </Tag>
  );
};

/**
 * 预设状态映射工具函数
 */
export const getStatusBadgeProps = (status: string): Pick<StatusBadgeProps, 'status' | 'text'> => {
  const statusMap: Record<string, { status: StatusType; text: string }> = {
    // 通用状态
    'pending': { status: 'warning', text: '待处理' },
    'processing': { status: 'processing', text: '进行中' },
    'completed': { status: 'success', text: '已完成' },
    'cancelled': { status: 'error', text: '已取消' },
    
    // 需求状态
    'draft': { status: 'default', text: '草稿' },
    'reviewing': { status: 'processing', text: '评审中' },
    'approved': { status: 'success', text: '已通过' },
    'developing': { status: 'processing', text: '开发中' },
    'testing': { status: 'processing', text: '测试中' },
    'released': { status: 'success', text: '已发布' },
    
    // 任务状态
    'todo': { status: 'default', text: '待办' },
    'in_progress': { status: 'processing', text: '进行中' },
    'done': { status: 'success', text: '已完成' },
    'blocked': { status: 'error', text: '阻塞' },
    
    // 审批状态
    'awaiting': { status: 'warning', text: '待审批' },
    'approve_pass': { status: 'success', text: '已批准' },
    'rejected': { status: 'error', text: '已驳回' },
  };

  return statusMap[status.toLowerCase()] || { status: 'default', text: status };
};