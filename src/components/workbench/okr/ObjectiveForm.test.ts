import { describe, expect, it } from 'vitest';
import { calculateKrWeightTotal } from './ObjectiveForm';

describe('ObjectiveForm weight rules', () => {
  it('derives objective weight from all KR weights', () => {
    expect(calculateKrWeightTotal([{ weight: 40 }, { weight: 35 }, { weight: 25 }])).toBe(100);
  });

  it('returns the live total when KR weights change', () => {
    expect(calculateKrWeightTotal([{ weight: 60 }, { weight: 20 }])).toBe(80);
  });
});
