import { useState } from 'react';
import { Alert, InputNumber, Modal } from 'antd';

export type GoalWeightEntry = { id: string; title: string; weight: number; submit: (weight: number) => Promise<boolean> };

export function initialGoalWeights(entries: Pick<GoalWeightEntry, 'weight'>[]): number[] {
  const valid = entries.every(entry => Number.isInteger(entry.weight) && entry.weight > 0)
    && entries.reduce((sum, entry) => sum + entry.weight, 0) === 100;
  return valid ? entries.map(entry => entry.weight) : entries.map((_, index) => Math.floor(100 / entries.length) + (index < 100 % entries.length ? 1 : 0));
}

export function goalWeightRemainder(weights: Array<number | null>): number {
  return 100 - weights.slice(0, -1).reduce<number>((sum, weight) => sum + (weight ?? 0), 0);
}

export function GoalWeightConfirmation({ entries, label, onFinish }: {
  entries: GoalWeightEntry[]; label: 'O' | 'KR'; onFinish: (completedIds: string[], submitted: boolean) => void;
}) {
  const [weights, setWeights] = useState<Array<number | null>>(() => initialGoalWeights(entries));
  const [completed, setCompleted] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const remainder = goalWeightRemainder(weights);
  const confirmed = weights.map((weight, index) => index === weights.length - 1 ? remainder : weight);
  const valid = confirmed.every(weight => weight !== null && Number.isInteger(weight) && weight >= 1 && weight <= 100);
  const submit = async () => {
    if (busy || !valid) return;
    setBusy(true); setError('');
    const saved = [...completed];
    try {
      for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index];
        if (saved.includes(entry.id)) continue;
        if (!await entry.submit(confirmed[index]!)) {
          setError('提交未完成，请检查目标内容或重试；已提交的条目不会重复提交。');
          return;
        }
        saved.push(entry.id); setCompleted([...saved]);
      }
      onFinish(saved, true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '提交失败，请重试');
    } finally { setBusy(false); }
  };
  return <Modal open title={label === 'O' ? '确认目标权重' : '确认主 KR 权重'} className="okr-weight-confirmation" zIndex={2100}
    okText="确认并提交" cancelText="取消" confirmLoading={busy} okButtonProps={{ disabled: !valid || busy }}
    cancelButtonProps={{ disabled: busy }} closable={!busy} keyboard={!busy} mask={{ closable: false }}
    onCancel={() => onFinish(completed, false)} onOk={() => void submit()}>
    <div className="okr-weight-confirmation-rows">{entries.map((entry, index) => <div className="okr-weight-confirmation-row" key={entry.id}>
      <div><span className="okr-weight-confirmation-label">{label}{index + 1}</span><span title={entry.title}>{entry.title || '未填写内容'}</span></div>
      <InputNumber aria-label={label + (index + 1) + '权重'} min={1} max={100} precision={0} suffix="%"
        value={confirmed[index]} disabled={busy || completed.includes(entry.id) || index === entries.length - 1}
        onChange={value => { setWeights(current => current.map((weight, i) => i === index ? value : weight)); setError(''); }}/>
    </div>)}</div>
    {!valid && <Alert type="error" title="每条权重须为 1–100 的整数，合计为 100%；请调整前面的权重。"/>}
    {error && <Alert type="error" title={error}/>}
  </Modal>;
}
