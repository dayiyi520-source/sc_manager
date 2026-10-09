import React, { useRef, useState } from 'react';
import { Alert, Button, Input, Modal, Popconfirm, Tag } from 'antd';
import { useApp } from '../../context/AppContext';
import type { ProductDocument, ProductLine } from '../../types';
import { sanitizeProductDocument as sanitizeHtml } from './productDocumentHtml';
import { LazyRichTextEditor } from './LazyRichTextEditor';

export const documentCategories = [['introduction', '产品介绍'], ['manual', '产品操作手册'], ['features', '产品功能分类']] as const;
const MAX_FILE_SIZE = 1024 * 1024;
export const validateProductDocument = (name: string, html: string) => {
  if (!name.trim()) return '请输入文档名称';
  if (name.trim().length > 100) return '文档名称不能超过100个字符';
  const element = document.createElement('div'); element.innerHTML = sanitizeHtml(html);
  if (!element.textContent?.trim() && !element.querySelector('img')) return '请输入文档内容';
  if (new Blob([html]).size > MAX_FILE_SIZE) return '文档内容不能超过1MB';
  return '';
};

export const ProductDocumentsPanel: React.FC<{ productLine: ProductLine }> = ({ productLine }) => {
  const { updateProductLine, currentUser } = useApp();
  const [category, setCategory] = useState<(typeof documentCategories)[number][0]>('introduction');
  const [editing, setEditing] = useState(false);
  const [reading, setReading] = useState(false);
  const [name, setName] = useState('');
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const editor = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const current = productLine.documents?.[category];
  const label = documentCategories.find(([key]) => key === category)![1];
  const persist = async (value: ProductDocument | undefined) => {
    setBusy(true); setError('');
    try {
      await updateProductLine(productLine.id, { documents: { ...productLine.documents, [category]: value ?? null } });
      return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : '文档保存失败，请重试'); return false; }
    finally { setBusy(false); }
  };
  const save = async () => {
    const safeHtml = sanitizeHtml(html);
    const invalid = validateProductDocument(name, safeHtml);
    if (invalid) { setError(invalid); return; }
    if (await persist({ name: `${name.trim().replace(/\.html?$/i, '')}.html`, source: 'online', html: safeHtml, mimeType: 'text/html', size: new Blob([safeHtml]).size, operatorName: currentUser.name, updatedAt: new Date().toISOString() })) setEditing(false);
  };
  const upload = async (file?: File) => {
    if (!file) return;
    if (!file.size || file.size > MAX_FILE_SIZE) { setError('请选择非空且不超过1MB的文件'); return; }
    setBusy(true); setError('');
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('文件读取失败，请重试')); reader.onabort = () => reject(new Error('文件读取已取消')); reader.readAsDataURL(file); });
      await persist({ name: file.name, source: 'upload', dataUrl, mimeType: file.type, size: file.size, operatorName: currentUser.name, updatedAt: new Date().toISOString() });
    } catch (cause) { setError(cause instanceof Error ? cause.message : '上传失败'); }
    finally { setBusy(false); }
  };
  const startEditing = () => { setName(current?.source === 'online' ? current.name.replace(/\.html$/i, '') : label); setHtml(current?.html || ''); setError(''); setEditing(true); };
  const download = () => {
    if (!current) return;
    const url = current.source === 'online' ? URL.createObjectURL(new Blob([sanitizeHtml(current.html || '')], { type: 'text/html' })) : current.dataUrl;
    if (!url) return;
    const link = document.createElement('a'); link.href = url; link.download = current.name; link.click();
    if (current.source === 'online') window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div className="space-y-4">
    <h2 className="text-base font-bold text-[var(--text-primary)]">产品文档</h2><p className="text-xs text-[var(--text-muted)]">集中维护产品介绍、操作手册与功能分类，每类保留一份当前文档。</p>
    <div className="grid min-h-80 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] md:grid-cols-[14rem_minmax(0,1fr)]">
      <nav aria-label="产品文档分类" className="space-y-2 border-r border-[var(--border-main)] p-3">{documentCategories.map(([key, title]) => <button key={key} type="button" disabled={busy} onClick={() => { setCategory(key); setError(''); }} className={`flex h-9 w-full items-center rounded-md px-3 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50 ${category === key ? 'bg-[var(--bg-elevated)] text-[var(--active-text)]' : 'text-[var(--text-body)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'}`}>{title}</button>)}</nav>
      <section className="min-w-0 space-y-4 p-6"><div className="flex items-center justify-between"><h3 className="text-sm font-bold text-[var(--text-primary)]">{label}</h3><Tag>{current ? current.source === 'online' ? 'HTML' : current.name.split('.').pop()?.toUpperCase() || '文件' : '未上传'}</Tag></div>
        {error && !editing && <Alert type="error" showIcon message={error} />}
        <div className="min-h-48 space-y-2 rounded-lg bg-[var(--bg-surface-soft)] p-4 text-xs text-[var(--text-body)]">{current ? <><p className="break-all font-medium">{current.name}</p><p className="text-[var(--text-muted)]">{(current.size / 1024).toFixed(1)} KB · {current.operatorName}</p><p className="text-[var(--text-muted)]">更新于 {new Date(current.updatedAt).toLocaleString()}</p></> : <p className="text-[var(--text-muted)]">还没有{label}，请上传文件或在线新建。</p>}</div>
        <input ref={input} type="file" hidden aria-label={`上传${label}`} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void upload(file); }} />
        <div className="flex flex-wrap gap-2">{current ? <Popconfirm title="替换当前文档？" description="新文件保存成功后替换原文档。" onConfirm={() => input.current?.click()} disabled={busy}><Button loading={busy}>替换文件</Button></Popconfirm> : <Button loading={busy} onClick={() => input.current?.click()}>上传文件</Button>}
          {current && <Button disabled={busy} onClick={() => setReading(true)}>在线阅读</Button>}
          {(!current || current.source === 'online') && <Button disabled={busy} onClick={startEditing}>{current ? '在线编辑' : '在线新建'}</Button>}
          {current && <Popconfirm title="删除当前文档？" onConfirm={() => persist(undefined)} disabled={busy}><Button danger disabled={busy}>删除</Button></Popconfirm>}
        </div>
      </section>
    </div>
    <Modal open={editing} title={`${current ? '编辑' : '新建'}${label}`} width="80%" destroyOnHidden mask={{ closable: false }} closable={!busy} onCancel={() => !busy && setEditing(false)} footer={<><Button disabled={busy} onClick={() => setEditing(false)}>取消</Button><Button type="primary" loading={busy} onClick={() => void save()}>保存文档</Button></>}>
      <div className="space-y-4">{error && <Alert message={error} type="error" />}<label className="block space-y-2"><span>文档名称 *</span><Input value={name} maxLength={100} disabled={busy} onChange={(event) => setName(event.target.value)} placeholder="请输入文档名称" /></label><LazyRichTextEditor editor={editor} htmlValue={html} readOnly={busy} onInput={(_text, value) => setHtml(value)} /></div>
    </Modal>
    <Modal open={reading} title={current?.name} width="80%" onCancel={() => setReading(false)} footer={<Button onClick={download}>下载文档</Button>}>
      {current?.source === 'online' ? <div className="prose max-w-none break-words text-[var(--text-body)]" dangerouslySetInnerHTML={{ __html: sanitizeHtml(current.html || '') }} /> : <div className="space-y-4"><Alert type="info" message="上传文件在隔离阅读区打开；不支持的格式请下载后查看。" /><iframe title="文档阅读" sandbox="" className="h-96 w-full border-0" src={current?.dataUrl} /></div>}
    </Modal>
  </div>;
};
