// @vitest-environment jsdom
import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {goalActivities,GoalActivityTimeline} from './GoalActivityTimeline';
import {okrRepository,type OkrRecord,type OkrPerson} from '../../../services/okrRepository';
const people:OkrPerson[]=[{id:'manager',name:'主管甲',department:'产品部',rootFlag:0,supervisorId:'boss',version:1},{id:'staff',name:'员工甲',department:'产品部',rootFlag:0,supervisorId:'manager',version:1}];
const record:OkrRecord={id:'goal',kind:'objective',ownerId:'staff',periodKey:'2026-10',status:'active',version:3,payload:{title:'改进交付',weight:60,keyResults:[{id:'kr',title:'完成原型',weight:100,progress:100}]},changeHistory:[{id:'c',purpose:'update',status:'approved',reviewerId:'manager',baseVersion:1,reason:'补齐指标',feedback:'确认执行',requestedAt:'2026-10-12T08:00:00Z',reviewedAt:'2026-10-13T08:00:00Z',previousPayload:{title:'原目标',weight:40},payload:{title:'改进交付',weight:60}}],progressHistory:[{id:'p',itemId:'kr',operatorId:'staff',createdAt:'2026-10-13T09:00:00Z',previousProgress:0,progress:100,status:'ahead',note:'已提交评审',attachments:[]}]};
afterEach(()=>vi.restoreAllMocks());
describe('goal activity cards',()=>{
 it('merges approval and progress data without duplicated event summaries and keeps exact previous values',()=>{
 const rows=goalActivities(record,people,[{action:'修改确认',operator:'主管甲',createdAt:'2026-10-13T08:00:00Z'}]);expect(rows).toHaveLength(2);expect(rows[0]).toMatchObject({kind:'progress',operator:'员工甲',subject:'完成原型'});expect(rows[1]).toMatchObject({title:'修改确认通过',operator:'主管甲',note:'补齐指标；确认执行'});expect(rows[1].differences).toContainEqual(expect.objectContaining({label:'目标权重',before:'40%',after:'60%'}));
 });
 it('keeps the original creation title after a later modification',()=>{
 const rows=goalActivities({...record,createdAt:'2026-10-11T08:00:00Z'},people);expect(rows.find(row=>row.id==='created')?.subject).toBe('原目标');
 });
 it('shows initial approval and does not invent historical before snapshots',()=>{
 const rows=goalActivities({...record,progressHistory:[],changeHistory:[{...record.changeHistory![0],purpose:'initial',previousPayload:undefined}]},people);expect(rows[0].title).toBe('目标确认通过');expect(rows[0].differences).toBeUndefined();
 const legacy=goalActivities({...record,progressHistory:[],changeHistory:[{...record.changeHistory![0],previousPayload:undefined}]},people);expect(legacy[0].differences![0].before).toBe('历史原内容未记录');
 });
 it('renders card changes and note, loads events and filters records',async()=>{
 vi.spyOn(okrRepository,'events').mockResolvedValue([]);render(<GoalActivityTimeline record={record} people={people}/>);await waitFor(()=>expect(screen.queryByText('动态记录加载失败')).not.toBeInTheDocument());
 expect(screen.getByText('修改确认通过')).toBeInTheDocument();expect(screen.getByText('已提交评审')).toBeInTheDocument();expect(screen.getByText('40%')).toBeInTheDocument();expect(screen.getByText('60%')).toBeInTheDocument();expect(screen.getByText('超预期')).toBeInTheDocument();
 fireEvent.mouseDown(screen.getByRole('combobox',{name:'记录类型'}));fireEvent.click(screen.getByText('修改记录',{selector:'.ant-select-item-option-content'}));expect(screen.queryByText('已提交评审')).not.toBeInTheDocument();expect(screen.getByText('修改确认通过')).toBeInTheDocument();
 });
});
