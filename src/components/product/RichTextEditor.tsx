import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import type { Editor as TinyMceInstance } from 'tinymce';
import { marked } from 'marked';
import TurndownService from 'turndown';

import 'tinymce/tinymce';
import 'tinymce/icons/default';
import 'tinymce/themes/silver';
import 'tinymce/models/dom';
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/autoresize';
import 'tinymce/plugins/code';
import 'tinymce/plugins/image';
import 'tinymce/plugins/link';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/media';
import 'tinymce/plugins/table';
import 'tinymce/plugins/wordcount';
import 'tinymce-i18n/langs8/zh-CN.js';
import 'tinymce/skins/ui/oxide/skin.css';
import './RichTextEditor.css';

type RichTextEditorProps = {
  editor: React.RefObject<HTMLDivElement | null>;
  size?: 'default' | 'work-order';
  value?: string;
  htmlValue?: string;
  onInput: (text: string, html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
};

const turndown = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });
const themeValue = (name: string, fallback: string) => typeof window === 'undefined' ? fallback : getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
const toText = (html: string) => { const node = document.createElement('div'); node.innerHTML = html; return node.innerText || node.textContent || ''; };
const hasMeaningfulContent = (html: string) => /<(img|table|video|audio|iframe)\b/i.test(html) || toText(html).replace(/\u00a0/g, ' ').trim().length > 0;

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ editor, size = 'default', value = '', htmlValue = '', onInput, onBlur, placeholder = '请输入内容，支持文字排版、列表和链接...' }) => {
  const instanceRef = useRef<TinyMceInstance | null>(null);
  const updateMarkdownAvailabilityRef = useRef<(html: string) => void>(() => undefined);
  const [markdownMode, setMarkdownMode] = useState(false);
  const [markdownDraft, setMarkdownDraft] = useState('');
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const theme = useMemo(() => ({
    primary: themeValue('--primary', '#2F66F6'),
    text: themeValue('--text-primary', '#F8FAFC'),
    muted: themeValue('--text-muted', '#7C8796'),
    surface: themeValue('--bg-card', '#0D1620'),
  }), [isDark]);
  const proxy = (html: string) => { if (editor.current) editor.current.innerHTML = html; };
  const emit = (instance: TinyMceInstance) => { const html = instance.getContent(); proxy(html); updateMarkdownAvailabilityRef.current(html); onInput(instance.getContent({ format: 'text' }), html); };
  const initialContent = htmlValue || (value ? value.replace(/\n/g, '<br>') : '');

  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance || instance.hasFocus()) return;
    const next = htmlValue || (value ? value.replace(/\n/g, '<br>') : '');
    if (instance.getContent() !== next) {
      instance.setContent(next);
      proxy(next);
      updateMarkdownAvailabilityRef.current(next);
    }
  }, [editor, htmlValue, value]);

  useEffect(() => { if (!markdownMode || !instanceRef.current) return; setMarkdownDraft(turndown.turndown(instanceRef.current.getContent())); }, [markdownMode]);

  const init = useMemo(() => ({
    height: 320, menubar: false, branding: false, promotion: false, language: 'zh-CN', skin: 'oxide', placeholder, resize: true,
    plugins: 'advlist autolink autoresize code image link lists media table wordcount',
    toolbar: 'undo redo | removeformat | blocks fontfamily fontsize | bold italic strikethrough underline | forecolor backcolor | imageupload table customlink blockquote codesample | alignleft aligncenter alignright | bullist numlist outdent indent | lineheight | markdown',
    toolbar_mode: 'wrap',
    content_style: `body{margin:16px;color:${theme.text};background:${theme.surface};font-family:system-ui,sans-serif;font-size:14px;line-height:1.7}a{color:${theme.primary}}blockquote{border-left:3px solid ${theme.primary};margin-left:0;padding-left:12px;color:${theme.muted}}ul.checklist{list-style:none;padding-left:0}ul.checklist li::before{content:'☐';margin-right:8px;color:${theme.primary}}`,
    setup: (instance: TinyMceInstance) => {
      instanceRef.current = instance;
      instance.ui.registry.addButton('imageupload', { icon: 'image', tooltip: '上传图片', onAction: () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => { instance.insertContent(`<img src="${String(reader.result)}" alt="${file.name.replaceAll('"', '')}" />`); emit(instance); };
          reader.readAsDataURL(file);
        };
        input.click();
      } });
      instance.ui.registry.addButton('customlink', { icon: 'link', tooltip: '插入链接', onAction: () => {
        instance.windowManager.open({
          title: '插入/编辑链接',
          body: { type: 'panel', items: [
            { type: 'input', name: 'title', label: '标题', placeholder: '请输入链接标题' },
            { type: 'input', name: 'href', label: '链接地址', placeholder: '请输入链接地址' },
          ] },
          buttons: [
            { type: 'cancel', text: '取消' },
            { type: 'submit', text: '保存', buttonType: 'primary' },
          ],
          onSubmit: (api: { getData: () => { href: string; title: string }; close: () => void }) => {
            const data = api.getData();
            if (!data.href.trim()) return;
            const text = data.title.trim() || data.href.trim();
            instance.insertContent(`<a href="${data.href.trim().replaceAll('"', '&quot;')}"${data.title.trim() ? ` title="${data.title.trim().replaceAll('"', '&quot;')}"` : ''}>${text}</a>`);
            emit(instance);
            api.close();
          },
        });
      } });
      instance.ui.registry.addButton('markdown', { text: 'Markdown', tooltip: '请选择编辑模式：富文本已有内容时不可切换', onSetup: (api) => {
        const updateAvailability = (html: string) => api.setEnabled(!hasMeaningfulContent(html));
        updateMarkdownAvailabilityRef.current = updateAvailability;
        updateAvailability(instance.getContent());
        return () => { updateMarkdownAvailabilityRef.current = () => undefined; };
      }, onAction: () => setMarkdownMode(true) });
      instance.on('blur', () => onBlur?.());
    },
  }), [onBlur, placeholder, theme]);

  const applyMarkdown = () => { const html = marked.parse(markdownDraft) as string; instanceRef.current?.setContent(html); proxy(html); updateMarkdownAvailabilityRef.current(html); onInput(toText(html), html); setMarkdownMode(false); };

  return <div className={`rich-text-editor ${size === 'work-order' ? 'rich-text-editor--work-order' : ''} overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/20`}>
    <div className="sr-only" aria-hidden="true" ref={editor} />
    {markdownMode ? <div className="space-y-3 p-3"><textarea aria-label="Markdown 源码" value={markdownDraft} onChange={(event) => setMarkdownDraft(event.target.value)} className="rich-text-editor__markdown min-h-80 w-full resize-y rounded border border-[var(--border-main)] bg-[var(--bg-card)] p-3 font-mono text-sm leading-6 text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20" /><div className="flex justify-end gap-2"><button type="button" onClick={() => setMarkdownMode(false)} className="rounded px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-surface-soft)]">取消</button><button type="button" onClick={applyMarkdown} className="rounded bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--primary-hover)]">应用 Markdown</button></div></div> : <Editor initialValue={initialContent} licenseKey="gpl" init={init} onInit={(_event, instance) => { instanceRef.current = instance; proxy(instance.getContent()); updateMarkdownAvailabilityRef.current(instance.getContent()); }} onEditorChange={(html, instance) => { proxy(html); updateMarkdownAvailabilityRef.current(html); onInput(instance.getContent({ format: 'text' }), html); }} />}
  </div>;
};
