// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DevLoginPage } from './DevLoginPage';

vi.mock('gsap', () => ({ gsap: { registerPlugin: vi.fn(), to: vi.fn(), fromTo: vi.fn() } }));
vi.mock('gsap/Draggable', () => ({ Draggable: { create: vi.fn(() => [{ kill: vi.fn() }]) } }));
vi.mock('gsap/MorphSVGPlugin', () => ({ MorphSVGPlugin: {} }));
vi.mock('../../services/session', () => ({ readSession: vi.fn(() => null), devLogin: vi.fn() }));

describe('DevLoginPage lamp control', () => {
  beforeEach(() => vi.clearAllMocks());

  it('provides a click and keyboard-equivalent path to reveal the login panel', () => {
    render(<MemoryRouter><DevLoginPage /></MemoryRouter>);
    const control = screen.getByRole('button', { name: '拖拽拉绳切换台灯' });

    fireEvent.click(control);
    expect(screen.getByText(/照明已开启/)).toBeInTheDocument();

    control.focus();
    fireEvent.keyDown(control, { key: 'Enter' });
    fireEvent.click(control);
    expect(screen.getByText(/灯光已关闭/)).toBeInTheDocument();
  });
});
