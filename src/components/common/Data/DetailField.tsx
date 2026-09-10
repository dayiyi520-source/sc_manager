import React from 'react';

export interface DetailFieldProps {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
  vertical?: boolean;
}

/**
 * 详情字段展示组件
 * 用于详情页面的字段展示
 * 
 * @example
 * ```tsx
 * <DetailField label="项目名称" value="师创管理后台" />
 * <DetailField label="负责人">
 *   <UserAvatar name="张三" />
 * </DetailField>
 * ```
 */
export const DetailField: React.FC<DetailFieldProps> = ({
  label,
  value,
  children,
  vertical = false,
}) => {
  const content = children || value || '-';

  if (vertical) {
    return (
      <div className="space-y-1">
        <div className="text-xs text-[var(--text-muted)]">{label}</div>
        <div className="text-sm text-[var(--text-primary)]">{content}</div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="text-xs text-[var(--text-muted)] w-20 flex-shrink-0 pt-0.5">
        {label}
      </div>
      <div className="text-sm text-[var(--text-primary)] flex-1">{content}</div>
    </div>
  );
};

/**
 * 详情字段组
 */
export interface DetailFieldGroupProps {
  title?: string;
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
}

export const DetailFieldGroup: React.FC<DetailFieldGroupProps> = ({
  title,
  children,
  columns = 2,
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  };

  return (
    <div className="space-y-3">
      {title && (
        <div className="text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-main)] pb-2">
          {title}
        </div>
      )}
      <div className={`grid ${gridCols[columns]} gap-4`}>{children}</div>
    </div>
  );
};