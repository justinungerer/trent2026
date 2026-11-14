# Ending

The ending is a video file: `assets/ending.mp4` (about 7.2 MB).

It is one short silent clip, about eight seconds, 16:9, 720p. A painted sleigh flies home over a snowy village, then Christmas morning is restored at a cottage with a lit tree. No blood and no insignia. It is not one of the chapter intros. Those stay on the existing painted sprites.

Chimney Road does not issue a continue code. When that minigame is won, the page shows a card. The video source is set and playback starts only after the player taps **Play the ending**. The element uses `playsinline` and `webkit-playsinline`, is muted, and the page never calls fullscreen. A Skip control leaves the clip for the restored card.
