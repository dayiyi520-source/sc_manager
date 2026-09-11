import React from 'react';
import { DatePicker } from 'antd';
import dayjs, { Dayjs } from 'dayjs';

export const DateField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}> = ({ label, value, onChange, required = false, disabled = false }) => {
  // 将 YYYY-MM-DD 字符串转为 dayjs 对象
  const dayjsValue = value ? dayjs(value, 'YYYY-MM-DD') : null;

  // 处理日期选择变化
  const handleChange = (date: Dayjs | null) => {
    if (date) {
      onChange(date.format('YYYY-MM-DD'));
    } else {
      onChange('');
    }
  };

  return (
    <div className="block">
      <label className="block text-xs text-[var(--text-muted)] mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <DatePicker
        value={dayjsValue}
        onChange={handleChange}
        format="YYYY-MM-DD"
        placeholder="请选择日期"
        disabled={disabled}
        allowClear
        className="w-full h-10"
        style={{ height: '40px' }}
      />
    </div>
  );
};
