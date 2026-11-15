# Minigame monitor final report

- **Ended:** 2026-11-15T01:22:56.5282836Z (UTC)
- **Reason:** 3-hour timeout
- **Sample count:** 7
- **STUCK occurred:** yes
- **Repo monitored:** `c:\Users\justi\OneDrive\Documents\_Vibe coding\Trent 2026\trent2026-integration-64c5683287f6`

## Samples

- SAMPLE | 2026-11-15T00:47:44.2521395Z | CPU=39% | UsedMB=15597 | FreeMB=479 | git=0 node=1 python=1 | prologue_index=1 | minigame_dirs=chapter-2,chimney-road,frosted-skies,holding-camp,listening-wire,night-broadcast,prologue,shelf-escape,switch-tower,white-rail,wrapping-line
- SAMPLE | 2026-11-15T00:47:46.2308468Z | CPU=43% | UsedMB=15603 | FreeMB=473 | git=0 node=1 python=1 | prologue_index=1 | minigame_dirs=chapter-2,chimney-road,frosted-skies,holding-camp,listening-wire,night-broadcast,prologue,shelf-escape,switch-tower,white-rail,wrapping-line
- SAMPLE | 2026-11-15T01:02:47.6601080Z | CPU=53% | UsedMB=14942 | FreeMB=1134 | git=0 node=1 python=1 | prologue_index=1 | minigame_dirs=chapter-2,chimney-road,frosted-skies,holding-camp,listening-wire,night-broadcast,prologue,shelf-escape,switch-tower,white-rail,wrapping-line
- SAMPLE | 2026-11-15T01:02:49.5951647Z | CPU=55% | UsedMB=14925 | FreeMB=1151 | git=0 node=1 python=1 | prologue_index=1 | minigame_dirs=chapter-2,chimney-road,frosted-skies,holding-camp,listening-wire,night-broadcast,prologue,shelf-escape,switch-tower,white-rail,wrapping-line
- SAMPLE | 2026-11-15T01:17:51.1304205Z | CPU=19% | UsedMB=14527 | FreeMB=1549 | git=0 node=1 python=1 | prologue_index=1 | minigame_dirs=chapter-2,chimney-road,frosted-skies,holding-camp,listening-wire,night-broadcast,prologue,shelf-escape,switch-tower,white-rail,wrapping-line
- SAMPLE | 2026-11-15T01:17:53.1755865Z | CPU=26% | UsedMB=14345 | FreeMB=1731 | git=0 node=1 python=1 | prologue_index=1 | minigame_dirs=chapter-2,chimney-road,frosted-skies,holding-camp,listening-wire,night-broadcast,prologue,shelf-escape,switch-tower,white-rail,wrapping-line
- SAMPLE | 2026-11-15T01:22:54.5473528Z | CPU=30% | UsedMB=14251 | FreeMB=1825 | git=0 node=1 python=1 | prologue_index=1 | minigame_dirs=chapter-2,chimney-road,frosted-skies,holding-camp,listening-wire,night-broadcast,prologue,shelf-escape,switch-tower,white-rail,wrapping-line

## STUCK events

- STUCK | 2026-11-15T00:47:46.2278505Z | prologue/index.html and game.js mtimes unchanged for 15+ minutes
- STUCK | 2026-11-15T01:17:53.1715841Z | prologue/index.html and game.js mtimes unchanged for 15+ minutes
- STUCK | 2026-11-15T01:22:56.4248434Z | prologue/index.html and game.js mtimes unchanged for 15+ minutes

## Minigame-like folders (root dirs with index.html)

- `chapter-2/`
- `chimney-road/`
- `frosted-skies/`
- `holding-camp/`
- `listening-wire/`
- `night-broadcast/`
- `prologue/`
- `shelf-escape/`
- `switch-tower/`
- `white-rail/`
- `wrapping-line/`

## Gaps (vs CAMPAIGN-PLAN)

- chapter-1/ — planned per CAMPAIGN-PLAN, not present

## Notes

- Existing shipped minigames on integration main: `frosted-skies/`, `chapter-2/` (Special Delivery), `shelf-escape/` (Ribbonfall).
- First build target for this watch: `prologue/` D-Day beach advance.
- Did not modify git repo or `trent2026` checkout.
