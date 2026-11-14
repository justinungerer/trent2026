# Shelf Escape

A standalone top-down stealth mission for Trent Saves Christmas. The depot has four continuous guard patrols, cover that blocks flashlight beams and detection, a limited-use thrown decoy, and a rescue followed by an escort to the exit.

## Run and host

Serve this folder over HTTP, for example with `python -m http.server 8000`, then open `http://localhost:8000`. In GitHub, put these files at the root of a new repository and enable Pages under **Settings → Pages → Deploy from a branch**, selecting the branch and root directory. The files use relative URLs, so they also work under a Pages repository subpath. No build or external runtime dependencies are required.

On a phone, drag the thumbstick with your left thumb and use Decoy with your right. On desktop, use WASD or the arrow keys and Space. The pause button also works on phones. Sound starts after selecting Sound on.

## Campaign integration

The mission plays standalone. To embed it, give an iframe the mission URL with the following query parameters.

| Parameter | Accepted values |
| --- | --- |
| `charges` | `1` or `2` (default) |
| `patrol` | `close` for faster guards, or omit for standard patrols |
| `parentOrigin` | Exact HTTPS origin of the campaign, URL-encoded, without a trailing slash |

The iframe sends `{type: 'trent:ready', version: 1, mission: 'shelf-escape'}`. The campaign should attach its listener before setting the iframe URL and verify both `event.source === iframe.contentWindow` and `event.origin === missionOrigin` on every message. On ready, send `{type: 'trent:init', version: 1, runId}` to the exact mission origin. When Trent reaches the hatch with Sprout, the iframe returns `{type: 'trent:complete', version: 1, mission: 'shelf-escape', runId, seconds, chargesUsed}`. Match the current run and process completion once. Catching Trent triggers a local retry and carries no quiz penalty.

For the first iPhone Safari test, check thumbstick and Decoy together, pause by switching apps, resume sound after returning, and complete the mission in the iframe as well as at its standalone URL.
