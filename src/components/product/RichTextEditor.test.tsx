// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { RichTextEditor } from './RichTextEditor';

describe('RichTextEditor', () => {
  it('exposes formatting controls and emits text plus html changes', () => {
    const onInput = vi.fn();
    const editor = React.createRef<HTMLDivElement>();
    render(<RichTextEditor editor={editor} onInput={onInput} />);
    const editorBox = screen.getByRole('textbox', { name: '' });
    expect(screen.getByRole('button', { name: '粗体' })).toBeTruthy();
    fireEvent.input(editorBox, { target: { innerHTML: '<strong>需求</strong>', innerText: '需求' } });
    expect(onInput).toHaveBeenCalledWith('需求', '<strong>需求</strong>');
  });
});
