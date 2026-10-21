// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionDemoView } from './PermissionDemoView';
import { WorkflowDemoView } from './WorkflowDemoView';
import { productRepository } from '../../services/productRepository';
import { okrRepository } from '../../services/okrRepository';
vi.mock('../../context/AppContext',()=>({useApp:()=>({currentUser:{id:'me'}})}));
vi.mock('../../services/productRepository',()=>({productRepository:{workItemTemplate:vi.fn()}}));
vi.mock('../../services/okrRepository',()=>({okrRepository:{settings:vi.fn(),people:vi.fn()}}));
const wrap=(child:ReactNode)=>render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}>{child}</QueryClientProvider>);
afterEach(cleanup);
beforeEach(()=>{vi.clearAllMocks();vi.mocked(productRepository.workItemTemplate).mockResolvedValue([]);});
async function select(label:string,text:string){fireEvent.mouseDown(screen.getByRole('combobox',{name:label}));fireEvent.click(await screen.findByText(text,{selector:'.ant-select-item-option-content'}));}
describe('current system demos',()=>{
 it('changes permission scenarios without saving any business data',async()=>{
  const storage=vi.spyOn(Storage.prototype,'setItem');
  wrap(<PermissionDemoView/>);
  expect(screen.getByRole('region',{name:'权限结果'})).toHaveTextContent('接收 / 发起转派');
  await select('权限业务对象','动态与评价');
  fireEvent.click(screen.getByRole('switch',{name:'仅指定人员可见'}));
  expect(screen.getByRole('region',{name:'权限结果'})).toHaveTextContent('管理员不自动越过指定范围');
  expect(storage).not.toHaveBeenCalled();storage.mockRestore();
 });
 it('loads real OKR permissions and handles errors with retry',async()=>{
  vi.mocked(okrRepository.settings).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({administratorIds:['me'],defaultView:'list',timeRules:[],templates:[],dictionaries:{},validation:{}} as never);
  vi.mocked(okrRepository.people).mockResolvedValue([{id:'me',name:'本人',department:'产品部'}] as never);
  wrap(<PermissionDemoView/>);await select('权限业务对象','目标总结设置');
  expect(await screen.findByText('权限资料加载失败')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/重\s*试/}));
  await waitFor(()=>expect(screen.getByRole('region',{name:'权限结果'})).toHaveTextContent('公司目标编辑'));
  expect(within(screen.getByRole('region',{name:'权限结果'})).getAllByText('允许')).toHaveLength(6);
 });
 it('steps forward, back and resets while replacing retired closing and todo wording',async()=>{
  wrap(<WorkflowDemoView/>);
  expect(screen.getByRole('button',{name:'上一步'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'下一步'}));
  expect(screen.getByLabelText('演示步骤')).toHaveTextContent('2 / 4');
  fireEvent.click(screen.getByRole('button',{name:'下一步'}));fireEvent.click(screen.getByRole('button',{name:'下一步'}));
  expect(screen.getByRole('button',{name:'下一步'})).toBeDisabled();
  expect(screen.getByRole('region',{name:'当前流程说明'})).toHaveTextContent('直接已完成');
  fireEvent.click(screen.getByRole('button',{name:'重置'}));expect(screen.getByLabelText('演示步骤')).toHaveTextContent('1 / 4');
  await select('工作流演示场景','动态发布与双层阅读标记');
  fireEvent.click(screen.getByRole('button',{name:'下一步'}));
  expect(screen.getByRole('region',{name:'当前流程说明'})).toHaveTextContent('不清除单条消息');
  expect(await screen.findByText('暂无可展示的工作项流程')).toBeInTheDocument();
 });
 it('retries template queries and displays configured state transitions',async()=>{
  vi.mocked(productRepository.workItemTemplate).mockRejectedValueOnce(new Error('offline')).mockResolvedValue([{id:'t',name:'配置测试任务',category:'test',enabled:true,workflow:{definition:{states:[{key:'a',name:'等待验证',initial:true},{key:'b',name:'验证完成',successful:true}],transitions:[{key:'finish',from:'a',to:'b',name:'验证通过'}]}}}] as never);
  wrap(<WorkflowDemoView/>);expect(await screen.findByText('工作项流程加载失败')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/重\s*试/}));
  expect(await screen.findByText('验证通过')).toBeInTheDocument();
  expect(screen.getByRole('table')).toHaveTextContent('等待验证');
  expect(screen.getByRole('table')).toHaveTextContent('验证完成');
 });
});
