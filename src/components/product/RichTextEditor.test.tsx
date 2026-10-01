// @vitest-environment jsdom
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const editorMock = vi.hoisted(() => ({ init: null as any, props: null as any, buttons: {} as Record<string, any>, icons: {} as Record<string, string> }));

vi.mock('@tinymce/tinymce-react', () => ({
  Editor: (props: any) => {
    editorMock.init = props.init;
    editorMock.props = props;
    return <div role="textbox" aria-label="富文本编辑器" data-testid="tiny-editor" />;
  },
}));

vi.mock('tinymce-i18n/langs8/zh-CN.js', () => ({}));

import { RichTextEditor } from './RichTextEditor';

describe('RichTextEditor', () => {
  it('does not reset the initial document when the parent echoes typed content', () => {
    const editor = React.createRef<HTMLDivElement>();
    const onInput = vi.fn();
    const { rerender } = render(<RichTextEditor editor={editor} value="草稿" htmlValue="<p>草稿</p>" onInput={onInput} />);
    const initialValue = editorMock.props.initialValue;
    rerender(<RichTextEditor editor={editor} value="草稿继续输入" htmlValue="<p>草稿继续输入</p>" onInput={onInput} />);
    expect(editorMock.props.initialValue).toBe(initialValue);
  });
  it('configures the screenshot capabilities and preserves the input contract', () => {
    const onInput = vi.fn();
    const editor = React.createRef<HTMLDivElement>();
    render(<RichTextEditor editor={editor} onInput={onInput} />);

    expect(screen.getByTestId('tiny-editor')).toBeTruthy();
    expect(editorMock.init.language).toBe('zh-CN');
    expect(editorMock.init.skin).toBe(false);
    expect(editorMock.init.content_css).toBe(false);
    expect(editorMock.init.toolbar).toContain('undo redo');
    expect(editorMock.init.toolbar).not.toContain('formatpainter');
    expect(editorMock.init.toolbar).not.toContain('checklist');
    expect(editorMock.init.toolbar).toContain('markdown');
    expect(editorMock.init.plugins).toContain('image');
    expect(editorMock.init.plugins).toContain('table');
    expect(editorMock.init.toolbar).toContain('imageupload');
    expect(editorMock.init.toolbar).toContain('customlink');
    expect(editorMock.init.toolbar).toContain('markdown');
  });

  it('registers thin stroke icons for the complete rich-text toolbar', () => {
    const editor = React.createRef<HTMLDivElement>();
    render(<RichTextEditor editor={editor} onInput={vi.fn()} />);
    const instance = {
      getContent: () => '',
      ui: { registry: {
        addButton: (name: string, config: any) => { editorMock.buttons[name] = config; },
        addIcon: (name: string, svg: string) => { editorMock.icons[name] = svg; },
      } },
      on: vi.fn(),
    } as any;

    editorMock.init.setup(instance);

    expect(Object.keys(editorMock.icons)).toEqual(expect.arrayContaining([
      'undo', 'redo', 'remove-formatting', 'chevron-down', 'bold', 'italic', 'strike-through', 'underline',
      'text-color', 'highlight-bg-color', 'image', 'table', 'link', 'quote', 'code-sample',
      'align-left', 'align-center', 'align-right', 'unordered-list', 'ordered-list',
      'outdent', 'indent', 'line-height',
    ]));
    expect(editorMock.icons.undo).toContain('data-icon="undo"');
    expect(editorMock.icons.image).toContain('data-icon="picture"');
    Object.values(editorMock.icons).forEach((svg) => {
      expect(svg).toContain('stroke-width="1.5"');
      expect(svg).toContain('<path fill="none"');
    });
  });

  it('opens color selection directly and applies or removes color through the editor', () => {
    render(<RichTextEditor editor={React.createRef<HTMLDivElement>()} onInput={vi.fn()} />);
    const open = vi.fn();
    const instance = {
      serializer: {}, getContent: () => '<p>内容</p>',
      execCommand: vi.fn(), focus: vi.fn(), nodeChanged: vi.fn(),
      formatter: { remove: vi.fn() },
      undoManager: { transact: (action: () => void) => action() },
      windowManager: { open },
      ui: { registry: { addIcon: vi.fn(), addButton: (name: string, config: any) => { editorMock.buttons[name] = config; } } },
      on: vi.fn(),
    } as any;
    editorMock.init.setup(instance);
    expect(editorMock.init.toolbar).toContain('textcolorpicker backgroundcolorpicker');
    ['textcolorpicker', 'backgroundcolorpicker'].forEach((name, index) => {
      editorMock.buttons[name].onAction();
      const dialog = open.mock.calls.at(-1)![0];
      expect(dialog.body.items[0].type).toBe('colorpicker');
      const api = { getData: () => ({ color: '#123456' }), close: vi.fn() };
      dialog.onSubmit(api);
      expect(instance.execCommand).toHaveBeenCalledWith(index === 0 ? 'ForeColor' : 'HiliteColor', false, '#123456');
      expect(api.close).toHaveBeenCalled();
      instance.execCommand.mockClear();
      dialog.onSubmit({ ...api, getData: () => ({ color: 'invalid' }) });
      expect(instance.execCommand).not.toHaveBeenCalled();
      dialog.onAction(api, { name: 'remove' });
      expect(instance.formatter.remove).toHaveBeenCalledWith(index === 0 ? 'forecolor' : 'hilitecolor', { value: null }, undefined, true);
    });
  });

  it('uses the reduced default height and the work-order height contract', () => {
    const defaultEditor = React.createRef<HTMLDivElement>();
    const { container, rerender } = render(<RichTextEditor editor={defaultEditor} onInput={vi.fn()} />);
    expect(container.querySelector('.rich-text-editor--work-order')).toBeNull();
    expect(editorMock.init.height).toBe(213);

    const workOrderEditor = React.createRef<HTMLDivElement>();
    rerender(<RichTextEditor size="work-order" editor={workOrderEditor} onInput={vi.fn()} />);
    expect(container.querySelector('.rich-text-editor--work-order')).not.toBeNull();
    expect(editorMock.init.height).toBe(320);
  });

  it('locks Markdown after meaningful rich-text content and unlocks when cleared', () => {
    const editor = React.createRef<HTMLDivElement>();
    render(<RichTextEditor editor={editor} onInput={vi.fn()} />);
    const enabled = vi.fn();
    let html = '';
    const instance = {
      getContent: () => html,
      ui: { registry: {
        addButton: (name: string, config: any) => { editorMock.buttons[name] = config; },
        addIcon: (name: string, svg: string) => { editorMock.icons[name] = svg; },
      } },
      on: vi.fn(),
    } as any;

    editorMock.init.setup(instance);
    const markdown = editorMock.buttons.markdown;
    markdown.onSetup({ setEnabled: enabled });
    expect(enabled).toHaveBeenLastCalledWith(true);

    html = '<p>已有内容</p>';
    act(() => editorMock.props.onEditorChange(html, instance));
    expect(enabled).toHaveBeenLastCalledWith(false);

    html = '<img src="data:image/png;base64,abc" />';
    act(() => editorMock.props.onEditorChange(html, instance));
    expect(enabled).toHaveBeenLastCalledWith(false);

    html = '<p><br></p>';
    act(() => editorMock.props.onEditorChange(html, instance));
    expect(enabled).toHaveBeenLastCalledWith(true);
  });
});
