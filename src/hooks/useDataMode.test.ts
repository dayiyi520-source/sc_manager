import { describe, expect, it } from 'vitest';
import { resolveDataMode } from './useDataMode';

describe('resolveDataMode', () => {
  it('uses local mode for a fallback development session', () => {
    expect(resolveDataMode('local-dev-admin', true)).toBe('local');
  });

  it('uses remote mode only for a ready non-local session', () => {
    expect(resolveDataMode('jwt-token', true)).toBe('remote');
    expect(resolveDataMode('jwt-token', false)).toBe('local');
    expect(resolveDataMode('', true)).toBe('local');
  });
});
