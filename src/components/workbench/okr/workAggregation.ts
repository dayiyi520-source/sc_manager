import dayjs from 'dayjs';
import {OkrWork,OkrReviewItem} from '../../../services/okrRepository';
const terminal=new Set(['已完成','已发布','已验收','已关闭','已取消','已驳回']);
export function periodWork(work:OkrWork[],start:string,end:string){
 return work.filter(w=>!dayjs(w.createdAt).isAfter(dayjs(end),'day')&&(!terminal.has(w.status)||!dayjs(w.updatedAt).isBefore(dayjs(start),'day')));
}
export function reviewWork(work:OkrWork,previous?:OkrReviewItem):OkrReviewItem{
 return previous||{workId:work.id,title:work.title,status:work.status,objectiveId:work.objectiveId||undefined,keyResultId:work.keyResultId||undefined,result:'',impact:'',sourceWorkOrderIds:work.sourceWorkOrderIds};
}
