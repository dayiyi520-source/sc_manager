import { useState } from 'react';
import { Alert, InputNumber, Modal } from 'antd';

export type GoalWeightEntry = { id: string; title: string; weight: number; submit: (weight: number) => Promise<boolean> };
export type GoalWeightGroup = { id: string; title: string; entries: GoalWeightEntry[]; totalLabel?: string; kind?: 'objective' | 'keyResult'; parentEntryId?: string };

export function initialGoalWeights(entries: Pick<GoalWeightEntry, 'weight'>[]): number[] {
  const valid = entries.every(entry => Number.isInteger(entry.weight) && entry.weight > 0)
    && entries.reduce((sum, entry) => sum + entry.weight, 0) === 100;
  return valid ? entries.map(entry => entry.weight) : entries.map((_, index) => Math.floor(100 / entries.length) + (index < 100 % entries.length ? 1 : 0));
}

export function goalWeightRemainder(weights: Array<number | null>): number {
  return 100 - weights.slice(0, -1).reduce<number>((sum, weight) => sum + (weight ?? 0), 0);
}

export function GoalWeightConfirmation({ entries = [], label = 'O', groups, title, onFinish }: {
  entries?: GoalWeightEntry[]; label?: 'O' | 'KR'; groups?: GoalWeightGroup[]; title?: string; onFinish: (completedIds: string[], submitted: boolean) => void;
}) {
  const normalizedGroups = groups?.length ? groups : [{ id: label, title: '', entries }];
  const [weights, setWeights] = useState<Record<string, Array<number | null>>>(() => Object.fromEntries(normalizedGroups.map(group => [group.id, initialGoalWeights(group.entries)])));
  const [completed, setCompleted] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const effectiveWeights = (group: GoalWeightGroup) => {
    const current = weights[group.id] || [];
    if (current.length <= 1) return current.length ? [100] : [];
    return current.map((weight, index) => index === current.length - 1 ? goalWeightRemainder(current) : weight);
  };
  const confirmed = normalizedGroups.map(group => ({ ...group, weights: effectiveWeights(group) }));
  const valid = confirmed.every(group => group.weights.every(weight => weight !== null && Number.isInteger(weight) && weight >= 1 && weight <= 100)
    && group.weights.reduce<number>((sum, weight) => sum + (weight ?? 0), 0) === 100);
  const submit = async () => {
    if (busy || !valid) return;
    setBusy(true); setError('');
    const saved = [...completed];
    try {
      for (const group of confirmed) {
        for (let index = 0; index < group.entries.length; index += 1) {
          const entry = group.entries[index];
          if (saved.includes(entry.id)) continue;
          if (!await entry.submit(group.weights[index]!)) {
            setError('提交未完成，请检查目标内容或重试；已提交的条目不会重复提交。');
            return;
          }
          saved.push(entry.id); setCompleted([...saved]);
        }
      }
      onFinish(saved, true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '提交失败，请重试');
    } finally { setBusy(false); }
  };
  const objectiveGroups = confirmed.filter(group => group.kind !== 'keyResult');
  const objectiveWeightTotal = objectiveGroups.reduce((sum, group) => sum + group.weights.reduce<number>((groupSum, weight) => groupSum + (weight ?? 0), 0), 0);
  const renderRow = (group: typeof confirmed[number], entry: GoalWeightEntry, index: number) => <div className={`okr-weight-confirmation-row${group.kind === 'keyResult' ? ' is-kr' : ' is-objective'}`} key={entry.id}>
    <div className="okr-weight-confirmation-copy"><span className="okr-weight-confirmation-label">{group.kind === 'keyResult' ? `KR${index + 1}` : `${label}${index + 1}`}</span><span className="okr-weight-confirmation-title" title={entry.title}>{entry.title || '未填写内容'}</span></div>
    <InputNumber aria-label={`${group.kind === 'keyResult' ? 'KR' : label}${index + 1}权重`} min={1} max={100} precision={0} suffix="%"
      value={group.weights[index]} disabled={busy || completed.includes(entry.id) || group.entries.length === 1 || index === group.entries.length - 1}
      onChange={value => { setWeights(current => ({ ...current, [group.id]: (current[group.id] || []).map((weight, i) => i === index ? value : weight) })); setError(''); }}/>
  </div>;
  const keyResultGroups = confirmed.filter(group => group.kind === 'keyResult' && group.parentEntryId);
  return <Modal open title={title || (label === 'O' ? '确认目标权重' : '确认主 KR 权重')} className="okr-weight-confirmation" zIndex={2100}
    okText="确认并提交" cancelText="取消" confirmLoading={busy} okButtonProps={{ disabled: !valid || busy }}
    cancelButtonProps={{ disabled: busy }} closable={!busy} keyboard={!busy} mask={{ closable: false }}
    onCancel={() => onFinish(completed, false)} onOk={() => void submit()}
    footer={(_, { OkBtn, CancelBtn }) => <div className="okr-weight-confirmation-footer"><span className={objectiveWeightTotal === 100 ? 'is-valid' : 'is-error'}>权重和：{objectiveWeightTotal}%</span><div><CancelBtn/><OkBtn/></div></div>}>
    {objectiveGroups.map(group => <section key={group.id} className="okr-weight-confirmation-group">
      <div className="okr-weight-confirmation-rows">{group.entries.map((entry, index) => <div key={entry.id}>
        {renderRow(group, entry, index)}
        {keyResultGroups.filter(child => child.parentEntryId === entry.id).map(child => <section key={child.id} className="okr-weight-confirmation-kr-group"><div className="okr-weight-confirmation-rows">{child.entries.map((kr, krIndex) => renderRow(child, kr, krIndex))}</div></section>)}
      </div>)}</div>
    </section>)}
    {confirmed.filter(group => group.kind === 'keyResult' && !group.parentEntryId).map(group => <section key={group.id} className="okr-weight-confirmation-group"><div className="okr-weight-confirmation-rows">{group.entries.map((entry, index) => renderRow(group, entry, index))}</div></section>)}
    {!valid && <Alert type="error" title="每条权重须为 1–100 的整数，合计为 100%；请调整各项权重。"/>}
    {error && <Alert type="error" title={error}/>}
  </Modal>;
}
