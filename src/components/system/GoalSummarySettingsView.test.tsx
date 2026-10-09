// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { okrRepository } from '../../services/okrRepository';
import { GoalSummarySettingsView } from './GoalSummarySettingsView';
const addToast = vi.fn();
vi.mock('../../context/AppContext', () => ({useApp:()=>({addToast})}));
vi.mock('../workbench/okr/OkrProvider', () => ({OkrProvider:({children}:any)=>children}));
const settings={version:1,defaultView:'list' as const,timeRules:[],templates:[],validation:{actionWeightTotal:100,maxActions:8,assigneeMultiple:true,keyNodeMultiple:true,resultRequired:true},dictionaries:{productNodes:[],deliveryNodes:[],presalesNodes:[],supportTypes:[]}};
const mount=()=>render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><GoalSummarySettingsView/></QueryClientProvider>);
afterEach(()=>vi.restoreAllMocks());
describe('goal summary settings entry',()=>{
  it('reuses the configuration page and saves without returning to goals',async()=>{
    vi.spyOn(okrRepository,'settings').mockResolvedValue(settings);
    const save=vi.spyOn(okrRepository,'saveSettings').mockImplementation(async value=>({...value,version:2}));
    mount();
    expect(await screen.findByRole('region',{name:'OKR 设置'})).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'返回目标页'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'保存配置'}));
    await waitFor(()=>expect(save).toHaveBeenCalled());
    await waitFor(()=>expect(addToast).toHaveBeenCalledWith('success','目标总结配置已保存'));
  });
  it('offers retry after a configuration loading failure',async()=>{
    vi.spyOn(okrRepository,'settings').mockRejectedValueOnce(new Error('offline')).mockResolvedValue(settings);
    mount();
    expect(await screen.findByText('目标总结设置加载失败')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:/重\s*试/}));
    expect(await screen.findByRole('region',{name:'OKR 设置'})).toBeInTheDocument();
  });
});
