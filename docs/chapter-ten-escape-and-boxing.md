# Chapter 10: expanded skyline and final fight

## Level changes

- Level 1 retains its chimney/double-jump lesson and lantern retrieval. Reaching the sleigh without the lantern still asks Trent to go back; it never teleports him.
- Level 2 has twice the previous vertical world span (3,480 world units), with repositioned roofs and markers. Painted stepping roofs connect the upper and lower paths. It now includes the final level's ordinary obstacle families: tall climbable chimneys, presents, a moving crate, rolling snowball, swinging lantern, smoke, falling icicles, and searchlights. Both markers remain required.
- Level 3 has four times the previous vertical span (6,960 units) and 1.5 times the horizontal length (12,870 units). Trent begins spotted. Bombs arrive every five active seconds, with a 2.2-second red target warning before impact. Authored snow roofs collapse; gold-braced reinforcement islands and stone switchback roofs remain. Checkpoints use permanent surfaces. Bombs can hurt Trent even when he stands on a permanent roof, so move away from their target.
- In all three levels, detection starts an immediate shot followed by one per second until Trent fully leaves the screen area where he was spotted. Solid roofs block bullets. Existing shots keep travelling after firing stops.

## Final encounter

Hitler stands beside the final sleigh. Contact opens a separate touch-controlled boxing encounter before campaign completion. The fight uses original painted rooftop art and character poses, with a historical portrait composited over the enemy's head, as approved when image generation rejected the requested likeness. His hairstyle and toothbrush moustache remain visible.

The opponent guards one side at a time. The game highlights the open punch, and an attack aimed at that side lands even if the guard changes during the animation. A correctly timed dodge or block creates a brief opening on both sides. The left punch is quicker and deals two damage, and the right punch deals three.

Trent starts with one star and earns another for every eight landed punches. An uppercut spends a star, deals six damage through either guard, and stuns the opponent for 1.5 seconds. His nose starts bleeding at half health and stays marked through the bout.

The opponent has 1,940 health and attacks more quickly as it falls. Losing offers a full-bout retry. Defeating him triggers the campaign completion and closing film. Music continues from the current level through the fight. A successful WebKit test bout took about five minutes. Pausing, hiding the tab, or turning the phone to portrait freezes fight progress. The quiz bonus grants fresh additional player health when retrying the bout.

## Verification

`tools/test-chimney-expansion.cjs` runs the local files through Playwright WebKit with mobile touch settings. It checks dimensions and objective placement, all ordinary obstacle families in level 2, actual movement/jump/climb reachability to both level-2 markers and the goal, and an actual movement route to the final roof after every destructible roof has been removed. It also verifies continuous gunfire and stopping outside the original screen, boss entry, guarded punches, a complete successful bout, full retry after defeat, pause, and victory progression.

Using the existing testing workspace from the repository directory in PowerShell:

```powershell
$env:NODE_PATH = (Resolve-Path '../iOS Safari Testing/node_modules').Path
$env:PLAYWRIGHT_BROWSERS_PATH = '0'
node tools/test-chimney-expansion.cjs
```

Playwright and its WebKit browser must be installed. This checks WebKit behavior rather than running Apple's iOS Safari itself. Additional existing lesson and lantern-return regressions passed. Artwork and touch-control layout were inspected at landscape sizes 568×320, 844×390, and 932×430.

Historical portrait credit and generated-asset prompts are in `chimney-road/art/ART-SOURCES.md`.

## Follow-up audit and menu access

The five recent gameplay requests were rechecked: (1) immediate gunfire on searchlight contact, with the later sustained-fire rule; (2) the first-run three-height chimney and double-jump lesson; (3) walking back for the dropped lantern instead of teleporting; (4) the larger level-2/3 maps and a completable bombed-roof escape, including the clarified 1.5× horizontal length; and (5) the final sleigh guardian and continuous five-minute boxing fight, including the approved historical-face/painted-body fallback. The associated movement, contact, tutorial, lantern, and full-fight checks passed.

Chapter 10 now has a **Final fight only** button whenever that chapter is unlocked. Earlier chapter passwords leave that button blank and disabled. The backdoor-only test level selector also includes **Final fight · Hitler guards the sleigh**, alongside the three rooftop levels. This is a practice entry, not a fourth campaign level. It skips the roof course, opens the fight instructions, uses landscape orientation, and returns to the same chapter menu on victory without awarding a completion password or showing the ending. Normal campaign play still reaches the fight by confronting the guardian on the final roof.

Run `node tools/test-final-fight-menu.cjs` with the same Playwright environment above. It exercises the locked/unlocked buttons, portrait-to-landscape handoff, direct fight introduction, a complete winning bout, return to the menu without completion rewards, and the test-level selector entry.
