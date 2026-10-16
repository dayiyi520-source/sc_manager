// @vitest-environment jsdom
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import { useOriginalOkr } from './useOriginalOkr';
import { okrRepository, type OkrRecord } from '../../../services/okrRepository';
const { records, people, update, toast } = vi.hoisted(() => ({
 records: [{id:'department-draft', kind:'review', ownerId:'m', periodKey:'2026-10', status:'draft', version:3, payload:{title:'部门月报', reviewType:'month', reviewMode:'supervisor', startDate:'2026-10-01', endDate:'2026-10-31'}}],
 people:[{id:'m',name:'主管',department:'产品',supervisorId:'boss',rootFlag:0,version:1},{id:'a',name:'员工',department:'产品',supervisorId:'m',rootFlag:0,version:1}],
 update:vi.fn().mockResolvedValue(undefined), toast:vi.fn(),
}));
vi.mock('../../../context/AppContext',()=>({useApp:()=>({currentUser:{id:'m',name:'主管',department:'产品'}, addToast:toast})}));
vi.mock('../../../services/productRepository',()=>({productRepository:{productLines:vi.fn().mockResolvedValue([])}}));
vi.mock('../../../services/teamRepository',()=>({teamRepository:{options:vi.fn().mockResolvedValue([])}}));
vi.mock('../../../services/customerDirectoryRepository',()=>({customerDirectoryRepository:{opportunities:vi.fn().mockResolvedValue({items:[]})}}));
vi.mock('../../../services/reviewEvidenceRepository',()=>({loadReviewEvidence:vi.fn().mockResolvedValue([])}));
vi.mock('../../../services/okrRepository',()=>({okrRepository:{records:vi.fn().mockResolvedValue(records),people:vi.fn().mockResolvedValue(people),settings:vi.fn().mockResolvedValue({timeRules:[]}),actionParents:vi.fn().mockResolvedValue([]),update}}));
it('validates and persists fresh exclusions on the exact selected department draft',async()=>{
 const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
 const wrapper=({children}:{children:React.ReactNode})=><QueryClientProvider client={client}>{children}</QueryClientProvider>;
 const {result,unmount}=renderHook(()=>useOriginalOkr(),{wrapper});
 await waitFor(()=>expect(result.current.loading || result.current.settingsLoading).toBe(false));
 await act(async()=>{expect(await result.current.submitReviewDraft('department-draft')).toBe(false);});
 expect(update).not.toHaveBeenCalled();
 const exclusions=[{employeeId:'a',employeeName:'员工',reason:'本轮休假'}];
 await act(async()=>{expect(await result.current.submitReviewDraft('department-draft',exclusions)).toBe(true);});
 expect(okrRepository.update).toHaveBeenCalledWith(expect.objectContaining({id:'department-draft',version:3}),'submit',{payload:{...(records[0] as OkrRecord).payload,departmentReviewExclusions:exclusions}},'m');
 unmount();client.clear();
});
