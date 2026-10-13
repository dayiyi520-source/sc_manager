import type { OkrKr, OkrKrDetail } from './okrRepository';

export function krDetails(kr: OkrKr): OkrKrDetail[] {
  if (kr.details !== undefined) return kr.details;
  return kr.version ? [{ id: `legacy:${kr.id}`, name: kr.version, stage: kr.stage, plannedEndDate: kr.deadline }] : [];
}
export function krDetailContentComplete(kr: OkrKr): boolean {
  if (!kr.businessObject?.trim()) return false;
  if (kr.details === undefined) return Boolean(kr.version?.trim() && kr.stage?.trim());
  if (!kr.details.length) return false;
  if (kr.structureType === 'delivery') {
    return kr.details.every(row => row.name?.trim() && row.version?.trim() && row.targetStage?.trim());
  }
  return kr.details.every(row => row.name?.trim() && row.stage?.trim() && row.plannedStartDate?.trim() && row.plannedEndDate?.trim());
}
export function krDetailsError(kr: OkrKr): string | undefined {
  if (kr.details === undefined) return;
  if (!kr.details.length) return '请至少选择一条 KR 明细';
  if (new Set(kr.details.map(row => row.id)).size !== kr.details.length || new Set(kr.details.map(row => row.name)).size !== kr.details.length) return 'KR 明细不能重复';
  const validDate = (value?: string) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);
  for (const row of kr.details) {
    if (!row.id || !row.name?.trim()) return '请填写每条 KR 明细';
    if (kr.structureType === 'delivery') {
      if (!row.version?.trim() || !row.targetStage?.trim()) return '请填写项目产品和目标里程碑';
      continue;
    }
    if (!row.stage?.trim()) return '请填写每条 KR 明细的达成阶段';
    if (!validDate(row.plannedStartDate) || !validDate(row.plannedEndDate)) return '请设置每条 KR 明细的有效计划开始和结束时间';
    if (row.plannedStartDate! > row.plannedEndDate!) return 'KR 明细结束时间不能早于开始时间';
    if (kr.deadline && row.plannedEndDate! > kr.deadline) return 'KR 明细结束时间不能超过所属 KR 截止日期';
  }
}
export function krDetailSummary(kr: OkrKr): string {
  return (kr.details || []).map(row => `${row.name} · ${row.stage || '未设置阶段'}`).join('；');
}
