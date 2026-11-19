'use strict';
(function () {
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
    var anchors = [];
    var route = [];
    var branches = [];
    function add(roof, x) { anchors.push({ roof: roof, x: x, y: roof.y }); }
    authored.filter(function (roof) { return roof.role === 'main'; }).sort(function (a, b) { return a.x - b.x; }).forEach(function (roof) {
      if (options.flags || roof.permanent) {
        add(roof, roof.goal ? roof.x + 90 : roof.x + roof.w - 90);
        return;
      }
      var count = Math.ceil(roof.w / 230);
      for (var i = 0; i < count; i++) {
        var x = roof.x + (i + .5) * roof.w / count;
        var core = { x: x - 72, y: roof.y, w: 144, name: 'Reinforced ' + roof.name, role: 'route', permanent: true, permanentRoute: true, destroyed: false };
        roofs.push(core); add(core, x);
      }
    });
    function bridge(a, b, label, output) {
      output = output || route;
      var steps = Math.max(1, Math.ceil(Math.abs(b.y - a.y) / 100), Math.ceil(Math.abs(b.x - a.x) / 145));
      for (var i = 1; i < steps; i++) {
        var t = i / steps;
        var zigzag = Math.abs(b.y - a.y) > 180 ? (i % 2 ? -62 : 62) : 0;
        var x = a.x + (b.x - a.x) * t + zigzag;
        var roof = { x: Math.max(12, Math.min(options.width - 156, x - 72)), y: a.y + (b.y - a.y) * t,
          w: 144, name: label + ' ' + i, role: 'route', permanent: true, permanentRoute: true, destroyed: false };
        roofs.push(roof); output.push({ roof: roof, x: roof.x + 72, y: roof.y });
      }
    }
    anchors.forEach(function (anchor, i) {
      if (i) bridge(anchors[i - 1], anchor, 'Stone switchback');
      route.push(anchor);
    });
    if (options.flags) objectives.forEach(function (item) {
      var target = authored.find(function (roof) { return Math.abs(roof.y - item.y) < 1 && item.x >= roof.x && item.x <= roof.x + roof.w; });
      var nearest = anchors.slice().sort(function (a, b) { return Math.abs(a.x - item.x) - Math.abs(b.x - item.x); })[0];
      if (target) { var branch = [nearest]; bridge(nearest, { x: item.x, y: item.y, roof: target }, 'Marker stair', branch); branch.push({ x: item.x, y: item.y, roof: target }); branches.push(branch); }
    });
    return { route: route, branches: branches, authored: authored, scale: scale,
      top: 300 + (-620 - 300) * scale, bottom: 300 + (1120 - 300) * scale };
  };
})();
