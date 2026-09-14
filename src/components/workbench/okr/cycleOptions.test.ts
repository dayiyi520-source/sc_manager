import {describe,it,expect} from 'vitest';
import {cycleOptions} from './cycleOptions';
import type {OkrRecord} from '../../../services/okrRepository';
describe('cycle groups',()=>{
 it('uses final monthly confirmation, including zero score, and keeps the current month active',()=>{
  const record=(startDate:string,endDate:string,ownerId='me',finalScore:number|undefined=0,status='reviewed')=>({kind:'review',ownerId,status,payload:{startDate,endDate,finalScore}} as OkrRecord);
  const groups=cycleOptions([record('2026-08-01','2026-08-31'),record('2026-07-01','2026-07-07'),record('2026-06-01','2026-06-30','other'),record('2026-05-01','2026-05-31','me',80,'submitted'),record('2026-09-01','2026-09-30')],'me','2026-09');
  expect(groups[0].children.map(c=>c.value)).toEqual(['2026-09']);
  expect(groups[2].children.map(c=>c.value)).toEqual(['2026-08']);
  expect(groups[1].children.map(c=>c.value)).toEqual(expect.arrayContaining(['2026-07','2026-06','2026-05']));
 });
});
