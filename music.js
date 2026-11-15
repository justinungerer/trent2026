'use strict';
const soundtrack = document.getElementById('soundtrack');
const turnGate = document.getElementById('turn-gate');
const musicButton = document.getElementById('music');
const campaignTrack = soundtrack.getAttribute('src');
soundtrack.volume = 0.35;
let wantsMusic = true;
let introPlaying = false;
let campaignTime = 0;

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

window.TrentMusic = {
  startIntro: function (chapterId) {
    if (!introPlaying) campaignTime = soundtrack.currentTime;
    introPlaying = true;
    soundtrack.loop = false;
    soundtrack.src = './assets/audio/christmas-metal/intros/' + chapterId + '.mp3';
    syncMusic();
  },
  stopIntro: function () {
    if (!introPlaying) return;
    introPlaying = false;
    soundtrack.pause();
    soundtrack.loop = true;
    soundtrack.src = campaignTrack;
    soundtrack.currentTime = campaignTime;
    queueMicrotask(syncMusic);
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
