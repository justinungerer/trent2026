# Quiz UI worker status

**Stage:** ui

## Changes

- `index.html`: cache-bust `quiz.css` and `quiz.js` query strings to `?v=quizui1` (no other edits).
- `quiz.css`: removed Google Fonts `@import`; headings use local `"Arial Narrow", "Franklin Gothic Medium", Impact, sans-serif`; body uses system UI stack.
- Raised body copy contrast (`--text`, `--text-muted`) and capped line length with `--measure` on paragraphs and key blocks.
- Spacing scale and vertical rhythm across intro, question layout, result, loadout, failure, and chapter-complete `.result` sections.
- Header respects `env(safe-area-inset-*)`; mission music button uses bottom safe-area when `.playing`.
- `.primary` and `.choice` stay at least 48px tall; loadout 3-column grid tightens on tablet, single-column row layout under 480px.
- Question pane: flex column, progress bar slightly taller; mobile scene heights use clamp instead of fixed 300px.
- Preserved gold-on-dark palette, `:focus-visible` rings, and `prefers-reduced-motion` animation disable.
- Desktop `header`: `min-height: calc(64px + safe-area inset top)` so notch padding sits outside the 64px content row (not clipped inside fixed height).
- `.choice` `min-height` raised to `52px` so measured tap height clears ~48px on phone-width browsers.