import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const mainSource = readFileSync(new URL('./main.tsx', import.meta.url), 'utf8');
const componentSource = readFileSync(new URL('./components/common/UIComponents.tsx', import.meta.url), 'utf8');

describe('theme and Ant Design compatibility contract', () => {
  it('maps the Ant Design theme through CSS design tokens', () => {
    expect(mainSource).toContain("cssToken('--primary'");
    expect(mainSource).toContain("cssToken('--success'");
    expect(mainSource).not.toContain("colorPrimary: '#");
  });

  it('uses current Card and Statistic APIs', () => {
    expect(componentSource).toContain('variant="borderless"');
    expect(componentSource).toContain('styles={{');
    expect(componentSource).not.toContain('bordered={false}');
    expect(componentSource).not.toContain('valueStyle=');
  });
});
