// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from './sanitizeHtml';

describe('sanitizeHtml', () => {
  it('保留安全的富文本图片并移除不安全图片地址', () => {
    const result = sanitizeHtml('<p>说明</p><img src="data:image/png;base64,abc" onerror="alert(1)"><img src="javascript:alert(1)">');

    expect(result).toContain('<img src="data:image/png;base64,abc">');
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('javascript:');
  });
});
