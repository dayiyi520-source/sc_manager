import { useRef, useState } from 'react';
import { Alert, Button, Empty, Input, Modal, Select, Table, Upload } from 'antd';
import type { UploadFile } from 'antd';
import { LinkIcon, PaperclipIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon } from '@primer/octicons-react';
import { useApp } from '../../context/AppContext';
import { isSaleableProduct } from '../../services/presalesCenterRepository';
import { createCompetitorDemoRecords } from './competitorDemoData';
import './competitorManagement.css';

export type CompetitorMaterial = { id: string; name: string };
export type CompetitorProduct = {
  id: string;
  productId: string;
  competitorProduct: string;
  attachments: CompetitorMaterial[];
  link?: string;
};
export type CompetitorEncounter = {
  id: string;
  biddingName: string;
  coreProduct: string;
  result: string;
};
export type CompetitorRecord = {
  id: string;
  companyName: string;
  creditCode?: string;
  registeredCapital: string;
  legalRepresentative: string;
  products: CompetitorProduct[];
  encounters: CompetitorEncounter[];
  creatorName: string;
  createdAt: string;
};

type ProductDraft = Omit<CompetitorProduct, 'attachments'> & { files: UploadFile[] };
type EditorDraft = Pick<CompetitorRecord, 'companyName' | 'creditCode' | 'registeredCapital' | 'legalRepresentative'> & { products: ProductDraft[] };
const newProduct = (id: string): ProductDraft => ({ id, productId: '', competitorProduct: '', files: [], link: '' });
const initialDraft = (): EditorDraft => ({ companyName: '', creditCode: '', registeredCapital: '', legalRepresentative: '', products: [newProduct('new-1')] });

export function CompetitorManagementView({ records }: { records?: CompetitorRecord[] }) {
  const { productLines } = useApp();
  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditorDraft>(initialDraft);
  const [detail, setDetail] = useState<{ kind: 'products' | 'encounters'; record: CompetitorRecord } | null>(null);
  const nextRow = useRef(2);
  const saleableProducts = productLines.filter(isSaleableProduct);
  const productOptions = saleableProducts.map(product => ({ value: product.id, label: product.name }));
  const productName = (id: string) => productLines.find(product => product.id === id)?.name || '—';
  const filtered = (records ?? createCompetitorDemoRecords(productLines)).filter(record => !keyword || record.companyName.toLocaleLowerCase().includes(keyword.toLocaleLowerCase()));

  const openEditor = (record?: CompetitorRecord) => {
    setDraft(record ? {
      companyName: record.companyName,
      creditCode: record.creditCode || '',
      registeredCapital: record.registeredCapital,
      legalRepresentative: record.legalRepresentative,
      products: record.products.map(item => ({
        ...item, files: item.attachments.map(file => ({ uid: file.id, name: file.name, status: 'done' as const })),
      })),
    } : initialDraft());
    setEditing(true);
  };
  const updateProduct = (id: string, changes: Partial<ProductDraft>) => setDraft(current => ({
    ...current, products: current.products.map(item => item.id === id ? { ...item, ...changes } : item),
  }));
  const productRows = (products: CompetitorProduct[]) => products.map(item => ({ ...item, key: item.id }));

  return <section className="competitor-workspace" aria-label="友商管理">
    <header className="competitor-page-header">
      <h1>友商管理</h1>
      <Button type="primary" icon={<PlusIcon />} onClick={() => openEditor()}>新建友商</Button>
    </header>
    {records === undefined && <Alert type="info" showIcon title="演示数据，仅用于界面预览；企业信息与交锋结果不代表真实记录。" className="competitor-demo-notice" />}
    <div className="competitor-toolbar">
      <Input aria-label="搜索友商名称" placeholder="搜索友商名称" prefix={<SearchIcon />} allowClear value={search} onChange={event => setSearch(event.target.value)} onPressEnter={() => setKeyword(search.trim())} />
      <Button onClick={() => setKeyword(search.trim())}>查询</Button>
      <Button onClick={() => { setSearch(''); setKeyword(''); }}>重置</Button>
    </div>
    <Table<CompetitorRecord> className="competitor-table" rowKey="id" size="middle" dataSource={filtered} scroll={{ x: 1320 }} locale={{ emptyText: <Empty description={keyword ? '没有符合条件的友商' : '暂无友商记录'} /> }} pagination={{ pageSize: 10, showSizeChanger: false, showTotal: total => `共 ${total} 条` }} columns={[
      { title: '友商名称', dataIndex: 'companyName', width: 210, render: (value: string) => <span className="competitor-ellipsis" title={value}>{value || '—'}</span> },
      { title: '企业信用代码', dataIndex: 'creditCode', width: 190, render: (value?: string) => <span className="competitor-credit-code" title={value || undefined}>{value || '—'}</span> },
      { title: '注册资金', dataIndex: 'registeredCapital', width: 130, render: (value: string) => value || '—' },
      { title: '法人', dataIndex: 'legalRepresentative', width: 120, render: (value: string) => value || '—' },
      { title: '关联竞品', width: 110, render: (_, record) => <Button type="link" className="competitor-count" onClick={() => setDetail({ kind: 'products', record })} aria-label={`查看${record.companyName}的关联竞品`}>{record.products.length}</Button> },
      { title: '交锋项目', width: 110, render: (_, record) => <Button type="link" className="competitor-count" onClick={() => setDetail({ kind: 'encounters', record })} aria-label={`查看${record.companyName}的交锋项目`}>{record.encounters.length}</Button> },
      { title: '创建人', dataIndex: 'creatorName', width: 110, render: (value: string) => value || '—' },
      { title: '创建时间', dataIndex: 'createdAt', width: 170, render: (value: string) => value || '—' },
      { title: '编辑操作', width: 100, fixed: 'right', render: (_, record) => <Button type="link" icon={<PencilIcon />} onClick={() => openEditor(record)}>编辑</Button> },
    ]} />

    <Modal className="competitor-dialog competitor-editor" title={draft.companyName ? `编辑友商 · ${draft.companyName}` : '新建友商'} open={editing} onCancel={() => setEditing(false)} destroyOnHidden footer={<><Button onClick={() => setEditing(false)}>取消</Button><Button type="primary" disabled>保存</Button></>}>
      <div className="competitor-editor-body">
        <Alert type="info" showIcon title="企业信息服务尚未接入，当前仅预览界面，不能保存。" />
        <div className="competitor-section-title"><h2>企业信息</h2></div>
        <div className="competitor-company-fields">
          <label className="competitor-company-search"><span>友商名称</span><Select aria-label="友商名称" showSearch allowClear placeholder="搜索并选择启信宝企业" value={draft.companyName || undefined} onClear={() => setDraft(current => ({ ...current, companyName: '', registeredCapital: '', legalRepresentative: '' }))} options={[]} notFoundContent={<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无企业候选" />} /></label>
          <label><span>注册资金</span><Input aria-label="注册资金" value={draft.registeredCapital} placeholder="选择友商后自动带入" readOnly /></label>
          <label><span>法人</span><Input aria-label="法人" value={draft.legalRepresentative} placeholder="选择友商后自动带入" readOnly /></label>
          <label><span>企业信用代码</span><Input aria-label="企业信用代码" placeholder="请输入企业信用代码" value={draft.creditCode || ''} onChange={event => setDraft(current => ({ ...current, creditCode: event.target.value }))} /></label>
        </div>
        <div className="competitor-section-title"><h2>关联竞品</h2><Button icon={<PlusIcon />} onClick={() => setDraft(current => ({ ...current, products: [...current.products, newProduct(`new-${nextRow.current++}`)] }))}>添加竞品</Button></div>
        <div className="competitor-draft-scroll"><div className="competitor-draft-head"><span>师创产品</span><span>友商产品</span><span>友商资料</span><span>操作</span></div>
          {draft.products.length ? draft.products.map(item => <div className="competitor-draft-row" key={item.id}>
            <Select aria-label="师创产品" showSearch allowClear placeholder="搜索可销售产品" optionFilterProp="label" options={productOptions} value={item.productId || undefined} onChange={value => updateProduct(item.id, { productId: value || '' })} notFoundContent={<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可销售产品" />} />
            <Input aria-label="友商产品" placeholder="输入友商产品名称" maxLength={100} value={item.competitorProduct} onChange={event => updateProduct(item.id, { competitorProduct: event.target.value })} />
            <div className="competitor-material-editor"><Upload beforeUpload={() => false} multiple fileList={item.files} onChange={({ fileList }) => updateProduct(item.id, { files: fileList })}><Button icon={<PaperclipIcon />}>附件</Button></Upload><Input aria-label="友商资料链接" prefix={<LinkIcon />} placeholder="输入资料链接" value={item.link} onChange={event => updateProduct(item.id, { link: event.target.value })} /></div>
            <Button type="text" danger icon={<TrashIcon />} aria-label="删除竞品行" onClick={() => setDraft(current => ({ ...current, products: current.products.filter(product => product.id !== item.id) }))} />
          </div>) : <Empty description="暂无关联竞品" />}
        </div>
      </div>
    </Modal>

    <Modal className="competitor-dialog competitor-detail" title={`${detail?.record.companyName || ''} · ${detail?.kind === 'encounters' ? '交锋项目' : '关联竞品'}`} open={Boolean(detail)} onCancel={() => setDetail(null)} footer={<Button onClick={() => setDetail(null)}>关闭</Button>}>
      {detail?.kind === 'products' ? <Table rowKey="key" size="small" dataSource={productRows(detail.record.products)} scroll={{ x: 720 }} pagination={false} locale={{ emptyText: <Empty description="暂无关联竞品" /> }} columns={[
        { title: '师创产品', width: 190, render: (_, item) => productName(item.productId) },
        { title: '友商产品', dataIndex: 'competitorProduct', width: 190, render: (value: string) => value || '—' },
        { title: '友商资料', render: (_, item) => <div className="competitor-material-list">{item.attachments.map(file => <span key={file.id} title={file.name}><PaperclipIcon />{file.name}</span>)}{item.link && (/^https?:\/\//i.test(item.link) ? <a href={item.link} target="_blank" rel="noreferrer"><LinkIcon />资料链接</a> : <span title={item.link}>资料链接无效</span>)}{!item.attachments.length && !item.link && '—'}</div> },
      ]} /> : detail?.kind === 'encounters' ? <Table rowKey="id" size="small" dataSource={detail.record.encounters} scroll={{ x: 720 }} pagination={false} locale={{ emptyText: <Empty description="暂无交锋项目" /> }} columns={[
        { title: '招投标项目', dataIndex: 'biddingName', width: 260, render: (value: string) => value || '—' },
        { title: '核心产品', dataIndex: 'coreProduct', width: 220, render: (value: string) => value || '—' },
        { title: '交锋结果', dataIndex: 'result', width: 160, render: (value: string) => value || '—' },
      ]} /> : null}
    </Modal>
  </section>;
}
