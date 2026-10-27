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
it('shows related department objectives, assigned KRs and sub KRs with progress', async () => {
 const month=dayjs().format('YYYY-MM');
 vi.mocked(okrRepository.people).mockResolvedValue([{id:'me',name:'本人',department:'产品部',supervisorId:'boss',rootFlag:0,version:0},{id:'boss',name:'主管',department:'产品部',supervisorId:null,rootFlag:0,goalRole:'supervisor',version:0}]);
 const record={id:'department',kind:'objective',ownerId:'boss',periodKey:month,status:'active',version:1,payload:{goalLevel:'department',title:'部门交付目标',deadline:month+'-28',keyResults:[{id:'kr',title:'关键成果',weight:100,progress:40,details:[{id:'mine',name:'本人子成果',progress:20,assigneeIds:['me']},{id:'other',name:'其他人子成果',progress:80,assigneeIds:['other']}]},{id:'hidden',title:'其他人成果',weight:0,progress:0,assigneeIds:['other']}]}} as OkrRecord;
 vi.mocked(okrRepository.records).mockResolvedValue([record,{...record,id:'old',periodKey:'2020-01'},{...record,id:'draft',status:'draft'}]);
 render(<MyGoalProgressMetric/>);
 expect(await screen.findByText('O：部门交付目标')).toBeInTheDocument();
 expect(screen.getByText(/子 KR1.1：本人子成果/)).toBeInTheDocument();
 expect(screen.queryByText(/其他人子成果|其他人成果/)).not.toBeInTheDocument();
 expect(screen.getByText('整体进度').previousSibling).toHaveTextContent('40%');
 fireEvent.click(screen.getByRole('button',{name:'查看更多我的目标进度'}));
 expect(openPageTab).toHaveBeenCalledWith('wb_okr_perf');
});
it('shows the official empty state and retries a failed read',async()=>{
 vi.mocked(okrRepository.records).mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]);
 render(<MyGoalProgressMetric/>);expect(await screen.findByText('目标进度加载失败')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/重\s*试/}));expect(await screen.findByText('本月暂无与我有关的部门目标')).toBeInTheDocument();
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
