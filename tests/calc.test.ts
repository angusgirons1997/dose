import { describe, expect, it } from 'vitest';
import {
  capacityUnits,
  check,
  fillFraction,
  markSpacing,
  offMark,
  plan,
  round1,
  round2,
  steps,
  unitsPerMl,
  unitsToMg,
  vialRemaining,
  vialSplit,
  vialsPerBottle,
  warnings,
  waterDraws,
} from '../src/lib/calc';

describe('worked examples (docs/calculator-spec.md)', () => {
  it('Check 5 mg / 1 mL / 1.5 mg U-100 → 30 units', () => {
    expect(check({ vialMg: 5, waterMl: 1, doseMg: 1.5, syringeType: 'U-100' })!.units).toBeCloseTo(30, 9);
  });

  it('Check 5 mg / 1 mL / 2 mg U-100 → 40 units, 2 doses + 1 mg (20 u) left', () => {
    const r = check({ vialMg: 5, waterMl: 1, doseMg: 2, syringeType: 'U-100' })!;
    expect(r.units).toBeCloseTo(40, 9);
    const s = vialSplit(5, 2, r.mgPerUnit);
    expect(s.fullDoses).toBe(2);
    expect(s.leftoverMg).toBeCloseTo(1, 9);
    expect(s.leftoverUnits).toBeCloseTo(20, 9);
  });

  it.each([
    [40, 1.0],
    [80, 2.0],
    [100, 2.5],
  ])('Plan 5 mg / 2 mg @ %i units U-100 → %f mL', (units, ml) => {
    expect(plan({ vialMg: 5, doseMg: 2, targetUnits: units, syringeType: 'U-100' })!.waterMl).toBeCloseTo(ml, 9);
  });

  it('Check 10 mg / 2 mL / 2.5 mg U-100 → 50 units', () => {
    expect(check({ vialMg: 10, waterMl: 2, doseMg: 2.5, syringeType: 'U-100' })!.units).toBeCloseTo(50, 9);
  });

  it('Check 5 mg / 1 mL / 2 mg U-40 → 16 units', () => {
    expect(check({ vialMg: 5, waterMl: 1, doseMg: 2, syringeType: 'U-40' })!.units).toBeCloseTo(16, 9);
  });

  it('Plan 5 mg / 2 mg @ 40 u, bottle 3 mL → 1.0 mL, 3 vials per bottle', () => {
    const r = plan({ vialMg: 5, doseMg: 2, targetUnits: 40, syringeType: 'U-100' })!;
    expect(r.waterMl).toBeCloseTo(1, 9);
    expect(vialsPerBottle(3, r.waterMl)).toBe(3);
  });
});

describe('plan / check', () => {
  it('returns null for zero, negative or non-numeric input', () => {
    expect(plan({ vialMg: 0, doseMg: 2, targetUnits: 40, syringeType: 'U-100' })).toBeNull();
    expect(check({ vialMg: 5, waterMl: -1, doseMg: 2, syringeType: 'U-100' })).toBeNull();
    expect(check({ vialMg: 5, waterMl: NaN, doseMg: 2, syringeType: 'U-100' })).toBeNull();
  });

  it('plan and check are inverses', () => {
    const p = plan({ vialMg: 10, doseMg: 0.25, targetUnits: 10, syringeType: 'U-100' })!;
    const c = check({ vialMg: 10, waterMl: p.waterMl, doseMg: 0.25, syringeType: 'U-100' })!;
    expect(c.units).toBeCloseTo(10, 9);
    expect(c.concentration).toBeCloseTo(p.concentration, 9);
  });

  it('plan reports concentration and mg per unit', () => {
    const p = plan({ vialMg: 5, doseMg: 2, targetUnits: 40, syringeType: 'U-100' })!;
    expect(p.concentration).toBeCloseTo(5, 9);
    expect(p.mgPerUnit).toBeCloseTo(0.05, 9);
  });
});

describe('constants', () => {
  it('units per mL and capacity', () => {
    expect(unitsPerMl('U-100')).toBe(100);
    expect(unitsPerMl('U-40')).toBe(40);
    expect(capacityUnits(0.3, 'U-100')).toBeCloseTo(30, 9);
    expect(capacityUnits(0.5, 'U-100')).toBe(50);
    expect(capacityUnits(1, 'U-100')).toBe(100);
    expect(capacityUnits(1, 'U-40')).toBe(40);
  });

  it('mark spacing', () => {
    expect(markSpacing('U-100', 1)).toBe(2);
    expect(markSpacing('U-100', 0.5)).toBe(1);
    expect(markSpacing('U-100', 0.3)).toBe(1);
    expect(markSpacing('U-40', 1)).toBe(1);
  });
});

describe('vialSplit', () => {
  it('exact division leaves nothing', () => {
    const s = vialSplit(10, 2.5, 0.05);
    expect(s.fullDoses).toBe(4);
    expect(s.leftoverMg).toBe(0);
    expect(s.leftoverUnits).toBe(0);
  });

  it('handles float noise (0.3 / 0.1 = 3 full doses)', () => {
    const s = vialSplit(0.3, 0.1, 0.001);
    expect(s.fullDoses).toBe(3);
    expect(s.leftoverMg).toBe(0);
  });

  it('dose bigger than vial → 0 full doses, all left over', () => {
    const s = vialSplit(1, 2, 0.05);
    expect(s.fullDoses).toBe(0);
    expect(s.leftoverMg).toBe(1);
  });
});

describe('fill / bottle / marks', () => {
  it('fillFraction', () => {
    expect(fillFraction(40, 1, 'U-100')).toBeCloseTo(0.4, 9);
    expect(fillFraction(40, 0.3, 'U-100')).toBeGreaterThan(1);
    expect(fillFraction(16, 1, 'U-40')).toBeCloseTo(0.4, 9);
  });

  it('vialsPerBottle floors', () => {
    expect(vialsPerBottle(10, 3)).toBe(3);
    expect(vialsPerBottle(3, 2.5)).toBe(1);
    expect(vialsPerBottle(0.6, 0.2)).toBe(3);
  });

  it('offMark', () => {
    expect(offMark(40, 'U-100', 1)).toBe(false);
    expect(offMark(31, 'U-100', 1)).toBe(true);
    expect(offMark(31, 'U-100', 0.5)).toBe(false);
    expect(offMark(12.5, 'U-100', 0.3)).toBe(true);
    expect(offMark(30.000000001, 'U-100', 1)).toBe(false);
  });

  it('waterDraws', () => {
    expect(waterDraws(1, 1, 'U-100')).toEqual([100]);
    expect(waterDraws(2.5, 1, 'U-100')).toEqual([100, 100, 50]);
    expect(waterDraws(1, 0.3, 'U-100').map(round1)).toEqual([30, 30, 30, 10]);
    expect(waterDraws(0, 1, 'U-100')).toEqual([]);
  });

  it('unitsToMg', () => {
    expect(unitsToMg(40, 5, 'U-100')).toBeCloseTo(2, 9);
    expect(unitsToMg(16, 5, 'U-40')).toBeCloseTo(2, 9);
  });
});

describe('vialRemaining', () => {
  it('subtracts logged doses and counts jabs left', () => {
    expect(vialRemaining(5, [2], 2)).toEqual({ remainingMg: 3, jabsLeft: 1, fraction: 0.6 });
    expect(vialRemaining(10, [2.5, 2.5], 2.5).jabsLeft).toBe(2);
  });
  it('never goes negative and handles unknown dose', () => {
    expect(vialRemaining(5, [3, 3]).remainingMg).toBe(0);
    expect(vialRemaining(5, []).jabsLeft).toBeUndefined();
  });
  it('float noise: 0.3 mg left at 0.1 mg = 3 jabs', () => {
    expect(vialRemaining(0.6, [0.1, 0.2], 0.1).jabsLeft).toBe(3);
  });
});

describe('warnings', () => {
  const base = { units: 40, waterMl: 1, capacityMl: 1, syringeType: 'U-100' as const };

  it('none for a sensible setup', () => {
    expect(warnings({ ...base, bottleMl: 3 })).toEqual([]);
  });

  it('dose exceeds capacity', () => {
    expect(warnings({ ...base, capacityMl: 0.3 }).some((w) => w.includes("won't fit"))).toBe(true);
  });

  it('water exceeds bottle', () => {
    expect(warnings({ ...base, waterMl: 2.5, bottleMl: 2 }).some((w) => w.includes('bottle'))).toBe(true);
  });

  it('water too little / too much', () => {
    expect(warnings({ ...base, waterMl: 0.4 }).some((w) => w.includes('0.5 mL'))).toBe(true);
    expect(warnings({ ...base, waterMl: 3.5 }).some((w) => w.includes('3 mL'))).toBe(true);
    expect(warnings({ ...base, waterMl: 3 })).toEqual([]);
  });

  it('under 5 units', () => {
    expect(warnings({ ...base, units: 4, capacityMl: 0.3 }).some((w) => w.includes('5 units'))).toBe(true);
  });

  it('between marks', () => {
    expect(warnings({ ...base, units: 33 }).some((w) => w.includes('between'))).toBe(true);
  });
});

describe('steps', () => {
  it('single draw', () => {
    const s = steps({ waterMl: 1, units: 40, doseMg: 2, capacityMl: 1, syringeType: 'U-100' });
    expect(s[0]).toBe('Fill the syringe to the 100 line with BAC water (1 mL).');
    expect(s[2]).toBe('Draw 40 units for each 2 mg dose.');
  });

  it('multiple draws: fill to 100 twice + 50', () => {
    const s = steps({ waterMl: 2.5, units: 100, doseMg: 2, capacityMl: 1, syringeType: 'U-100' });
    expect(s[0]).toContain('to the 100 line twice + 50');
  });
});

describe('rounding', () => {
  it('rounds for display', () => {
    expect(round1(33.333)).toBe(33.3);
    expect(round1(1.05)).toBe(1.1);
    expect(round2(1.005)).toBe(1.01);
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });
});
