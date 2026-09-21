import React from 'react';
import { Alert, Cascader, Form, Modal, Select } from 'antd';
import type { TestCaseDirectory } from '../../types/testManagement';
import { employeeSelectOptions } from '../common/PersonIdentity';
import { directoryOptions } from './TestCaseEditorDrawer';

export type TestCaseBatchAction = 'move' | 'owner' | 'priority';

type Props = {
  open: boolean;
  action?: TestCaseBatchAction;
  directories: TestCaseDirectory[];
  directoryPath: string[];
  value?: string;
  employees: Parameters<typeof employeeSelectOptions>[0];
  employeesLoading: boolean;
  employeesError: boolean;
  directoriesLoading: boolean;
  directoriesError: boolean;
  submitting: boolean;
  error: string;
  onDirectoryPathChange: (path: string[]) => void;
  onValueChange: (value?: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

const title = (action?: TestCaseBatchAction) => action === 'move' ? '移动用例' : action === 'owner' ? '修改负责人' : '修改优先级';

export const isConcreteDirectoryPath = (path: string[]) => Boolean(path.length > 1 && !path.at(-1)?.startsWith('product-line:'));

export const TestCaseBatchActionModal: React.FC<Props> = ({
  open, action, directories, directoryPath, value, employees, employeesLoading, employeesError,
  directoriesLoading, directoriesError, submitting, error, onDirectoryPathChange, onValueChange, onCancel, onSubmit,
}) => {
  const canSubmit = action === 'move' ? isConcreteDirectoryPath(directoryPath) : Boolean(value);

  return <Modal
    title={title(action)}
    open={open}
    onCancel={onCancel}
    onOk={onSubmit}
    okButtonProps={{ disabled: !canSubmit || directoriesLoading || directoriesError }}
    confirmLoading={submitting}
    okText="保存"
    cancelText="取消"
    destroyOnHidden
  >
    <Form layout="vertical" className="test-case-batch-form">
      {error && <Alert type="error" showIcon title="保存失败" description={error} />}
      {action === 'move' ? <Form.Item label="目标目录" required validateStatus={directoriesError ? 'error' : undefined} help={directoriesError ? '目录加载失败，请关闭弹窗后重试' : undefined}>
        <Cascader
          aria-label="目标目录"
          className="w-full"
          options={directoryOptions(directories)}
          value={directoryPath}
          onChange={(path) => onDirectoryPathChange(path.map(String))}
          showSearch
          changeOnSelect
          disabled={directoriesLoading || directoriesError}
          status={directoriesError ? 'error' : undefined}
          placeholder={directoriesLoading ? '目录加载中' : '请选择目标目录'}
        />
      </Form.Item> : <Form.Item label={action === 'owner' ? '负责人' : '优先级'} required>
        <Select
          className="w-full"
          showSearch
          optionFilterProp="label"
          value={value}
          onChange={onValueChange}
          loading={action === 'owner' && employeesLoading}
          status={action === 'owner' && employeesError ? 'error' : undefined}
          placeholder={action === 'owner' ? '选择负责人' : '选择优先级'}
          options={action === 'priority' ? ['P0', 'P1', 'P2', 'P3'].map((item) => ({ label: item, value: item })) : employeeSelectOptions(employees)}
        />
      </Form.Item>}
    </Form>
  </Modal>;
};
