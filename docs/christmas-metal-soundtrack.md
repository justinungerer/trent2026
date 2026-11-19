# Christmas playlist soundtrack

Background music in Trent Saves Christmas uses the 17 MP3s in `assets/audio/christmas-metal/playlist-songs/`. Chapter and minigame-level selections are random across the playlist, avoiding the immediately preceding song. The opening sequence uses Jingle Bells.

## Playback

The cast introductions, scrolling opening credits, title screen, and opening story film share `01-jingle-bells.mp3` without restarting it between screens. This replaces the former Let It Snow override for the opening story film.

A new random song is selected only when a chapter starts, when a new minigame level starts, or when the closing movie starts. A chapter's song continues through its opening film and quiz. A level's song begins with its introductory film and continues through instructions, gameplay, results, and the chapter password screen. Menus, film cleanup, retries of the same level, quiz transitions, and restored-Christmas credits keep the current song and playback position. Restarting a minigame from a later level changes to its first level's segment.

Songs loop when they finish. Pausing for phone rotation, hiding the tab, or toggling music preserves playback position. The closing movie starts its own selection, which continues through the final completion screen.

## Integration

`playlist.js` owns the 17 filenames, resolves URLs from the script location, and loops the selected track. `music.js` owns one persistent campaign audio element and identifies chapter/level/opening/ending segments. Repeated requests for the same segment do not reload audio. `campaign.js` explicitly marks chapter and level boundaries.

Embedded minigames reuse the parent campaign player through `TrentMusic.sync`, so their films and gameplay share one continuous audio element. Standalone minigame pages use their own looping player and preserve it across retries. The shared music toggle controls campaign and embedded gameplay. Video elements remain muted. Playback follows browser interaction requirements.

Short gameplay sound effects use the existing WAV files and their separate players.

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

## Validation

WebKit phone tests cover the shared opening song, exact source-load counts and retained playback positions across film cleanup, quizzes, menus, retries, next levels, and the ending. All 11 embedded games reuse the parent player, and all 11 standalone games keep their song across retries and loop it. Separate tests with actual MP3 decoding over a local range-capable HTTP server verified increasing playback time through cast-to-credits, chapter-film-to-quiz, and level-film-to-embedded-game transitions, plus mute/resume. No browser errors occurred.
