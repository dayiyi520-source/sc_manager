// @vitest-environment jsdom
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const editorMock = vi.hoisted(() => ({ init: null as any, props: null as any, buttons: {} as Record<string, any> }));

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
  it('configures the screenshot capabilities and preserves the input contract', () => {
    const onInput = vi.fn();
    const editor = React.createRef<HTMLDivElement>();
    render(<RichTextEditor editor={editor} onInput={onInput} />);

    expect(screen.getByTestId('tiny-editor')).toBeTruthy();
    expect(editorMock.init.language).toBe('zh-CN');
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

  it('applies the enlarged work-order editing surface without changing the default editor', () => {
    const defaultEditor = React.createRef<HTMLDivElement>();
    const { container, rerender } = render(<RichTextEditor editor={defaultEditor} onInput={vi.fn()} />);
    expect(container.querySelector('.rich-text-editor--work-order')).toBeNull();

    const workOrderEditor = React.createRef<HTMLDivElement>();
    rerender(<RichTextEditor size="work-order" editor={workOrderEditor} onInput={vi.fn()} />);
    expect(container.querySelector('.rich-text-editor--work-order')).not.toBeNull();
  });

  it('locks Markdown after meaningful rich-text content and unlocks when cleared', () => {
    const editor = React.createRef<HTMLDivElement>();
    render(<RichTextEditor editor={editor} onInput={vi.fn()} />);
    const enabled = vi.fn();
    let html = '';
    const instance = {
      getContent: () => html,
      ui: { registry: { addButton: (name: string, config: any) => { editorMock.buttons[name] = config; } } },
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
