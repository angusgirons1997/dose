# Dose — project rules for Claude Code

## What this is
A personal, single-user iPhone home-screen PWA for peptide reconstitution maths, jab logging and body tracking. Owner: Gus. Not for sale or public use.

## Non-negotiables
- **Accuracy over everything in the calculator.** Every formula lives in `src/lib/calc.ts` as a pure function with Vitest coverage. UI never does its own maths.
- Round displayed units to 1 decimal and mg to 2 decimals, but calculate with full precision. Warn when a dose needs a fraction of a syringe mark (U-100 1 mL syringes are marked every 2 units; 0.3/0.5 mL every 1 unit).
- Warn (amber, not blocking) when: dose doesn't fit the syringe capacity; water to add exceeds the BAC bottle; water < 0.5 mL or > 3 mL (impractical); concentration produces < 5 units per dose (hard to measure).
- All data local: Dexie/IndexedDB. Photos stored as Blobs, downscaled to max 1600px long edge, JPEG 0.85, before saving.
- Call `navigator.storage.persist()` on first launch.
- No external network calls at runtime. No fonts from CDNs — use the system stack (`-apple-system, "SF Pro Display", "Inter", system-ui`).

## Design
Follow `docs/design-spec.md` and `reference/*.png`. Frosted glass over a warm, blurred colour field. If in doubt, copy image 01 (the "Your daily words" card).

## Structure
```
src/
  lib/calc.ts         pure calculator functions
  lib/db.ts           Dexie schema
  lib/backup.ts       export/import
  components/         Glass, PillButton, Stepper, SyringeBar, TabBar, Sheet
  screens/            Calculator.tsx, Jabs.tsx, Body.tsx, Settings.tsx
  styles/tokens.css   all design tokens
tests/calc.test.ts
```

## Data model (Dexie)
- `vials`: id, createdAt, peptideName, vialMg, waterMl, concentrationMgPerMl, syringeType, active (bool)
- `jabs`: id, date (YYYY-MM-DD), units, doseMg, vialId, newVial (bool), note?
- `weights`: id, date, kg, photoId?
- `photos`: id, date, blob, note?
- `settings`: key/value

Logging a jab with `newVial = true` marks the previous active vial inactive and creates a new active vial from the saved calculator values (or prompts for them).
