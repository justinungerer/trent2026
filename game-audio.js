'use strict';
(function () {
  var name = document.documentElement.getAttribute('data-game');
  if (!name) return;
  var base = '../assets/audio/' + name;
  var music = new Audio('../assets/audio/christmas-metal/' + name + '.mp3?v=carol-metal1');
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

  if (!document.getElementById('portrait')) {
    var gate = document.createElement('div');
    var mark = document.createElement('div');
    var heading = document.createElement('h1');
    var note = document.createElement('p');
    gate.id = 'turn-gate';
    gate.hidden = true;
    mark.className = 'rotate-mark';
    mark.setAttribute('aria-hidden', 'true');
    heading.textContent = 'Turn the screen sideways';
    note.textContent = 'This part stays paused until the phone is landscape.';
    gate.appendChild(mark);
    gate.appendChild(heading);
    gate.appendChild(note);
    var style = document.createElement('style');
    style.textContent = '#turn-gate{position:fixed;inset:0;z-index:40;display:grid;place-items:center;align-content:center;gap:12px;background:#0c171e;color:#f8ecd4;text-align:center;padding:24px}#turn-gate[hidden]{display:none!important}#turn-gate .rotate-mark{width:92px;height:148px;border:8px solid #f8ecd4;border-radius:16px;transform:rotate(90deg)}';
    document.head.appendChild(style);
    var held = false;
    function landscape() {
      var portrait = window.innerHeight > window.innerWidth + 20;
      var pause = document.getElementById('pause');
      gate.hidden = !portrait;
      if (portrait && pause && !held) {
        pause.click();
        held = true;
      } else if (!portrait && held) {
        held = false;
        if (pause) pause.click();
      }
    }
    window.addEventListener('resize', landscape);
    window.addEventListener('orientationchange', landscape);
    landscape();
  }

  window.TrentSfx = {
    play: function (kind) {
      var clip = new Audio(base + '-' + kind + '.wav');
      clip.volume = 0.55;
      clip.play().catch(function () {});
    }
  };
})();
