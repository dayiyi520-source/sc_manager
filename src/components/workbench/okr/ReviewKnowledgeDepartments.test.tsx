// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ConfigProvider } from 'antd';
import { WeeklyReviewEditor } from './WeeklyReviewEditor';
import { MonthlyReviewEditor } from './MonthlyReviewEditor';
import type { OkrPayload, OkrPerson, OkrRecord } from '../../../services/okrRepository';
class Observer {observe(){} disconnect(){} unobserve(){}}
globalThis.IntersectionObserver=Observer as unknown as typeof IntersectionObserver;
const people:OkrPerson[]=[{id:'m',name:'主管',department:'产品部',supervisorId:'boss',rootFlag:0,version:0},{id:'a',name:'员工甲',department:'产品部',supervisorId:'m',rootFlag:0,version:0}];
const entry={id:'own',category:'应知应会',formatVersion:2 as const,title:'主管经验',scenarioAndPain:'主管场景',actionsAndConclusion:'主管结论'};
it.each(['week','month'] as const)('shows source employees in department %s knowledge and only removes owned entries',async reviewType=>{
 const period={startDate:'2026-10-01',endDate:reviewType==='week'?'2026-10-07':'2026-10-31'};
 const employeeEntry={...entry,id:'employee',title:'员工经验',scenarioAndPain:'员工场景',actionsAndConclusion:'员工结论',reusePlan:'团队推广'};
 const records:OkrRecord[]=[{id:'employee-report',ownerId:'a',kind:'review',periodKey:'2026-10',status:'submitted',version:1,payload:{title:'员工报告',reviewType,...period,knowledgeEntries:[employeeEntry]}}];
 const save=vi.fn(async (_payload:OkrPayload)=>true);
 const props={template:'supervisor' as const,viewer:{id:'m',name:'主管',department:'产品部'},people,records,okrs:[],work:[],workLoading:false,busy:false,periodOverride:period,initialPayload:{title:'部门复盘',knowledgeEntries:[entry]},onSaveDraft:save,onSubmit:vi.fn(async()=>true),onCancel:vi.fn()};
 const mount=(readOnly=false,saved?:OkrPayload)=>render(<ConfigProvider theme={{token:{motion:false}}}>{reviewType==='week'?<WeeklyReviewEditor {...props} initialPayload={saved||props.initialPayload} records={readOnly?[]:records} recordStatus={readOnly?'submitted':undefined} onRefreshWork={vi.fn()}/>:<MonthlyReviewEditor {...props} currentUserId="m" initialPayload={saved||props.initialPayload} records={readOnly?[]:records} recordStatus={readOnly?'submitted':undefined}/>}</ConfigProvider>);
 const view=mount();
 const region=screen.getByRole('region',{name:'知识沉淀'});
 expect(within(region).getAllByRole('columnheader').map(node=>node.textContent)).toEqual(['标题','场景与痛点','执行动作与复盘结论','来源员工','操作']);
 expect(within(region).getByText('员工甲')).toBeInTheDocument();
 expect(within(region).queryByRole('button',{name:'删除知识沉淀员工经验'})).not.toBeInTheDocument();
 fireEvent.click(within(region).getByRole('button',{name:'删除知识沉淀主管经验'}));
 expect(within(region).getByRole('button',{name:'员工经验'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/存草稿/}));
 await waitFor(()=>expect(save).toHaveBeenCalledOnce());
 const saved=save.mock.calls[0][0];
 expect(saved.knowledgeEntries).toEqual([]);
 expect(saved.departmentContentSnapshots?.[0].knowledgeEntries).toEqual([employeeEntry]);
 view.unmount();mount(true,saved);
 expect(screen.getByRole('button',{name:'员工经验'})).toBeInTheDocument();
 expect(within(screen.getByRole('region',{name:'知识沉淀'})).queryByRole('columnheader',{name:'操作'})).not.toBeInTheDocument();
});
