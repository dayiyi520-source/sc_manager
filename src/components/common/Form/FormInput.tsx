import React from 'react';
import { Input } from 'antd';
import type { InputProps } from 'antd';

export interface FormInputProps extends Omit<InputProps, 'onChange'> {
  label?: string;
  error?: string;
  required?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * 表单输入框组件
 * 基于 Ant Design Input，适配 AIEDIT 暗色主题
 * 
 * @example
 * ```tsx
 * <FormInput
 *   label="项目名称"
 *   value={name}
 *   onChange={setName}
 *   placeholder="请输入项目名称"
 *   required
 * />
 * ```
 */
export const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  required,
  value,
  onChange,
  ...inputProps
}) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-[var(--text-primary)]">
          {required && <span className="text-[var(--danger)] mr-1">*</span>}
          {label}
        </label>
      )}
      <Input
        {...inputProps}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        status={error ? 'error' : undefined}
      />
      {error && (
        <div className="text-xs text-[var(--danger)] mt-1">{error}</div>
      )}
    </div>
  );
};