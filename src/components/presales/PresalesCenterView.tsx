import { useRef, useState, type DragEvent } from 'react';
import { Alert, Button, Empty, Input, Modal } from 'antd';
import { ArrowLeftIcon, BookIcon, ChevronRightIcon, CommentDiscussionIcon, DownloadIcon, FileDirectoryIcon, FileIcon, GearIcon, GrabberIcon, LawIcon, PackageIcon, TagIcon } from '@primer/octicons-react';
import { useApp } from '../../context/AppContext';
import { defaultPresalesConfig, orderedSaleableProducts, readPresalesConfig, savePresalesConfig, type PresalesCenterConfig } from '../../services/presalesCenterRepository';
import './presalesCenter.css';

const icons = { guide: BookIcon, policy: FileDirectoryIcon, pitch: CommentDiscussionIcon, pricing: TagIcon, qualification: LawIcon, other: FileIcon };
const documentTypes = ['宣发文件', '建设方案', '汇报PPT', '立项文件', '招标文件', '投标文件'];

type SortSection = 'categories' | 'products';
type SortItem = { id: string };
function insertItem<T extends SortItem>(items: T[], sourceId: string, targetId: string, after: boolean) {
  if (sourceId === targetId) return items;
  const source = items.find(item => item.id === sourceId);
  if (!source || !items.some(item => item.id === targetId)) return items;
  const remaining = items.filter(item => item.id !== sourceId);
  const targetIndex = remaining.findIndex(item => item.id === targetId);
  remaining.splice(targetIndex + Number(after), 0, source);
  return remaining;
}

export const PresalesCenterView = () => {
  const { currentUser, productLines } = useApp();
  const [config, setConfig] = useState<PresalesCenterConfig>(() => {
    try { return readPresalesConfig(); } catch { return defaultPresalesConfig(); }
  });
  const [readError] = useState(() => {
    try { readPresalesConfig(); return ''; } catch (error) { return (error as Error).message; }
  });
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<PresalesCenterConfig | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const dragging = useRef<{ section: SortSection; id: string } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ section: SortSection; id: string; after: boolean } | null>(null);
  const products = orderedSaleableProducts(productLines, config);
  const editableProducts = orderedSaleableProducts(productLines, draft || config);
  const canConfigure = currentUser.role === 'admin';

  const openSettings = () => {
    if (!canConfigure || readError) return;
    setDraft({ ...config, categories: config.categories.map(item => ({ ...item })), products: products.map(product => ({
      id: product.id, alias: config.products.find(item => item.id === product.id)?.alias || '',
    })) });
    setError('');
  };
  const updateCategory = (id: string, field: 'name' | 'description', value: string) => setDraft(previous => previous && ({
    ...previous, categories: previous.categories.map(category => category.id === id ? { ...category, [field]: value } : category),
  }));
  const save = () => {
    if (!draft || !canConfigure || readError) return;
    try {
      const saved = savePresalesConfig(draft, config.revision);
      setConfig(saved); setDraft(null); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '保存失败，请重试'); }
  };
  const resetDrag = () => { dragging.current = null; setDraggingId(null); setDropTarget(null); };
  const startDrag = (event: DragEvent<HTMLButtonElement>, section: SortSection, id: string) => {
    dragging.current = { section, id };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
    setDraggingId(id);
  };
  const dragOver = (event: DragEvent<HTMLDivElement>, section: SortSection, id: string) => {
    if (!dragging.current) return;
    if (dragging.current.section !== section) { event.preventDefault(); event.dataTransfer.dropEffect = 'none'; return; }
    if (dragging.current.id === id) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const bounds = event.currentTarget.getBoundingClientRect();
    const after = event.clientY > bounds.top + bounds.height / 2;
    setDropTarget(previous => previous?.section === section && previous.id === id && previous.after === after ? previous : { section, id, after });
  };
  const dropOn = (event: DragEvent<HTMLDivElement>, section: SortSection, id: string) => {
    event.preventDefault();
    const source = dragging.current;
    if (source?.section === section && source.id !== id) {
      const bounds = event.currentTarget.getBoundingClientRect();
      const after = event.clientY > bounds.top + bounds.height / 2;
      setDraft(previous => previous && ({
        ...previous, [section]: insertItem(previous[section], source.id, id, after),
      }));
    }
    resetDrag();
  };
  const scrollDuringDrag = (event: DragEvent<HTMLDivElement>) => {
    if (dragging.current?.section !== 'products') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientY < bounds.top + 56) event.currentTarget.scrollTop -= 32;
    if (event.clientY > bounds.bottom - 56) event.currentTarget.scrollTop += 32;
  };

  return <div className='presales-center'>
    {readError && <Alert type='error' showIcon title={readError} description='为避免覆盖原配置，排序设置已停用。' />}
    <header className='presales-header'>
      <div><h1>{draft ? '排序设置' : '售前中心'}</h1>{draft && <p>调整售前分类及产品信息在本页面的展示顺序</p>}</div>
      {!draft && <div className='presales-header-actions'>
        {canConfigure && <Button icon={<GearIcon />} onClick={openSettings} disabled={Boolean(readError)}>排序设置</Button>}
        <Button icon={<DownloadIcon />} onClick={() => setLogOpen(true)}>下载日志</Button>
      </div>}
    </header>
    {draft ? <div className='presales-settings'>
      <div className='presales-settings-toolbar'><Button icon={<ArrowLeftIcon />} onClick={() => { setDraft(null); setError(''); }}>返回售前中心</Button><Button type='primary' onClick={save}>保存设置</Button></div>
      {error && <Alert type='error' showIcon title={error} />}
      <section><div className='presales-section-heading'><h2>资料分类</h2><span>拖动手柄调整顺序；名称与描述可编辑</span></div>
        <div className='presales-setting-list'>{draft.categories.map(category => <div className={`presales-setting-row${draggingId === category.id ? ' is-dragging' : ''}${dropTarget?.section === 'categories' && dropTarget.id === category.id ? dropTarget.after ? ' is-drop-after' : ' is-drop-before' : ''}`} key={category.id} onDragOver={event => dragOver(event, 'categories', category.id)} onDrop={event => dropOn(event, 'categories', category.id)}>
          <div className='presales-reorder'><Button className='presales-drag-handle' aria-label={`拖动${category.name}`} title='拖动调整顺序' icon={<GrabberIcon />} draggable onDragStart={event => startDrag(event, 'categories', category.id)} onDragEnd={resetDrag} /></div>
          <label>分类名称<Input value={category.name} maxLength={20} onChange={event => updateCategory(category.id, 'name', event.target.value)} /></label>
          <label>分类描述<Input value={category.description} maxLength={60} onChange={event => updateCategory(category.id, 'description', event.target.value)} /></label>
        </div>)}</div>
      </section>
      <section><div className='presales-section-heading'><h2>产品信息</h2><span>只展示可销售产品；拖动手柄可跨多行排序，别名仅在售前中心生效</span></div>
        {editableProducts.length ? <div className='presales-setting-list presales-product-list' onDragOver={scrollDuringDrag}>{editableProducts.map(product => <div className={`presales-setting-row presales-product-setting${draggingId === product.id ? ' is-dragging' : ''}${dropTarget?.section === 'products' && dropTarget.id === product.id ? dropTarget.after ? ' is-drop-after' : ' is-drop-before' : ''}`} key={product.id} onDragOver={event => dragOver(event, 'products', product.id)} onDrop={event => dropOn(event, 'products', product.id)}>
          <div className='presales-reorder'><Button className='presales-drag-handle' aria-label={`拖动${product.name}`} title='拖动调整顺序' icon={<GrabberIcon />} disabled={editableProducts.length < 2} draggable={editableProducts.length > 1} onDragStart={event => startDrag(event, 'products', product.id)} onDragEnd={resetDrag} /></div>
          <div className='presales-original-name' title={product.name}><span>产品名称</span><strong>{product.name}</strong></div>
          <label>售前展示别名<Input placeholder={product.name} value={draft.products.find(entry => entry.id === product.id)?.alias || ''} maxLength={50} onChange={event => setDraft({ ...draft, products: draft.products.map(entry => entry.id === product.id ? { ...entry, alias: event.target.value } : entry) })} /></label>
        </div>)}</div> : <Empty description='暂无可销售产品' />}
      </section>
    </div> : <div className='presales-content'>
      <section className='presales-categories' aria-label='售前资料分类'>{config.categories.map(category => {
        const Icon = icons[category.id as keyof typeof icons] || FileIcon;
        return <button type='button' className={`presales-category presales-category-${category.id}`} key={category.id} onClick={() => setSelectedCategory(category.name)}>
          <span className='presales-category-icon'><Icon size={20} /></span><span className='presales-category-copy'><strong title={category.name}>{category.name}</strong><small title={category.description}>{category.description}</small></span><ChevronRightIcon className='presales-category-chevron' size={16} />
        </button>;
      })}</section>
      <section aria-label='产品信息'><div className='presales-section-heading'><h2>产品信息</h2></div>
        {products.length ? <div className='presales-product-grid'>{products.map(product => {
          const alias = config.products.find(item => item.id === product.id)?.alias;
          return <article className='presales-product-card' key={product.id}><div className='presales-product-title'><span className='presales-folder'><PackageIcon size={20} /></span><div className='presales-product-names'><strong title={alias || product.name}>{alias || product.name}</strong>{alias && <span title={product.name}>产品名称：{product.name}</span>}</div></div>
            {product.description && <p title={product.description}>{product.description}</p>}
            <div className='presales-document-grid'>{documentTypes.map(type => <div key={type} className='presales-document-slot'><span>{type}</span><span className='presales-document-empty'>-</span></div>)}</div>
          </article>;
        })}</div> : <Empty description='暂无可销售产品' />}
      </section>
    </div>}
    <Modal title={selectedCategory || ''} open={Boolean(selectedCategory)} onCancel={() => setSelectedCategory(null)} footer={null}><Empty description='暂无文件' /></Modal>
    <Modal title='下载日志' open={logOpen} onCancel={() => setLogOpen(false)} footer={null}><Empty description='暂无下载记录' /></Modal>
  </div>;
};
