import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApp } from '../../../context/AppContext';
import { okrRepository, type OkrPayload } from '../../../services/okrRepository';
import type { OKRItem, PerformanceReview } from '../../../types';

export function useOriginalOkr() {
  const {currentUser, addToast} = useApp();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const records = useQuery({queryKey:['okr',currentUser.id,'records'],queryFn:okrRepository.records,retry:false});
  const peopleQuery = useQuery({queryKey:['okr',currentUser.id,'people'],queryFn:okrRepository.people,retry:false});
  const work = useQuery({queryKey:['okr',currentUser.id,'work'],queryFn:()=>okrRepository.work(currentUser.id),retry:false});
  const people = peopleQuery.data || [];
  const all = records.data || [];
  const me = people.find(p=>p.id===currentUser.id);
  const okrs: OKRItem[] = all.filter(r=>r.kind==='objective').map(r=>{
    const owner = people.find(p=>p.id===r.ownerId);
    return {
      id:r.id,cycle:r.periodKey,ownerId:r.ownerId,ownerName:owner?.name || '人员已停用',department:owner?.department || '',
      category:r.ownerId===currentUser.id?'my':r.ownerId===me?.supervisorId?'supervisor':owner?.supervisorId===currentUser.id?'subordinate':owner?.department===currentUser.department?'department':'other_dept',
      objective:r.payload.title,weight:r.payload.weight ?? 100,progress:r.payload.progress || 0,deadline:r.payload.deadline || '',
      parentObjectiveId:r.payload.parentObjectiveId,alignTo:all.find(p=>p.id===r.payload.parentObjectiveId)?.payload.title,
      parentKeyResultId:r.payload.parentKeyResultId,alignments:r.payload.alignments, objectiveType:r.payload.objectiveType || 'target',
      status:r.status as OKRItem['status'],
      keyResults:(r.payload.keyResults || []).map(k=>({id:k.id,content:k.title,progress:k.progress,weight:k.weight,deadline:k.deadline || ''})),
    };
  });
  const performances: (PerformanceReview & {authorId:string})[] = all.filter(r=>r.kind==='review').map(r=>{
    const owner = people.find(p=>p.id===r.ownerId), p=r.payload;
    return {id:r.id,authorId:r.ownerId,author:owner?.name || '人员已停用',authorDept:owner?.department || '',
      type:p.reviewType || 'month',cycleName:p.title,summary:p.summary || '',selfScore:p.selfScore ?? 0,
      uncompletedReason:p.uncompletedReason || '',suggestions:p.suggestions || '',helpNeeded:p.helpNeeded || '',sendTo:p.sendTo || [],
      createdAt:r.createdAt?.replace('T',' ').slice(0,16) || '—',status:r.status as PerformanceReview['status'],feedback:p.feedback,leaderScore:p.finalScore,
      linkedWorkItems:(p.items || []).map(i=>({id:i.workId,title:i.title,type:'task',status:i.status})),
      krReviews:p.krReviews || [], assistance:p.assistance || [], extraWork:p.extraWork, syncKrProgress:p.syncKrProgress,
    };
  });
  const refresh = () => client.invalidateQueries({queryKey:['okr',currentUser.id]});
  const save = async (kind: 'objective' | 'review', period:string, payload:OkrPayload, submit = true) => {
    setBusy(true);
    try {
      await okrRepository.create(kind,period,payload,submit);
      await refresh(); addToast('success',kind==='objective'?(submit?'目标已提交':'目标草稿已保存'):(submit?'复盘已提交':'复盘草稿已保存')); return true;
    } catch(error) { addToast('error',error instanceof Error?error.message:'提交失败，请重试'); return false; }
    finally {setBusy(false);}
  };
  return {records:all,okrs,performances,people,work:work.data || [],busy,loading:records.isPending || peopleQuery.isPending,
    error:records.error || peopleQuery.error,workLoading:work.isPending,workError:work.error,refresh,refreshWork:()=>work.refetch(),
    saveObjective:(period:string,payload:OkrPayload)=>save('objective',period,payload),
    saveObjectiveDraft:(period:string,payload:OkrPayload)=>save('objective',period,payload,false),
    saveReview:(payload:OkrPayload)=>save('review',`${payload.startDate}/${payload.endDate}`,payload),
    saveReviewDraft:(payload:OkrPayload)=>save('review',`${payload.startDate}/${payload.endDate}`,payload,false),
  };
}
