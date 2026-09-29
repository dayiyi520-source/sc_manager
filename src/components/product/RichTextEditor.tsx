import React, { Component, type ErrorInfo, useEffect, useMemo, useRef, useState } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import type { Editor as TinyMceInstance } from 'tinymce';
import { marked } from 'marked';
import TurndownService from 'turndown';

import 'tinymce/tinymce';
import 'tinymce/icons/default';
import 'tinymce/themes/silver';
import 'tinymce/models/dom';
import 'tinymce/plugins/image';
import 'tinymce/plugins/link';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/codesample';
import 'tinymce/plugins/table';
import 'tinymce-i18n/langs8/zh-CN.js';
import 'tinymce/skins/ui/oxide/skin.css';
import './RichTextEditor.css';

export type RichTextEditorProps = {
  editor: React.RefObject<HTMLDivElement | null>;
  size?: 'default' | 'work-order';
  readOnly?: boolean;
  value?: string;
  htmlValue?: string;
  onInput: (text: string, html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
};

class TinyMceErrorBoundary extends Component<{ fallback: React.ReactNode; children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  props!: { fallback: React.ReactNode; children: React.ReactNode };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* Keep the task panel usable when TinyMCE cannot initialize. */ }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

const PlainTextFallback: React.FC<Pick<RichTextEditorProps, 'value' | 'onInput' | 'readOnly' | 'placeholder'>> = ({ value = '', onInput, readOnly = false, placeholder }) => (
  <textarea
    aria-label="纯文本任务描述"
    readOnly={readOnly}
    value={value}
    onChange={(event) => onInput(event.target.value, event.target.value ? `<p>${event.target.value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replace(/\n/g, '<br>')}</p>` : '')}
    placeholder={placeholder}
    className="min-h-80 w-full resize-y border-0 bg-transparent p-4 text-sm leading-6 text-[var(--text-primary)] outline-none"
  />
);

const turndown = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });
const themeValue = (name: string, fallback: string) => typeof window === 'undefined' ? fallback : getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
const toText = (html: string) => { const node = document.createElement('div'); node.innerHTML = html; return node.innerText || node.textContent || ''; };
const hasMeaningfulContent = (html: string) => /<(img|table|video|audio|iframe)\b/i.test(html) || toText(html).replace(/\u00a0/g, ' ').trim().length > 0;
const thinToolbarIcons: Record<string, string> = {
  undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 7 4 12l5 5"/><path d="M5 12h8a6 6 0 0 1 6 6"/></svg>',
  redo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 7 5 5-5 5"/><path d="M19 12h-8a6 6 0 0 0-6 6"/></svg>',
  'remove-formatting': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6h11M10.5 6 7.8 17M5 20h7M15 15l5 5m0-5-5 5"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="1.5"/><circle cx="9" cy="9" r="1.5"/><path d="m4 17 5-5 3.5 3.5 2.5-2.5 5 5"/></svg>',
  table: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 10h18M9 4v16M15 4v16"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9.5 14.5 5-5"/><path d="M7.5 17.5 5 20a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0M16.5 6.5 19 4a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0" transform="translate(-2)"/></svg>',
  quote: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11H5a4 4 0 0 1 4-4h1v10H5v-4M21 11h-5a4 4 0 0 1 4-4h1v10h-5v-4"/></svg>',
  'code-sample': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>',
  'align-left': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 6h16M4 10h10M4 14h16M4 18h10"/></svg>',
  'align-center': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 6h16M7 10h10M4 14h16M7 18h10"/></svg>',
  'align-right': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 6h16M10 10h10M4 14h16M10 18h10"/></svg>',
  'unordered-list': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="5" cy="7" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="5" cy="17" r="1"/><path d="M9 7h11M9 12h11M9 17h11"/></svg>',
  'ordered-list': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h2v3M4 9h3M4 14c0-1 3-1 3 0s-3 2-3 3h3M10 7h10M10 12h10M10 17h10"/></svg>',
  outdent: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 6h10M10 10h10M10 14h10M10 18h10M7 9l-3 3 3 3"/></svg>',
  indent: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 6h10M10 10h10M10 14h10M10 18h10M4 9l3 3-3 3"/></svg>',
  'line-height': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 6h10M11 12h10M11 18h10M6 4v16M3 7l3-3 3 3M3 17l3 3 3-3"/></svg>',
};
const safeGetContent = (instance: TinyMceInstance, fallback = '') => {
  try {
    return instance.serializer ? instance.getContent() : fallback;
  } catch {
    return fallback;
  }
};
const safeSetContent = (instance: TinyMceInstance, html: string) => {
  try {
    if (!instance.parser || !instance.serializer) return false;
    instance.setContent(html);
    return true;
  } catch {
    return false;
  }
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ editor, size = 'default', readOnly = false, value = '', htmlValue = '', onInput, onBlur, placeholder = '请输入内容，支持文字排版、列表和链接...' }) => {
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
  const proxy = (html: string) => { /* ref is for accessibility only, not for DOM manipulation */ };
  const emit = (instance: TinyMceInstance) => { const html = safeGetContent(instance); proxy(html); updateMarkdownAvailabilityRef.current(html); onInput(toText(html), html); };
  // TinyMCE resets content and selection when initialValue changes. Parent
  // input echoes must not become a new initial document on every keystroke.
  const initialContent = useRef(htmlValue || (value ? value.replace(/\n/g, '<br>') : '')).current;

  useEffect(() => {
    // Clear any instance left by a keyed remount before syncing controlled content.
    instanceRef.current = null;
    return () => {
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance || instance.hasFocus()) return;
    const next = htmlValue || (value ? value.replace(/\n/g, '<br>') : '');
    if (safeGetContent(instance) !== next) {
      if (safeSetContent(instance, next)) {
        proxy(next);
        updateMarkdownAvailabilityRef.current(next);
      }
    }
  }, [editor, htmlValue, value]);

  useEffect(() => { if (!markdownMode || !instanceRef.current) return; setMarkdownDraft(turndown.turndown(safeGetContent(instanceRef.current))); }, [markdownMode]);

  const init = useMemo(() => ({
    height: 320, menubar: false, branding: false, promotion: false, language: 'zh-CN', skin: false, content_css: false, placeholder, resize: true,
    plugins: 'image link lists codesample table',
    toolbar: readOnly ? false : 'undo redo | removeformat | blocks fontfamily fontsize | bold italic strikethrough underline | forecolor backcolor | imageupload table customlink blockquote codesample | alignleft aligncenter alignright | bullist numlist outdent indent | lineheight | markdown',
    readonly: readOnly,
    toolbar_mode: 'wrap',
    content_style: `html{background:${theme.surface}}body{margin:16px;color:${theme.text};background:${theme.surface};font-family:system-ui,sans-serif;font-size:14px;line-height:1.7}.mce-content-body{color:${theme.text}}.mce-list-item{color:${theme.text}}.mce-caret{color:${theme.text}}a{color:${theme.primary};text-decoration:underline}a:hover{opacity:0.8}blockquote{border-left:3px solid ${theme.primary};margin-left:0;padding-left:12px;color:${theme.muted}}code{background:${theme.surface};color:${theme.primary};padding:2px 6px;border-radius:3px}pre{background:${theme.surface};color:${theme.text};padding:12px;border-radius:4px;overflow-x:auto}ul.checklist{list-style:none;padding-left:0}ul.checklist li::before{content:'☐';margin-right:8px;color:${theme.primary}}`,
    setup: (instance: TinyMceInstance) => {
      instanceRef.current = instance;
      Object.entries(thinToolbarIcons).forEach(([name, svg]) => instance.ui.registry.addIcon(name, svg));
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
        updateAvailability(safeGetContent(instance));
        return () => { updateMarkdownAvailabilityRef.current = () => undefined; };
      }, onAction: () => setMarkdownMode(true) });
      instance.on('blur', () => onBlur?.());
    },
  }), [onBlur, placeholder, readOnly, theme]);

  const applyMarkdown = () => { const html = marked.parse(markdownDraft) as string; if (instanceRef.current) safeSetContent(instanceRef.current, html); proxy(html); updateMarkdownAvailabilityRef.current(html); onInput(toText(html), html); setMarkdownMode(false); };

  return <div className={`rich-text-editor ${size === 'work-order' ? 'rich-text-editor--work-order' : ''} overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/20`}>
    <div className="sr-only" aria-hidden="true" ref={editor} />
    {markdownMode ? <div className="space-y-3 p-3"><textarea aria-label="Markdown 源码" value={markdownDraft} onChange={(event) => setMarkdownDraft(event.target.value)} className="rich-text-editor__markdown min-h-80 w-full resize-y rounded border border-[var(--border-main)] bg-[var(--bg-card)] p-3 font-mono text-sm leading-6 text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20" /><div className="flex justify-end gap-2"><button type="button" onClick={() => setMarkdownMode(false)} className="rounded px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-surface-soft)]">取消</button><button type="button" onClick={applyMarkdown} className="rounded bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--primary-hover)]">应用 Markdown</button></div></div> : <TinyMceErrorBoundary fallback={<PlainTextFallback value={value} onInput={onInput} readOnly={readOnly} placeholder={placeholder} />}><Editor initialValue={initialContent} licenseKey="gpl" init={init} onInit={(_event, instance) => { instanceRef.current = instance; proxy(safeGetContent(instance)); updateMarkdownAvailabilityRef.current(safeGetContent(instance)); }} onEditorChange={(html) => { proxy(html); updateMarkdownAvailabilityRef.current(html); onInput(toText(html), html); }} /></TinyMceErrorBoundary>}
  </div>;
};
