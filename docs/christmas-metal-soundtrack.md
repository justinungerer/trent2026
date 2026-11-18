# Christmas playlist soundtrack

Background music in Trent Saves Christmas uses the 17 MP3s in `assets/audio/christmas-metal/playlist-songs/`. Each selection is random across the full playlist.

## Playback

A fresh song is chosen for every minigame level, replay or retry, every chapter film and level film, the ending film, the title credits, and campaign or quiz transitions. Songs that finish are followed by another random selection.

Pausing for phone rotation, hiding the tab, and toggling music resume the selected song. The campaign track pauses while the embedded minigame plays. The music toggle also controls embedded minigames.

## Integration

`playlist.js` owns the song filenames and resolves their URLs from the script location, so the same playlist works from the root page and minigame folders. `music.js` controls campaign, quiz, and cinematic music. `game-audio.js` controls minigame music. The opening and ending video elements remain muted while playlist audio plays.

Every game page loads `playlist.js` before its music controller. `campaign.js` starts a fresh selection when a film or scene starts. Song playback follows normal browser interaction requirements.

Short gameplay sound effects use the existing WAV files.

## Songs

- `01-jingle-bells.mp3`
- `02-christ-was-born-on-christmas.mp3`
- `03-deck-the-halls.mp3`
- `04-little-drummer-boy.mp3`
- `05-emmanuel.mp3`
- `06-frosty-the-snowman.mp3`
- `07-grandma-got-run-over-by-a-reindeer.mp3`
- `09-the-twelve-days-of-christmas.mp3`
- `10-jingle-bell-rock.mp3`
- `11-jolly-old-saint-nicholas.mp3`
- `12-let-it-snow.mp3`
- `13-o-little-town-of-bethlehem.mp3`
- `14-its-the-most-wonderful-time-of-the-year.mp3`
- `15-santa-claus-is-coming-to-town.mp3`
- `16-rockin-around-the-christmas-tree.mp3`
- `17-rudolph-the-red-nosed-reindeer.mp3`
- `18-silent-night.mp3`
