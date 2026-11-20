# Wrapping Line art sources

These paintings were generated for this repository. They are original artwork for this game, not a third-party license.

## trent.webp

Horizontal strip of equal frames on a transparent background. The feet share one baseline.

- Frame width: 302 px
- Frame height: 676 px
- Frame count: 5
- Order: idle, idle, bow held up, bow pressed down, hands open after the bow.
- Anchor: (127, 666) in every frame, at the feet. X is the center of the soles. Y is the shared sole baseline.
- Milliseconds per frame:
  - idle: 520
  - bow: a one-shot of three frames, 120 ms each, played when a good present is met

## scene.webp

Painted workshop, opaque. 1280 × 720 px. A belt bench, ribbon spools, garland, and a snowy window. No people and no readable text.

## parcel.webp

One wrapped parcel on a transparent background, 420 × 418 px. Brown paper and twine, no bow. The bow is drawn when a good present is met. The feet of this sprite are not a character anchor; draw it by its center. The scored presents below are separate pictures. This parcel is not one of those five.

## Scored presents

Five original paintings, one present each, on a transparent background. They were generated as painted props, then the flat magenta backdrop was removed. Draw each by its center. None of them is a character. The two damaged presents are torn or crushed packages, not green figures.

| File | Pixels | Points | What it shows |
| --- | --- | --- | --- |
| present-plain.webp | 394 × 412 | +1 | Kraft paper, twine, and a red snowflake seal. |
| present-ribbon.webp | 403 × 412 | +3 | Crimson paper, gold sprigs, and a green bow. |
| present-gilt.webp | 373 × 413 | +5 | Gold paper, a cream band, a crimson bow, and holly. |
| present-torn.webp | 412 × 409 | −1 | Kraft paper ripped open, with cardboard and loose tape showing. |
| present-crushed.webp | 411 × 411 | −3 | A squashed red package, split at the seam, with slack twine. |

If a picture has not loaded, the belt paints a matching stand-in: kraft, crimson with a green cross, gold with a red bow, a torn kraft box, or a flattened red box.

## Targeting bow

The built-in image generator produced `targeting-bow.webp` from this prompt.

> One isolated, hand-painted gift ribbon bow for a vintage Christmas workshop side-scrolling game. A broad open bow with two equal side loops, a prominent central knot at the exact center of the image, and short tails curling below. Deep jewel-red satin, fine cream-gold edging and warm golden highlights, clear bold silhouette and textured gouache brushwork. Front view, evenly lit, horizontally centered, fully contained with small clear margins. Keep the bow readable at 70 pixels wide. Wide 3:2 composition, genuine transparent alpha background. Only the ribbon bow. No package, cast shadow, letters, numbers, outlines, border, or UI.
