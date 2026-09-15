import { useEffect, useState } from 'react';
import { Button, Empty, Input, Modal, Radio } from 'antd';
import { ChevronDownIcon, ChevronRightIcon, DashIcon, SearchIcon } from '@primer/octicons-react';
import type { OKRItem } from '../../../types';

export type AlignmentCategory = 'my' | 'supervisor' | 'subordinate' | 'department' | 'related' | 'aligned-by-me' | 'aligned-to-me' | 'mentioned';

interface Props {
  open: boolean;
  parents: OKRItem[];
  selectedValues: string[];
  search: string;
  category: AlignmentCategory;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: AlignmentCategory) => void;
  onSelectionChange: (values: string[]) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const categories: Array<{ key: AlignmentCategory; label: string; nested?: boolean }> = [
  { key: 'my', label: '我的 OKR' },
  { key: 'supervisor', label: '直属上级' },
  { key: 'subordinate', label: '直属下级' },
  { key: 'department', label: '我部门的' },
  { key: 'related', label: '与我关联' },
  { key: 'aligned-by-me', label: '我对齐的', nested: true },
  { key: 'aligned-to-me', label: '对齐我的', nested: true },
  { key: 'mentioned', label: '@我的', nested: true },
];

export const encodeAlignment = (objectiveId: string, keyResultId?: string) => JSON.stringify(keyResultId ? [objectiveId, keyResultId] : [objectiveId]);
export const decodeAlignment = (value: string) => {
  const [parentObjectiveId, parentKeyResultId] = JSON.parse(value) as string[];
  return { parentObjectiveId, ...(parentKeyResultId ? { parentKeyResultId } : {}) };
};

const AlignmentEmpty = () => <Empty className="okr-alignment-empty" description="暂无数据"/>;

export function ObjectiveAlignmentModal({ open, parents, selectedValues, search, category, onSearchChange, onCategoryChange, onSelectionChange, onCancel, onConfirm }: Props) {
  const [relatedExpanded, setRelatedExpanded] = useState(false);
  useEffect(() => { if (open) setRelatedExpanded(false); }, [open]);
  const selectedFor = (parentId: string) => selectedValues.find(value => decodeAlignment(value).parentObjectiveId === parentId);
  const selectFor = (parentId: string, value: string) => onSelectionChange([...selectedValues.filter(item => decodeAlignment(item).parentObjectiveId !== parentId), value]);
  const visibleParents = category === 'supervisor' ? parents.filter(parent => {
    const term = search.trim().toLowerCase();
    return !term || parent.ownerName.toLowerCase().includes(term) || parent.objective.toLowerCase().includes(term) || parent.keyResults.some(kr => kr.content.toLowerCase().includes(term));
  }) : [];
  const selectedParents = selectedValues.map(value => ({ value, selection: decodeAlignment(value), parent: parents.find(parent => parent.id === decodeAlignment(value).parentObjectiveId) })).filter(item => item.parent);

  const objectiveCard = (parent: OKRItem, value: string | undefined, onChange: (next: string) => void, removable = false) => <div className="okr-alignment-objective-card" key={parent.id}>
    {removable && <Button className="okr-alignment-remove" type="text" danger aria-label={`删除对齐目标：${parent.objective}`} icon={<DashIcon/>} onClick={() => onSelectionChange(selectedValues.filter(item => decodeAlignment(item).parentObjectiveId !== parent.id))}/>}
    <Radio.Group value={value} onChange={event => onChange(event.target.value)}>
      <Radio className="okr-alignment-objective" value={encodeAlignment(parent.id)}><strong>{parent.objective}</strong></Radio>
      <div className="okr-alignment-meta"><span>个人级</span><span>{parent.ownerName}</span><span>{parent.weight}%</span></div>
      <div className="okr-alignment-kr-list">{parent.keyResults.map((kr, index) => <Radio key={kr.id} value={encodeAlignment(parent.id, kr.id)}><span className="okr-alignment-kr-index">KR{index + 1}</span><span>{kr.content}</span></Radio>)}</div>
    </Radio.Group>
  </div>;

  return <Modal className="okr-alignment-modal-shell" width={1120} title="选择对齐目标" open={open} onCancel={onCancel} onOk={onConfirm} okText="确定" cancelText="取消" destroyOnHidden>
    <div className="okr-alignment-modal">
      <aside className="okr-alignment-nav"><Input allowClear prefix={<SearchIcon/>} placeholder="搜索人员 / OKR" value={search} onChange={event => onSearchChange(event.target.value)} className="okr-alignment-search"/>{categories.filter(item => !item.nested || relatedExpanded).map(item => item.key === 'related' ? <button type="button" key={item.key} className={`okr-alignment-nav-item${category === item.key ? ' is-active' : ''}`} aria-expanded={relatedExpanded} onClick={() => { setRelatedExpanded(expanded => !expanded); onCategoryChange('related'); }}><span>{item.label}</span><span className="okr-alignment-nav-expand-icon" aria-hidden="true">{relatedExpanded ? <ChevronDownIcon/> : <ChevronRightIcon/>}</span></button> : <button type="button" key={item.key} className={`okr-alignment-nav-item${item.nested ? ' is-nested' : ''}${category === item.key ? ' is-active' : ''}`} onClick={() => onCategoryChange(item.key)}>{item.label}</button>)}</aside>
      <section className="okr-alignment-options"><h3>{categories.find(item => item.key === category)?.label}</h3>{visibleParents.length ? <div className="okr-alignment-card-list">{visibleParents.map(parent => objectiveCard(parent, selectedFor(parent.id), value => selectFor(parent.id, value)))}</div> : <AlignmentEmpty/>}</section>
      <aside className="okr-alignment-selected"><h3>已添加的对齐</h3>{selectedParents.length ? <div className="okr-alignment-card-list">{selectedParents.map(({ value, parent }) => objectiveCard(parent!, value, next => selectFor(parent!.id, next), true))}</div> : <AlignmentEmpty/>}</aside>
    </div>
  </Modal>;
}
