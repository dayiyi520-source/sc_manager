import React from 'react';
import { Select } from 'antd';
import type { SelectProps } from 'antd';
import { PersonIdentity } from '../PersonIdentity';

export interface User {
  id: string;
  name: string;
  avatar?: string;
  department?: string;
  role?: string;
}

export interface UserSelectorProps extends Omit<SelectProps, 'options' | 'onChange'> {
  label?: string;
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  users: User[];
  error?: string;
  required?: boolean;
}

/**
 * 用户选择器组件
 * 基于 Ant Design Select，支持头像展示
 * 
 * @example
 * ```tsx
 * <UserSelector
 *   label="负责人"
 *   value={ownerId}
 *   onChange={setOwnerId}
 *   users={userList}
 *   placeholder="选择负责人"
 * />
 * ```
 */
export const UserSelector: React.FC<UserSelectorProps> = ({
  label,
  value,
  onChange,
  users,
  error,
  required,
  ...selectProps
}) => {
  const options = users.map((user) => ({
    value: user.id,
    label: (
      <PersonIdentity name={user.name} subtitle={user.role || '未设置职位'} size={24} />
    ),
    searchLabel: `${user.name} ${user.department || ''} ${user.role || ''}`,
  }));

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-[var(--text-primary)]">
          {required && <span className="text-[var(--danger)] mr-1">*</span>}
          {label}
        </label>
      )}
      <Select
        {...selectProps}
        value={value}
        onChange={onChange}
        options={options}
        optionFilterProp="searchLabel"
        showSearch
        status={error ? 'error' : undefined}
        style={{ width: '100%', ...selectProps.style }}
      />
      {error && (
        <div className="text-xs text-[var(--danger)] mt-1">{error}</div>
      )}
    </div>
  );
};
