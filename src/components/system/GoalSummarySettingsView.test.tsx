// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { okrRepository } from '../../services/okrRepository';
import { GoalSummarySettingsView } from './GoalSummarySettingsView';
vi.mock('../../services/teamRepository', () => ({teamRepository:{options:vi.fn(async()=>[]),departments:vi.fn(async()=>['研发','交付'])}}));
const addToast = vi.fn();
vi.mock('../../context/AppContext', () => ({useApp:()=>({addToast,currentUser:{id:"admin"}})}));
vi.mock('../workbench/okr/OkrProvider', () => ({OkrProvider:({children}:any)=>children}));
const settings={version:1,defaultView:'list' as const,timeRules:[],templates:[{department:'研发',departments:['研发'],type:'support',fields:[],types:['支持']}],validation:{actionWeightTotal:100,maxActions:8,assigneeMultiple:true,keyNodeMultiple:true,resultRequired:true},dictionaries:{productNodes:[],deliveryNodes:[],presalesNodes:[],supportTypes:[]}};
const mount=()=>render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><GoalSummarySettingsView/></QueryClientProvider>);
afterEach(()=>vi.restoreAllMocks());
describe('goal summary settings entry',()=>{
  it('reuses the configuration page and saves without returning to goals',async()=>{
    vi.spyOn(okrRepository,'settings').mockResolvedValue(settings);
    const save=vi.spyOn(okrRepository,'saveSettings').mockImplementation(async value=>({...value,version:2}));
    vi.spyOn(okrRepository,"people").mockResolvedValue([{id:"admin",name:"管理员",department:"公司",rootFlag:1,supervisorId:null,version:0}]);
    mount();
    expect(await screen.findByRole('region',{name:'OKR 设置'})).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'返回目标页'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'目标确认配置'}));
    fireEvent.click(screen.getByRole('button',{name:/保存配置/}));
    await waitFor(()=>expect(save).toHaveBeenCalled());
    await waitFor(()=>expect(addToast).toHaveBeenCalledWith('success','目标总结配置已保存'));
  });
  it.each(['目标确认配置'])('keeps %s selected after consecutive saves', async section => {
    vi.spyOn(okrRepository,'settings').mockResolvedValue(settings);
    const save=vi.spyOn(okrRepository,'saveSettings').mockImplementation(async value=>({...value,version:value.version+1}));
    vi.spyOn(okrRepository,'people').mockResolvedValue([{id:'admin',name:'管理员',department:'公司',rootFlag:1,supervisorId:null,version:0}]);
    mount();
    fireEvent.click(await screen.findByRole('button',{name:section}));
    fireEvent.click(screen.getByRole('button',{name:/保存配置/}));
    await waitFor(()=>expect(save).toHaveBeenCalledTimes(1));
    await waitFor(()=>expect(screen.getByRole('button',{name:section})).toHaveClass('is-active'));
    await waitFor(()=>expect(screen.getByRole('button',{name:/保存配置/})).toBeEnabled());
    fireEvent.click(screen.getByRole('button',{name:/保存配置/}));
    await waitFor(()=>expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.calls[1][0].version).toBe(2);
    expect(screen.getByRole('button',{name:section})).toHaveClass('is-active');
  });
  it.each(['周报周期配置', '角色设置'])('removes the redundant save action from %s', async section => {
    vi.spyOn(okrRepository,'settings').mockResolvedValue(settings);
    vi.spyOn(okrRepository,'people').mockResolvedValue([{id:'admin',name:'管理员',department:'公司',rootFlag:1,supervisorId:null,version:0}]);
    mount();
    fireEvent.click(await screen.findByRole('button', { name: section }));
    expect(screen.queryByRole('button', { name: /保存配置/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: section === '角色设置' ? '添加成员' : '增加周期' })).toBeEnabled();
  });
  it('offers retry after a configuration loading failure',async()=>{
    vi.spyOn(okrRepository,'settings').mockRejectedValueOnce(new Error('offline')).mockResolvedValue(settings);
    vi.spyOn(okrRepository,"people").mockResolvedValue([{id:"admin",name:"管理员",department:"公司",rootFlag:1,supervisorId:null,version:0}]);
    mount();
    expect(await screen.findByText('目标总结设置加载失败')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:/重\s*试/}));
    expect(await screen.findByRole('region',{name:'OKR 设置'})).toBeInTheDocument();
  });
});
