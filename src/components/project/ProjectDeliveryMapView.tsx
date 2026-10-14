import React, { useMemo, useState } from 'react';
import { Button, Empty, Input, Select, Spin, Tag } from 'antd';
import { ReloadOutlined, SearchOutlined, FolderOpenOutlined, UserOutlined } from '@ant-design/icons';
import { projectDeliveryMap } from '../../services/projectDeliveryMap';
const MOCK_PROJECT_DELIVERY_MAP = projectDeliveryMap();
import type { DeliveryMapProject, DeliveryMapStage, DeliveryMapStageStatus } from '../../types';

const STAGE_WIDTH = 126;
const STATUS_META: Record<DeliveryMapStageStatus, { label: string; className: string }> = {
  completed: { label: '\u5df2\u5b8c\u6210', className: 'delivery-stage-completed' },
  ongoing: { label: '\u8fdb\u884c\u4e2d', className: 'delivery-stage-ongoing' },
  pending: { label: '\u672a\u5f00\u59cb', className: 'delivery-stage-pending' },
};
const stageNames = Array.from(new Set(MOCK_PROJECT_DELIVERY_MAP.flatMap((project) => project.products.flatMap((product) => product.stages.map((stage) => stage.name)))));
const productNames = Array.from(new Set(MOCK_PROJECT_DELIVERY_MAP.flatMap((project) => project.products.map((product) => product.name))));
const includesText = (value: string, query: string) => value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());

const matchesProject = (project: DeliveryMapProject, filters: { project: string; stage: string; product: string; status: string }) => {
  if (filters.project && !includesText(`${project.name} ${project.customerName}`, filters.project)) return false;
  return project.products.some((product) => {
    if (filters.product && product.name !== filters.product) return false;
    return product.stages.some((stage) => {
      if (filters.stage && stage.name !== filters.stage) return false;
      return filters.status === 'all' || stage.status === filters.status;
    });
  });
};
const visibleProducts = (project: DeliveryMapProject, filters: { stage: string; product: string; status: string }) => project.products.filter((product) => {
  if (filters.product && product.name !== filters.product) return false;
  return product.stages.some((stage) => (!filters.stage || stage.name === filters.stage) && (filters.status === 'all' || stage.status === filters.status));
});

const StageNode: React.FC<{ stage: DeliveryMapStage; isLast: boolean }> = ({ stage, isLast }) => {
  const meta = STATUS_META[stage.status];
  return <div className={`delivery-stage-node ${meta.className}`} style={{ width: STAGE_WIDTH }}>
    <div className="delivery-stage-card">
      <div className="delivery-stage-name" title={stage.name}>{stage.name}</div>
      <div className="delivery-stage-status" aria-label={meta.label}><span className="delivery-stage-status-icon">{stage.status === 'completed' ? '\u2713' : '\u25cb'}</span></div>
      <div className="delivery-stage-date">{stage.dateLabel}</div>
    </div>
    {!isLast && <span className="delivery-stage-connector" aria-hidden="true" />}
  </div>;
};

export const ProjectDeliveryMapView: React.FC = () => {
  const [draftFilters, setDraftFilters] = useState({ project: '', stage: '', product: '', status: 'all' });
  const [filters, setFilters] = useState(draftFilters);
  const [isSearching, setIsSearching] = useState(false);
  const filteredProjects = useMemo(() => MOCK_PROJECT_DELIVERY_MAP.filter((project) => matchesProject(project, filters)), [filters]);
  const handleSearch = () => {
    setIsSearching(true);
    window.setTimeout(() => { setFilters(draftFilters); setIsSearching(false); }, 180);
  };
  const handleReset = () => {
    const emptyFilters = { project: '', stage: '', product: '', status: 'all' };
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
  };

  return <section className="delivery-map-page" aria-labelledby="delivery-map-title">
    <div className="delivery-map-heading">
      <div><p className="delivery-map-eyebrow">PROJECT DELIVERY</p><h1 id="delivery-map-title">{'\u9879\u76ee\u4ea4\u4ed8\u5730\u56fe'}</h1><p className="delivery-map-description">{'\u6309\u9879\u76ee\u3001\u5ba2\u6237\u9662\u6821\u548c\u4ea7\u54c1\u67e5\u770b\u4ea4\u4ed8\u9636\u6bb5\u8fdb\u5ea6\uff0c\u5feb\u901f\u8bc6\u522b\u5f53\u524d\u9700\u8981\u63a8\u8fdb\u7684\u8282\u70b9\u3002'}</p></div>
      <div className="delivery-map-summary" aria-label="delivery map summary"><span><strong>{MOCK_PROJECT_DELIVERY_MAP.length}</strong> {'\u4e2a\u9879\u76ee'}</span><span><strong>{MOCK_PROJECT_DELIVERY_MAP.reduce((total, project) => total + project.products.length, 0)}</strong> {'\u4e2a\u4ea7\u54c1'}</span></div>
    </div>
    <div className="delivery-map-filter-panel">
      <div className="delivery-map-filter-grid">
        <Input aria-label="project or customer" allowClear value={draftFilters.project} onChange={(event) => setDraftFilters((prev) => ({ ...prev, project: event.target.value }))} placeholder={'\u8bf7\u8f93\u5165\u9879\u76ee\u540d\u79f0/\u5ba2\u6237\u9662\u6821'} prefix={<SearchOutlined />} />
        <Select aria-label="stage" allowClear value={draftFilters.stage || undefined} onChange={(stage) => setDraftFilters((prev) => ({ ...prev, stage: stage || '' }))} placeholder={'\u8bf7\u9009\u62e9\u9636\u6bb5\u540d\u79f0'} options={stageNames.map((value) => ({ value, label: value }))} />
        <Select aria-label="product" allowClear value={draftFilters.product || undefined} onChange={(product) => setDraftFilters((prev) => ({ ...prev, product: product || '' }))} placeholder={'\u8bf7\u9009\u62e9\u4ea7\u54c1'} options={productNames.map((value) => ({ value, label: value }))} />
        <Select aria-label="status" value={draftFilters.status} onChange={(status) => setDraftFilters((prev) => ({ ...prev, status }))} options={[{ value: 'all', label: '\u8bf7\u9009\u62e9\u9879\u76ee\u72b6\u6001' }, ...Object.entries(STATUS_META).map(([value, meta]) => ({ value, label: meta.label }))]} />
        <div className="delivery-map-filter-actions"><Button type="primary" icon={<SearchOutlined />} loading={isSearching} onClick={handleSearch}>{'\u641c\u7d22'}</Button><Button icon={<ReloadOutlined />} onClick={handleReset} disabled={isSearching}>{'\u91cd\u7f6e'}</Button></div>
      </div>
      <div className="delivery-map-legend" aria-label="status legend">{Object.entries(STATUS_META).map(([status, meta]) => <span key={status} className="delivery-map-legend-item"><i className={`delivery-map-legend-dot ${meta.className}`} />{meta.label}</span>)}</div>
    </div>
    <div className="delivery-map-table-shell">
      {isSearching ? <div className="delivery-map-feedback" role="status"><Spin size="small" />{'\u6b63\u5728\u52a0\u8f7d\u4ea4\u4ed8\u5730\u56fe...'}</div> : filteredProjects.length === 0 ? <div className="delivery-map-feedback delivery-map-empty" role="status"><Empty description={'\u6682\u65e0\u5339\u914d\u7684\u9879\u76ee\u4ea4\u4ed8\u6570\u636e'} /><Button onClick={handleReset}>{'\u6e05\u9664\u7b5b\u9009\u6761\u4ef6'}</Button></div> : <div className="delivery-map-table-scroll"><div className="delivery-map-table" role="table" aria-label="project delivery stages">
        <div className="delivery-map-table-header" role="row"><div className="delivery-map-project-column" role="columnheader">{'\u9879\u76ee/\u5ba2\u6237\u9662\u6821'}</div><div className="delivery-map-product-column" role="columnheader">{'\u4ea7\u54c1'}</div><div className="delivery-map-stage-column" role="columnheader">{'\u9636\u6bb5'}</div></div>
        {filteredProjects.map((project) => { const products = visibleProducts(project, filters); return <div className="delivery-project-group" role="rowgroup" key={project.id}>
          <div className="delivery-map-project-cell" style={{ gridRow: `span ${products.length}` }} role="cell"><div className="delivery-project-icon"><FolderOpenOutlined /></div><div className="delivery-project-name" title={project.name}>{project.name}</div><div className="delivery-project-customer" title={project.customerName}>{project.customerName}</div><div className="delivery-project-tags">{project.customerTags.map((tag) => <Tag key={tag} icon={<UserOutlined />} color="blue">{tag}</Tag>)}</div></div>
          {products.map((product) => <div className="delivery-map-product-row" role="row" key={product.id}>
            <div className="delivery-map-product-cell" role="cell"><span className="delivery-product-mark" aria-hidden="true" /><div><div className="delivery-product-name" title={product.name}>{product.name}</div><Tag color="blue">{product.ownerName}</Tag></div></div>
            <div className="delivery-map-stage-cell" role="cell"><div className="delivery-map-stage-track">{product.stages.map((stage, index) => <StageNode key={stage.id} stage={stage} isLast={index === product.stages.length - 1} />)}</div></div>
          </div>)}
        </div>; })}
      </div></div>}
    </div>
  </section>;
};