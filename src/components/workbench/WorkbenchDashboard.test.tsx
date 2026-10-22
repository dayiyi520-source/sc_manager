// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import dayjs from 'dayjs';
import { MyGoalProgressMetric } from './MyGoalProgressMetric';
import { WorkbenchLearningCard } from './WorkbenchLearningCard';
import { okrRepository } from '../../services/okrRepository';
import { createTrainingState, saveTraining } from '../../services/trainingRepository';
import type { OkrRecord } from '../../services/okrRepository';
const openPageTab=vi.fn();
vi.mock('../../context/AppContext',()=>({useApp:()=>({currentUser:{id:'me',name:'本人',department:'产品部'},openPageTab})}));
vi.mock('../../services/okrRepository',()=>({okrRepository:{records:vi.fn(),people:vi.fn(),settings:vi.fn()}}));
beforeEach(()=>{localStorage.clear();sessionStorage.clear();vi.clearAllMocks();vi.mocked(okrRepository.records).mockResolvedValue([]);vi.mocked(okrRepository.people).mockResolvedValue([{id:'me',name:'本人',department:'产品部',supervisorId:null,rootFlag:1,version:0}]);vi.mocked(okrRepository.settings).mockResolvedValue({} as never);});
afterEach(cleanup);
it('aggregates all effective monthly targets and navigates to monthly goals',async()=>{
 const record=(id:string,progress:number,weight:number)=>({id,kind:'objective',ownerId:'me',periodKey:dayjs().format('YYYY-MM'),status:'active',version:1,payload:{title:id,weight,keyResults:[{id:id+'-kr',title:'成果',weight:100,progress}]}} as OkrRecord);
 vi.mocked(okrRepository.records).mockResolvedValue([record('a',20,25),record('b',60,75),{...record('other',100,100),ownerId:'other'},{...record('old',100,100),periodKey:'2020-01'},{...record('draft',100,100),status:'draft'},{...record('deleted',100,100),status:'deleted'}]);
 render(<MyGoalProgressMetric/>);expect(await screen.findByText('50%')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'我的目标进度，进入月度目标'}));expect(openPageTab).toHaveBeenCalledWith('wb_okr_perf');
});
it('distinguishes missing goals from zero progress and provides retry after failure',async()=>{
 vi.mocked(okrRepository.records).mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]);
 render(<MyGoalProgressMetric/>);expect(await screen.findByText('目标进度加载失败')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/重\s*试/}));expect(await screen.findByText('—')).toBeInTheDocument();
});
it('reads current training records, prioritizes unfinished courses and opens the selected course',async()=>{
 const state=createTrainingState();state.courses=state.courses.slice(0,2);state.records=[{courseId:state.courses[1].id,lessonId:state.courses[1].lessons[0].id,status:'学习中',updatedAt:'2026-10-22'}];
 saveTraining('me',state);render(<WorkbenchLearningCard/>);
 expect(await screen.findByText(state.courses[1].title)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'继续学习'}));expect(sessionStorage.getItem('shichuang.training.openCourse')).toBe(state.courses[1].id);expect(openPageTab).toHaveBeenCalledWith('training_learning');
});
it('shows retry and the official empty state for invalid or empty training data',async()=>{
 localStorage.setItem('shichuang.training.demo.v1.me','broken');render(<WorkbenchLearningCard/>);
 expect(await screen.findByText('学习记录加载失败')).toBeInTheDocument();
 const state=createTrainingState();state.courses=[];saveTraining('me',state);
 fireEvent.click(screen.getByRole('button',{name:/重\s*试/}));expect(await screen.findByText('暂无学习课程')).toBeInTheDocument();
});
