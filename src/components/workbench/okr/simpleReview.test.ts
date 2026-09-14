import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { completedWorkInPeriod, reviewPeriod } from './simpleReview';
import type { OkrWork } from '../../../services/okrRepository';
describe('simple review associations', () => {
 it('uses Monday through Sunday across month boundaries',()=>{
  expect(reviewPeriod('week',dayjs('2026-10-01'))).toEqual({startDate:'2026-09-28',endDate:'2026-10-04'});
  expect(reviewPeriod('week',dayjs('2026-10-04'))).toEqual({startDate:'2026-09-28',endDate:'2026-10-04'});
 });
 it('keeps the original monthly review option',()=>{
  expect(reviewPeriod('month',dayjs('2026-09-14'))).toEqual({startDate:'2026-09-01',endDate:'2026-09-30'});
 });
 it('only offers completed work in the selected period, excluding rejected/cancelled work',()=>{
  const row=(id:string,status:string,updatedAt:string)=>({id,status,updatedAt} as OkrWork);
  expect(completedWorkInPeriod([
   row('start','已完成','2026-09-14T00:00:00'),row('end','已验收','2026-09-20T23:59:59'),
   row('old','已完成','2026-09-13'),row('future','已完成','2026-09-21'),row('open','进行中','2026-09-14'),
   row('cancelled','已取消','2026-09-14'),row('rejected','已驳回','2026-09-14'),row('bad','已完成','invalid'),
  ],'2026-09-14','2026-09-20').map(w=>w.id)).toEqual(['start','end']);
 });
});
