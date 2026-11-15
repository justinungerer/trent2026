'use strict';

(function () {
  var params = new URLSearchParams(location.search);
  var runId = params.get('runId');
  if (window.parent === window || !params.has('sequence') || !runId) return;

  function restartMinigame() {
    window.parent.postMessage({ type: 'trent:restart-minigame', runId: runId }, location.origin);
  }

  function addRestartButton(selector) {
    var retry = document.querySelector(selector);
    if (!retry) return;
    retry.textContent = 'Retry Level';
    var restart = document.createElement('button');
    restart.type = 'button';
    restart.className = 'ghost';
    restart.textContent = 'Restart Minigame';
    restart.addEventListener('click', restartMinigame);
    retry.after(restart);
  }

  addRestartButton('#pause-sheet #restart, #pause-sheet #give-up');
  addRestartButton('#lose-sheet #retry-lose, #out-sheet #out-retry, #lose-sheet #retry, #lose-sheet #again');
  var sharedSheetAction = document.querySelector('#sheet #action, #panel #start');
  if (sharedSheetAction) {
    var restart = document.createElement('button');
    restart.type = 'button';
    restart.id = 'restart-sequence';
    restart.textContent = 'Restart Minigame';
    restart.hidden = true;
    restart.addEventListener('click', restartMinigame);
    sharedSheetAction.after(restart);
  }
}());
