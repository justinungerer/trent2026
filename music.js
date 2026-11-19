'use strict';
const soundtrack = document.getElementById('soundtrack');
const turnGate = document.getElementById('turn-gate');
const musicButton = document.getElementById('music');
soundtrack.volume = 0.35;
let wantsMusic = true;
let musicSegment = 'opening';
let segmentTrack = '01-jingle-bells.mp3';
let beforeBoss = null;
const playlistPlayer = window.TrentPlaylist.createPlayer(soundtrack, function () {
  return wantsMusic && !musicBlocked();
}, function () { return segmentTrack; });

function musicBlocked() {
  return document.hidden || !turnGate.hidden;
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

// A segment spans its film, instructions, gameplay, and completion screens.
// Keeping the same key preserves the source and playback position on retries.
function startMusicSegment(key, fixedTrack) {
  if (musicSegment === key) { syncMusic(); return; }
  musicSegment = key;
  segmentTrack = fixedTrack || null;
  playlistPlayer.next();
}

function startBossMusic() {
  if (!beforeBoss) beforeBoss = { segment: musicSegment, track: soundtrack.src };
  startMusicSegment('boss:chimney', window.TrentPlaylist.bossFile);
}

function endBossMusic() {
  if (!beforeBoss) return;
  const previous = beforeBoss;
  beforeBoss = null;
  if (musicSegment === 'boss:chimney') startMusicSegment(previous.segment, previous.track);
}

window.TrentMusic = {
  startBoss: startBossMusic,
  endBoss: endBossMusic,
  enabled: function () { return wantsMusic; },
  sync: syncMusic,
  startScene: syncMusic,
  startChapter: function (id) { startMusicSegment('chapter:' + id); },
  startLevel: function (chapterId, levelId) { startMusicSegment('level:' + chapterId + ':' + levelId); },
  startIntro: function (filmId) {
    if (filmId === 'cast' || filmId === 'opening') startMusicSegment('opening', '01-jingle-bells.mp3');
    else if (filmId === 'ending') startMusicSegment('ending');
    else startMusicSegment('chapter:' + filmId);
  },
  stopIntro: syncMusic
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
