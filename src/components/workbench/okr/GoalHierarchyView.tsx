import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Drawer, Empty, Progress, Skeleton, Tag } from 'antd';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  GitBranchIcon,
  LinkIcon,
  PersonIcon,
  ScreenFullIcon,
  ScreenNormalIcon,
  XIcon,
} from '@primer/octicons-react';
import type { OkrPerson, OkrRecord } from '../../../services/okrRepository';
import type { MyTargetViewItem } from './MyTargetMonthSection';

export type GoalHierarchyNode = {
  id: string;
  referenceId: string;
  kind: 'objective' | 'action';
  title: string;
  status: string;
  progress: number;
  weight: number;
  ownerId: string;
  assigneeIds: string[];
  assigneeNames?: string[];
  department?: string;
  deadline?: string;
  createdAt?: string;
  source?: GoalHierarchyNode;
  children: GoalHierarchyNode[];
  record?: OkrRecord;
};

const clampProgress = (value: unknown) => Math.max(0, Math.min(100, Number(value) || 0));

const aggregateProgress = (node: GoalHierarchyNode): number => {
  if (node.children.length === 0) return clampProgress(node.progress);
  const weighted = node.children.filter(child => child.weight > 0);
  if (weighted.length === 0) return clampProgress(node.progress);
  const totalWeight = weighted.reduce((sum, child) => sum + child.weight, 0);
  return Math.round(weighted.reduce((sum, child) => sum + aggregateProgress(child) * child.weight, 0) / totalWeight);
};

export function buildGoalHierarchy(records: OkrRecord[], periodKey: string, ownerId?: string): GoalHierarchyNode[] {
  const periodRecords = records.filter(record => record.periodKey === periodKey);
  const objectives = periodRecords.filter(record => record.kind === 'objective' && (!ownerId || record.ownerId === ownerId));
  const actions = periodRecords.filter(record => record.kind === 'action');

  const buildActionChildren = (parent: GoalHierarchyNode, parentReferenceId: string, seen: Set<string>): GoalHierarchyNode[] => actions
    .filter(record => record.payload.parentActionId === parentReferenceId && !seen.has(record.id))
    .map(record => {
      const nextSeen = new Set(seen).add(record.id);
      const node: GoalHierarchyNode = {
        id: record.id,
        referenceId: record.id,
        kind: 'action',
        title: record.payload.title,
        status: record.status,
        progress: clampProgress(record.payload.progress),
        weight: Number(record.payload.weight) || 0,
        ownerId: record.ownerId,
        assigneeIds: record.payload.assigneeIds || [],
        department: record.payload.department,
        deadline: record.payload.deadline,
        createdAt: record.createdAt,
        source: parent,
        children: [],
        record,
      };
      node.children = buildActionChildren(node, record.id, nextSeen);
      node.progress = aggregateProgress(node);
      return node;
    });

  return objectives.map(record => {
    const root: GoalHierarchyNode = {
      id: record.id,
      referenceId: record.id,
      kind: 'objective',
      title: record.payload.title,
      status: record.status,
      progress: clampProgress(record.payload.progress),
      weight: Number(record.payload.weight) || 100,
      ownerId: record.ownerId,
      assigneeIds: [],
      deadline: record.payload.deadline,
      createdAt: record.createdAt,
      children: [],
      record,
    };
    const keyResultNodes: GoalHierarchyNode[] = (record.payload.keyResults || []).map(keyResult => {
      const actionNode: GoalHierarchyNode = {
        id: `kr:${record.id}:${keyResult.id}`,
        referenceId: keyResult.id,
        kind: 'action',
        title: keyResult.title,
        status: record.status,
        progress: clampProgress(keyResult.progress),
        weight: Number(keyResult.weight) || 0,
        ownerId: record.ownerId,
        assigneeIds: keyResult.assigneeIds || [],
        deadline: keyResult.deadline,
        source: root,
        children: [],
      };
      actionNode.children = buildActionChildren(actionNode, keyResult.id, new Set());
      actionNode.progress = aggregateProgress(actionNode);
      return actionNode;
    });
    const keyResultIds = new Set(keyResultNodes.map(node => node.referenceId));
    const topLevelActions = actions
      .filter(action => action.payload.parentObjectiveId === record.id && !action.payload.parentActionId && !keyResultIds.has(action.id))
      .map(action => {
        const node: GoalHierarchyNode = {
          id: action.id,
          referenceId: action.id,
          kind: 'action',
          title: action.payload.title,
          status: action.status,
          progress: clampProgress(action.payload.progress),
          weight: Number(action.payload.weight) || 0,
          ownerId: action.ownerId,
          assigneeIds: action.payload.assigneeIds || [],
          department: action.payload.department,
          deadline: action.payload.deadline,
          createdAt: action.createdAt,
          source: root,
          children: [],
          record: action,
        };
        node.children = buildActionChildren(node, action.id, new Set([action.id]));
        node.progress = aggregateProgress(node);
        return node;
      });
    root.children = [...keyResultNodes, ...topLevelActions];
    root.progress = aggregateProgress(root);
    return root;
  });
}

const flatten = (nodes: GoalHierarchyNode[]): GoalHierarchyNode[] => nodes.flatMap(node => [node, ...flatten(node.children)]);

const statusMeta = (status: string) => status === 'draft'
  ? { label: '草稿', color: 'warning' as const }
  : status === 'active'
    ? { label: '已生效', color: 'success' as const }
    : status === 'pending_review'
      ? { label: '待确认', color: 'processing' as const }
      : { label: '已提交', color: 'processing' as const };

const GoalNodeRow = ({ node, code, expanded, selected, people, onToggle, onSelect }: {
  node: GoalHierarchyNode;
  code: string;
  expanded: boolean;
  selected: boolean;
  people: OkrPerson[];
  onToggle: () => void;
  onSelect: () => void;
}) => {
  const status = statusMeta(node.status);
  const assigneeNames = node.assigneeNames || node.assigneeIds.map(id => people.find(person => person.id === id)?.name || id);
  return <div className={`goal-node-row${selected ? ' is-selected' : ''}${node.status === 'draft' ? ' is-draft' : ''}`}>
    <button type="button" className="goal-node-toggle" aria-label={node.children.length ? `${expanded ? '收起' : '展开'} ${node.title}` : `${node.title} 无下级动作`} disabled={!node.children.length} onClick={onToggle}>
      {node.children.length ? (expanded ? <ChevronDownIcon /> : <ChevronRightIcon />) : <span />}
    </button>
    <button type="button" className="goal-node-main" aria-label={`查看 ${node.title}`} aria-pressed={selected} onClick={onSelect}>
      <span className={`goal-node-code is-${node.kind}`}>{code}</span>
      <span className="goal-node-content">
        <span className="goal-node-title">{node.title}</span>
        <span className="goal-node-meta">
          {node.kind === 'action' && <><PersonIcon />{assigneeNames.length ? assigneeNames.join('、') : '未指定承接人'}</>}
          {node.children.length > 0 && <span>{node.children.length} 个下级动作</span>}
        </span>
      </span>
      <span className="goal-node-progress"><Progress percent={node.progress} size="small" showInfo={false}/><b>{node.progress}%</b></span>
      <Tag color={status.color}>{status.label}</Tag>
    </button>
  </div>;
};

const GoalNodeBranch = ({ node, path, expandedIds, selectedId, people, onToggle, onSelect }: {
  key?: string;
  node: GoalHierarchyNode;
  path: number[];
  expandedIds: Set<string>;
  selectedId?: string;
  people: OkrPerson[];
  onToggle: (id: string) => void;
  onSelect: (node: GoalHierarchyNode) => void;
}) => {
  const code = node.kind === 'objective' ? `O${path[0]}` : `A${path.join('')}`;
  const expanded = expandedIds.has(node.id);
  return <div className={`goal-node-branch depth-${path.length}`}>
    <GoalNodeRow node={node} code={code} expanded={expanded} selected={selectedId === node.id} people={people} onToggle={() => onToggle(node.id)} onSelect={() => onSelect(node)}/>
    {expanded && node.children.length > 0 && <div className="goal-node-children">{node.children.map((child, index) => <GoalNodeBranch key={child.id} node={child} path={[...path, index + 1]} expandedIds={expandedIds} selectedId={selectedId} people={people} onToggle={onToggle} onSelect={onSelect}/>)}</div>}
  </div>;
};

const sourcePath = (node: GoalHierarchyNode) => {
  const chain: GoalHierarchyNode[] = [];
  let current: GoalHierarchyNode | undefined = node;
  while (current) { chain.unshift(current); current = current.source; }
  return chain;
};

const GoalHierarchyDemo = () => {
  const levels = [
    { code: 'O', title: '公司月度目标', role: '老板制定' },
    { code: 'A1', title: '老板关键动作', role: '下发主管' },
    { code: 'A11', title: '主管拆解目标', role: '下发员工' },
    { code: 'A111', title: '员工执行目标', role: '落地执行' },
  ];
  return <section className="goal-hierarchy-demo" aria-label="四级目标关系演示">
    <header><div><Tag color="processing">关系演示</Tag><strong>四级下钻效果</strong></div><p>仅用于说明老板视角的层级关系，不保存、不提交，也不参与真实目标进度。</p></header>
    <div className="goal-hierarchy-demo-tree">{levels.map((level, index) => <div key={level.code} className={`goal-hierarchy-demo-node depth-${index}`}>
      <span>{level.code}</span><b>{level.title}</b><small>{level.role}</small>
    </div>)}</div>
  </section>;
};

export function GoalHierarchyView({ records, people, periodKey, ownerId, supplementalTargets = [], loading = false, error, initialSelectedId, showDemoHierarchy = false, onBack, onEditDraft, onSubmitDraft }: {
  records: OkrRecord[];
  people: OkrPerson[];
  periodKey: string;
  ownerId?: string;
  supplementalTargets?: MyTargetViewItem[];
  loading?: boolean;
  error?: unknown;
  initialSelectedId?: string;
  showDemoHierarchy?: boolean;
  onBack?: () => void;
  onEditDraft?: (record: OkrRecord) => void;
  onSubmitDraft?: (record: OkrRecord) => void;
}) {
  const roots = useMemo(() => {
    const persistedRoots = buildGoalHierarchy(records, periodKey, ownerId);
    const persistedIds = new Set(persistedRoots.map(root => root.id));
    const supplementalRoots = supplementalTargets
      .filter(target => !persistedIds.has(target.id) && (!target.detailId || !persistedIds.has(target.detailId)))
      .map<GoalHierarchyNode>(target => {
        const root: GoalHierarchyNode = {
          id: target.id,
          referenceId: target.id,
          kind: 'objective',
          title: target.title,
          status: target.status,
          progress: target.progress,
          weight: 100,
          ownerId: ownerId || '',
          assigneeIds: [],
          children: [],
        };
        root.children = target.actions.map(action => ({
          id: action.id,
          referenceId: action.id,
          kind: 'action',
          title: action.title,
          status: target.status,
          progress: action.progress,
          weight: action.weight,
          ownerId: ownerId || '',
          assigneeIds: [],
          assigneeNames: action.assigneeNames,
          deadline: action.deadline,
          source: root,
          children: [],
        }));
        return root;
      });
    return [...persistedRoots, ...supplementalRoots];
  }, [records, periodKey, ownerId, supplementalTargets]);
  const nodes = useMemo(() => flatten(roots), [roots]);
  const expandableIds = useMemo(() => nodes.filter(node => node.children.length > 0).map(node => node.id), [nodes]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(roots.map(root => root.id)));
  const [selectedId, setSelectedId] = useState<string | undefined>(initialSelectedId);
  const [detailId, setDetailId] = useState<string | undefined>();
  useEffect(() => { setExpandedIds(new Set(roots.map(root => root.id))); }, [periodKey, roots.length]);
  useEffect(() => { if (initialSelectedId) setSelectedId(initialSelectedId); }, [initialSelectedId]);
  const selected = nodes.find(node => node.id === selectedId);
  const allExpanded = expandableIds.length > 0 && expandableIds.every(id => expandedIds.has(id));
  const toggle = (id: string) => setExpandedIds(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const ownerName = (id: string) => people.find(person => person.id === id)?.name || '人员已停用';
  const assignees = selected?.assigneeNames || selected?.assigneeIds.map(id => people.find(person => person.id === id)?.name || id) || [];

  return <section className="goal-hierarchy" aria-label="目标逐级承接关系">
    <header className="goal-hierarchy-toolbar">
      <div><span>目标关系</span><h2>{periodKey.replace('-', '年')}月目标树</h2><p>默认展示 O 与直属 A，继续展开可查看逐级承接动作。</p></div>
      <div className="goal-hierarchy-actions">
        <Button icon={allExpanded ? <ScreenNormalIcon /> : <ScreenFullIcon />} disabled={!expandableIds.length || loading} onClick={() => setExpandedIds(allExpanded ? new Set(roots.map(root => root.id)) : new Set(expandableIds))}>{allExpanded ? '收起深层' : '全部展开'}</Button>
        {onBack && <Button type="text" icon={<XIcon />} onClick={onBack}>返回列表</Button>}
      </div>
    </header>
    {error && <Alert type="error" showIcon title="目标关系加载失败" description="服务暂不可用，请重试后查看。"/>}
    {loading ? <div className="goal-hierarchy-loading" role="status"><Skeleton active paragraph={{ rows: 5 }}/></div> : roots.length === 0 ? <div className="goal-hierarchy-empty"><Empty description="当前周期暂无可展示的目标关系"/><p>上级目标提交并指派后，承接动作会显示在这里。</p></div> : <div className="goal-hierarchy-layout">
      <div className="goal-hierarchy-tree">{roots.map((root, index) => <GoalNodeBranch key={root.id} node={root} path={[index + 1]} expandedIds={expandedIds} selectedId={selectedId} people={people} onToggle={toggle} onSelect={node => { setSelectedId(node.id); setDetailId(node.id); }}/>)}</div>
    </div>}
    {showDemoHierarchy && <GoalHierarchyDemo />}
    <Drawer rootClassName="goal-hierarchy-drawer" open={Boolean(detailId)} placement="right" closable={false} maskClosable destroyOnHidden onClose={() => setDetailId(undefined)} title="目标节点详情">
      {selected && detailId && <aside className="goal-node-detail" aria-label="目标节点详情">
        <div className="goal-node-detail-head"><div><Tag color={statusMeta(selected.status).color}>{statusMeta(selected.status).label}</Tag><span>{selected.kind === 'objective' ? '目标 O' : '动作 A'}</span></div><Button type="text" aria-label="关闭详情" icon={<XIcon />} onClick={() => setDetailId(undefined)}/></div>
        <h3>{selected.title}</h3>
        <div className="goal-source-path"><b><LinkIcon />来源链路</b><div>{sourcePath(selected).map((item, index) => <span key={item.id}>{index > 0 && <ChevronRightIcon/>}<em>{item.title}</em></span>)}</div></div>
        <div className="goal-detail-progress"><span>递归汇总进度</span><strong>{selected.progress}%</strong><Progress percent={selected.progress} showInfo={false}/><small>{selected.children.length ? `由 ${selected.children.length} 个直属下级动作按权重汇总` : '当前为叶子动作，展示自身进度'}</small></div>
        <dl className="goal-detail-fields">
          <div><dt>负责人</dt><dd>{ownerName(selected.ownerId)}</dd></div>
          <div><dt>承接人</dt><dd>{selected.kind === 'objective' ? '—' : assignees.length ? assignees.join('、') : '未指定承接人'}</dd></div>
          <div><dt>权重</dt><dd>{selected.weight}%</dd></div>
          <div><dt>完成时间</dt><dd>{selected.deadline || '未设置'}</dd></div>
          <div><dt>下级承接</dt><dd>{selected.children.length ? `${selected.children.filter(child => child.status !== 'draft').length}/${selected.children.length} 已提交` : '暂无下级动作'}</dd></div>
          <div><dt>所属部门</dt><dd>{selected.department || people.find(person => person.id === selected.ownerId)?.department || '—'}</dd></div>
        </dl>
        <div className="goal-node-detail-actions">
          {selected.status === 'draft' && selected.record ? <><Button onClick={() => { onEditDraft?.(selected.record); setSelectedId(undefined); }} disabled={!onEditDraft}>编辑草稿</Button><Button type="primary" onClick={() => onSubmitDraft?.(selected.record)} disabled={!onSubmitDraft}>提交</Button></> : <Button icon={<GitBranchIcon />} disabled>创建调整</Button>}
          {selected.status !== 'draft' && <span>已提交内容只读，后续将通过“创建调整”进入变更流程。</span>}
        </div>
      </aside>}
    </Drawer>
  </section>;
}
