import React from 'react';
import { Input, Space, Button } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';

export interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  showFilter?: boolean;
  onFilterClick?: () => void;
  filterActive?: boolean;
  extra?: React.ReactNode;
}

/**
 * 搜索栏组件
 * 包含搜索输入框和筛选按钮
 * 
 * @example
 * ```tsx
 * <SearchBar
 *   placeholder="搜索需求标题、编号"
 *   value={keyword}
 *   onChange={setKeyword}
 *   onSearch={handleSearch}
 *   showFilter
 *   onFilterClick={() => setFilterOpen(true)}
 *   filterActive={hasActiveFilters}
 * />
 * ```
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = '搜索...',
  value,
  onChange,
  onSearch,
  showFilter = false,
  onFilterClick,
  filterActive = false,
  extra,
}) => {
  return (
    <div className="flex items-center gap-3">
      <Input
        placeholder={placeholder}
        prefix={<SearchOutlined className="text-[var(--text-muted)]" />}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onPressEnter={(e) => onSearch?.((e.target as HTMLInputElement).value)}
        allowClear
        style={{ flex: 1 }}
      />
      
      {showFilter && (
        <Button
          icon={<FilterOutlined />}
          onClick={onFilterClick}
          type={filterActive ? 'primary' : 'default'}
        >
          筛选
        </Button>
      )}
      
      {extra}
    </div>
  );
};