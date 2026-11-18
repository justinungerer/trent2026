'use strict';
const soundtrack = document.getElementById('soundtrack');
const turnGate = document.getElementById('turn-gate');
const musicButton = document.getElementById('music');
soundtrack.volume = 0.35;
let wantsMusic = true;
let introPlaying = false;
const playlistPlayer = window.TrentPlaylist.createPlayer(soundtrack, function () {
  return wantsMusic && !musicBlocked();
});

function musicBlocked() {
  return document.hidden || document.body.classList.contains('playing') || !turnGate.hidden;
}

function updateMusic() {
  musicButton.textContent = wantsMusic ? 'Music on' : 'Music off';
  musicButton.setAttribute('aria-pressed', String(wantsMusic));
}

function syncMusic() {
  if (!wantsMusic || musicBlocked()) {
    soundtrack.pause();
    return;
  }
  playlistPlayer.sync();
}

musicButton.onclick = function () {
  wantsMusic = !wantsMusic;
  syncMusic();
  updateMusic();
  window.dispatchEvent(new Event('trent:musicchange'));
};

document.addEventListener('pointerdown', syncMusic);
document.addEventListener('keydown', syncMusic);
document.addEventListener('visibilitychange', syncMusic);

window.TrentMusic = {
  enabled: function () { return wantsMusic; },
  startScene: function () {
    introPlaying = false;
    playlistPlayer.next();
  },
  startIntro: function () {
    introPlaying = true;
    playlistPlayer.next();
  },
  stopIntro: function () {
    if (!introPlaying) return;
    introPlaying = false;
    playlistPlayer.next();
  }
};

window.TrentSfx = {
  play: function (kind) {
    var clip = new Audio('./assets/audio/campaign-' + kind + '.wav');
    clip.volume = 0.55;
    clip.play().catch(function () {});
  }
};

const musicObserver = new MutationObserver(syncMusic);
musicObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
musicObserver.observe(turnGate, { attributes: true, attributeFilter: ['hidden'] });
updateMusic();
playlistPlayer.next();
