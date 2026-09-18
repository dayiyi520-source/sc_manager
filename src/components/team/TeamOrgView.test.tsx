/* @vitest-environment jsdom */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamOrgView } from './TeamOrgView';

const mocks = vi.hoisted(() => ({
  addToast: vi.fn(),
  list: vi.fn(),
  departments: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateStatus: vi.fn(),
}));

vi.mock('../../context/AppContext', () => ({ useApp: () => ({ addToast: mocks.addToast }) }));
vi.mock('../../services/teamRepository', () => ({
  teamRepository: {
    list: mocks.list,
    departments: mocks.departments,
    create: mocks.create,
    update: mocks.update,
    updateStatus: mocks.updateStatus,
  },
}));

const renderView = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><TeamOrgView /></QueryClientProvider>);

describe('TeamOrgView', () => {
  beforeEach(() => {
    mocks.list.mockResolvedValue([{ id: 'user-admin', name: '林志豪', department: '软件研发部', jobTitle: '超级系统管理员', status: 'enabled', loginEnabled: true, version: 0 }]);
    mocks.departments.mockResolvedValue(['专家顾问部', '市场运营部', '售前方案部', '产品规划部', '项目管理交付中心', '师生服务交付中心', '数据应用部', '软件研发部', '交互设计部', '人力行政部']);
  });

  it('uses the employee directory as a persistent organization view', async () => {
    renderView();

    expect(await screen.findByText('林志豪')).toBeInTheDocument();
    expect(screen.getAllByText('软件研发部')).toHaveLength(2);
    expect(screen.getByText('超级管理员')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '停用林志豪' })).toBeDisabled();
    expect(screen.getByText('人力行政部')).toBeInTheDocument();
  });

  it('adds an employee without creating login credentials', async () => {
    mocks.create.mockResolvedValue({ id: 'user-new', name: '新员工', department: '产品规划部', jobTitle: '产品经理', status: 'enabled', loginEnabled: false, version: 0 });
    renderView();
    await screen.findByText('林志豪');
    fireEvent.click(screen.getByRole('button', { name: /添加成员/ }));

    expect(screen.getByText('成员仅用于业务配置，不会创建登录账号或密码。')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('请输入员工姓名'), { target: { value: '新员工' } });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '所属部门' }));
    fireEvent.click(await screen.findByText('产品规划部', { selector: '.ant-select-item-option-content' }));
    fireEvent.change(screen.getByPlaceholderText('例如：产品经理'), { target: { value: '产品经理' } });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ name: '新员工', department: '产品规划部', jobTitle: '产品经理' })));
  });
});
