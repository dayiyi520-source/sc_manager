import { Cascader } from 'antd';
import type { OkrRecord, OkrSettings } from '../../../services/okrRepository';
import { periodLabel } from '../../../services/okrPeriods';
import { cycleOptions } from './cycleOptions';

export function OkrCycleFilter({ records, viewerId, settings, value, onChange, disabled = false }: {
  records: OkrRecord[];
  viewerId: string;
  settings?: OkrSettings;
  value: string[];
  onChange: (cycles: string[]) => void;
  disabled?: boolean;
}) {
  const options = cycleOptions(records, viewerId, undefined, settings);
  const paths = options.flatMap(group => group.children
    .filter(child => value.includes(child.value))
    .map(child => [group.value, child.value]));
  const summary = value.length === 1 ? `周期：${periodLabel(value[0])}` : `周期：${value.length}个周期`;

  return <Cascader aria-label="周期筛选" className="okr-cycle-filter" multiple options={options}
    value={paths} showCheckedStrategy={Cascader.SHOW_CHILD} allowClear maxTagCount={0}
    maxTagPlaceholder={() => summary} placeholder="周期：请选择" disabled={disabled}
    onChange={selected => onChange(selected.map(path => String(path[path.length - 1])))}/>;
}
