import { describe, expect, it, vi } from 'vitest';
import type { ObjectiveFormHandle } from './ObjectiveForm';
import { runObjectiveBatch } from './objectiveBatch';

const form = (result: boolean): ObjectiveFormHandle => ({
  submit: vi.fn().mockResolvedValue(result),
  saveDraft: vi.fn().mockResolvedValue(result),
});

describe('runObjectiveBatch', () => {
  it('runs forms in order and reports all completed forms', async () => {
    const first = form(true);
    const second = form(true);

    await expect(runObjectiveBatch(['first', 'second'], { first, second }, 'submit'))
      .resolves.toEqual({ completedIds: ['first', 'second'] });
    expect(first.submit).toHaveBeenCalledOnce();
    expect(second.submit).toHaveBeenCalledOnce();
  });

  it('stops at the first invalid form to avoid out-of-order partial writes', async () => {
    const first = form(true);
    const second = form(false);
    const third = form(true);

    await expect(runObjectiveBatch(['first', 'second', 'third'], { first, second, third }, 'saveDraft'))
      .resolves.toEqual({ completedIds: ['first'], failedId: 'second' });
    expect(third.saveDraft).not.toHaveBeenCalled();
  });
});
