'use strict';
(function () {
  var MAX_ENEMY_HP = 2120;
  var STUN_SECONDS = 3;
  var STUN_COOLDOWN_SECONDS = 3;
  var PUNCH_FLASH_SECONDS = .16;
  var SAME_SIDE_LIMIT = 3;
  var WINDUP_SECONDS = 2;
  var DODGE_SECONDS = 1.15;
  var ATTACK_WARNINGS = {
    left: 'Left hook. Hold Dodge Right or Block.',
    right: 'Right hook. Hold Dodge Left or Block.',
    straight: 'Straight punch. Hold Block or either dodge.',
    upper: 'Uppercut. Hold Block or either dodge.'
  };
  var HIT_BLUR_SECONDS = { straight: 1, left: 2, right: 2, upper: 3 };
  var SPLASH_DROPS = [
    [0, 0, 33], [.05, -.07, 22], [-.04, .09, 25], [.12, .07, 10],
    [.17, -.12, 8], [.05, -.18, 10], [.24, -.02, 5], [.16, .18, 6],
    [-.02, .25, 9], [.08, .28, 4], [.30, -.13, 4], [.21, .12, 3]
  ];
  var HITS_PER_STAR = 3;
  var PUNCHES = {
    left: { windup: .09, recovery: .20, damage: 4, cost: 6, side: -1 },
    right: { windup: .14, recovery: .23, damage: 6, cost: 8, side: 1 },
    upper: { windup: .22, recovery: .24, damage: 18, cost: 12, side: 1 }
  };
  function ready(image) { return image.complete && image.naturalWidth > 0; }
  window.TrentBoxing = { create: function (options) {
    var enemy = new Image(), hero = new Image(), ring = new Image(), face = new Image();
    face.src = 'art/hitler-front-historical.jpg';
    enemy.src = 'art/hitler-boxing-painted.webp'; hero.src = 'art/trent-boxing-painted.webp'; ring.src = 'art/boxing-rooftop.webp';
    var host = document.createElement('div'); host.className = 'boxing-ui'; host.hidden = true;
    host.innerHTML = '<div class="boxing-hud"><span>Trent <strong id="box-player-hp"></strong> <strong id="box-player-hit" hidden></strong></span><span id="box-clock"></span><span>Hitler <strong id="box-enemy-hp"></strong></span></div>' +
      '<div class="boxing-cue"><strong id="box-guard"></strong><span id="box-cue"></span><progress id="box-windup" max="1" aria-hidden="true" hidden></progress></div><div class="boxing-left"><button id="box-block">Block</button><button id="box-left">Dodge left</button><button id="box-right">Dodge right</button></div>' +
      '<button class="boxing-pause" id="box-pause">Pause</button>' +
      '<div class="boxing-right"><button id="box-uppercut">Uppercut <span id="box-stars"></span></button><button id="box-punch-left">Left punch</button><button id="box-punch-right">Right punch</button></div>' +
      '<div class="sheet" id="box-sheet"><div class="card"><h1 id="box-title">The final fight</h1><p id="box-copy"></p><button id="box-start">Fight</button><p class="boxing-art-credit"><a href="art/ART-SOURCES.md" target="_blank" rel="noopener">Portrait: Bundesarchiv / CC BY-SA 3.0</a></p></div></div>';
    document.querySelector('.stage').appendChild(host);
    var get = function (id) { return host.querySelector('#' + id); };
    var bout = null;
    var defensePointer = null;
    var canvas = document.getElementById('roofs');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    function reset() {
      defensePointer = null;
      bout = { mode: 'intro', hp: 20 + (window.TrentMissionBonus || 0), max: 20 + (window.TrentMissionBonus || 0), enemy: MAX_ENEMY_HP,
        time: 0, stamina: 100, phase: 'guard', timer: 1.5, attack: 'left', cycle: 0,
        dodge: 0, dodgeTime: 0, dodgeCool: 0, dodgeHeld: false, block: false,
        punch: null, queuedPunch: null, stars: 0, punchStreak: 0, lastPunchSide: 0, sameSideHits: 0, stunCooldown: 0,
        guardSide: -1, evadeSide: 0, evadeTime: 0, playerHitTime: 0, playerDamage: 0,
        hitVision: 0, hitVisionDuration: 0, hitSide: 1,
        counterHits: 0, counterLimit: 0, flash: 0, lastImpact: null,
        victory: 0, cue: 'Punch the highlighted side.' };
    }
    function modal(title, copy, label) {
      get('box-title').textContent = title; get('box-copy').textContent = copy;
      get('box-start').textContent = label; get('box-sheet').hidden = false;
    }
    function start() {
      reset();host.hidden = false;document.querySelector('.move').hidden = true;document.getElementById('jump').hidden = true;document.querySelector('.hud').hidden = true;
      modal('Hitler guards the sleigh', 'The highlighted punch always lands. He guards one side at a time, so watch for switches. Switch sides after three hits. Land three punches in a row to earn an Uppercut. It stuns him when he has been awake for at least three seconds after the last stun. Missing or taking a hit resets the streak. Every punch has a two-second warning with two flashes. Hold Block or the indicated dodge until the swing to avoid damage and open both sides.', 'Fight');
      sync();
    }
    function stop() {
      clearDefense();
      host.hidden = true;if (bout) bout.mode = 'off';
      canvas.style.filter = '';
      document.querySelector('.move').hidden = false;document.getElementById('jump').hidden = false;document.querySelector('.hud').hidden = false;
    }
    function clearDefense() {
      defensePointer = null;
      if (!bout) return;
      bout.block = false;
      bout.dodgeHeld = false;
      bout.dodgeTime = 0;
    }
    function dodge(side, held) {
      if (!bout || bout.mode !== 'fight' || (!held && bout.dodgeCool > 0)) return;
      if (bout.punch && bout.punch.resolved) bout.punch = null;
      bout.queuedPunch = null;
      bout.stamina = Math.max(0, bout.stamina - 10);
      bout.dodge = side;
      bout.dodgeTime = DODGE_SECONDS;
      bout.dodgeCool = DODGE_SECONDS;
      bout.dodgeHeld = Boolean(held);
      bout.block = false;
    }
    function dodgeOffset() {
      var elapsed = DODGE_SECONDS - bout.dodgeTime;
      var lean = Math.min(1, elapsed / .13);
      var release = bout.dodgeHeld ? 1 : Math.min(1, bout.dodgeTime / .18);
      return bout.dodge * 72 * lean * release;
    }
    function adaptiveDodgeSide() {
      return bout.phase !== 'stun' && bout.sameSideHits >= SAME_SIDE_LIMIT ? bout.lastPunchSide : 0;
    }
    function guardedSide() {
      if (bout.phase === 'stun') return 0;
      var counterOpen = bout.phase === 'recover' && bout.counterHits < bout.counterLimit;
      return adaptiveDodgeSide() || (counterOpen ? 0 : bout.guardSide);
    }
    function punch(kind) {
      if (!bout || bout.mode !== 'fight' || !PUNCHES[kind] || bout.block || bout.dodgeHeld) return;
      // Keep the opening the player saw when tapping, even if the next guard starts during the animation.
      var request = { kind: kind, guarded: kind !== 'upper' && PUNCHES[kind].side === guardedSide() };
      if (bout.punch) bout.queuedPunch = request;
      else startPunch(request);
    }
    function startPunch(request) {
      var kind = request.kind, move = PUNCHES[kind];
      if (kind === 'upper' && !bout.stars) {
        bout.cue = 'Land ' + (HITS_PER_STAR - bout.punchStreak) + ' more in a row for a star.';
        sync();
        return;
      }
      if (bout.stamina < move.cost) {
        bout.cue = 'Catch your breath. Dodge the next punch.';
        sync();
        return;
      }
      var adaptedSide = adaptiveDodgeSide();
      var evaded = kind !== 'upper' && bout.phase !== 'stun' &&
        (adaptedSide ? adaptedSide === move.side : request.guarded);
      bout.punch = { kind: kind, elapsed: 0, offset: dodgeOffset(), resolved: false, evaded: evaded };
      bout.dodgeTime = 0;
      bout.block = false;
      bout.stamina -= move.cost;
      if (kind === 'upper') bout.stars--;
      if (evaded) {
        bout.evadeSide = -move.side;
        bout.evadeTime = .42;
      }
      sync();
    }
    function resolvePunch(action, move) {
      if (action.evaded) {
        bout.cue = bout.punchStreak ? 'He dodged. Streak reset.' : 'He dodged the covered side.';
        bout.punchStreak = 0;
        return;
      }
      var upper = action.kind === 'upper';
      var earnedStar = false;
      var stunned = upper && bout.phase !== 'stun' && bout.stunCooldown <= 0;
      if (stunned) {
        bout.phase = 'stun';
        bout.timer = STUN_SECONDS;
        bout.evadeTime = 0;
      }
      if (!upper) {
        bout.sameSideHits = move.side === bout.lastPunchSide ? Math.min(SAME_SIDE_LIMIT, bout.sameSideHits + 1) : 1;
        bout.lastPunchSide = move.side;
        if (++bout.punchStreak >= HITS_PER_STAR) {
          earnedStar = bout.stars < 3;
          if (earnedStar) bout.stars++;
          bout.punchStreak = 0;
        }
      }
      bout.enemy = Math.max(0, bout.enemy - move.damage);
      if (bout.phase === 'recover') bout.counterHits++;
      bout.flash = .20;
      bout.lastImpact = action.kind;
      var hit = stunned ? 'Guard broken! He’s stunned.' : upper ? 'Uppercut lands!' : action.kind === 'left' ? 'Left lands!' : 'Right lands!';
      bout.cue = hit + (earnedStar ? ' +1 star.' : '');
      if (bout.enemy === 0) {
        bout.mode = 'victory';
        bout.victory = 1.2;
        bout.cue = 'Hitler is beaten. The sleigh is clear!';
      }
    }
    function beginAttack() {
      var phase = bout.enemy > MAX_ENEMY_HP * 2 / 3 ? 0 : bout.enemy > MAX_ENEMY_HP / 3 ? 1 : 2;
      var patterns = [['left','right','straight','left'],['right','upper','left','straight'],['upper','right','left','upper','straight']];
      bout.attack = patterns[phase][bout.cycle % patterns[phase].length];bout.cycle++;
      bout.phase = 'tell';
      bout.timer = WINDUP_SECONDS;
    }
    function strike() {
      var dodged = (bout.dodgeHeld || bout.dodgeTime > 0) && (bout.attack === 'left' ? bout.dodge > 0 : bout.attack === 'right' ? bout.dodge < 0 : true);
      var blocked = !dodged && bout.block;
      if (blocked) bout.stamina = Math.max(0, bout.stamina - 18);
      bout.counterLimit = dodged ? 2 : blocked ? 1 : 0;
      bout.counterHits = 0;
      if (!dodged && !blocked) {
        bout.playerDamage = Math.min(bout.hp, bout.attack === 'upper' ? 2 : 1);
        bout.hp -= bout.playerDamage;
        bout.playerHitTime = .55;
        bout.hitVisionDuration = Math.max(bout.hitVision, HIT_BLUR_SECONDS[bout.attack]);
        bout.hitVision = bout.hitVisionDuration;
        bout.hitSide = bout.attack === 'right' ? -1 : 1;
        bout.stamina = Math.max(0, bout.stamina - 12);
        bout.cue = bout.punchStreak ? 'Hit! Streak reset.' : 'Hit! Watch the next wind-up.';
        bout.punchStreak = 0;
      } else {
        bout.cue = dodged ? 'Good dodge. Get ready to counter.' : 'Blocked. Get ready to counter.';
      }
      if (!bout.hp) { bout.mode = 'lost';modal('Knocked down', 'The sleigh is still guarded. Take another shot at the full bout.', 'Fight again'); }
    }
    function update(dt) {
      if (!bout) return;
      if (bout.mode === 'fight' || bout.mode === 'lost' || bout.mode === 'victory') {
        bout.hitVision = Math.max(0, bout.hitVision - dt);
      }
      if (bout.mode === 'victory') { bout.victory -= dt;if (bout.victory <= 0) { stop();options.onWin(); }return; }
      if (bout.mode !== 'fight') return;
      bout.time += dt;bout.stamina = Math.min(100, bout.stamina + (bout.block ? 5 : 18) * dt);
      bout.dodgeTime = Math.max(0,bout.dodgeTime-dt);bout.dodgeCool = Math.max(0,bout.dodgeCool-dt);
      bout.flash = Math.max(0, bout.flash - dt);
      bout.playerHitTime = Math.max(0, bout.playerHitTime - dt);
      bout.evadeTime = Math.max(0, bout.evadeTime - dt);
      bout.stunCooldown = Math.max(0, bout.stunCooldown - dt);
      bout.timer -= dt;
      if (bout.timer <= 0) {
        if (bout.phase === 'guard') beginAttack();
        else if (bout.phase === 'tell') {
          bout.phase = 'strike';
          bout.timer = .25;
          strike();
        } else if (bout.phase === 'strike') {
          bout.phase = 'recover';
          bout.timer = 1.25;
          if (bout.counterLimit) bout.cue = bout.counterLimit === 2 ? 'Open! Land two punches.' : 'Open! Land one punch.';
        } else {
          if (bout.phase === 'stun') bout.stunCooldown = STUN_COOLDOWN_SECONDS;
          bout.phase = 'guard';
          bout.counterLimit = 0;
          bout.guardSide *= -1;
          bout.timer = bout.enemy > MAX_ENEMY_HP * 2 / 3 ? 1.5 : bout.enemy > MAX_ENEMY_HP / 3 ? 1.25 : 1;
          bout.cue = 'Punch the highlighted side.';
        }
      }
      if (bout.punch) {
        var action = bout.punch, move = PUNCHES[action.kind];
        action.elapsed += dt;
        if (!action.resolved && action.elapsed >= move.windup && bout.mode === 'fight') {
          action.resolved = true;
          resolvePunch(action, move);
        }
        if (action.elapsed >= move.windup + move.recovery) bout.punch = null;
      }
      if (!bout.punch && bout.queuedPunch && bout.mode === 'fight') {
        var queued = bout.queuedPunch;
        bout.queuedPunch = null;
        startPunch(queued);
      }
      sync();
    }
    function sync() {
      if (!bout) return;
      get('box-player-hp').textContent = bout.hp + '/' + bout.max;
      var playerHit = get('box-player-hit');
      playerHit.hidden = bout.playerHitTime <= 0;
      playerHit.textContent = '−' + bout.playerDamage + ' HP';
      var enemyPercent = bout.enemy > 0 ? Math.max(1, Math.floor(100 * bout.enemy / MAX_ENEMY_HP)) : 0;
      get('box-enemy-hp').textContent = enemyPercent + '%';
      var uppercutLabel = bout.stars ? bout.stars + '★' : bout.punchStreak + '/' + HITS_PER_STAR;
      if (bout.stars && bout.stunCooldown > 0) uppercutLabel += ' · Stun ' + Math.ceil(bout.stunCooldown) + 's';
      get('box-stars').textContent = uppercutLabel;
      get('box-uppercut').classList.toggle('charged', bout.stars > 0);
      get('box-clock').textContent = Math.floor(bout.time/60) + ':' + String(Math.floor(bout.time%60)).padStart(2,'0') + ' · Stamina ' + Math.round(bout.stamina);
      var guard = guardedSide();
      var guardLabel = guard < 0 ? 'Left covered · Right open' : guard > 0 ? 'Right covered · Left open' : 'Both sides open';
      if (bout.phase === 'stun') guardLabel = 'Stunned · Both sides open';
      else if (adaptiveDodgeSide()) guardLabel = guard < 0 ? 'Dodging left · Right open' : 'Dodging right · Left open';
      get('box-guard').textContent = bout.mode === 'victory' ? '' : guardLabel;
      get('box-punch-left').classList.toggle('open-side', guard !== -1);
      get('box-punch-right').classList.toggle('open-side', guard !== 1);
      var warning = bout.mode === 'fight' && bout.phase === 'tell';
      get('box-cue').textContent = warning ? ATTACK_WARNINGS[bout.attack] : bout.cue;
      var windup = get('box-windup');
      windup.hidden = !warning;
      windup.value = warning ? Math.max(0, bout.timer / WINDUP_SECONDS) : 0;
      get('box-block').classList.toggle('defending', bout.block);
      get('box-left').classList.toggle('defending', bout.dodgeHeld && bout.dodge < 0);
      get('box-right').classList.toggle('defending', bout.dodgeHeld && bout.dodge > 0);
    }
    function sprite(ctx,img,cols,rows,frame,x,y,height) {
      if (!ready(img)) return;
      var sw=img.naturalWidth/cols,sh=img.naturalHeight/rows,w=height*sw/sh;
      ctx.drawImage(img,frame%cols*sw,Math.floor(frame/cols)*sh,sw,sh,x-w/2,y-height,w,height);
    }
    // Historical face over the painted poses: the approved portrait/body fallback.
    function enemySprite(ctx,frame,x,y,height,healthFraction,warningFlash) {
      ctx.save();
      if (warningFlash) ctx.filter = 'brightness(1.75)';
      sprite(ctx,enemy,3,2,frame,x,y,height);
      ctx.restore();
      if(!ready(face)||!ready(enemy))return;
      var heads=[[229,8,58,79],[747,8,58,81],[1231,10,65,83],[230,518,59,81],[728,524,63,86],[1240,582,69,88]];
      var h=heads[frame],k=height/512,w=height,dx=x-w/2+(h[0]%512)*k,dy=y-height+(h[1]%512)*k;
      ctx.save();ctx.beginPath();ctx.ellipse(dx+h[2]*k/2,dy+h[3]*k/2,h[2]*k/2,h[3]*k/2,0,0,Math.PI*2);ctx.clip();
      ctx.filter = warningFlash ? 'sepia(.35) brightness(1.75)' : 'sepia(.35)';
      ctx.drawImage(face, 174, 18, 116, 161, dx, dy, h[2] * k, h[3] * k);
      ctx.filter = 'none';
      if (healthFraction <= .75) {
        drawFaceDamage(ctx, dx, dy, h[2] * k, h[3] * k, healthFraction);
      }
      ctx.restore();
    }
    function drawBruise(ctx, x, y, width, height, centerColor, edgeColor) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(width, height);
      var bruise = ctx.createRadialGradient(-.12, -.15, .05, 0, 0, 1);
      bruise.addColorStop(0, centerColor);
      bruise.addColorStop(.52, edgeColor);
      bruise.addColorStop(1, 'rgba(54, 23, 60, 0)');
      ctx.fillStyle = bruise;
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
    }
    function drawFaceDamage(ctx, x, y, width, height, healthFraction) {
      // Draw in portrait coordinates so injuries follow the face in every pose.
      ctx.translate(x, y);
      ctx.scale(width / 116, height / 161);
      if (healthFraction <= .5) {
        drawBruise(ctx, 82, 78, 23, 17, 'rgba(52, 28, 65, .80)', 'rgba(104, 49, 93, .64)');
      }
      if (healthFraction <= .25) {
        drawBruise(ctx, 35, 76, 20, 15, 'rgba(49, 27, 68, .84)', 'rgba(118, 44, 86, .61)');
        drawBruise(ctx, 88, 103, 23, 20, 'rgba(92, 30, 55, .85)', 'rgba(124, 53, 78, .62)');
        drawBruise(ctx, 37, 110, 18, 14, 'rgba(124, 38, 44, .72)', 'rgba(139, 61, 54, .53)');
        ctx.strokeStyle = '#751d29';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(89, 60);ctx.lineTo(99, 65);
        ctx.moveTo(53, 129);ctx.lineTo(44, 137);
        ctx.stroke();
      }
      ctx.fillStyle = '#8f252d';
      ctx.beginPath();
      ctx.moveTo(65, 108);
      ctx.quadraticCurveTo(71, 111, 70, 118);
      ctx.quadraticCurveTo(72, 123, 70, 132);
      ctx.quadraticCurveTo(68, 138, 65, 134);
      ctx.lineTo(64, 119);
      ctx.quadraticCurveTo(60, 117, 60, 113);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#cf5553';
      ctx.fillRect(66, 116, 2, 12);
    }
    function drawGuard(ctx,x,y,height) {
      enemySprite(ctx,0,x,y,height);ctx.fillStyle='#fff0d6';ctx.font='bold 18px system-ui';ctx.textAlign='center';ctx.fillText('Hitler',x,y-height-8);
    }
    // Reuse the painted sleeve and glove as an articulated arm aimed into the ring.
    function drawPunchArm(ctx, shoulderX, shoulderY, gloveX, gloveY, mirror, scale) {
      var sourceAngle = Math.atan2(-41, 124);
      var length = Math.hypot(gloveX - shoulderX, gloveY - shoulderY);
      ctx.save();
      ctx.translate(shoulderX, shoulderY);
      ctx.rotate(Math.atan2(gloveY - shoulderY, gloveX - shoulderX));
      ctx.scale(length / Math.hypot(124, 41), (mirror ? -1 : 1) * scale * .48);
      ctx.rotate(-sourceAngle);
      ctx.translate(-343, -135);
      ctx.beginPath();
      ctx.moveTo(316, 112);ctx.lineTo(447, 60);ctx.lineTo(508, 62);
      ctx.lineTo(516, 110);ctx.lineTo(464, 130);ctx.lineTo(344, 170);
      ctx.closePath();ctx.clip();
      var frameWidth = hero.naturalWidth / 2, frameHeight = hero.naturalHeight / 2;
      ctx.drawImage(hero, frameWidth, 0, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
      ctx.restore();
    }
    function drawStunStars(ctx, x, y, scale) {
      var orbit = reduceMotion.matches ? 0 : (STUN_SECONDS - bout.timer) * 5;
      ctx.fillStyle = '#ffdc73';
      ctx.strokeStyle = '#69401b';
      ctx.lineWidth = Math.max(1, 1.3 * scale);
      for (var star = 0; star < 3; star++) {
        var angle = orbit + star * Math.PI * 2 / 3;
        var starX = x + Math.cos(angle) * 34 * scale;
        var starY = y + Math.sin(angle) * 6 * scale;
        ctx.beginPath();
        for (var point = 0; point < 10; point++) {
          var ray = point * Math.PI / 5 - Math.PI / 2;
          var radius = (point % 2 === 0 ? 8 : 3.6) * scale;
          var tipX = starX + Math.cos(ray) * radius, tipY = starY + Math.sin(ray) * radius;
          if (point === 0) ctx.moveTo(tipX, tipY);
          else ctx.lineTo(tipX, tipY);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    function drawHitSplash(ctx, width, height) {
      if (!bout || bout.hitVision <= 0) {
        if (canvas.style.filter) canvas.style.filter = '';
        return;
      }
      var remaining = bout.hitVision / bout.hitVisionDuration;
      var fade = Math.min(1, bout.hitVision / .65);
      var blur = (1 + 4 * remaining) * fade;
      canvas.style.filter = 'blur(' + blur.toFixed(2) + 'px)';
      var scale = height / 390, side = bout.hitSide;
      var spread = reduceMotion.matches ? 1 : Math.min(1, .65 + (1 - remaining) * 2.5);
      var originX = width * (side > 0 ? .085 : .915);
      var originY = height * .55;

      ctx.save();
      ctx.globalAlpha = .72 * fade;
      ctx.fillStyle = '#821720';
      ctx.beginPath();
      SPLASH_DROPS.forEach(function (drop) {
        var x = originX + side * width * drop[0] * spread;
        var y = originY + height * drop[1] * spread;
        var size = drop[2] * scale;
        ctx.moveTo(x + Math.cos(.56) * size, y + side * Math.sin(.56) * size);
        ctx.ellipse(x, y, size, size * .64, side * .56, 0, Math.PI * 2);
      });
      ctx.fill();
      ctx.restore();
    }
    function draw(ctx, width, height, dpr) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#101b2c';
      ctx.fillRect(0, 0, width, height);
      if (ready(ring)) ctx.drawImage(ring, 0, 0, width, height);

      var scale = height / 390, center = width / 2;
      var enemyFrame = 0, enemyShift = 0, recoil = 0;
      if (bout) {
        if (bout.mode === 'victory') enemyFrame = 5;
        else if (bout.phase === 'tell') enemyFrame = bout.attack === 'right' ? 2 : 1;
        else if (bout.phase === 'strike') enemyFrame = bout.attack === 'right' ? 4 : 3;
        else if (bout.phase === 'stun') enemyFrame = bout.timer > STUN_SECONDS - .5 ? 5 : 0;
        if (bout.evadeTime > 0) {
          enemyFrame = bout.evadeSide < 0 ? 2 : 1;
          enemyShift = bout.evadeSide * 66 * Math.sin(Math.PI * Math.min(1, bout.evadeTime / .42));
        }
        recoil = bout.flash / .20 * (bout.lastImpact === 'left' ? 10 : -10);
      }
      var enemyX = center + (enemyShift + recoil) * scale;
      var warningFlash = bout && bout.mode === 'fight' && bout.phase === 'tell' &&
        (bout.timer <= PUNCH_FLASH_SECONDS || (bout.timer > 1 && bout.timer <= 1 + PUNCH_FLASH_SECONDS));
      if (warningFlash) {
        var flashY = 132 * scale, flashRadius = 81 * scale;
        var glow = ctx.createRadialGradient(enemyX, flashY, 0, enemyX, flashY, flashRadius);
        glow.addColorStop(0, 'rgba(255, 226, 151, .66)');
        glow.addColorStop(1, 'rgba(255, 226, 151, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(enemyX - flashRadius, flashY - flashRadius, flashRadius * 2, flashRadius * 2);
      }
      enemySprite(ctx, enemyFrame, enemyX, (435 - Math.abs(recoil) * .6) * scale, 380 * scale,
        bout ? bout.enemy / MAX_ENEMY_HP : 1, warningFlash);
      if (bout && bout.phase === 'stun' && bout.mode !== 'victory') {
        drawStunStars(ctx, enemyX, (enemyFrame === 5 ? 94 : 49) * scale, scale);
      }
      var guard = bout && guardedSide();
      if (bout && bout.mode === 'fight' && guard) {
        var coveredX = enemyX + guard * 29 * scale;
        var arcStart = guard < 0 ? Math.PI / 2 : -Math.PI / 2;
        ctx.strokeStyle = '#ffd389';
        ctx.lineWidth = 3 * scale;
        ctx.beginPath();
        ctx.arc(coveredX, 131 * scale, 20 * scale, arcStart, arcStart + Math.PI);
        ctx.stroke();
      }

      var action = bout && bout.punch;
      var heroShift = bout ? dodgeOffset() : 0;
      var lunge = 0, extension = 0;
      if (action) {
        var move = PUNCHES[action.kind];
        var reach = Math.min(1, action.elapsed / move.windup);
        var retract = Math.max(0, (action.elapsed - move.windup - .045) / (move.recovery - .045));
        extension = reach * Math.max(0, 1 - retract);
        lunge = extension * (action.kind === 'upper' ? 53 : 39);
        heroShift = action.offset * (1 - reach) - move.side * extension * 9;
      }
      if (bout && bout.playerHitTime > .35 && !reduceMotion.matches) {
        heroShift += Math.sin((.55 - bout.playerHitTime) * 50) * (bout.playerHitTime - .35) * 45;
      }
      var heroX = center + heroShift * scale;
      sprite(ctx, hero, 2, 2, bout && bout.block ? 3 : 0, heroX, (470 - lunge) * scale, 280 * scale);
      if (action && extension > .02 && ready(hero)) {
        var side = PUNCHES[action.kind].side;
        var shoulderX = heroX + side * 28 * scale, shoulderY = (246 - lunge) * scale;
        var goalX = center + (action.kind === 'upper' ? 9 : side * 20) * scale, goalY = (action.kind === 'upper' ? 111 : 152) * scale;
        var gloveX = shoulderX + (goalX - shoulderX) * extension + side * 10 * scale * (1 - extension);
        var gloveY = shoulderY + (goalY - shoulderY) * extension - 22 * scale * (1 - extension);
        drawPunchArm(ctx, shoulderX, shoulderY, gloveX, gloveY, side < 0, scale);
      }
      if (bout && bout.flash > 0) {
        var impactSide = PUNCHES[bout.lastImpact].side;
        var impactY = bout.lastImpact === 'upper' ? 111 : 152;
        ctx.strokeStyle = 'rgba(255,220,138,' + Math.min(1, bout.flash/.16) + ')';
        ctx.lineWidth = 2.5 * scale;
        ctx.beginPath();
        for (var i = 0; i < 6; i++) {
          var angle = i * Math.PI / 3, x = center + (bout.lastImpact === 'upper' ? 9 : impactSide * 20) * scale, y = impactY * scale;
          ctx.moveTo(x + Math.cos(angle) * 10 * scale, y + Math.sin(angle) * 10 * scale);
          ctx.lineTo(x + Math.cos(angle) * 22 * scale, y + Math.sin(angle) * 22 * scale);
        }
        ctx.stroke();
      }
      drawHitSplash(ctx, width, height);
      if (bout) {
        ctx.fillStyle = '#371d20';
        var gaugeTop = Math.max(28, 32 * scale);
        ctx.fillRect(center - 120 * scale, gaugeTop, 240 * scale, 5);
        ctx.fillStyle = '#ec6257';
        ctx.fillRect(center - 120 * scale, gaugeTop, 240 * scale * bout.enemy / MAX_ENEMY_HP, 5);
      }
    }
    function bindDefense(id, side) {
      var button = get(id);
      button.addEventListener('pointerdown', function (event) {
        if (event.button !== 0 || !bout || bout.mode !== 'fight') return;
        event.preventDefault();
        defensePointer = event.pointerId;
        if (side) {
          dodge(side, true);
        } else {
          if (bout.punch && bout.punch.resolved) bout.punch = null;
          bout.queuedPunch = null;
          bout.dodgeHeld = false;
          bout.dodgeTime = 0;
          bout.block = true;
        }
        button.setPointerCapture(event.pointerId);
        sync();
      });
      function release(event) {
        if (defensePointer !== event.pointerId) return;
        // A quick tap still works just before impact. An early dodge needs to be held.
        var tapWindow = side && event.type === 'pointerup' ? Math.max(0, bout.dodgeTime - .85) : 0;
        clearDefense();
        bout.dodgeTime = tapWindow;
        sync();
      }
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (event) {
        button.addEventListener(event, release);
      });
    }
    bindDefense('box-left', -1);
    bindDefense('box-right', 1);
    bindDefense('box-block', 0);
    [['box-punch-left', 'left'], ['box-punch-right', 'right'], ['box-uppercut', 'upper']].forEach(function (binding) {
      get(binding[0]).addEventListener('click', function () { punch(binding[1]); });
    });
    function pause() {
      if (!bout || bout.mode !== 'fight') return;
      clearDefense();
      bout.mode = 'pause';
      sync();
      modal('Paused', 'The bout resumes from this moment.', 'Resume');
    }
    get('box-pause').onclick = pause;
    get('box-start').onclick=function(){
      if(bout.mode==='lost')reset();
      bout.mode='fight';get('box-sheet').hidden=true;sync();
    };
    document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
    window.addEventListener('blur', clearDefense);
    window.TrentOrientation.subscribe(function () {
      if (window.TrentOrientation.blocked(true)) clearDefense();
    });
    return {start:start,stop:stop,update:update,draw:draw,drawGuard:drawGuard,ready:function(){return [enemy,hero,ring,face].every(ready)},
      // State and controls also support deterministic balance and progression checks.
      state:function(){return bout},dodge:dodge,punch:punch,begin:function(){get('box-start').click()}};
  }};
})();
