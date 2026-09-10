import React from 'react';
import { Table, Empty } from 'antd';
import type { TableProps, ColumnsType } from 'antd/es/table';

export interface DataTableProps<T = any> extends TableProps<T> {
  columns: ColumnsType<T>;
  dataSource?: T[];
  loading?: boolean;
  emptyText?: string;
  emptyDescription?: string;
}

/**
 * 数据表格组件
 * 基于 Ant Design Table，适配 AIEDIT 暗色主题
 * 
 * @example
 * ```tsx
 * <DataTable
 *   columns={[
 *     { title: '项目名称', dataIndex: 'name', key: 'name' },
 *     { title: '状态', dataIndex: 'status', key: 'status' }
 *   ]}
 *   dataSource={projects}
 *   loading={loading}
 *   rowKey="id"
 * />
 * ```
 */
export function DataTable<T extends Record<string, any>>({
  columns,
  dataSource = [],
  loading = false,
  emptyText = '暂无数据',
  emptyDescription,
  pagination,
  rowKey = 'id',
  ...tableProps
}: DataTableProps<T>) {
  return (
    <Table<T>
      {...tableProps}
      columns={columns}
      dataSource={dataSource}
      loading={loading}
      rowKey={rowKey}
      pagination={
        pagination === false
          ? false
          : {
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
              ...pagination,
            }
      }
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div className="text-[var(--text-muted)]">
                <div className="font-medium">{emptyText}</div>
                {emptyDescription && (
                  <div className="text-xs mt-1">{emptyDescription}</div>
                )}
              </div>
            }
          />
        ),
      }}
    />
  );
}