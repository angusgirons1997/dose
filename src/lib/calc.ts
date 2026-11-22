// Pure reconstitution maths. Full precision everywhere; round only for display.

export type SyringeType = 'U-100' | 'U-40';
export type CapacityMl = 0.3 | 0.5 | 1;

const EPS = 1e-9;

export const unitsPerMl = (t: SyringeType): number => (t === 'U-40' ? 40 : 100);

export const capacityUnits = (capacityMl: number, t: SyringeType): number =>
  capacityMl * unitsPerMl(t);

/** Spacing of printed marks in units. U-100 1 mL = every 2 units; 0.3/0.5 mL = every 1; U-40 = every 1. */
export const markSpacing = (t: SyringeType, capacityMl: number): number =>
  t === 'U-100' && capacityMl >= 1 ? 2 : 1;

const positive = (...xs: number[]) => xs.every((x) => Number.isFinite(x) && x > 0);

// ---------- Mode A: Plan (solve for water) ----------
export interface PlanInput {
  vialMg: number;
  doseMg: number;
  targetUnits: number;
  syringeType: SyringeType;
}
export interface Reconstitution {
  waterMl: number;
  concentration: number; // mg/mL
  mgPerUnit: number;
  units: number; // units per dose
}

export function plan({ vialMg, doseMg, targetUnits, syringeType }: PlanInput): Reconstitution | null {
  if (!positive(vialMg, doseMg, targetUnits)) return null;
  const upm = unitsPerMl(syringeType);
  const concentration = doseMg / (targetUnits / upm);
  const waterMl = (vialMg * targetUnits) / (doseMg * upm);
  return { waterMl, concentration, mgPerUnit: concentration / upm, units: targetUnits };
}

// ---------- Mode B: Check (solve for units) ----------
export interface CheckInput {
  vialMg: number;
  waterMl: number;
  doseMg: number;
  syringeType: SyringeType;
}

export function check({ vialMg, waterMl, doseMg, syringeType }: CheckInput): Reconstitution | null {
  if (!positive(vialMg, waterMl, doseMg)) return null;
  const concentration = vialMg / waterMl;
  const mgPerUnit = concentration / unitsPerMl(syringeType);
  return { waterMl, concentration, mgPerUnit, units: doseMg / mgPerUnit };
}

// ---------- Shared outputs ----------
export interface VialSplit {
  dosesPerVial: number; // exact, e.g. 2.5
  fullDoses: number;
  leftoverMg: number;
  leftoverUnits: number;
}

export function vialSplit(vialMg: number, doseMg: number, mgPerUnit: number): VialSplit {
  const dosesPerVial = vialMg / doseMg;
  const fullDoses = Math.floor(dosesPerVial + EPS);
  let leftoverMg = vialMg - fullDoses * doseMg;
  if (Math.abs(leftoverMg) < EPS) leftoverMg = 0;
  return { dosesPerVial, fullDoses, leftoverMg, leftoverUnits: leftoverMg / mgPerUnit };
}

/** Fraction of the syringe a dose fills (>1 means it won't fit). */
export const fillFraction = (units: number, capacityMl: number, t: SyringeType): number =>
  units / capacityUnits(capacityMl, t);

export const vialsPerBottle = (bottleMl: number, waterMl: number): number =>
  Math.floor(bottleMl / waterMl + EPS);

/** Does this dose land between printed marks? */
export function offMark(units: number, t: SyringeType, capacityMl: number): boolean {
  const s = markSpacing(t, capacityMl);
  const r = units / s;
  return Math.abs(r - Math.round(r)) > 1e-6;
}

/** Split a water volume into syringe draws, in units, e.g. 2.5 mL with a 1 mL U-100 → [100, 100, 50]. */
export function waterDraws(waterMl: number, capacityMl: number, t: SyringeType): number[] {
  const total = waterMl * unitsPerMl(t);
  const cap = capacityUnits(capacityMl, t);
  const draws: number[] = [];
  let left = total;
  while (left > EPS && draws.length < 50) {
    const d = Math.min(cap, left);
    draws.push(d);
    left -= d;
  }
  return draws;
}

/** mg in a given number of units at a concentration. Used by the jab log. */
export const unitsToMg = (units: number, concentration: number, t: SyringeType): number =>
  (units * concentration) / unitsPerMl(t);

/** What's left in a vial after the logged doses. jabsLeft is undefined without a known dose. */
export function vialRemaining(vialMg: number, dosesTakenMg: number[], doseMg?: number) {
  const remainingMg = Math.max(0, vialMg - dosesTakenMg.reduce((s, d) => s + d, 0));
  const jabsLeft = doseMg && doseMg > 0 ? Math.floor(remainingMg / doseMg + EPS) : undefined;
  return { remainingMg, jabsLeft, fraction: vialMg > 0 ? remainingMg / vialMg : 0 };
}

export interface WarningInput {
  units: number;
  waterMl: number;
  capacityMl: number;
  syringeType: SyringeType;
  bottleMl?: number;
}

export function warnings({ units, waterMl, capacityMl, syringeType, bottleMl }: WarningInput): string[] {
  const w: string[] = [];
  if (fillFraction(units, capacityMl, syringeType) > 1 + EPS)
    w.push("Dose won't fit this syringe — split into 2 draws or use a bigger syringe.");
  if (bottleMl && bottleMl > 0 && waterMl > bottleMl + EPS)
    w.push(`Needs ${round2(waterMl)} mL of water but the bottle only holds ${bottleMl} mL.`);
  if (waterMl < 0.5 - EPS) w.push('Less than 0.5 mL of water is hard to add accurately.');
  if (waterMl > 3 + EPS) w.push('More than 3 mL of water may not fit the vial.');
  if (units < 5 - EPS) w.push('Under 5 units per dose is hard to measure — use less water.');
  if (offMark(units, syringeType, capacityMl))
    w.push(
      `${round1(units)} units falls between syringe marks (every ${markSpacing(syringeType, capacityMl)} u) — you'll be estimating.`,
    );
  return w;
}

export interface StepsInput {
  waterMl: number;
  units: number;
  doseMg: number;
  capacityMl: number;
  syringeType: SyringeType;
}

/** Plain-English mixing steps. */
export function steps({ waterMl, units, doseMg, capacityMl, syringeType }: StepsInput): string[] {
  const draws = waterDraws(waterMl, capacityMl, syringeType).map(round1);
  const fill =
    draws.length <= 1
      ? `Fill the syringe to the ${draws[0] ?? 0} line with BAC water (${round2(waterMl)} mL).`
      : `Fill the syringe ${describeDraws(draws)} with BAC water (${round2(waterMl)} mL total).`;
  return [
    fill,
    'Inject slowly down the inside wall of the vial. Swirl gently — don’t shake.',
    `Draw ${round1(units)} units for each ${round2(doseMg)} mg dose.`,
  ];
}

function describeDraws(draws: number[]): string {
  const full = draws.filter((d) => d === draws[0]).length;
  const rest = draws.slice(full);
  const times = full === 2 ? 'twice' : `${full} times`;
  return `to the ${draws[0]} line ${times}` + (rest.length ? ` + ${rest.join(' + ')}` : '');
}

// ---------- Rounding ----------
export const round1 = (x: number): number => Math.round((x + Number.EPSILON) * 10) / 10;
export const round2 = (x: number): number => Math.round((x + Number.EPSILON) * 100) / 100;

/** Days from `todayIso` to the next jab (`lastIso` + interval). Negative = overdue. Dates are YYYY-MM-DD. */
export function nextJab(lastIso: string, todayIso: string, intervalDays: number) {
  const day = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5;
  const due = day(lastIso) + intervalDays;
  const d = new Date(due * 864e5);
  const dueIso = d.toISOString().slice(0, 10);
  const daysLeft = due - day(todayIso);
  return { dueIso, daysLeft, fraction: Math.min(1, Math.max(0, 1 - daysLeft / intervalDays)) };
}
