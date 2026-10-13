import { describe, expect, it } from 'vitest';
import { goalSourceLabel, hasDownstreamAlignment } from './goalPresentation';
import { buildMyTargetViewItems } from './MyTargetMonthSection';
import type { OkrPerson, OkrRecord } from '../../../services/okrRepository';
const people: OkrPerson[] = [
  {id:'manager',name:'主管甲',department:'产品部',jobTitle:'主管',rootFlag:0,supervisorId:'boss',version:1},
  {id:'staff',name:'成员乙',department:'产品部',rootFlag:0,supervisorId:'manager',version:1},
];
const manager: OkrRecord = { id:'manager-o',kind:'objective',ownerId:'manager',periodKey:'2026-10',status:'active',version:1,payload:{title:'主管目标',goalLevel:'department',keyResults:[{id:'shared-kr',title:'产品达到设计阶段',weight:100,progress:0,assigneeIds:['staff']}]}};
const personal: OkrRecord = {id:'personal',kind:'objective',ownerId:'staff',periodKey:'2026-10',status:'active',version:1,payload:{title:'产品达到设计阶段',goalLevel:'personal',origin:'assigned',weight:35,sourceObjectiveId:'manager-o',sourceKrId:'shared-kr',alignments:[{parentObjectiveId:'manager-o',parentKeyResultId:'shared-kr'}],keyResults:[{id:'shared-kr',title:'产品达到设计阶段',structureType:'product',businessObject:'产品',weight:100,progress:0,details:[{id:'d',name:'V1',stage:'UI设计',plannedStartDate:'2026-10-01',plannedEndDate:'2026-10-15'}],executionActions:[{id:'mine',ownerId:'staff',title:'完成原型',weight:100,progress:30,deadline:'2026-10-15'},{id:'other',ownerId:'manager',title:'其他人的动作',weight:100,progress:20}]}]}};
describe('personal presentation and source identity', () => {
  it('places the downstream link on the source supervisor and never on a reused personal KR id', () => {
    expect(hasDownstreamAlignment(personal, manager.id, 'shared-kr', manager.ownerId, manager.periodKey, people)).toBe(true);
    expect(hasDownstreamAlignment(manager, personal.id, 'shared-kr', personal.ownerId, personal.periodKey, people)).toBe(false);
    expect(hasDownstreamAlignment({...personal,payload:{...personal.payload,sourceObjectiveId:'other',alignments:[{parentObjectiveId:'other',parentKeyResultId:'shared-kr'}]}},manager.id,'shared-kr','manager',manager.periodKey,people)).toBe(false);
    expect(hasDownstreamAlignment({...personal,status:'draft'},manager.id,'shared-kr','manager',manager.periodKey,people)).toBe(false);
    expect(buildMyTargetViewItems([manager],[],[manager,personal],people,'manager')[0].actions[0].alignments).toHaveLength(1);
  });
  it.each(['draft','active'] as const)('shows the inherited primary KR, saved details and only own A in %s', status => {
    const row=buildMyTargetViewItems([{...personal,status}],[],[manager,personal],people,'staff')[0];
    expect(row).toMatchObject({title:personal.payload.title,primaryLabel:'KR',totalWeight:35,objectiveWeight:35,primaryDetails:personal.payload.keyResults![0].details,alignmentLabel:'产品——来源于上级主管甲'});
    expect(row.actions.map(action=>action.title)).toEqual(['完成原型']);
    expect(row.actions[0]).toMatchObject({label:'A',alignments:[]});
    expect(goalSourceLabel(personal,[manager],people)).toBe(row.alignmentLabel);
  });
});
