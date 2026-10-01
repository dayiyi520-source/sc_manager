import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const mainSource = readFileSync(new URL('./main.tsx', import.meta.url), 'utf8');
const componentSource = readFileSync(new URL('./components/common/UIComponents.tsx', import.meta.url), 'utf8');
const globalStyles = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
const antOverrides = readFileSync(new URL('./styles/antd-override.css', import.meta.url), 'utf8');

describe('theme and Ant Design compatibility contract', () => {
  it('maps the Ant Design theme through CSS design tokens', () => {
    expect(mainSource).toContain("cssToken('--primary'");
    expect(mainSource).toContain("cssToken('--success'");
    expect(mainSource).not.toContain("colorPrimary: '#");
  });

  it('lets Ant Design own input interaction states', () => {
    expect(mainSource).toContain('components: {');
    expect(mainSource).toContain('Input: {');
    expect(mainSource).toContain('hoverBorderColor:');
    expect(mainSource).toContain('activeBorderColor:');
    expect(mainSource).toContain('activeShadow:');
    expect(mainSource).toContain('errorActiveShadow:');
    expect(mainSource).toContain('colorBgContainerDisabled:');
    expect(mainSource).toContain('colorTextDisabled:');
  });

  it('keeps global native-control states away from Ant Design inputs', () => {
    expect(globalStyles).toContain('textarea:not(.ant-input)');
    expect(globalStyles).toContain('input:not(.ant-input):not(.ant-input *)');
    expect(globalStyles).toContain(":not(.ant-picker-input > input)");
    expect(globalStyles).toContain(':not(.ant-input-number-input)');
    expect(antOverrides).not.toMatch(/\.ant-input(?::hover|:focus|:focus-visible)/);
  });

  it('uses current Card and Statistic APIs', () => {
    expect(componentSource).toContain('variant="borderless"');
    expect(componentSource).toContain('styles={{');
    expect(componentSource).not.toContain('bordered={false}');
    expect(componentSource).not.toContain('valueStyle=');
  });
});
