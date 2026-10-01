import React from 'react';
import { DatePicker } from 'antd';
import type { RangePickerProps } from 'antd/es/date-picker';
import dayjs, { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

export interface FormDateRangePickerProps extends Omit<RangePickerProps, 'value' | 'onChange'> {
  label?: string;
  error?: string;
  required?: boolean;
  value?: [string, string]; // [start ISO, end ISO]
  onChange?: (value: [string, string]) => void;
}

/**
 * 表单日期范围选择组件
 * 基于 Ant Design RangePicker
 * 
 * @example
 * ```tsx
 * <FormDateRangePicker
 *   label="项目周期"
 *   value={dateRange}
 *   onChange={setDateRange}
 *   placeholder={['开始日期', '结束日期']}
 * />
 * ```
 */
export const FormDateRangePicker: React.FC<FormDateRangePickerProps> = ({
  label,
  error,
  required,
  value,
  onChange,
  ...rangePickerProps
}) => {
  const handleChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      onChange?.([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]);
    } else {
      onChange?.(['', '']);
    }
  };

  const dayjsValue: [Dayjs, Dayjs] | null = 
    value && value[0] && value[1] 
      ? [dayjs(value[0]), dayjs(value[1])] 
      : null;

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-[var(--text-primary)]">
          {required && <span className="text-[var(--danger)] mr-1">*</span>}
          {label}
        </label>
      )}
      <RangePicker
        {...rangePickerProps}
        value={dayjsValue}
        onChange={handleChange}
        status={error ? 'error' : undefined}
        style={{ width: '100%', ...rangePickerProps.style }}
      />
      {error && (
        <div className="text-xs text-[var(--danger)] mt-1">{error}</div>
      )}
    </div>
  );
};