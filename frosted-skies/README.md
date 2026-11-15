# Frosted Skies — Chapter 1 prototype

Open index.html in a browser or serve this folder through VS Code Live Server.
The game uses Canvas 2D to animate original raster sprites over an illustrated scrolling valley. There are no
dependencies, remote assets, or build steps.

Drag to steer the sleigh. The twin ribbon
cannons fire automatically. Dodge amber fire and collect cyan repair parcels.
The convoy flagship arrives at about 51 seconds. Tap Pause to take a break.

## Handoff

Copy this whole folder into the main project as a new directory. Test it at
/chapter-1/ (or the equivalent path under GitHub Pages) before connecting it
to the campaign. The standalone game dispatches a browser CustomEvent named
frosted-skies:complete on victory with detail {score, hull}. An iframe host can
add a bridge in the child to relay that result using postMessage and verify
the iframe source and expected origin in the parent. Quiz effects and saved
campaign progress are not wired into this prototype.

The wave schedule, boss HP, and speeds are in game.js. This short prototype
is designed to exercise the controls and combat loop before adding longer
chapter pacing, sound, and more enemy patterns.

## Illustrated edition

The art folder contains original generated WebP illustrations for the sleigh,
scout, flagship, and winter valley. Keep it beside index.html when copying the
prototype. Flight poses use transforms on painted sprites paired with animated
exhaust, muzzle flares, hit effects and gift wrap effects. The valley scrolls
beneath independent snow layers. Camera shake respects reduced-motion settings.

The art-direction pass adds aircraft hit rings and a ribbon lasso sequence
before defeated craft resolve into parcels. Reduced motion suppresses shake,
reduces snowfall density, and replaces hit blinking with a steady hull ring.
The aircraft still use the original generated sprites with runtime transforms.
