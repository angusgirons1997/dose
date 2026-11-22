# Design spec — "warm frosted glass"

Reference images live in `/reference`. Priority order: **01 > 04 > 02 > 03 > 05**.

| File | What to take from it |
|---|---|
| 01-daily-words-card.png | Overall vibe. Warm blurred colour field background, big bold left-aligned title, circular glass date chips in a horizontal scroller, one large rounded glass card, cream pill primary button with icon, small circular glass icon buttons. |
| 02-frosted-glass-variants.png | The "Frosted" material (top) = default card surface. Grainy, warm, soft edge highlight. |
| 03-ask-bar-glass.png | Edge treatment: 1px inner light border, subtle chromatic rim, generous radius. Use for the bottom tab bar. |
| 04-onboarding-pills.png | Stacked full-width glass pills with a small circular icon on the left, title + muted subtitle. Use for jab history list and settings rows. Dark-mode variant. |
| 05-home-grid-red.png | 2×2 glass tile grid (alternative home layout) and pill input bar at bottom. Secondary reference only. |

## Background
A fixed full-screen layer of 3–4 large blurred radial gradients (blur 80–120px) slowly drifting (60s loop, respect `prefers-reduced-motion`). Each tab gets its own palette:
- Calculator: terracotta `#8C4A32` → amber `#C98A3E` → dusty blue `#7E93A8` (image 01)
- Jabs: oxblood `#5A1E22` → rose `#B5525A` → plum `#3B2033` (images 04/05)
- Body: deep teal `#1E3B40` → slate `#4A5F6B` → warm sand `#B89A74`
Overlay a subtle noise texture (inline SVG feTurbulence, opacity ~0.06) for the frosted grain.

## Glass material (tokens)
```css
--glass-bg: rgba(255,255,255,0.10);
--glass-bg-strong: rgba(255,255,255,0.16);
--glass-border: rgba(255,255,255,0.22);
--glass-blur: blur(28px) saturate(140%);
--glass-shadow: 0 10px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.25);
--radius-card: 32px;
--radius-pill: 999px;
--cream: #FBF3C4;      /* primary button, image 01 "Got it" */
--cream-ink: #1A1A1A;
--text: #FFFFFF;
--text-muted: rgba(255,255,255,0.62);
```
Always include `-webkit-backdrop-filter`.

## Typography
System stack. Titles: 34–40px, weight 700, letter-spacing −0.02em, tight line-height (1.05), left aligned ("Your daily words"). Hero number (calculator result): 72–88px, weight 700. Labels: 13px, muted. Small caps chips: 12px in pill ("adjective" chip in image 01).

## Components
- **GlassCard** — main surface, radius 32, padding 24.
- **DateChip** — 72px circle, glass, day name / big number / small label (image 01). Selected = brighter glass + white ring. Used as the week strip on the Jabs tab, label = units taken.
- **PillButton (primary)** — cream fill, dark text, icon right, height 52.
- **IconButton** — 40px glass circle (menu, speaker, bookmark in image 01).
- **ListPill** — image 04 rows.
- **TabBar** — floating glass capsule, 16px from bottom + safe area, three icons + labels, active icon in cream.
- **Sheet** — bottom sheet, glass-strong, drag handle, for log-jab / log-weight / settings.
- **SyringeBar** — horizontal glass capsule with cream fill and tick marks every 10 units.

## Layout
- Design at 390×844, safe areas via `env(safe-area-inset-*)`.
- `apple-mobile-web-app-status-bar-style: black-translucent` so the background runs under the status bar.
- Generous whitespace; one hero thing per screen.

## Motion
Spring-ish 250ms ease-out on sheet open, card press scale 0.98, number changes cross-fade. Nothing bouncy.
