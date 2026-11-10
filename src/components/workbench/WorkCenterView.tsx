import React, { useState } from 'react';

export const WORK_CENTER_TASK_TYPES = [
  { key: 'product', label: '产品' },
  { key: 'design', label: '设计' },
  { key: 'development', label: '研发' },
  { key: 'testing', label: '测试' },
  { key: 'operations', label: '运维' },
  { key: 'delivery', label: '交付' },
  { key: 'presales', label: '售前' },
] as const;

export type WorkCenterTaskType = (typeof WORK_CENTER_TASK_TYPES)[number]['key'];

type WorkCenterViewProps = {
  taskPanels: Record<WorkCenterTaskType, React.ReactNode>;
};

export const WorkCenterView: React.FC<WorkCenterViewProps> = ({ taskPanels }) => {
  const [activeType, setActiveType] = useState<WorkCenterTaskType>('product');

  return (
    <section className="min-w-0 space-y-4" aria-label="工作中心">
      <div className="flex min-w-0 flex-wrap items-center gap-1 border-b border-[var(--border-main)]" role="tablist" aria-label="任务类型">
        {WORK_CENTER_TASK_TYPES.map(({ key, label }) => (
          <button
            key={key}
            id={`work-center-tab-${key}`}
            type="button"
            role="tab"
            aria-selected={activeType === key}
            aria-controls={`work-center-panel-${key}`}
            onClick={() => setActiveType(key)}
            className={`min-h-10 border-b-2 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${
              activeType === key
                ? 'border-[var(--primary)] text-[var(--active-text)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {WORK_CENTER_TASK_TYPES.map(({ key }) => (
        <div
          key={key}
          id={`work-center-panel-${key}`}
          role="tabpanel"
          aria-labelledby={`work-center-tab-${key}`}
          hidden={activeType !== key}
          className="min-w-0"
        >
          {activeType === key ? taskPanels[key] : null}
        </div>
      ))}
    </section>
  );
};
