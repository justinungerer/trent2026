'use strict';
(function () {
  window.TrentAddRoofTiers = function (roofs, mainRoofs, width, escape, eaves) {
    mainRoofs.forEach(function (main, index) {
      var span = escape ? 256 : 196;
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
        cap: offset > 0 && index % 3 === 0 && (!eaves || index > 2) ? 'right' : null });
    });
  };

  window.TrentRoofExpansion = function (roofs, objectives, options) {
    var scale = options.flags ? 2 : 4;
    var horizontal = options.flags ? 1 : 1.5;
    roofs.forEach(function (roof, index) {
      roof.originalIndex = index; roof.authoredY = roof.y; roof.authoredX = roof.x;
      roof.x *= horizontal; roof.w *= horizontal;
      roof.y = 300 + (roof.y - 300) * scale;
      roof.permanent = options.flags || index === 0 || !!roof.goal;
      roof.destroyed = false;
    });
    objectives.forEach(function (item) { item.y = 300 + (item.y - 300) * scale; });
    var authored = roofs.slice();
    var route = [];
    var expansion = { route: route, authored: authored, scale: scale,
      top: 300 + (-620 - 300) * scale, bottom: 300 + (1120 - 300) * scale };
    if (options.flags) return expansion;

    var anchors = [];
    function add(roof, x) { anchors.push({ roof: roof, x: x, y: roof.y }); }
    authored.filter(function (roof) { return roof.role === 'main'; }).sort(function (a, b) { return a.x - b.x; }).forEach(function (roof) {
      if (roof.permanent) {
        add(roof, roof.goal ? roof.x + 90 : roof.x + roof.w - 90);
        return;
      }
      var count = Math.ceil(roof.w / 230);
      var start = roof.x, end = roof.x + roof.w, span = roof.w / count;
      var cursor = start;
      var usedOriginal = false;
      var description = Object.assign({}, roof);
      function addWeakSection(left, right) {
        var section = usedOriginal ? Object.assign({}, description) : roof;
        section.x = left;
        section.w = right - left;
        section.section = true;
        if (usedOriginal) {
          delete section.originalIndex;
          roofs.push(section);
        }
        usedOriginal = true;
      }
      for (var i = 0; i < count; i++) {
        var x = start + (i + .5) * span;
        var core = { x: x - 57, y: roof.y, w: 114, name: 'Reinforced ' + roof.name, role: 'route', permanent: true, permanentRoute: true, destroyed: false };
        addWeakSection(cursor, core.x);
        roofs.push(core);
        add(core, x);
        cursor = core.x + core.w;
      }
      addWeakSection(cursor, end);
    });
    authored.forEach(function (roof) {
      if (roof.permanent || roof.section || roof.w <= 145) return;
      var segments = Math.ceil(roof.w / 145);
      var segmentWidth = roof.w / segments;
      var detail = Object.assign({}, roof);
      roof.w = segmentWidth;
      roof.section = true;
      if (detail.cap === 'right') roof.cap = null;
      for (var i = 1; i < segments; i++) {
        roofs.push({
          x: detail.x + i * segmentWidth, y: roof.y, w: segmentWidth, name: roof.name,
          role: roof.role, section: true, permanent: false, destroyed: false,
          cap: detail.cap === 'right' && i === segments - 1 ? 'right' : null
        });
      }
    });
    function bridge(a, b) {
      var steps = Math.max(1, Math.ceil(Math.abs(b.y - a.y) / 100), Math.ceil(Math.abs(b.x - a.x) / 145));
      for (var i = 1; i < steps; i++) {
        var t = i / steps;
        var zigzag = Math.abs(b.y - a.y) > 180 ? (i % 2 ? -62 : 62) : 0;
        var x = a.x + (b.x - a.x) * t + zigzag;
        var roof = { x: Math.max(12, Math.min(options.width - 156, x - 72)), y: a.y + (b.y - a.y) * t,
          w: 144, name: 'Stone switchback ' + i, role: 'route', permanent: true, permanentRoute: true, destroyed: false };
        while (roofs.some(function (other) {
          return Math.abs(other.y - roof.y) < .01 && roof.x < other.x + other.w && roof.x + roof.w > other.x;
        })) roof.y += 9;
        roofs.push(roof); route.push({ roof: roof, x: roof.x + 72, y: roof.y });
      }
    }
    anchors.forEach(function (anchor, i) {
      if (i) bridge(anchors[i - 1], anchor);
      route.push(anchor);
    });
    return expansion;
  };
})();
