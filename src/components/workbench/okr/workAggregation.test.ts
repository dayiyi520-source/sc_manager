import {describe,it,expect} from 'vitest';
import {periodWork,reviewWork,workSource} from './workAggregation';
import type {OkrWork} from '../../../services/okrRepository';
const work=(overrides:Partial<OkrWork>):OkrWork=>({id:'task:1',sourceId:'1',kind:'task',title:'处理工单',status:'开发中',createdAt:'2026-08-01',updatedAt:'2026-08-02',dueDate:'2026-09-30',actualHours:0,estimatedHours:4,sourceWorkOrderIds:'["ticket-1"]',linkVersion:-1,...overrides});
describe('period work aggregation',()=>{
 it('includes carry-over work and work completed during the period, excludes future and old completed work',()=>{
  const rows=[work({id:'ongoing'}),work({id:'finished',status:'已完成',updatedAt:'2026-09-10'}),work({id:'old',status:'已完成'}),work({id:'future',createdAt:'2026-10-01'})];
  expect(periodWork(rows,'2026-09-01','2026-09-30').map(w=>w.id)).toEqual(['ongoing','finished']);
 });
 it('preserves KR links and original work-order source',()=>{
  expect(reviewWork(work({objectiveId:'o',keyResultId:'kr'}))).toMatchObject({objectiveId:'o',keyResultId:'kr',sourceWorkOrderIds:'["ticket-1"]'});
 });
 it('keeps out-of-plan work and does not overwrite existing results on regrouping',()=>{
  const entry=reviewWork(work({}));entry.result='完成紧急恢复';entry.impact='占用原计划两天';
  expect(reviewWork(work({}),entry)).toEqual(entry);expect(entry.objectiveId).toBeUndefined();
 });
 it('classifies transferred requirements and requirement work items as tickets',()=>{
  expect(workSource(work({kind:'product_requirement'}))).toBe('ticket');
  expect(workSource(work({kind:'requirement_work_item'}))).toBe('ticket');
  expect(workSource(work({kind:'product_dev_task'}))).toBe('task');
 });
});
