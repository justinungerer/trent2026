'use strict';

(function () {
  var bonus = new URLSearchParams(window.location.search).get('bonus');
  window.TrentMissionBonus = /^[1-3]$/.test(bonus || '') ? Number(bonus) : 0;
})();
