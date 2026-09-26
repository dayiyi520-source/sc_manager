import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useApp } from '../../../context/AppContext';
import { crmRepository } from '../../../services/crmRepository';
import { okrRepository, type OkrPayload, type OkrRecord, type OkrSettings } from '../../../services/okrRepository';
import { productRepository } from '../../../services/productRepository';
import { teamRepository } from '../../../services/teamRepository';
import type { EmployeeOption, OKRItem, PerformanceReview } from '../../../types';

export const findReviewForPayload = (records: OkrRecord[], ownerId: string, periodKey: string, payload: OkrPayload) =>
  records.find(record => (
    record.kind === 'review'
    && record.ownerId === ownerId
    && record.periodKey === periodKey
    && record.payload.reviewType === payload.reviewType
    && record.payload.startDate === payload.startDate
    && record.payload.endDate === payload.endDate
  ));

export function useOriginalOkr() {
  const {currentUser, addToast} = useApp();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const records = useQuery({queryKey:['okr',currentUser.id,'records'],queryFn:okrRepository.records,retry:false});
  const settingsQuery = useQuery({queryKey:['okr','settings'],queryFn:okrRepository.settings,retry:false});
  const peopleQuery = useQuery({queryKey:['okr',currentUser.id,'people'],queryFn:okrRepository.people,retry:false});
  const teamMembersQuery = useQuery<EmployeeOption[]>({queryKey:['team-member-options'],queryFn:teamRepository.options,retry:false});
  const work = useQuery({queryKey:['okr',currentUser.id,'work'],queryFn:()=>okrRepository.work(currentUser.id),retry:false});
  const productLinesQuery = useQuery({queryKey:['okr',currentUser.id,'product-lines'],queryFn:()=>productRepository.productLines(),retry:false});
  const projectsQuery = useQuery({queryKey:['okr',currentUser.id,'projects'],queryFn:()=>crmRepository.projects({page:1,pageSize:100}),retry:false});
  const actionParents = useQuery({
    queryKey:['okr',currentUser.id,'action-parents'],
    queryFn:async()=>{
      const current = dayjs().startOf('month');
      const periods = [current.add(1,'month'), current, current.subtract(1,'month')].map(month => month.format('YYYY-MM'));
      const results = await Promise.all(periods.map(period => okrRepository.actionParents(period, currentUser.id)));
      return results.flat();
    },
    retry:false,
  });
  const people = peopleQuery.data || [];
  const productLineOptions = (productLinesQuery.data || []).filter(line => line.status !== '已停用').map(line => line.name);
  const projectOptions = (projectsQuery.data?.items || []).map(project => String(project.name || '')).filter(Boolean);
  const businessOptionsError = productLinesQuery.error || projectsQuery.error;
  const all = records.data || [];
  const me = people.find(p=>p.id===currentUser.id);
  const derivedActionParents = useMemo(() => {
    if (!me) return [];
    const activeStatuses = new Set(['active', 'submitted', 'reviewed']);
    const result: OkrRecord[] = [];
    const seen = new Set<string>();
    const actionById = new Map(all.filter(record => record.kind === 'action').map(record => [record.id, record]));
    const addParent = (record: OkrRecord, parentObjectiveId: string, parentActionId: string, parentKeyResultId: string, title: string) => {
      const key = `${record.periodKey}:${parentObjectiveId}:${parentActionId}:${parentKeyResultId}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ ...record, id: parentActionId, kind: 'action', ownerId: record.ownerId, payload: { title, parentObjectiveId, parentActionId, parentKeyResultId } });
      }
    };
    for (const record of all) {
      if (record.kind === 'objective' && activeStatuses.has(record.status) && record.ownerId === me.supervisorId) {
        for (const kr of record.payload.keyResults || []) {
          if ((kr.assigneeIds || []).includes(currentUser.id)) addParent({ ...record, kind: 'action' }, record.id, kr.id, kr.id, kr.title);
        }
      }
      if (record.kind === 'action' && activeStatuses.has(record.status) && (record.payload.assigneeIds || []).includes(currentUser.id)) {
        const parentId = String(record.payload.parentActionId || '');
        const parent = actionById.get(parentId);
        if (parent && parent.ownerId !== currentUser.id) {
          const parentPayload = parent.payload;
          addParent(parent, String(parentPayload.parentObjectiveId || record.payload.parentObjectiveId || ''), parent.id, String(parentPayload.parentKeyResultId || parent.id), String(parentPayload.title || '上级行动'));
        }
      }
    }
    return result;
  }, [all, currentUser.id, me]);
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
    return {id:r.id,version:r.version,authorId:r.ownerId,author:owner?.name || '人员已停用',authorDept:owner?.department || '',
      type:p.reviewType || 'month',cycleName:p.title,summary:p.summary || '',selfScore:p.selfScore ?? 0,
      uncompletedReason:p.uncompletedReason || '',suggestions:p.suggestions || '',helpNeeded:p.helpNeeded || '',sendTo:p.sendTo || [],
      createdAt:r.createdAt?.replace('T',' ').slice(0,16) || '—',status:r.status as PerformanceReview['status'],feedback:p.feedback,leaderScore:p.finalScore,
      linkedWorkItems:(p.items || []).map(i=>({id:i.workId,title:i.title,type:'task',status:i.status})),
      krReviews:p.krReviews || [], assistance:p.assistance || [], extraWork:p.extraWork, syncKrProgress:p.syncKrProgress,
      weeklyReviewSnapshots:p.weeklyReviewSnapshots || [], monthlyOtherTasks:p.monthlyOtherTasks || [], nextMonthPlans:p.nextMonthPlans || [],
      otherNotes:p.otherNotes || '', nextMonthArrangement:p.nextMonthArrangement || '',
    };
  });
  const refresh = () => client.invalidateQueries({queryKey:['okr',currentUser.id]});
  const saveActions = async (period:string,payloads:import('../../../services/okrRepository').OkrActionPayload[], submit = true) => {
    setBusy(true);
    try { for(const payload of payloads) { if(payload.recordId) await okrRepository.updateAction(payload.recordId, payload.version ?? 0, payload, submit, currentUser.id); else await okrRepository.createAction(period,payload,submit,currentUser.id); } await refresh(); addToast('success',submit?'拆解目标已提交':'拆解目标草稿已保存'); return true; }
    catch(error){addToast('error',error instanceof Error?error.message:'拆解目标保存失败');return false;}
    finally{setBusy(false);}
  };
  const submitReviewDraft = async (id:string) => {
    const record = all.find(item=>item.id===id && item.kind==='review');
    if(!record){addToast('error','复盘记录不存在或已刷新');return false;}
    setBusy(true);
    try{
      await okrRepository.update(record,'submit');
      await refresh();
      addToast('success','复盘已提交');
      return true;
    }catch(error){addToast('error',error instanceof Error?error.message:'提交失败，请重试');return false;}
    finally{setBusy(false);}
  };
  const submitOkrDraft = async (id: string) => {
    const record = all.find(item => item.id === id && (item.kind === 'objective' || item.kind === 'action'));
    if (!record) { addToast('error', '目标记录不存在或已刷新'); return false; }
    if (record.status !== 'draft') { addToast('error', '只有草稿可以提交'); return false; }
    setBusy(true);
    try {
      await okrRepository.update(record, 'submit', { payload: record.payload });
      await refresh();
      addToast('success', record.kind === 'action' ? '拆解目标已提交' : '目标已提交');
      return true;
    } catch(error) { addToast('error', error instanceof Error ? error.message : '提交失败，请重试'); return false; }
    finally { setBusy(false); }
  };
  const save = async (kind: 'objective' | 'review', period:string, payload:OkrPayload, submit = true) => {
    setBusy(true);
    try {
      if (kind === 'review') {
        const existing = findReviewForPayload(all, currentUser.id, period, payload);
        if (existing) {
          if (!['draft', 'returned'].includes(existing.status)) {
            addToast('warning', '本周期已有复盘，不能重复新建');
            return false;
          }
          await okrRepository.update(existing, submit ? 'submit' : 'save', { payload });
        } else {
          await okrRepository.create(kind,period,payload,submit);
        }
      } else {
        await okrRepository.create(kind,period,payload,submit);
      }
      await refresh(); addToast('success',kind==='objective'?(submit?'目标已提交':'目标草稿已保存'):(submit?'复盘已提交':'复盘草稿已保存')); return true;
    } catch(error) { addToast('error',error instanceof Error?error.message:'提交失败，请重试'); return false; }
    finally {setBusy(false);}
  };
  const updateOkr = async (recordId: string, payload: OkrPayload, submit = false) => {
    const record = all.find(item => item.id === recordId && item.kind === 'objective');
    if (!record) { addToast('error', '目标记录不存在或已刷新'); return false; }
    setBusy(true);
    try { await okrRepository.update(record, submit ? 'submit' : 'save', { payload }); await refresh(); addToast('success', submit ? '目标已提交' : '目标草稿已保存'); return true; }
    catch(error) { addToast('error', error instanceof Error ? error.message : '目标保存失败'); return false; }
    finally { setBusy(false); }
  };
  const saveSettings = async (settings: OkrSettings) => { setBusy(true); try { await okrRepository.saveSettings(settings); await client.invalidateQueries({queryKey:['okr','settings']}); addToast('success','OKR 配置已保存'); return true; } catch(error) { addToast('error',error instanceof Error ? error.message : '配置保存失败'); return false; } finally { setBusy(false); } };
  return {records:all,okrs,performances,people,work:work.data || [],busy,loading:records.isPending || peopleQuery.isPending,
    error:records.error || peopleQuery.error,workLoading:work.isPending,workError:work.error,refresh,refreshWork:()=>work.refetch(),
    productLineOptions,projectOptions,businessOptionsLoading:productLinesQuery.isPending || projectsQuery.isPending,
    businessOptionsError:businessOptionsError instanceof Error ? businessOptionsError.message : businessOptionsError ? '业务数据加载失败' : undefined,
    actionParents:derivedActionParents.length ? derivedActionParents : actionParents.data || [],actionParentsLoading:actionParents.isPending,actionParentsError:actionParents.error,saveActions,
    saveObjective:(period:string,payload:OkrPayload)=>save('objective',period,payload),
    saveObjectiveDraft:(period:string,payload:OkrPayload)=>save('objective',period,payload,false),
    saveReview:(payload:OkrPayload)=>save('review',`${payload.startDate}/${payload.endDate}`,payload),
    saveReviewDraft:(payload:OkrPayload)=>save('review',`${payload.startDate}/${payload.endDate}`,payload,false),
    submitReviewDraft,submitOkrDraft,updateOkr,
    settings: settingsQuery.data, settingsLoading: settingsQuery.isPending, saveSettings, teamMembers: teamMembersQuery.data || [],
  };
}
