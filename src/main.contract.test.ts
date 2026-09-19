import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('application router deployment contract', () => {
  it('keeps client-side routes under the configured Vite base path', () => {
    const source = readFileSync(new URL('./main.tsx', import.meta.url), 'utf8');

    expect(source).toContain("import.meta.env.BASE_URL.replace(/\\/$/, '') || '/'");
    expect(source).toContain('<BrowserRouter basename={routerBasePath}>');
  });
});
