'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = readFileSync(join(__dirname, 'orientation.js'), 'utf8');

function loadOrientation({ parent, screenType, pointer = true, viewportPortrait = true, angle } = {}) {
  const screen = new EventTarget();
  screen.type = screenType;
  const window = Object.assign(new EventTarget(), {
    screen: { orientation: screen },
    orientation: angle,
    matchMedia(query) {
      return Object.assign(new EventTarget(), {
        matches: query.includes('pointer') ? pointer : viewportPortrait
      });
    }
  });
  window.parent = parent || window;
  vm.runInNewContext(source, { window, navigator: { maxTouchPoints: pointer ? 5 : 0 } });
  return window;
}

test('phone orientation ignores viewport shape when the device reports its position', () => {
  const phone = loadOrientation({ screenType: 'landscape-primary', viewportPortrait: true });
  assert.equal(phone.TrentOrientation.blocked(true), false);
  assert.equal(phone.TrentOrientation.blocked(false), true);

  const oldPhone = loadOrientation({ angle: 0, viewportPortrait: false });
  assert.equal(oldPhone.TrentOrientation.blocked(true), true);
  assert.equal(oldPhone.TrentOrientation.blocked(false), false);
});

test('embedded missions use the campaign orientation and release their listeners on exit', () => {
  const parent = loadOrientation({ screenType: 'landscape-primary' });
  const child = loadOrientation({ parent, screenType: 'portrait-primary' });
  assert.equal(child.TrentOrientation.embedded, true);
  assert.equal(child.TrentOrientation.blocked(true), false);
  let updates = 0;
  child.TrentOrientation.subscribe(() => { updates++; });
  parent.screen.orientation.type = 'portrait-primary';
  parent.screen.orientation.dispatchEvent(new Event('change'));
  assert.equal(child.TrentOrientation.blocked(true), true);
  assert.equal(updates, 1);
  child.dispatchEvent(new Event('pagehide'));
  parent.screen.orientation.dispatchEvent(new Event('change'));
  assert.equal(updates, 1);
});

test('viewport fallback still gates a touch phone and leaves desktop windows usable', () => {
  assert.equal(loadOrientation().TrentOrientation.blocked(true), true);
  const desktop = loadOrientation({ screenType: 'portrait-primary', pointer: false });
  assert.equal(desktop.TrentOrientation.blocked(true), false);
  assert.equal(desktop.TrentOrientation.blocked(false), false);
});
