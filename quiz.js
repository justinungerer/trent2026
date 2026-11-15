'use strict';

let activeRun = null;

function launchMission(loadout, level) {
  const url = new URL('./shelf-escape/', location.href);
  const params = {
    build: 'side6',
    charges: loadout.charges,
    reload: loadout.reload,
    ribbon: loadout.ribbon,
    parentOrigin: location.origin
  };
  Object.keys(params).forEach(function (key) {
    url.searchParams.set(key, params[key]);
  });
  activeRun = level.runId;
  url.searchParams.set('runId', activeRun);
  if (level.stage) url.searchParams.set('stage', level.stage);
  if (level.sequence) url.searchParams.set('sequence', String(level.sequence));
  window.TrentCampaign.openMissionFrame(url.href, 'Operation Ribbonfall');
}

window.addEventListener('message', function (event) {
  const frame = document.getElementById('game');
  if (!activeRun || event.origin !== location.origin || event.source !== frame.contentWindow) return;
  if (event.data?.version !== 1 || event.data.mission !== 'shelf-escape') return;
  if (event.data.type === 'trent:ready') {
    frame.contentWindow.postMessage({ type: 'trent:init', version: 1, runId: activeRun }, location.origin);
  }
  if (event.data.type === 'trent:complete' && event.data.runId === activeRun) {
    const completedRun = activeRun;
    activeRun = null;
    if (window.TrentCampaign && typeof window.TrentCampaign.onShelfWon === 'function') {
      window.TrentCampaign.onShelfWon(completedRun);
    }
  }
});

// Score out of 10 selects the existing Ribbonfall switches: charges, reload, ribbon.
// Eight right adds ammo, nine adds faster reload, and ten adds enchanted ribbon.
function loadoutFromScore(correct) {
  const score = Number(correct) || 0;
  return {
    charges: score >= 8 ? '4' : '2',
    reload: score >= 9 ? 'fast' : 'slow',
    ribbon: score >= 10 ? 'enchanted' : 'plain'
  };
}

window.TrentChapter6 = {
  loadoutFromScore: loadoutFromScore,
  startMission: function (correct, level) {
    launchMission(loadoutFromScore(correct), level);
  }
};
