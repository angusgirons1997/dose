# Decisions

Calls made while building without asking.

## Round 2 changes (from your feedback)
- **The app opens on a new Home tab.** It shows the last jab, how much of the vial is left, your latest weight with a small graph, quick "Log a jab" / "Log weight" buttons and a link to the calculator. It always opens on Home, even if you were on another tab before.
- **The Dose logo and name are fixed at the top left**, with the date underneath. Tapping it takes you to Home. The settings gear stays top right.
- **The tabs are Home, Calculator, Jabs and Body.** All four pages sit side by side and slide left or right when you switch. The background colours fade between tab palettes as you slide, and the blobs move slightly behind the page. Pages you can't see are `inert` (not tappable or focusable).
- **With iOS Reduce Motion on**, only the slow background drift stops. The tab slide still plays, because you asked for it.
- **There's a fade behind the nav bar**: a gradient and blur that sits above the content and blocks taps, so nothing under or around the nav bar can be pressed.
- **Glass surfaces have no border now.** Depth comes from a soft shadow and a faint top highlight only.
- **Click sounds are made in code** (Web Audio, no sound files). There's a tick for buttons, a rising tone for tab switches and a two-note chime for saves. On iOS 17+ they follow the silent switch (`audioSession.type = 'ambient'`), and there's an on/off switch in Settings.
- **New icon**: the same warm gradient, with a frosted glass disc and a cream droplet with a highlight. The in-app logo, favicon and PNG icons all use the same shape.

## Round 3: speed and nav bar position (from your screen recording)
- **The nav bar sat too high** because iOS home-screen apps with a black-translucent status bar measure `100%` / `inset: 0` as the screen minus the status bar. That left a strip at the bottom. Everything now lives in one `.app` box that is `100vh` tall when installed (`100dvh` in a normal browser tab). The nav bar, fade and sheets are positioned inside that box instead of with `position: fixed`, and only `html` clips overflow.
- **The slide was choppy** because every frame re-blurred every glass card on four pages and repainted huge blurred background blobs with animating colours. Now:
  - Cards use a translucent frosted gradient instead of a live blur. The only live blurs left are the tab bar and open sheets.
  - The background is one pre-painted layer per tab. Switching tabs only fades opacity and moves layers, which the GPU does without repainting. There's no CSS `filter` anywhere.
  - The noise grain no longer uses `mix-blend-mode`.
  - The header and nav fades are plain gradients.

## Round 4: Liquid Glass direction
- **The icon is now a clear glass "D"** with a bright edge on the top left and a soft shadow, on the same warm gradient. The droplet is gone. The PNG icons, the favicon and the in-app logo all use the same shape.
- **No colour fills on controls.** Buttons are raised clear glass with white text. The selected tab, the selected chip, the "on" switch track and anything you're pressing are pushed into the surface (a darker see-through well with an inner shadow) and shrink slightly (scale 0.97).
- **Data visuals are see-through white instead of cream**: the syringe fill, the vial meter and the weight graph. Warnings are still amber and over-capacity is still red, because those carry meaning.
- **Haptics:** on iOS 18+ Safari, toggling a native `<input switch>` gives a system haptic tick. Every button tap clicks a hidden one, so you feel a light tick. There's a "Haptics" switch in Settings next to "Sounds". On other platforms it does nothing.

## Calculator
- **Check mode only.** The plan / water-to-add mode is gone from the screen. `plan()` and its spec tests stay in `calc.ts`, since the spec still covers them.
- **The result and the inputs are one card**: units, the working, the syringe bar and the strength / full doses / leftover, then vial, water and dose (with quick-pick chips) and an optional peptide name.
- **The syringe card and BAC bottle setting are gone.** Syringe type and capacity are now only in Settings. The default is U-100, 1 mL.
- **U-40 syringes are assumed to be marked every 1 unit.** U-100 1 mL is marked every 2 units, and 0.3 / 0.5 mL every 1 unit.
- **Warnings show amber inside the card.** They never block anything. The "between marks" warning is one of them.
- **"Save as my vial"** stores `settings.savedVial`. The vial itself is created when you log a jab with "Reconstituted a new vial today" switched on.
- **The disclaimer** sits just above the nav bar on the Calculator tab.

## Jabs
- **It's a list now, not a calendar**: jabs grouped by month, newest first. Tap one to edit or delete it. A ring icon marks a new-vial jab. The active vial card is at the top.
- **You can log more than one jab a day.**
- **The new-vial toggle is on by default** when there's no active vial. Its fields are prefilled from `savedVial` and can be edited.
- **Units are prefilled** from the saved vial. **Dose (mg)** is worked out from the vial's strength until you edit it; a chip puts the worked-out value back.
- **The vial is created when the jab is first saved.** Editing a jab never changes vials.
- **`vials.doseMg` (optional) was added** so "jabs left" knows the planned dose.

## Body
- **Weight is required on every entry. The photo is optional.** A photo is always attached to a weight entry.
- **There are two photo buttons, Camera and Library.** On iOS, `capture` forces the camera, so the spec's single input would block the library.
- **Compare:** tap "Compare", pick any two photos, and they open side by side, oldest on the left.
- **The weight graph is the first thing on the page**, with kg gridlines and the first and last dates. It always shows: an empty frame before you've logged anything, then a single dot. The x-axis is real dates, and the y-axis covers at least 2 kg so a flat line stays readable.

## Data / backup
- **Export uses the iOS share sheet** (`navigator.share` with a file), so you can choose "Save to Files". It falls back to a download where share isn't available. Cancelling the share sheet doesn't count as a backup.
- **Import replaces all data** after a confirm. It's checked first (`app: "dose"`, every table must be an array, photos must be inline `data:image/` URLs). A bad file throws and changes nothing.
- **Settings shows "Last backup: N days ago"** and turns amber after 14 days or if you've never backed up.
- **`navigator.storage.persist()` runs on every launch** (it's harmless to repeat). The result shows in Settings.
- **Booleans can't be indexed in IndexedDB**, so `vials.active` is filtered in memory.

## Build / deploy
- **TypeScript is checked with `tsc --noEmit`.** `tsc -b` isn't needed with no project references.
- **Base path is `/dose/` for production builds** by default. The GitHub Action sets `BASE=/<repo-name>/`, so any repo name works. Use `BASE=/` for a custom domain.
- **Icons are generated by `scripts/make-icons.mjs`** (a warm gradient with a cream droplet, no dependencies). Re-run it to regenerate.
- **The service worker auto-updates.** The whole app is precached, so it works offline.

## Round 5: iOS 26 Liquid Glass, jab countdown
- **No top header.** The logo/name bar and its top fade are gone. The greeting and date head Home, with Settings as a glass button beside them (Settings is reached from Home only).
- **Bottom edge only.** The dark fade under the tab bar is now a progressive blur (iOS 26 "scroll edge" effect): one masked `backdrop-filter` layer that still swallows taps.
- **Liquid Glass look.** Cards and buttons are brighter, thicker frosted glass with a specular rim (a 1px masked gradient: light at top-left and bottom-right, clear on the sides) and a faint inner glow. Card blur is still off for speed: over a smooth gradient it would look the same.
- **Tab bar.** Lighter glass capsule; the selected tab is a single glass "lens" that slides between tabs with the page, like iOS 26.
- **Jab countdown.** Home leads with "Next jab": days to go (Today / Tomorrow / n days late in amber), due date and a progress ring. Interval is per peptide (Settings → Jab schedule, keyed by peptide name, default 7 days; with no vials saved it shows "Reta"). Peptide comes from the active vial, else the last jab's vial, else Reta. Maths is `nextJab` in `calc.ts` (UTC day counting, so no DST drift).
- **Icon:** paused while Gus picks a direction; the old glass-D `Logo` component is deleted.

## Round 6: clear glass, smaller type, measure-marks icon
- **Icon:** "measure marks" — three white rounded bars, shortening and fading like syringe graduations, on one flat terracotta (#B0573A), no gradient. `scripts/make-icons.mjs` renders the PNGs; `public/favicon.svg` matches.
- **Disclaimer removed** from the calculator, at Gus's request.
- **Clear glass** (reference: a near-transparent card on a cloud photo): card fill is almost nothing; the shape comes from a 1.5px specular rim, bright at top-left and bottom-right corners. Buttons and chips get the same rim with a faint warm-dark tint.
- **Parallax shine:** a second highlight layer in the rim slides along the edge as each card scrolls, using a CSS scroll-driven animation (`animation-timeline: view()`). Where that isn't supported (older iOS) the rim is just static.
- **Type scaled down and lightened:** title 26/600, big numbers 30/500, calculator hero 52/500, buttons 14/500 at 44px tall, labels 12px. Inputs stay 16px+ so iOS doesn't zoom on focus.

## Round 7: vertical marks icon, livelier backgrounds
- **Icon:** eight evenly spaced vertical graduations on one baseline, in the U-100 rhythm `i I i i i i I i` (a mark every 2 units, a long mark every 10). Same flat #B0573A.
- **Home has its own palette** (dusk: coral, rose, violet over plum); it used to share Calculator's.
- **Backgrounds move:** each tab has a base wash plus two floating colour sets (`::before` / `::after`) that drift, rotate and scale on 23s and 31s cycles that don't line up, so the field keeps changing. Transform-only on pre-painted layers; the hidden tabs' animations are paused and reduced-motion stops them.

## Round 8: syringe glyph icon
- **Icon:** a white syringe glyph at 45° (needle bottom-left) on the same flat #B0573A: thumb pad, rod, finger flange, outlined barrel with two graduations, stopper and liquid, hub, needle. Replaces the measure-marks icon. `scripts/make-icons.mjs` now writes `favicon.svg` from the same parts list so the two always match.
