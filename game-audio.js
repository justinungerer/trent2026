'use strict';
(function () {
  var name = document.documentElement.getAttribute('data-game');
  if (!name) return;
  var base = '../assets/audio/' + name;
  var campaignMusic = null;
  try {
    if (window.parent !== window && window.parent.TrentMusic && window.parent.TrentMusic.sync) {
      campaignMusic = window.parent.TrentMusic;
    }
  } catch (error) {}
  var music = campaignMusic ? null : new Audio();
  var wantsMusic = false;
  var bossMusic = false;
  var previousTrack = null;
  var gate = null;
  var orientation = window.TrentOrientation;
  var landscape = orientation.gameUsesLandscape(name);
  if (music) music.volume = 0.35;
  var player = campaignMusic ? { sync: campaignMusic.sync } : window.TrentPlaylist.createPlayer(music, function () {
    return !document.hidden && wantsMusic && parentMusicEnabled();
  }, function () {
    return bossMusic ? window.TrentPlaylist.bossFile : previousTrack;
  });

  function setBossMusic(active) {
    if (campaignMusic) {
      if (active) campaignMusic.startBoss();
      else campaignMusic.endBoss();
      return;
    }
    if (bossMusic === active) {
      sync();
      return;
    }
    if (active) previousTrack = music.src;
    bossMusic = active;
    player.next();
    if (!active) previousTrack = null;
  }

  if (name === 'chimney-road') {
    window.addEventListener('trent:boss-music', function (event) { setBossMusic(event.detail); });
  }

  function parentMusicEnabled() {
    try {
      return window.parent === window || !window.parent.TrentMusic || window.parent.TrentMusic.enabled();
    } catch (error) {
      return true;
    }
  }

  function blocked() {
    return orientation.blocked(landscape);
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
    player.sync();
  }

  function start(event) {
    if (blocked()) return;
    wantsMusic = true;
    sync();
  }

  if (!orientation.embedded && !document.getElementById('portrait')) {
    gate = document.createElement('div');
    gate.id = 'turn-gate';
    gate.hidden = true;
    gate.tabIndex = -1;
    gate.classList.toggle('upright', !landscape);
    gate.innerHTML = '<div class="rotate-mark" aria-hidden="true"></div>' +
      (landscape ? '<h1>Turn your phone sideways</h1><p>This minigame plays in landscape.</p>' :
        '<h1>Turn your phone upright</h1><p>Frosted Skies plays in portrait.</p>');
    var style = document.createElement('style');
    style.textContent = '#turn-gate{position:fixed;inset:0;z-index:80;display:grid;place-items:center;align-content:center;gap:12px;background:#0c171e;color:#f8ecd4;text-align:center;padding:24px}#turn-gate[hidden]{display:none!important}#turn-gate h1,#turn-gate p{margin:0}#turn-gate .rotate-mark{width:92px;height:148px;border:8px solid #f8ecd4;border-radius:16px;transform:rotate(90deg)}#turn-gate.upright .rotate-mark{transform:none}';
    document.head.appendChild(style);
    document.body.appendChild(gate);
  }

  window.addEventListener('keydown', function (event) {
    if (blocked()) event.stopImmediatePropagation();
  }, true);
  document.addEventListener('pointerdown', start);
  document.addEventListener('keydown', start);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', function () {
    if (music) music.pause();
    if (window.parent !== window) {
      try { window.parent.removeEventListener('trent:musicchange', sync); } catch (error) {}
    }
  });
  window.addEventListener('pageshow', function () {
    if (window.parent !== window) {
      try { window.parent.addEventListener('trent:musicchange', sync); } catch (error) {}
    }
    sync();
  });
  orientation.subscribe(sync);
  if (window.parent !== window) {
    try { window.parent.addEventListener('trent:musicchange', sync); } catch (error) {}
  }
  if (!campaignMusic) player.next();
  sync();

  window.TrentSfx = {
    play: function (kind) {
      var clip = new Audio(base + '-' + kind + '.wav');
      clip.volume = 0.55;
      clip.play().catch(function () {});
    }
  };
})();
