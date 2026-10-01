import React from 'react';
import { Select } from 'antd';
import type { SelectProps } from 'antd';

export interface FormSelectProps<T = string> extends Partial<Omit<SelectProps<T>, 'onChange'>> {
  label?: string;
  name?: string;
  error?: string;
  required?: boolean;
  value?: T;
  onChange?: (value: T) => void;
}

/**
 * 表单下拉选择组件
 * 基于 Ant Design Select，适配 AIEDIT 暗色主题
 * 
 * @example
 * ```tsx
 * <FormSelect
 *   label="优先级"
 *   value={priority}
 *   onChange={setPriority}
 *   options={[
 *     { value: 'high', label: '高' },
 *     { value: 'medium', label: '中' },
 *     { value: 'low', label: '低' }
 *   ]}
 *   placeholder="请选择优先级"
 * />
 * ```
 */
export const FormSelect = <T extends string | number = string>({
  label,
  name,
  error,
  required,
  value,
  onChange,
  ...selectProps
}: FormSelectProps<T>) => {
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
        status={error ? 'error' : undefined}
        style={{ width: '100%', ...selectProps.style }}
      />
      {error && (
        <div className="text-xs text-[var(--danger)] mt-1">{error}</div>
      )}
    </div>
  );
};