'use strict';

(function () {
  var base = new URL('./assets/audio/christmas-metal/playlist-songs/', document.currentScript.src);
  var files = [
    '01-jingle-bells.mp3',
    '02-christ-was-born-on-christmas.mp3',
    '03-deck-the-halls.mp3',
    '04-little-drummer-boy.mp3',
    '05-emmanuel.mp3',
    '06-frosty-the-snowman.mp3',
    '07-grandma-got-run-over-by-a-reindeer.mp3',
    '09-the-twelve-days-of-christmas.mp3',
    '10-jingle-bell-rock.mp3',
    '11-jolly-old-saint-nicholas.mp3',
    '12-let-it-snow.mp3',
    '13-o-little-town-of-bethlehem.mp3',
    '14-its-the-most-wonderful-time-of-the-year.mp3',
    '15-santa-claus-is-coming-to-town.mp3',
    '16-rockin-around-the-christmas-tree.mp3',
    '17-rudolph-the-red-nosed-reindeer.mp3',
    '18-silent-night.mp3'
  ];

  function createPlayer(audio, canPlay, selectFile) {
    audio.loop = false;
    audio.preload = 'metadata';

    function sync() {
      if (!canPlay()) audio.pause();
      else if (audio.paused && audio.getAttribute('src')) audio.play().catch(function () {});
    }

    function next() {
      audio.pause();
      var selected = selectFile && selectFile();
      audio.src = new URL(selected || files[Math.floor(Math.random() * files.length)], base).href;
      sync();
    }

    audio.addEventListener('ended', next);
    return { next: next, sync: sync };
  }

  window.TrentPlaylist = { files: files.slice(), createPlayer: createPlayer };
})();
