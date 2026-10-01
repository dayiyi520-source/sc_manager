import React from 'react';
import { Input } from 'antd';
import type { TextAreaProps } from 'antd/es/input';

const { TextArea } = Input;

export interface FormTextareaProps extends Omit<TextAreaProps, 'onChange'> {
  label?: string;
  error?: string;
  required?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * 表单多行文本输入组件
 * 基于 Ant Design TextArea
 * 
 * @example
 * ```tsx
 * <FormTextarea
 *   label="需求描述"
 *   value={description}
 *   onChange={setDescription}
 *   rows={4}
 *   placeholder="请输入需求描述"
 * />
 * ```
 */
export const FormTextarea: React.FC<FormTextareaProps> = ({
  label,
  error,
  required,
  value,
  onChange,
  rows = 4,
  ...textareaProps
}) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-[var(--text-primary)]">
          {required && <span className="text-[var(--danger)] mr-1">*</span>}
          {label}
        </label>
      )}
      <TextArea
        {...textareaProps}
        rows={rows}
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