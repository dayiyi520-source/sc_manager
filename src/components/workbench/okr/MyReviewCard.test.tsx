// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MyReviewCard } from './MyReviewCard';
import { ReviewReadOnlyView } from './ReviewReadOnlyView';
import type { PerformanceReview } from '../../../types';
const review: PerformanceReview & {authorId:string} = { id:'r',authorId:'e',author:'员工',authorDept:'产品部',type:'week',reviewMode:'structured',cycleName:'周报验收',status:'submitted',createdAt:'2026-10-14',summary:'',uncompletedReason:'',selfScore:90,suggestions:'',helpNeeded:'',sendTo:[],nextWeekPlan:'下周计划内容',krReviews:[{objectiveId:'o',objectiveTitle:'目标',keyResultId:'a',keyResultTitle:'动作',previousProgress:20,currentProgress:60,health:'normal',achievement:'',blocker:'',nextPlan:'',workIds:[],detailRows:[{id:'d',name:'产品',version:'V1'}],detailProgress:[{id:'d',previousProgress:20,currentProgress:60}]}] };
describe('personal review card and detail',()=>{
 it('uses saved personal fields without old score/summary filler',()=>{
  const view=vi.fn(); render(<MyReviewCard review={review} onView={view} onCopy={vi.fn()} onSubmit={vi.fn()}/>);
  expect(screen.getByText('我的计划进度')).toBeInTheDocument();expect(screen.getByText('60%')).toBeInTheDocument();expect(screen.queryByText(/自评/)).not.toBeInTheDocument();expect(screen.getByText('下周计划内容')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'查看详情'}));expect(view).toHaveBeenCalledOnce();
 });
 it('aligns detail fields with the new form and preserves detail snapshots',()=>{
  render(<ReviewReadOnlyView review={review} onBack={vi.fn()} onCopy={vi.fn()}/>);
  expect(screen.getByText('我的计划：动作')).toBeInTheDocument();expect(screen.getByText('产品 / V1')).toBeInTheDocument();expect(screen.queryByText('自评分')).not.toBeInTheDocument();expect(screen.queryByText('本期成果')).not.toBeInTheDocument();expect(screen.getByText('下周计划内容')).toBeInTheDocument();
 });
 it('distinguishes department monthly statistics and content cards from a weekly report',()=>{
  render(<MyReviewCard review={{...review,type:'month',reviewMode:'supervisor',summary:'部门成果',suggestions:'问题分析',monthlyMetrics:{taskCount:5,collaborationCount:1,totalHours:12}}} onView={vi.fn()} onCopy={vi.fn()} onSubmit={vi.fn()}/>);
  expect(screen.getByText('部门月报')).toBeInTheDocument();
  expect(screen.getByLabelText('月度统计')).toBeInTheDocument();
  expect(screen.getByText('本月部门补充总结')).toBeInTheDocument();
  expect(screen.getByText('部门反馈问题梳理与分析')).toBeInTheDocument();
  expect(screen.getByLabelText('复盘内容统计').children).toHaveLength(3);
 });
});

it('shows weighted department O progress rather than the KR average', () => {
  render(<MyReviewCard review={{ ...review, reviewMode: 'supervisor' }} departmentProgress={16} onView={vi.fn()} onSubmit={vi.fn()}/>);
  expect(screen.getByText('部门目标整体进度')).toBeInTheDocument();
  expect(screen.getByText('16%')).toBeInTheDocument();
  expect(screen.queryByText('KR 平均进度')).not.toBeInTheDocument();
});
