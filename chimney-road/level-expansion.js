'use strict';
(function () {
  window.TrentAddRoofTiers = function (roofs, mainRoofs, width) {
    mainRoofs.forEach(function (main, index) {
      var span = 196;
      var x = Math.max(14, Math.min(width - span - 14, main.x + main.w * .45 - span / 2));
      var preferredOffset = index % 2 ? -146 : 152;
      var offsets = [preferredOffset, -preferredOffset, 184, -178, 125, -121];
      var offset = offsets.find(function (candidate) {
        return !roofs.some(function (roof) {
          return x < roof.x + roof.w && x + span > roof.x && Math.abs(main.y + candidate - roof.y) < 58;
        });
      });
      if (offset === undefined) return;
      roofs.push({ x: x, y: main.y + offset, w: span, name: offset < 0 ? 'Upper terrace' : 'Lower terrace',
        role: 'end', permanent: true, destroyed: false,
        cap: offset > 0 && index % 3 === 0 && index > 2 ? 'right' : null });
    });
  };

  window.TrentRoofExpansion = function (roofs, objectives, options) {
    var scale = options.flags ? 2 : 4;
    var horizontal = options.flags ? 1 : 1.5;
    roofs.forEach(function (roof, index) {
      roof.originalIndex = index; roof.authoredY = roof.y; roof.authoredX = roof.x;
      roof.x *= horizontal; roof.w *= horizontal;
      roof.y = 300 + (roof.y - 300) * scale;
      if (!options.flags && roof.w < 300) {
        roof.x = Math.max(0, Math.min(options.width - 300, roof.x - (300 - roof.w) / 2));
        roof.w = 300;
      }
      roof.permanent = true;
      roof.destroyed = false;
    });
    objectives.forEach(function (item) { item.y = 300 + (item.y - 300) * scale; });
    var authored = roofs.slice();
    var route = [];
    var expansion = { route: route, authored: authored, scale: scale,
      top: 300 + (-620 - 300) * scale, bottom: 300 + (1120 - 300) * scale };
    if (options.flags) return expansion;

    var mainRoofs = authored.filter(function (roof) { return roof.role === 'main'; });
    authored.forEach(function (roof, index) {
      if (index === 0 || roof.goal || roof.w < 580) return;
      // A single jumpable hole separates two wide sections of the same roof.
      var holeWidth = 112;
      var half = (roof.w - holeWidth) / 2;
      var holeX = roof.x + half;
      roofs.push(Object.assign({}, roof, { originalIndex: undefined, x: holeX, w: holeWidth,
        cap: null, section: true, permanent: false }));
      var right = Object.assign({}, roof, { originalIndex: undefined, x: holeX + holeWidth,
        w: half, cap: roof.cap === 'right' ? 'right' : null, section: true, permanentRoute: true });
      roof.w = half;
      roof.cap = roof.cap === 'left' ? 'left' : null;
      roof.section = roof.permanentRoute = true;
      roofs.push(right);
    });

    function bridge(left, right) {
      var startX = left.x + left.w - 45;
      var endX = right.x + 45;
      var rise = right.y - left.y;
      var dx = endX - startX;
      var gap = Math.max(left.x - right.x - right.w, right.x - left.x - left.w, 0);
      if (gap <= 155 && Math.abs(rise) <= 104) return;
      var steps = Math.max(2, Math.ceil(Math.abs(rise) / 110), Math.ceil(Math.abs(dx) / 225));
      for (var i = 1; i < steps; i++) {
        var t = i / steps;
        var span = 300;
        var x = Math.max(12, Math.min(options.width - span - 12, startX + dx * t - span / 2));
        var y = left.y + rise * t;
        var overlap = roofs.some(function (other) {
          return Math.abs(other.y - y) < 1 && x < other.x + other.w && x + span > other.x;
        });
        if (overlap) continue;
        var roof = { x: x, y: y, w: span, name: 'Stone landing', role: 'route',
          permanent: true, permanentRoute: true, destroyed: false };
        roofs.push(roof);
        route.push({ roof: roof, x: x + span / 2, y: y });
      }
    }
    mainRoofs.forEach(function (roof, i) {
      if (i) {
        var left = mainRoofs[i - 1];
        // The original outline reaches past any center bomb hole.
        var rightHalf = roofs.find(function (part) {
          return part !== left && part.name === left.name && part.permanent && part.x > left.x;
        });
        bridge(rightHalf || left, roof);
      }
      route.push({ roof: roof, x: roof.x + roof.w / 2, y: roof.y });
    });
    return expansion;
  };
})();
