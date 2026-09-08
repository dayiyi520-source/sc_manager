import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const styles = readFileSync(new URL('./index.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

describe('light workspace theme contract', () => {
  it('normalizes dialogs and page controls inside the right workspace only', () => {
    expect(styles).toContain('html:not(.dark) .tech-main .fixed.inset-0 > div:not(.fixed)');
    expect(styles).toContain('html:not(.dark) .tech-main .fixed.inset-0 :where(input, select, textarea)[class]');
    expect(styles).toContain('html:not(.dark) .tech-main .fixed.inset-0 button:disabled');
    expect(styles).toContain('html:not(.dark) .tech-main [role="tablist"]');
  });

  it('normalizes product-line detail tabs that use custom button markup', () => {
    expect(styles).toContain('html:not(.dark) .product-line-detail .product-line-tabs > button');
    expect(styles).toContain('html:not(.dark) .product-line-detail .product-line-tabs > button:hover');
    expect(styles).toContain('html:not(.dark) .product-line-detail .product-line-tabs > button[class*="text-[#2F66F6]"]');
    expect(styles).toContain('html:not(.dark) .product-line-detail .product-line-tabs > button:focus-visible');
    expect(styles).toContain('html:not(.dark) .product-line-detail button[class*="bg-[#2F66F6]"]');
  });

  it('preserves the existing dark navigation rail in light mode', () => {
    expect(styles).toContain('html:not(.dark) .tech-sidebar {\n  --bg-main: #0C0F13;');
    expect(styles).not.toContain('html:not(.dark) .tech-sidebar {\n  background: var(--bg-card)');
  });
});
