import dayjs from 'dayjs';
import type { OkrRecord } from '../../../services/okrRepository';

export function cycleOptions(records: OkrRecord[], ownerId: string, current = dayjs().format('YYYY-MM')) {
  const months = new Set(Array.from({length:12}, (_,i)=>dayjs(current).subtract(i,'month').format('YYYY-MM')));
  records.forEach(r=>{const month=r.kind==='objective'?r.periodKey:r.payload.startDate?.slice(0,7);if(month&&/^\d{4}-\d{2}$/.test(month)&&month<=current)months.add(month);});
  return ['进行中','已结束','已归档'].map(label=>({label,value:label,children:[...months].sort().reverse().filter(month=>{
    const confirmed=records.some(r=>r.ownerId===ownerId&&r.kind==='review'&&['reviewed','archived'].includes(r.status)&&r.payload.finalScore!=null&&r.payload.startDate===`${month}-01`&&r.payload.endDate===dayjs(month).endOf('month').format('YYYY-MM-DD'));
    return (month===current?'进行中':confirmed?'已归档':'已结束')===label;
  }).map(month=>({value:month,label:dayjs(month).format('YYYY年MM月')}))}));
}
