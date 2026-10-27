import type { OkrPerson, OkrRecord } from './okrRepository';

export type OkrWeightPlan = {
  id: string;
  userId: string;
  periodKey: string;
  objectiveWeights: Record<string, number>;
  keyResultWeights: Record<string, Record<string, number>>;
  status: 'submitted' | 'approved' | 'returned';
  baseVersions: Record<string, number>;
  submittedAt: string;
  reviewedAt?: string;
  reviewerId?: string;
  feedback?: string;
  previousApproved?: Pick<OkrWeightPlan, 'objectiveWeights' | 'keyResultWeights'>;
};

const STORAGE_KEY = 'shichuang.frontend.mock.okr.weightPlans';

const readPlans = (): OkrWeightPlan[] => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export const listOkrWeightPlans = (): OkrWeightPlan[] => readPlans();

export const reviewOkrWeightPlan = (userId: string, periodKey: string, reviewerId: string, decision: 'approve' | 'return', people: OkrPerson[], feedback = ''): OkrWeightPlan | undefined => {
  if (!people.some(person => person.id === userId && person.supervisorId === reviewerId && person.id !== reviewerId)) throw new Error('仅直属主管可确认员工个人目标');
  const plans = readPlans();
  const current = plans.find(plan => plan.userId === userId && plan.periodKey === periodKey && plan.status === 'submitted');
  if (!current) return undefined;
  const next = { ...current, status: decision === 'approve' ? 'approved' as const : 'returned' as const, reviewedAt: new Date().toISOString(), reviewerId, feedback: feedback.trim() || undefined };
  writePlans(plans.map(plan => plan.id === current.id ? next : plan));
  return next;
};

const writePlans = (plans: OkrWeightPlan[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));

export const getOkrWeightPlan = (userId: string, periodKey: string): OkrWeightPlan | undefined =>
  readPlans().find(plan => plan.userId === userId && plan.periodKey === periodKey);

export const saveOkrWeightPlan = (
  userId: string,
  periodKey: string,
  patch: Pick<OkrWeightPlan, 'objectiveWeights' | 'keyResultWeights' | 'baseVersions'> & { autoApprove?: boolean },
): OkrWeightPlan => {
  const plans = readPlans();
  const current = plans.find(plan => plan.userId === userId && plan.periodKey === periodKey);
  const next: OkrWeightPlan = {
    id: current?.id || crypto.randomUUID(),
    userId,
    periodKey,
    objectiveWeights: { ...(current?.objectiveWeights || {}), ...patch.objectiveWeights },
    keyResultWeights: Object.fromEntries(Object.entries({ ...(current?.keyResultWeights || {}), ...patch.keyResultWeights }).map(([id, weights]) => [id, { ...(current?.keyResultWeights[id] || {}), ...weights }])),
    baseVersions: { ...(current?.baseVersions || {}), ...patch.baseVersions },
    status: patch.autoApprove ? 'approved' : 'submitted',
    submittedAt: new Date().toISOString(),
    reviewedAt: undefined,
    reviewerId: undefined,
    feedback: undefined,
    previousApproved: current?.status === 'approved'
      ? { objectiveWeights: current.objectiveWeights, keyResultWeights: current.keyResultWeights }
      : current?.previousApproved,
  };
  writePlans([...plans.filter(plan => !(plan.userId === userId && plan.periodKey === periodKey)), next]);
  return next;
};

export const applyOkrWeightPlan = (records: OkrRecord[], userId: string, periodKey?: string): OkrRecord[] => records.map(record => {
  const plan = getOkrWeightPlan(userId, periodKey || record.periodKey);
  if (!plan || plan.periodKey !== record.periodKey) return record;
  const effective = plan.status === 'approved' ? plan : plan.previousApproved;
  if (!effective) return record;
  const objectiveWeight = effective.objectiveWeights[record.id];
  const krWeights = effective.keyResultWeights[record.id];
  if (objectiveWeight === undefined && !krWeights) return record;
  return {
    ...record,
    payload: {
      ...record.payload,
      ...(objectiveWeight === undefined ? {} : { weight: objectiveWeight }),
      keyResults: record.payload.keyResults?.map(kr => {
        const directWeight = krWeights?.[kr.id];
        const details = kr.details?.map(detail => krWeights?.[detail.id] === undefined ? detail : { ...detail, weight: krWeights[detail.id] });
        return { ...kr, ...(directWeight === undefined ? {} : { weight: directWeight }), ...(details ? { details } : {}) };
      }),
    },
  };
});

export const previewOkrWeightPlan = (records: OkrRecord[], plan: OkrWeightPlan): OkrRecord[] => records.map(record => {
  if (record.periodKey !== plan.periodKey) return record;
  const objectiveWeight = plan.objectiveWeights[record.id];
  const krWeights = plan.keyResultWeights[record.id];
  return { ...record, payload: { ...record.payload,
    ...(objectiveWeight === undefined ? {} : { weight: objectiveWeight }),
    keyResults: record.payload.keyResults?.map(kr => ({ ...kr,
      ...(krWeights?.[kr.id] === undefined ? {} : { weight: krWeights[kr.id] }),
      details: kr.details?.map(detail => krWeights?.[detail.id] === undefined ? detail : { ...detail, weight: krWeights[detail.id] }),
    })),
  } };
});
