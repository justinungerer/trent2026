'use strict';

(function () {
  var host = null;
  if (window.parent !== window) {
    try { host = window.parent.TrentOrientation; } catch (error) {}
  }

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

  function blocked(landscape) {
    if (host) return host.blocked(landscape);
    var phone = pointer.matches || (navigator.maxTouchPoints > 0 && typeof window.orientation === 'number');
    return phone && isPortrait() === landscape;
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
})();
