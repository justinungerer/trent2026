'use strict';
(function () {
  var name = document.documentElement.getAttribute('data-game');
  if (!name) return;
  var base = '../assets/audio/' + name;
  var music = new Audio('../assets/audio/christmas-metal/' + name + '.mp3?v=carol-metal1');
  var wantsMusic = false;
  var gate = null;
  var orientation = window.TrentOrientation;
  music.loop = true;
  music.volume = 0.35;
  music.preload = 'auto';

  function blocked() {
    return orientation.blocked(true);
  }
  window.TrentGameOrientation = { blocked: blocked };

  function sync() {
    var waiting = blocked();
    if (gate && gate.hidden === waiting) {
      gate.hidden = !waiting;
      for (var child of document.body.children) {
        if (child !== gate && child.tagName !== 'SCRIPT') child.inert = waiting;
      }
      if (waiting) gate.focus({ preventScroll: true });
    }
    if (waiting || document.hidden || !wantsMusic) music.pause();
    else if (music.paused) music.play().catch(function () {});
  }

  function start() {
    if (blocked()) return;
    wantsMusic = true;
    sync();
  }

  if (!orientation.embedded && !document.getElementById('portrait')) {
    gate = document.createElement('div');
    gate.id = 'turn-gate';
    gate.hidden = true;
    gate.tabIndex = -1;
    gate.innerHTML = '<div class="rotate-mark" aria-hidden="true"></div>' +
      '<h1>Turn your phone sideways</h1><p>Minigames play in landscape.</p>';
    var style = document.createElement('style');
    style.textContent = '#turn-gate{position:fixed;inset:0;z-index:80;display:grid;place-items:center;align-content:center;gap:12px;background:#0c171e;color:#f8ecd4;text-align:center;padding:24px}#turn-gate[hidden]{display:none!important}#turn-gate h1,#turn-gate p{margin:0}#turn-gate .rotate-mark{width:92px;height:148px;border:8px solid #f8ecd4;border-radius:16px;transform:rotate(90deg)}';
    document.head.appendChild(style);
    document.body.appendChild(gate);
  }

  window.addEventListener('keydown', function (event) {
    if (blocked()) event.stopImmediatePropagation();
  }, true);
  document.addEventListener('pointerdown', start);
  document.addEventListener('keydown', start);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', function () { music.pause(); });
  orientation.subscribe(sync);
  sync();

  window.TrentSfx = {
    play: function (kind) {
      var clip = new Audio(base + '-' + kind + '.wav');
      clip.volume = 0.55;
      clip.play().catch(function () {});
    }
  };
})();
