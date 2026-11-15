'use strict';

let activeRun = null;

function launchMission(loadout) {
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
  activeRun = String(Date.now()) + '-' + Math.random().toString(36).slice(2);
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
    activeRun = null;
    if (window.TrentCampaign && typeof window.TrentCampaign.onShelfWon === 'function') {
      window.TrentCampaign.onShelfWon();
    }
  }
});

// Score out of 10 selects the existing Ribbonfall switches: charges, reload, ribbon.
// A finished round can earn a score from 0 to 10.
// 0–3 correct: charges 2, slow, plain. 4–6: charges 4, slow, plain.
// 7–8: charges 4, fast, plain. 9–10: charges 4, fast, enchanted.
function loadoutFromScore(correct) {
  const score = Number(correct) || 0;
  return {
    charges: score >= 4 ? '4' : '2',
    reload: score >= 7 ? 'fast' : 'slow',
    ribbon: score >= 9 ? 'enchanted' : 'plain'
  };
}

window.TrentChapter6 = {
  loadoutFromScore: loadoutFromScore,
  startMission: function (correct) {
    launchMission(loadoutFromScore(correct));
  }
};
