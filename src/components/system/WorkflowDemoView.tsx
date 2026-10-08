import React, { useMemo, useState } from 'react';
import { Button, Select, Tag } from 'antd';
import Card from 'antd/es/card/Card';
import { ArrowDownOutlined, ArrowRightOutlined, CheckCircleOutlined, LinkOutlined } from '@ant-design/icons';

type ScenarioId = 'assistance' | 'reject' | 'direct';
type NodeId =
  | 'a-pending' | 'a-processing' | 'a-review' | 'a-close' | 'a-closed'
  | 'w-pending' | 'w-processing' | 'w-completed'
  | 'm-task' | 'm-assist' | 'm-done';

interface DemoStep {
  title: string;
  detail: string;
  active: NodeId[];
  complete: NodeId[];
}

const SCENARIOS: Record<ScenarioId, { label: string; steps: DemoStep[] }> = {
  assistance: {
    label: '协同事项转产研任务并闭环',
    steps: [
      { title: '发起协同事项', detail: '事项进入待处理，同时负责人可在工作台看到协同事项待办。', active: ['a-pending', 'm-assist'], complete: [] },
      { title: '创建并指派下游任务', detail: '协同事项可创建产品、设计、研发或缺陷任务；任务指派给本人时，我的任务会新增一条产研任务待办。', active: ['a-processing', 'w-pending', 'm-task', 'm-assist'], complete: ['a-pending'] },
      { title: '负责人处理任务', detail: '下游任务从待处理进入处理中，任务和协同事项继续显示在对应负责人的待办中。', active: ['a-processing', 'w-processing', 'm-task', 'm-assist'], complete: ['a-pending', 'w-pending'] },
      { title: '下游任务全部完成', detail: '任务进入已完成并移出任务待办；所有阻断任务完成后，协同事项进入待验收。', active: ['a-review', 'w-completed', 'm-assist'], complete: ['a-pending', 'a-processing', 'w-pending', 'w-processing', 'm-task'] },
      { title: '发起人验收通过', detail: '全部下游任务验收通过后，协同事项进入待关闭。', active: ['a-close', 'w-completed', 'm-assist'], complete: ['a-pending', 'a-processing', 'a-review', 'w-pending', 'w-processing', 'm-task'] },
      { title: '发起人关闭事项', detail: '协同事项进入已关闭，协同事项待办也从工作台移出。', active: ['a-closed', 'w-completed', 'm-done'], complete: ['a-pending', 'a-processing', 'a-review', 'a-close', 'w-pending', 'w-processing', 'm-task', 'm-assist'] }
    ]
  },
  reject: {
    label: '协同事项验收未通过',
    steps: [
      { title: '等待发起人验收', detail: '下游任务已经完成，协同事项处于待验收。', active: ['a-review', 'w-completed', 'm-assist'], complete: ['a-pending', 'a-processing', 'w-pending', 'w-processing', 'm-task'] },
      { title: '验收未通过', detail: '发起人填写未通过原因，协同事项退回处理中，下游任务重新交回负责人。', active: ['a-processing', 'w-processing', 'm-task', 'm-assist'], complete: ['a-pending', 'w-pending'] },
      { title: '负责人重新处理', detail: '任务保持在个人待办中，负责人修正处理结果。', active: ['a-processing', 'w-processing', 'm-task', 'm-assist'], complete: ['a-pending', 'w-pending'] },
      { title: '再次提交验收', detail: '任务再次完成后移出任务待办，协同事项重新进入待验收。', active: ['a-review', 'w-completed', 'm-assist'], complete: ['a-pending', 'a-processing', 'w-pending', 'w-processing', 'm-task'] }
    ]
  },
  direct: {
    label: '独立产研任务直接流转',
    steps: [
      { title: '直接创建产研任务', detail: '在产研管理创建产品、设计、研发、测试或缺陷任务，指派负责人后进入我的任务。', active: ['w-pending', 'm-task'], complete: [] },
      { title: '负责人开始处理', detail: '任务进入处理中，并继续显示在工作台我的任务。', active: ['w-processing', 'm-task'], complete: ['w-pending'] },
      { title: '任务完成', detail: '任务进入已完成并从个人未完成待办中移出；取消任务同样会移出。', active: ['w-completed', 'm-done'], complete: ['w-pending', 'w-processing', 'm-task'] }
    ]
  }
};

const ASSISTANCE_STATES = [
  { id: 'a-pending' as const, title: '待处理', detail: '发起并指定负责人' },
  { id: 'a-processing' as const, title: '处理中', detail: '处理或创建下游任务' },
  { id: 'a-review' as const, title: '待验收', detail: '阻断任务均已完成' },
  { id: 'a-close' as const, title: '待关闭', detail: '下游任务均已验收' },
  { id: 'a-closed' as const, title: '已关闭', detail: '发起人确认闭环' }
];
const WORK_ITEM_STATES = [
  { id: 'w-pending' as const, title: '待处理', detail: '新建或由事项生成' },
  { id: 'w-processing' as const, title: '处理中', detail: '负责人执行' },
  { id: 'w-completed' as const, title: '已完成', detail: '形成处理结果' }
];

const FlowStates: React.FC<{ states: Array<{ id: NodeId; title: string; detail?: string }>; active: NodeId[]; complete: NodeId[] }> = ({ states, active, complete }) => (
  <div className="overflow-x-auto pb-1">
    <div className="flex min-w-[620px] items-stretch gap-2">
      {states.map((state, index) => {
        const stateClass = active.includes(state.id)
          ? 'border-[var(--primary)] bg-[var(--primary)]/15'
          : complete.includes(state.id)
            ? 'border-[var(--success)]/50 bg-[var(--success)]/10'
            : 'border-transparent bg-[var(--bg-surface-soft)] opacity-45';
        return (
          <React.Fragment key={state.id}>
            <div className={`min-w-0 flex-1 rounded-md border px-3 py-2 text-center transition-colors ${stateClass}`}>
              <strong className="block text-xs font-medium text-[var(--text-primary)]">{state.title}</strong>
              {state.detail && <small className="mt-1 block text-[10px] text-[var(--text-muted)]">{state.detail}</small>}
            </div>
            {index < states.length - 1 && <ArrowRightOutlined className="self-center text-[var(--text-muted)]" />}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

const MyTaskCard: React.FC<{ id: NodeId; label: string; title: string; detail: string; active: NodeId[]; complete: NodeId[]; done?: boolean }> = ({ id, label, title, detail, active, complete, done }) => {
  const stateClass = active.includes(id)
    ? 'border-[var(--primary)] bg-[var(--primary)]/15'
    : complete.includes(id)
      ? 'border-[var(--success)]/50 bg-[var(--success)]/10'
      : 'border-transparent bg-[var(--bg-surface-soft)] opacity-45';
  return <div className={`rounded-md border p-3 transition-colors ${stateClass}`}><span className={`text-[10px] ${done ? 'text-[var(--success)]' : 'text-[var(--primary)]'}`}>{label}</span><strong className="mt-1 block text-xs font-medium text-[var(--text-primary)]">{title}</strong><small className="mt-1 block text-[10px] text-[var(--text-muted)]">{detail}</small></div>;
};

export const WorkflowDemoView: React.FC = () => {
  const [scenario, setScenario] = useState<ScenarioId>('assistance');
  const [stepIndex, setStepIndex] = useState(0);
  const steps = SCENARIOS[scenario].steps;
  const current = steps[stepIndex];
  const scenarioOptions = useMemo(() => Object.entries(SCENARIOS).map(([value, item]) => ({ value, label: item.label })), []);
  const switchScenario = (value: ScenarioId) => { setScenario(value); setStepIndex(0); };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-main)] pb-3">
        <div>
          <div className="text-[11px] text-[var(--primary)]">系统与组织 / 工作流演示</div>
          <h1 className="mt-1 text-lg font-bold text-[var(--text-primary)]">产研任务、协同事项与我的任务如何流转</h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">“我的任务”是个人待办聚合入口，状态始终以产研任务或协同事项的源数据为准。</p>
        </div>
        <Tag color="success" icon={<CheckCircleOutlined />}>业务关系演示</Tag>
      </header>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="min-w-[280px] flex-1 space-y-1.5 text-xs text-[var(--text-muted)] md:max-w-[420px]">
          <span>演示场景</span>
          <Select className="w-full" value={scenario} options={scenarioOptions} onChange={switchScenario} />
        </label>
        <div className="flex items-center gap-2">
          <Button disabled={stepIndex === 0} onClick={() => setStepIndex((value) => Math.max(0, value - 1))}>上一步</Button>
          <span className="min-w-14 text-center text-xs text-[var(--text-muted)]">{stepIndex + 1} / {steps.length}</span>
          <Button type="primary" disabled={stepIndex === steps.length - 1} onClick={() => setStepIndex((value) => Math.min(steps.length - 1, value + 1))}>下一步</Button>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-md border border-[var(--border-main)] border-l-[3px] border-l-[var(--primary)] bg-[var(--bg-surface)] px-4 py-3" aria-live="polite">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--primary)]/20 text-sm font-semibold text-[var(--text-primary)]">{stepIndex + 1}</span>
        <div>
          <strong className="text-sm font-medium text-[var(--text-primary)]">{current.title}</strong>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{current.detail}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Card className={`border-[var(--border-main)] bg-[var(--bg-surface)] transition-opacity ${scenario === 'direct' ? 'opacity-45' : ''}`} styles={{ body: { padding: 16 } }}>
          <div className="mb-3 flex flex-wrap items-baseline gap-2"><strong className="text-sm font-semibold text-[var(--text-primary)]">协同事项</strong><span className="text-[11px] text-[var(--text-muted)]">跨部门问题与诉求入口</span></div>
          <FlowStates states={ASSISTANCE_STATES} active={current.active} complete={current.complete} />
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]">
            <span>可创建下游：</span><Tag>产品需求</Tag><Tag>设计任务</Tag><Tag>研发任务</Tag><Tag>缺陷管理</Tag>
            <span className="md:ml-auto text-[var(--warning)]">验收未通过：待验收 → 处理中　|　重新开启：已关闭 → 处理中</span>
          </div>
        </Card>

        <div className="flex h-8 items-center justify-center gap-3 text-[10px] text-[var(--text-muted)]"><span>创建并关联下游任务</span><ArrowDownOutlined className="text-[var(--primary)]" /><span>任务完成结果回写协同事项</span></div>

        <Card className="border-[var(--border-main)] bg-[var(--bg-surface)]" styles={{ body: { padding: 16 } }}>
          <div className="mb-3 flex flex-wrap items-baseline gap-2"><strong className="text-sm font-semibold text-[var(--text-primary)]">产研管理各任务</strong><span className="text-[11px] text-[var(--text-muted)]">产品、设计、研发、测试、缺陷</span></div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="mb-2 text-[11px] text-[var(--text-muted)]">通用工作项状态</div>
              <FlowStates states={WORK_ITEM_STATES} active={current.active} complete={current.complete} />
              <div className="mt-2 text-center text-[10px] text-[var(--text-muted)]">待处理 / 处理中 <span className="text-[var(--warning)]">→</span> 已取消</div>
            </div>
            <div>
              <div className="mb-2 text-[11px] text-[var(--text-muted)]">测试任务状态</div>
              <div className="overflow-x-auto pb-1"><div className="flex min-w-[420px] items-center gap-2"><div className="flex-1 rounded-md bg-[var(--bg-surface-soft)] px-3 py-2 text-center text-xs text-[var(--text-primary)]">待测试</div><ArrowRightOutlined className="text-[var(--text-muted)]" /><div className="flex-1 rounded-md bg-[var(--bg-surface-soft)] px-3 py-2 text-center text-xs text-[var(--text-primary)]">测试中</div><ArrowRightOutlined className="text-[var(--text-muted)]" /><div className="flex-1 rounded-md bg-[var(--bg-surface-soft)] px-3 py-2 text-center text-xs text-[var(--text-primary)]">已完成</div></div></div>
              <div className="mt-2 text-center text-[10px] text-[var(--text-muted)]">待测试 / 测试中 <span className="text-[var(--warning)]">→</span> 暂缓测试 <span className="text-[var(--warning)]">→</span> 恢复测试</div>
            </div>
          </div>
          <div className="mt-3 border-t border-[var(--border-main)] pt-3 text-[11px] text-[var(--text-muted)]"><LinkOutlined className="mr-1 text-[var(--primary)]" />状态来自工作项模板；不同子类型可配置自己的状态名称与允许流转路径，本页展示通用主流程。</div>
        </Card>

        <div className="flex h-8 items-center justify-center gap-3 text-[10px] text-[var(--text-muted)]"><span>负责人名下且未结束</span><ArrowDownOutlined className="text-[var(--primary)]" /><span>完成、取消或关闭后移出待办</span></div>

        <Card className="border-[var(--border-main)] bg-[var(--bg-surface)]" styles={{ body: { padding: 16 } }}>
          <div className="mb-3 flex flex-wrap items-baseline gap-2"><strong className="text-sm font-semibold text-[var(--text-primary)]">工作台 · 我的任务</strong><span className="text-[11px] text-[var(--text-muted)]">个人待办聚合，不产生第三套状态</span></div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <MyTaskCard id="m-task" label="任务" title="产研任务待办" detail="点击进入对应产品、设计、研发、测试或缺陷页面" active={current.active} complete={current.complete} />
            <MyTaskCard id="m-assist" label="协同事项" title="协同事项待办" detail="点击进入协同事项，查看关联任务和验收进度" active={current.active} complete={current.complete} />
            <MyTaskCard id="m-done" label="结束" title="移出我的待办" detail="源任务完成、取消，或协同事项关闭后不再展示" active={current.active} complete={current.complete} done />
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-1 border-t border-[var(--border-main)] pt-3 text-[11px] text-[var(--text-muted)] md:flex-row md:gap-3"><strong className="shrink-0 font-medium text-[var(--warning)]">核心规则</strong><span>我的任务聚合当前负责人相关且未结束的记录；协同事项可拆成多条下游任务，下游任务指派给本人时会形成独立任务待办，全部阻断任务完成并验收后才可关闭协同事项。</span></div>
    </div>
  );
};
