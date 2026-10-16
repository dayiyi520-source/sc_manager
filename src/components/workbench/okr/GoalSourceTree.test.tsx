// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { GoalSourceTree, goalSourceTree } from './GoalSourceTree';
import type { OkrRecord } from '../../../services/okrRepository';
afterEach(cleanup);
const company: OkrRecord = {id:'company',kind:'objective',ownerId:'boss',periodKey:'2026-10',status:'active',version:1,payload:{goalLevel:'company',title:'公司经营目标',progress:30,keyResults:[{id:'company-kr',title:'指派给部门的结果',weight:60,progress:20,assigneeIds:['manager']},{id:'other',title:'其他部门结果',weight:40,progress:0}]}};
const department: OkrRecord = {id:'department',kind:'objective',ownerId:'manager',periodKey:'2026-10',status:'active',version:1,payload:{goalLevel:'department',title:'部门交付目标',sourceObjectiveId:'company',sourceKrId:'company-kr',keyResults:[{id:'dept-kr',title:'指派给我的结果',weight:100,progress:10,assigneeIds:['staff']}]}};
const people = [{id:'boss',name:'公司负责人',department:'公司',rootFlag:1,supervisorId:null,version:1},{id:'manager',name:'主管',department:'研发',rootFlag:0,supervisorId:'boss',version:1}];
it('shows only the department assigned company objective and KR',()=>{
 render(<GoalSourceTree payload={{title:'部门目标',sourceObjectiveId:'company',sourceKrId:'company-kr'}} records={[company]} people={people} cycle="2026-10"/>);
 expect(screen.getByText('公司经营目标')).toBeVisible(); expect(screen.getByText('指派给部门的结果')).toBeVisible(); expect(screen.queryByText('其他部门结果')).not.toBeInTheDocument();
 expect(screen.getByText('公司级').closest('.goal-source-period')).toHaveTextContent('2026年10月目标');
});
it('shows the full personal chain with department nested under company',()=>{
 render(<GoalSourceTree payload={{title:'个人目标',sourceObjectiveId:'department',sourceKrId:'dept-kr'}} records={[company,department]} people={people} cycle="2026-10"/>);
 const tree=screen.getByRole('region',{name:'目标承接链路'});
 for(const title of ['公司经营目标','指派给部门的结果','部门交付目标','指派给我的结果']) expect(screen.getByText(title)).toBeVisible();
 expect(tree.textContent!.indexOf('公司经营目标')).toBeLessThan(tree.textContent!.indexOf('部门交付目标'));
 expect(screen.getByText('部门交付目标').closest('.goal-source-branch')).toBeInTheDocument();
});
it('reports missing or deleted sources without guessing content',()=>{
 const view=render(<GoalSourceTree payload={{title:'个人目标',sourceObjectiveId:'missing'}} records={[company]} people={people} cycle="2026-10"/>);
 expect(screen.getByText('上级目标来源已不可用，请核对承接关系')).toBeVisible();
 view.rerender(<GoalSourceTree payload={{title:'目标',sourceObjectiveId:'company',sourceKrId:'missing'}} records={[company]} people={people} cycle="2026-10"/>);
 expect(screen.getByText('原指派 KR 已不可用，请核对承接关系')).toBeVisible();
});
it('deduplicates identical links and terminates cyclic historical references',()=>{
 expect(goalSourceTree({title:'目标',alignments:[{parentObjectiveId:'company',parentKeyResultId:'company-kr'},{parentObjectiveId:'company',parentKeyResultId:'company-kr'}]},[company])).toHaveLength(1);
 expect(goalSourceTree({title:'目标',sourceObjectiveId:'company'},[{...company,payload:{...company.payload,sourceObjectiveId:'company'}}])[0].children).toEqual([]);
});

it('uses the source owner department and can collapse and restore the full chain',()=>{
 render(<GoalSourceTree payload={{title:'个人目标',sourceObjectiveId:'department',sourceKrId:'dept-kr'}} records={[company,department]} people={people} cycle="2026-10"/>);
 expect(screen.queryByText('上级目标承接')).not.toBeInTheDocument();
 expect(screen.getByText('部门级').closest('.goal-source-period')).toHaveTextContent('研发');
 expect(screen.getByRole('button',{name:'收起'})).toHaveAttribute('aria-expanded','true');
 fireEvent.click(screen.getByRole('button',{name:'收起'}));
 expect(screen.getByText('部门交付目标')).not.toBeVisible();
 expect(screen.getAllByText('公司级').some(element => !element.closest('[hidden]'))).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'展开'}));
 expect(screen.getByText('部门交付目标')).toBeVisible();
});
it('shows a clear fallback when the source owner department is unavailable',()=>{
 render(<GoalSourceTree payload={{title:'个人目标',sourceObjectiveId:'department',sourceKrId:'dept-kr'}} records={[company,department]} people={people.map(person=>({...person,department:''}))} cycle="2026-10"/>);
 expect(screen.getByText('部门级').closest('.goal-source-period')).toHaveTextContent('未设置部门');
});
