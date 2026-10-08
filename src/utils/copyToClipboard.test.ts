// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { copyToClipboard } from './copyToClipboard';

afterEach(() => vi.restoreAllMocks());
beforeEach(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, get: () => undefined }));

describe('clipboard compatibility', () => {
  it('copies through the browser clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue({ writeText } as unknown as Clipboard);
    await copyToClipboard('WO-001');
    expect(writeText).toHaveBeenCalledWith('WO-001');
  });

  it('propagates clipboard permission failures', async () => {
    vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue({ writeText: vi.fn().mockRejectedValue(new Error('denied')) } as unknown as Clipboard);
    await expect(copyToClipboard('WO-001')).rejects.toThrow('denied');
  });

  it('cleans up the fallback input when copying fails', async () => {
    vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue(undefined as unknown as Clipboard);
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn().mockReturnValue(false) });
    await expect(copyToClipboard('WO-001')).rejects.toThrow('无法复制');
    expect(document.querySelector('textarea')).toBeNull();
  });
});
