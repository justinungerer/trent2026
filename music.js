'use strict';
const soundtrack = document.getElementById('soundtrack');
const musicButton = document.getElementById('music');
soundtrack.volume = 0.35;
let wantsMusic = true;

function musicBlocked() {
  return document.hidden || document.body.classList.contains('playing');
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
  soundtrack.play().catch(function () {});
}

musicButton.onclick = function () {
  wantsMusic = !wantsMusic;
  syncMusic();
  updateMusic();
};

document.addEventListener('pointerdown', syncMusic);
document.addEventListener('keydown', syncMusic);
document.addEventListener('visibilitychange', syncMusic);

window.TrentSfx = {
  play: function (kind) {
    var clip = new Audio('./assets/audio/campaign-' + kind + '.wav');
    clip.volume = 0.55;
    clip.play().catch(function () {});
  }
};

new MutationObserver(syncMusic).observe(document.body, { attributes: true, attributeFilter: ['class'] });
updateMusic();
