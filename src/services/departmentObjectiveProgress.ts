import type { OkrPayload } from './okrRepository';

/** Use saved O/KR weights; a missing historical snapshot is not a KR average. */
export function departmentObjectiveProgress(snapshots: OkrPayload['objectiveSnapshots']): number | undefined {
  if (!snapshots?.length) return undefined;
  let total = 0, weight = 0;
  for (const { payload } of snapshots) {
    const krs = payload.keyResults || [];
    const krWeight = krs.reduce((sum, kr) => sum + kr.weight, 0);
    const progress = krWeight ? krs.reduce((sum, kr) => sum + kr.progress * kr.weight, 0) / krWeight : payload.progress ?? 0;
    const objectiveWeight = payload.weight ?? 100;
    total += progress * objectiveWeight;
    weight += objectiveWeight;
  }
  return weight ? Math.round(total / weight * 10) / 10 : 0;
}
