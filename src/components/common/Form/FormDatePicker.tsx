import React from 'react';
import { DatePicker } from 'antd';
import type { DatePickerProps } from 'antd';
import dayjs, { Dayjs } from 'dayjs';

export interface FormDatePickerProps extends Omit<DatePickerProps, 'value' | 'onChange'> {
  label?: string;
  error?: string;
  required?: boolean;
  value?: string; // ISO 8601 字符串
  onChange?: (value: string) => void;
}

/**
 * 表单日期选择组件
 * 基于 Ant Design DatePicker，适配 AIEDIT 暗色主题
 * 
 * @example
 * ```tsx
 * <FormDatePicker
 *   label="计划开始日期"
 *   value={startDate}
 *   onChange={setStartDate}
 *   placeholder="选择日期"
 * />
 * ```
 */
export const FormDatePicker: React.FC<FormDatePickerProps> = ({
  label,
  error,
  required,
  value,
  onChange,
  ...datePickerProps
}) => {
  const handleChange = (date: Dayjs | null) => {
    onChange?.(date ? date.format('YYYY-MM-DD') : '');
  };

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-[var(--text-primary)]">
          {required && <span className="text-[var(--danger)] mr-1">*</span>}
          {label}
        </label>
      )}
      <DatePicker
        {...datePickerProps}
        value={value ? dayjs(value) : null}
        onChange={handleChange}
        status={error ? 'error' : undefined}
        style={{ width: '100%', ...datePickerProps.style }}
      />
      {error && (
        <div className="text-xs text-[var(--danger)] mt-1">{error}</div>
      )}
    </div>
  );
};