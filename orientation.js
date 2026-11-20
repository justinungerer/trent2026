'use strict';

(function () {
  var host = null;
  if (window.parent !== window) {
    try { host = window.parent.TrentOrientation; } catch (error) {}
  }
  var game = typeof document === 'undefined' ? null : document.documentElement.getAttribute('data-game');
  var readingInstructions = Boolean(game);

  var pointer = window.matchMedia('(pointer: coarse)');
  var viewport = window.matchMedia('(orientation: portrait)');
  var screenOrientation = window.screen.orientation;

  function isPortrait() {
    // iOS can resize the viewport for browser controls while the phone stays put.
    if (typeof window.orientation === 'number') return window.orientation % 180 === 0;
    var type = screenOrientation && screenOrientation.type;
    if (type && /^(portrait|landscape)-/.test(type)) return type.indexOf('portrait-') === 0;
    return viewport.matches;
  }

  function rotationNeeded(landscape) {
    if (host) return host.blocked(landscape);
    var phone = pointer.matches || (navigator.maxTouchPoints > 0 && typeof window.orientation === 'number');
    return phone && isPortrait() === landscape;
  }

  function blocked(landscape) {
    return !readingInstructions && rotationNeeded(landscape);
  }

  function subscribe(listener) {
    if (host) {
      var stop = host.subscribe(listener);
      window.addEventListener('pagehide', function onHide(event) {
        if (event.persisted) return;
        stop();
        window.removeEventListener('pagehide', onHide);
      });
      return stop;
    }
    var targets = [[window, 'resize'], [window, 'orientationchange'], [pointer, 'change'], [viewport, 'change']];
    if (screenOrientation && screenOrientation.addEventListener) targets.push([screenOrientation, 'change']);
    targets.forEach(function (entry) { entry[0].addEventListener(entry[1], listener); });
    return function () {
      targets.forEach(function (entry) { entry[0].removeEventListener(entry[1], listener); });
    };
  }

  function gameUsesLandscape(game) {
    return game !== 'frosted-skies';
  }

  window.TrentOrientation = {
    blocked: blocked, subscribe: subscribe, embedded: Boolean(host), gameUsesLandscape: gameUsesLandscape
  };

  if (!game) return;
  var root = document.documentElement;
  var stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('game-instructions.css?v=portrait', document.currentScript.src).href;
  document.head.appendChild(stylesheet);
  root.classList.add('reading-game-instructions');

  var pendingStart = null;
  var briefingGate = null;
  var gameScreen = document.querySelector('main');
  if (!host) {
    briefingGate = document.createElement('div');
    briefingGate.className = 'briefing-turn';
    briefingGate.hidden = true;
    briefingGate.tabIndex = -1;
    briefingGate.innerHTML = '<h1>Turn your phone upright</h1><p>Read the minigame instructions in portrait.</p>';
    document.body.appendChild(briefingGate);
  }

  function syncBriefing() {
    if (briefingGate) {
      var wait = readingInstructions && rotationNeeded(false);
      if (briefingGate.hidden === wait) {
        briefingGate.hidden = !wait;
        if (gameScreen) gameScreen.inert = wait;
        if (wait) briefingGate.focus({ preventScroll: true });
      }
    }
    if (pendingStart && !rotationNeeded(gameUsesLandscape(game))) {
      var button = pendingStart;
      pendingStart = null;
      button.click();
    }
  }

  document.addEventListener('click', function (event) {
    if (!readingInstructions) return;
    var button = event.target.closest('button:is(#start, #action, #box-start)');
    if (!button) return;
    if (rotationNeeded(false) || (host && host.acceptMissionInstructions && !host.acceptMissionInstructions(window))) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    readingInstructions = false;
    root.classList.remove('reading-game-instructions');
    if (rotationNeeded(gameUsesLandscape(game))) {
      event.preventDefault();
      event.stopImmediatePropagation();
      pendingStart = button;
      if (!host) window.dispatchEvent(new Event('orientationchange'));
    }
  }, true);
  subscribe(syncBriefing);
  syncBriefing();
})();
