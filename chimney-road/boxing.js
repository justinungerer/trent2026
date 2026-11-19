'use strict';
(function () {
  function ready(image) { return image.complete && image.naturalWidth > 0; }
  window.TrentBoxing = { create: function (options) {
    var enemy = new Image(), hero = new Image(), ring = new Image(), face = new Image();
    face.src = 'art/hitler-front-historical.jpg';
    enemy.src = 'art/hitler-boxing-painted.webp'; hero.src = 'art/trent-boxing-painted.webp'; ring.src = 'art/boxing-rooftop.webp';
    var host = document.createElement('div'); host.className = 'boxing-ui'; host.hidden = true;
    host.innerHTML = '<div class="boxing-hud"><span>Trent <strong id="box-player-hp"></strong></span><span id="box-clock"></span><span>Hitler <strong id="box-enemy-hp"></strong></span></div>' +
      '<p class="boxing-cue" id="box-cue"></p><div class="boxing-left"><button id="box-block">Block</button><button id="box-left">Dodge left</button><button id="box-right">Dodge right</button></div>' +
      '<div class="boxing-right"><button id="box-pause">Pause</button><button id="box-punch">Punch</button></div>' +
      '<div class="sheet" id="box-sheet"><div class="card"><h1 id="box-title">The final fight</h1><p id="box-copy"></p><button id="box-start">Fight</button><p class="boxing-art-credit"><a href="art/ART-SOURCES.md" target="_blank" rel="noopener">Portrait: Bundesarchiv / CC BY-SA 3.0</a></p></div></div>';
    document.querySelector('.stage').appendChild(host);
    var get = function (id) { return host.querySelector('#' + id); };
    var bout = null;
    function reset() {
      bout = { mode: 'intro', hp: 20 + (window.TrentMissionBonus || 0), max: 20 + (window.TrentMissionBonus || 0), enemy: 360,
        time: 0, stamina: 100, phase: 'guard', timer: 1.5, attack: 'left', cycle: 0,
        dodge: 0, dodgeTime: 0, dodgeCool: 0, block: false, punch: 0, punchCool: 0,
        counter: 0, counterHits: 0, counterLimit: 0, flash: 0, victory: 0, cue: 'Watch his gloves. Dodge, then counterpunch.' };
    }
    function modal(title, copy, label) {
      get('box-title').textContent = title; get('box-copy').textContent = copy;
      get('box-start').textContent = label; get('box-sheet').hidden = false;
    }
    function start() {
      reset();host.hidden = false;document.querySelector('.move').hidden = true;document.getElementById('jump').hidden = true;document.querySelector('.hud').hidden = true;
      modal('Hitler guards the sleigh', 'Dodge away from the glove he draws back. Block straight punches, but dodge uppercuts. After a successful dodge, land two counterpunches while he is winded. Watch your stamina. This is one continuous bout, designed for about five minutes.', 'Fight');
      sync();
    }
    function stop() {
      host.hidden = true;if (bout) bout.mode = 'off';
      document.querySelector('.move').hidden = false;document.getElementById('jump').hidden = false;document.querySelector('.hud').hidden = false;
    }
    function dodge(side) {
      if (!bout || bout.mode !== 'fight' || bout.dodgeCool > 0 || bout.stamina < 10) return;
      bout.stamina -= 10;bout.dodge = side;bout.dodgeTime = 1.15;bout.dodgeCool = 1.15;bout.block = false;
    }
    function punch() {
      if (!bout || bout.mode !== 'fight' || bout.punchCool > 0 || bout.stamina < 7) return;
      bout.stamina -= 7;bout.punch = .24;bout.punchCool = .36;
      if (bout.phase === 'recover' && bout.counterHits < bout.counterLimit) {
        bout.enemy = Math.max(0, bout.enemy - 2);bout.counterHits++;bout.flash = .16;bout.cue = 'Counterpunch!';
        if (!bout.enemy) { bout.mode = 'victory';bout.victory = 1.2;bout.cue = 'Hitler is beaten. The sleigh is clear!'; }
      } else bout.cue = 'He is guarding. Wait for an opening.';
      sync();
    }
    function beginAttack() {
      var phase = bout.enemy > 240 ? 0 : bout.enemy > 120 ? 1 : 2;
      var patterns = [['left','right','straight','left'],['right','upper','left','straight'],['upper','right','left','upper','straight']];
      bout.attack = patterns[phase][bout.cycle % patterns[phase].length];bout.cycle++;
      bout.phase = 'tell';bout.timer = [1,.85,.7][phase];
      bout.cue = bout.attack === 'left' ? 'Left hook — dodge right!' : bout.attack === 'right' ? 'Right hook — dodge left!' : bout.attack === 'upper' ? 'Uppercut — dodge either way!' : 'Straight punch — block or dodge!';
    }
    function strike() {
      var dodged = bout.dodgeTime > 0 && (bout.attack === 'left' ? bout.dodge > 0 : bout.attack === 'right' ? bout.dodge < 0 : true);
      var blocked = !dodged && bout.block && bout.attack !== 'upper' && bout.stamina >= 18;
      if (blocked) bout.stamina -= 18;
      bout.counterLimit = dodged ? 2 : blocked ? 1 : 0;bout.counterHits = 0;
      if (!dodged && !blocked) { bout.hp = Math.max(0, bout.hp - (bout.attack === 'upper' ? 2 : 1));bout.cue = 'Hit! Watch the next wind-up.'; }
      else bout.cue = dodged ? 'He missed — two counterpunches!' : 'Blocked — counterpunch!';
      if (!bout.hp) { bout.mode = 'lost';modal('Knocked down', 'The sleigh is still guarded. Take another shot at the full bout.', 'Fight again'); }
    }
    function update(dt) {
      if (!bout) return;
      if (bout.mode === 'victory') { bout.victory -= dt;if (bout.victory <= 0) { stop();options.onWin(); }return; }
      if (bout.mode !== 'fight') return;
      bout.time += dt;bout.stamina = Math.min(100, bout.stamina + (bout.block ? 5 : 18) * dt);
      bout.dodgeTime = Math.max(0,bout.dodgeTime-dt);bout.dodgeCool = Math.max(0,bout.dodgeCool-dt);
      bout.punch = Math.max(0,bout.punch-dt);bout.punchCool = Math.max(0,bout.punchCool-dt);bout.flash = Math.max(0,bout.flash-dt);
      bout.timer -= dt;
      if (bout.timer <= 0) {
        if (bout.phase === 'guard') beginAttack();
        else if (bout.phase === 'tell') { bout.phase = 'strike';bout.timer = .25;strike(); }
        else if (bout.phase === 'strike') { bout.phase = 'recover';bout.timer = 1; }
        else { bout.phase = 'guard';bout.counterLimit = 0;bout.timer = bout.enemy > 240 ? 1.5 : bout.enemy > 120 ? 1.25 : 1; }
      }
      sync();
    }
    function sync() {
      if (!bout) return;
      get('box-player-hp').textContent = bout.hp + '/' + bout.max;
      get('box-enemy-hp').textContent = Math.ceil(bout.enemy / 3.6) + '%';
      get('box-clock').textContent = Math.floor(bout.time/60) + ':' + String(Math.floor(bout.time%60)).padStart(2,'0') + ' · Stamina ' + Math.round(bout.stamina);
      get('box-cue').textContent = bout.cue;
    }
    function sprite(ctx,img,cols,rows,frame,x,y,height) {
      if (!ready(img)) return;
      var sw=img.naturalWidth/cols,sh=img.naturalHeight/rows,w=height*sw/sh;
      ctx.drawImage(img,frame%cols*sw,Math.floor(frame/cols)*sh,sw,sh,x-w/2,y-height,w,height);
    }
    // Historical face over the painted poses: the approved portrait/body fallback.
    function enemySprite(ctx,frame,x,y,height) {
      sprite(ctx,enemy,3,2,frame,x,y,height);
      if(!ready(face)||!ready(enemy))return;
      var heads=[[229,8,58,79],[747,8,58,81],[1231,10,65,83],[230,518,59,81],[728,524,63,86],[1240,582,69,88]];
      var h=heads[frame],k=height/512,w=height,dx=x-w/2+(h[0]%512)*k,dy=y-height+(h[1]%512)*k;
      ctx.save();ctx.beginPath();ctx.ellipse(dx+h[2]*k/2,dy+h[3]*k/2,h[2]*k/2,h[3]*k/2,0,0,Math.PI*2);ctx.clip();
      ctx.filter='sepia(0.35)';ctx.drawImage(face,174,18,116,161,dx,dy,h[2]*k,h[3]*k);ctx.restore();
    }
    function drawGuard(ctx,x,y,height) {
      enemySprite(ctx,0,x,y,height);ctx.fillStyle='#fff0d6';ctx.font='bold 18px system-ui';ctx.textAlign='center';ctx.fillText('Hitler',x,y-height-8);
    }
    function draw(ctx,width,height,dpr) {
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#101b2c';ctx.fillRect(0,0,width,height);
      if (ready(ring)) ctx.drawImage(ring,0,0,width,height);
      var s=height/390,cx=width/2,enemyFrame=0;
      if(bout){
        if(bout.mode==='victory')enemyFrame=5;
        else if(bout.phase==='tell')enemyFrame=bout.attack==='right'?2:1;
        else if(bout.phase==='strike')enemyFrame=bout.attack==='right'?4:3;
        else if(bout.flash>0)enemyFrame=5;
      }
      enemySprite(ctx,enemyFrame,cx,435*s,380*s);
      var shift=bout&&bout.dodgeTime>0?bout.dodge*88*s:0;
      var frame=bout&&bout.block?3:bout&&bout.punch>0?(Math.floor(bout.time*10)%2?1:2):0;
      sprite(ctx,hero,2,2,frame,cx+shift,470*s,280*s);
      if(bout){
        ctx.fillStyle='#371d20';ctx.fillRect(cx-120*s,32*s,240*s,10*s);
        ctx.fillStyle='#ec6257';ctx.fillRect(cx-120*s,32*s,240*s*bout.enemy/360,10*s);
      }
    }
    get('box-left').addEventListener('pointerdown',function(e){e.preventDefault();dodge(-1)});
    get('box-right').addEventListener('pointerdown',function(e){e.preventDefault();dodge(1)});
    get('box-punch').addEventListener('pointerdown',function(e){e.preventDefault();punch()});
    get('box-block').addEventListener('pointerdown',function(e){e.preventDefault();if(bout&&bout.mode==='fight')bout.block=true;if(e.currentTarget.setPointerCapture)e.currentTarget.setPointerCapture(e.pointerId)});
    ['pointerup','pointercancel','lostpointercapture'].forEach(function(event){get('box-block').addEventListener(event,function(){if(bout)bout.block=false})});
    get('box-pause').onclick=function(){if(!bout||bout.mode!=='fight')return;bout.mode='pause';modal('Paused','The bout resumes from this moment.','Resume')};
    get('box-start').onclick=function(){
      if(bout.mode==='lost')reset();
      bout.mode='fight';get('box-sheet').hidden=true;sync();
    };
    document.addEventListener('visibilitychange',function(){if(document.hidden&&bout&&bout.mode==='fight'){bout.mode='pause';bout.block=false;modal('Paused','The bout resumes from this moment.','Resume')}});
    return {start:start,stop:stop,update:update,draw:draw,drawGuard:drawGuard,ready:function(){return [enemy,hero,ring,face].every(ready)},
      // State and controls also support deterministic balance and progression checks.
      state:function(){return bout},dodge:dodge,punch:punch,begin:function(){get('box-start').click()}};
  }};
})();
