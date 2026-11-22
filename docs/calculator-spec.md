# Calculator spec

## Why two modes (not one big form)
The original brief listed vial mg, BAC water, desired units AND desired dose as inputs. Those four over-determine the answer: fix any three and the fourth is forced. So the calculator solves for one unknown at a time.

The **BAC water bottle size** (e.g. 3 mL, 10 mL) is *not* the amount you add — it's only used as a check ("you need 1 mL, your bottle has 3 mL → enough for 3 vials").

## Constants
- U-100 syringe: 100 units = 1 mL → `unitsPerMl = 100`
- U-40 syringe: 40 units = 1 mL → `unitsPerMl = 40`
- Capacity (U-100): 0.3 mL = 30 units, 0.5 mL = 50 units, 1.0 mL = 100 units

## Mode A — Plan (solve for water to add)
Inputs: `vialMg`, `doseMg`, `targetUnits`, `syringeType`, `bottleMl` (optional)

```
concentration (mg/mL) = doseMg / (targetUnits / unitsPerMl)
waterMl               = vialMg / concentration
                      = vialMg × targetUnits / (doseMg × unitsPerMl)
```

## Mode B — Check (solve for units to draw)
Inputs: `vialMg`, `waterMl`, `doseMg`, `syringeType`

```
concentration = vialMg / waterMl
mgPerUnit     = concentration / unitsPerMl
units         = doseMg / mgPerUnit
```

## Always show (both modes)
- `dosesPerVial = vialMg / doseMg` → show as "2 full doses + 1 mg left (20 units)"
- `leftoverMg = vialMg − floor(dosesPerVial) × doseMg`, leftover units = `leftoverMg / mgPerUnit`
- Syringe fill bar: units ÷ capacity units. Red if > 100% ("won't fit — split into 2 draws or use a bigger syringe").
- Bottle check (if `bottleMl` given): `vialsPerBottle = floor(bottleMl / waterMl)`
- Plain-English steps, e.g.
  1. Fill the syringe to the **100** line with BAC water (1 mL).
  2. Inject slowly down the inside wall of the vial. Swirl gently.
  3. Draw **40 units** for each **2 mg** dose.
  
  If waterMl > syringe capacity, step 1 becomes "fill to 100 twice + 50" etc.

## Worked examples (these MUST be unit tests)
| Mode | vialMg | water | doseMg | units | syringe | Expected |
|---|---|---|---|---|---|---|
| Check | 5 | 1 mL | 1.5 | – | U-100 | **30 units** |
| Check | 5 | 1 mL | 2 | – | U-100 | **40 units**, 2 doses + 1 mg (20 u) left |
| Plan | 5 | – | 2 | 40 | U-100 | **1.0 mL water** |
| Plan | 5 | – | 2 | 80 | U-100 | **2.0 mL water** |
| Plan | 5 | – | 2 | 100 | U-100 | **2.5 mL water** |
| Check | 10 | 2 mL | 2.5 | – | U-100 | **50 units** |
| Check | 5 | 1 mL | 2 | – | U-40 | **16 units** |
| Plan | 5 | – | 2 | 40 | U-100, bottle 3 mL | 1.0 mL, **3 vials per bottle** |

## Input UX
- Big numeric fields with − / + steppers (vial mg step 0.5, water step 0.1, dose step 0.25, units step 1).
- Quick-pick chips under each field: vial 5 / 10 / 15 / 20 / 30 mg; dose 0.5 / 1 / 1.5 / 2 / 2.5 mg; units 10 / 20 / 30 / 40 / 50.
- Optional peptide name field (free text, remembered).
- Results update live; no "Calculate" button.
