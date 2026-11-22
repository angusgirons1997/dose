# One-shot prompt — paste this into Claude Code from inside this folder

Build me a mobile-first iPhone home-screen web app (PWA) called **Dose** in this folder. Read `CLAUDE.md`, `docs/design-spec.md`, `docs/calculator-spec.md` and every image in `reference/` before writing any code — the images are the visual target and the specs are the source of truth.

**Stack:** Vite + React + TypeScript, plain CSS (CSS variables, no Tailwind), Dexie (IndexedDB) for all data including photos, `vite-plugin-pwa` for install/offline. No backend, no accounts, no analytics. Everything stays on the device.

**Three tabs (bottom floating glass tab bar):**

1. **Calculator** — reconstitution calculator exactly as specified in `docs/calculator-spec.md`. Two modes: *Plan* (vial mg + target dose mg + target units → how much BAC water to add) and *Check* (vial mg + water already added + target dose mg → units to draw). Settings for syringe type (U-100 default, U-40 option) and syringe capacity (0.3 / 0.5 / 1.0 mL). Show the result huge, the working underneath in small text, a visual syringe fill bar, doses per vial and the leftover. "Save as my vial" stores the current reconstitution so the tracker can prefill from it.

2. **Jabs** — a simple month calendar. Tap a day to log: date, units taken, dose (mg, auto-calculated from the active vial's concentration but editable), and a "Reconstituted a new vial today" toggle. Days with a jab show a filled glass dot; new-vial days show a ring marker. Below the calendar: the last 5 jabs as glass pills, and an "active vial" card showing mg remaining and jabs left (based on logged jabs since the last reconstitution).

3. **Body** — weight tracker + progress photos. Log weight (kg) with date, optional photo (camera or library via `<input type="file" accept="image/*" capture>`). Show a minimal line chart of weight over time (hand-rolled SVG, no chart library), latest weight + change since start, and a photo grid by date with a side-by-side compare view (pick any two).

**Also:**
- A Settings sheet (top-right glass button): syringe defaults, units (kg only is fine), **Export backup** (JSON with photos base64-encoded) and **Import backup**. This matters because iOS can clear web storage — make export prominent.
- A small persistent footer line on the Calculator: "Calculator only — not medical advice. Check your maths."
- Unit tests (Vitest) for every calculator function, including the worked examples in `docs/calculator-spec.md`. All must pass.
- Deploy config for GitHub Pages (`base` path set, GitHub Actions workflow), plus the iOS meta tags and icons so it installs cleanly via Safari → Share → Add to Home Screen.

**Done means:** `npm run build` passes, `npm test` passes, the app runs at `npm run dev`, and you've checked it at 390×844 against the reference images (screenshot it if you can). Then give me a short summary and the exact steps to deploy and install it on my iPhone.

Don't ask me questions — make sensible calls, note them in `DECISIONS.md`.
