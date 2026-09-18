/* @vitest-environment jsdom */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import dayjs from 'dayjs';
import { CreateVersionModal, isEndDateDisabled, shouldClearEndDate, VERSION_RELEASE_NOTES_PLACEHOLDER } from './CreateVersionModal';

const mocks = vi.hoisted(() => ({
  addVersion: vi.fn().mockResolvedValue(true),
  updateVersion: vi.fn().mockResolvedValue(true),
  addToast: vi.fn(),
}));

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    ...mocks,
    productLines: [{ id: 'line-1', name: '协同产品线', code: 'PL-01', ownerName: '林志豪', members: [] }],
  }),
}));

describe('CreateVersionModal', () => {
  it('requires a product line and exposes the agreed release-note example', async () => {
    render(<CreateVersionModal isOpen onClose={vi.fn()} />);

    expect(screen.getByText(/所属产品线/)).toHaveTextContent('*');
    expect(document.querySelector('textarea')).toHaveAttribute('placeholder', VERSION_RELEASE_NOTES_PLACEHOLDER);
    fireEvent.submit(document.querySelector('#create-version-form')!);

    await waitFor(() => expect(mocks.addToast).toHaveBeenCalledWith('warning', '请选择所属产品线'));
    expect(mocks.addVersion).not.toHaveBeenCalled();
  });

  it('clears an end date when the start date moves beyond it', () => {
    expect(shouldClearEndDate('2026-09-25', '2026-09-20')).toBe(true);
    expect(shouldClearEndDate('2026-09-20', '2026-09-20')).toBe(false);
    expect(shouldClearEndDate('2026-09-01', '')).toBe(false);
  });

  it('disables end dates before the selected start date', () => {
    expect(isEndDateDisabled(dayjs('2026-09-09'), '2026-09-10')).toBe(true);
    expect(isEndDateDisabled(dayjs('2026-09-10'), '2026-09-10')).toBe(false);
    expect(isEndDateDisabled(dayjs('2026-09-09'), '')).toBe(false);
  });
});
