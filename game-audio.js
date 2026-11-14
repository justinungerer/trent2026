'use strict';
(function () {
  var name = document.documentElement.getAttribute('data-game');
  if (!name) return;
  var base = '../assets/audio/' + name;
  var music = new Audio(base + '.wav');
  var on = true;
  music.loop = true;
  music.volume = 0.35;
  music.preload = 'auto';

  function start() {
    if (on) music.play().catch(function () {});
  }

  document.addEventListener('pointerdown', start);
  document.addEventListener('keydown', start);
  window.addEventListener('pagehide', function () { music.pause(); });

  window.TrentSfx = {
    play: function (kind) {
      var clip = new Audio(base + '-' + kind + '.wav');
      clip.volume = 0.55;
      clip.play().catch(function () {});
    }
  };
})();
