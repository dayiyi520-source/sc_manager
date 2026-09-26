import {describe,it,expect} from 'vitest';
import {cycleOptions, periodMonths, periodStatusLabel, periodStatusOptions} from './cycleOptions';
import type {OkrRecord} from '../../../services/okrRepository';
describe('cycle groups',()=>{
 it('maps period states to current, next, and recorded historical months',()=>{
  const objective=(periodKey:string)=>({kind:'objective',ownerId:'me',periodKey,payload:{title:periodKey}} as OkrRecord);
  const records=[objective('2026-10'),objective('2026-09'),objective('2026-08'),objective('2026-03'),objective('2026-08')];

  expect(periodMonths(records,'active','2026-09')).toEqual(['2026-09']);
  expect(periodMonths(records,'upcoming','2026-09')).toEqual(['2026-10']);
  expect(periodMonths(records,'ended','2026-09')).toEqual(['2026-08','2026-03']);
  expect(periodStatusOptions().map(option=>option.label)).toEqual(['进行中','已结束','未开始']);
  expect(periodStatusLabel('2026-08','2026-09')).toBe('已结束');
  expect(periodStatusLabel('2026-09','2026-09')).toBe('进行中');
  expect(periodStatusLabel('2026-10','2026-09')).toBe('未开始');
 });

 it('groups the current month, historical months, and next month by calendar state',()=>{
  const record=(startDate:string,endDate:string,ownerId='me',finalScore:number|undefined=0,status='reviewed')=>({kind:'review',ownerId,status,payload:{startDate,endDate,finalScore}} as OkrRecord);
  const groups=cycleOptions([record('2026-08-01','2026-08-31'),record('2026-07-01','2026-07-07'),record('2026-06-01','2026-06-30','other'),record('2026-05-01','2026-05-31','me',80,'submitted'),record('2026-09-01','2026-09-30')],'me','2026-09');
  expect(groups.map(group=>group.label)).toEqual(['进行中','已结束','未开始']);
  expect(groups[0].children.map(c=>c.value)).toEqual(['2026-09']);
  expect(groups[1].children.map(c=>c.value)).toEqual(expect.arrayContaining(['2026-08','2026-07','2026-06','2026-05']));
  expect(groups[2].children.map(c=>c.value)).toEqual(['2026-10']);
 });
});
