const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),hook=String.raw`
window.testExpansion=()=>{
 beginRun();hurt=999;
 if(eaves)return {stage,unchangedWidth:WORLD_W};
 const scale=flags?2:4;
 if(WORLD_BOTTOM-WORLD_TOP!==1740*scale)throw Error('Wrong vertical size');
 for(const roof of expansion.authored)if(Math.abs(roof.y-(300+(roof.authoredY-300)*scale))>.01)throw Error('Roof not vertically repositioned');
 if(escapeMode&&WORLD_W!==12870)throw Error('Escape not 1.5 times horizontal length');
 for(const item of objectives)if(!PLATFORMS.some(r=>Math.abs(r.y-item.y)<1&&item.x>=r.x&&item.x<=r.x+r.w))throw Error('Marker not on roof');
 if(flags&&(!crateBox().w||!snowball().r||smokeList().length!==2||!lanternBob().r))throw Error('Level 2 missing obstacle families');
 const sequences=[expansion.route,...expansion.branches];
 let reversals=0,up=0,down=0;
 for(const sequence of sequences)for(let i=1;i<sequence.length;i++){
  const a=sequence[i-1],b=sequence[i],dy=b.y-a.y,dx=b.x-a.x;
  if(dy<0)up++;if(dy>0)down++;if(dx<0)reversals++;
  if(Math.abs(dy)>105)throw Error('Unjumpable vertical route edge '+dy);
  const gap=Math.max(0,Math.abs(dx)-(a.roof.w+b.roof.w)/2+28);
  if(gap>195)throw Error('Unjumpable horizontal route edge '+gap);
 }
 if(!up||!down)throw Error('Route does not use vertical space');
 if(escapeMode){
  if(!reversals)throw Error('Escape route lacks backtracking');
  for(const roof of PLATFORMS.filter(r=>!r.permanent)){
   body.x=roof.x+roof.w/2;body.y=roof.y;stood=PLATFORMS.indexOf(roof);
   played=bombNext;updateBombing(0);
   if(!fallingBomb)throw Error('Bomb did not target roof');
   played=fallingBomb.due;updateBombing(0);
   if(!roof.destroyed)throw Error('Weak roof did not collapse');
  }
  if(PLATFORMS.some(r=>r.permanent&&r.destroyed))throw Error('Bomb destroyed permanent route');
  for(const point of expansion.route)if(point.roof.destroyed)throw Error('Route broken after every weak roof destroyed');
 }
 return {stage:stage||'escape',width:WORLD_W,height:WORLD_BOTTOM-WORLD_TOP,platforms:PLATFORMS.length,route:expansion.route.length,branches:expansion.branches.length,reversals};
};
window.testSearchlightContact=()=>{
 beginRun();gunfire=null;hostileShots=[];shotSerial=0;
 const light=SEARCHLIGHTS[0];played=(8-light.phase%8)%8;light.spottedCycle=-1;
 body.x=light.x;body.y=light.labelY+78;body.vx=body.vy=0;body.ground=false;hurt=999;
 camX=body.x-200;camY=body.y-250;
 if(!inSearchlight(light))throw Error('Visible character not detected by beam');
 update(0);
 if(!gunfire||shotSerial!==1)throw Error('Touching searchlight did not fire immediately');
 played+=3;
 for(let i=0;i<50;i++){if(searchlightState(light).active)throw Error('Searchlight break shorter than five seconds');played+=.0999;}
 return {touchStartsFire:true,firstShotImmediate:true,fiveSecondBreak:true};
};
window.testPersistentGunfire=()=>{
 beginRun();gunfire=null;hostileShots=[];shotSerial=0;hurt=999;
 const light=SEARCHLIGHTS[0];light.spottedCycle=-1;body.x=light.x;body.y=light.labelY+78;camX=body.x-200;camY=body.y-250;
 startGunfire(light);const start=played;
 for(let second=0;second<=9;second++){played=start+second;updateGunfire(0);}
 if(shotSerial!==10||!gunfire)throw Error('Soldiers stopped after four shots');
 body.x=gunfire.screen.right+200;updateGunfire(0);
 if(gunfire||shotSerial!==10)throw Error('Soldiers kept firing after leaving screen');
 return {stage:stage||'escape',shotsWhileVisible:10,stopsOutside:true};
};
window.testPermanentRoutePhysics=()=>{
 if(!escapeMode)return;
 beginRun();PLATFORMS.forEach(r=>{if(!r.permanent)r.destroyed=true});bombNext=Infinity;
 const permanent=PLATFORMS.map((r,i)=>({r,i})).filter(p=>p.r.permanent),reached=new Set([0]),queue=[0];let trials=0;
 for(let q=0;q<queue.length;q++){
  const source=PLATFORMS[queue[q]];
  const candidates=permanent.filter(p=>!reached.has(p.i)&&p.r.y-source.y>=-190&&p.r.y-source.y<=900&&Math.max(source.x-(p.r.x+p.r.w),p.r.x-(source.x+source.w),0)<270)
    .sort((a,b)=>Math.abs(a.r.y-source.y)+Math.abs(a.r.x-source.x)-Math.abs(b.r.y-source.y)-Math.abs(b.r.x-source.x)).slice(0,24);
  for(const candidate of candidates){
   const target=candidate.r;
   for(const variant of [0,1]){
    trials++;state='play';falls=0;placeOn(queue[q]);hurt=999;gunfire=null;hostileShots=[];bombNext=Infinity;fallingBomb=null;
    let center=target.x+target.w/2;
    const downOverlap=target.y>source.y&&target.x<source.x+source.w&&target.x+target.w>source.x;
    const outward=variant?1:target.x+target.w>source.x+source.w?1:-1;
    body.x=downOverlap?(outward>0?source.x+source.w-18:source.x+18):clamp(center,source.x+18,source.x+source.w-18);body.y=source.y;body.ground=true;
    held.left=held.right=held.climb=false;if(!downOverlap)requestJump();let second=false,departed=false;
    for(let tick=0;tick<260;tick++){
     let aim=center;if(downOverlap&&body.y<source.y+18)aim=outward>0?source.x+source.w+30:source.x-30;
     const dx=aim-body.x-body.vx*.1;held.left=dx<-10;held.right=dx>10;
     if(!downOverlap&&!second&&!body.ground&&body.vy>-70){requestJump();second=true;}
     played+=.01;update(.01);
     if(state==='boxing')return {reachablePermanent:reached.size,trials,goalReached:true};
     if(!body.ground||stood!==queue[q])departed=true;
     if(departed&&body.ground&&stood!==queue[q]&&PLATFORMS[stood].permanent){
      if(!reached.has(stood)){reached.add(stood);queue.push(stood);}
      if(stood===GOAL)return {reachablePermanent:reached.size,trials,goalReached:true};
      break;
     }
     if(falls)break;
    }
   }
  }
 }
 throw Error('No physical permanent-only route to goal '+JSON.stringify({reached:reached.size,trials,maxX:Math.max(...[...reached].map(i=>PLATFORMS[i].x)),goal:PLATFORMS[GOAL].x}));
};
window.testIncomingBoxingDamage=()=>{
 if(!escapeMode)return;
 const results=[];
 const combinations=[
  {attack:'left',loss:1},
  {attack:'right',loss:1},
  {attack:'straight',loss:1},
  {attack:'upper',loss:2},
  {attack:'left',dodge:1,loss:0},
  {attack:'right',dodge:-1,loss:0},
  {attack:'left',dodge:-1,loss:1},
  {attack:'upper',dodge:1,loss:0},
  {attack:'straight',block:true,loss:0},
  {attack:'right',block:true,loss:0},
  {attack:'upper',block:true,loss:2}
 ];
 for(const sample of combinations){
  beginRun();body.x=GUARD_X;body.y=PLATFORMS[GOAL].y;checkBoarding();fight.begin();
  const bout=fight.state();
  bout.phase='tell';bout.attack=sample.attack;bout.timer=.12;
  if(sample.dodge)fight.dodge(sample.dodge);
  if(sample.block)bout.block=true;
  for(let i=0;i<8;i++)fight.update(.02);
  if(bout.max-bout.hp!==sample.loss)throw Error('Unexpected damage for '+JSON.stringify(sample));
  const badge=document.getElementById('box-player-hit');
  if(sample.loss&&(badge.hidden||badge.textContent!=='−'+sample.loss+' HP'))throw Error('Player damage feedback was not shown');
  if(!sample.loss&&!badge.hidden)throw Error('Damage feedback shown for a successful defense');
  const expectedBlur=sample.loss ? {straight:1,left:2,right:2,upper:3}[sample.attack] : 0;
  if(bout.hitVisionDuration!==expectedBlur)throw Error('Incorrect blur duration for '+JSON.stringify(sample));
  render(0);
  if(Boolean(canvas.style.filter)!==Boolean(expectedBlur))throw Error('Blur rendered without a hit or missing after impact');
  if(expectedBlur){
   bout.phase='stun';bout.timer=5;
   fight.update(bout.hitVision-.05);
   render(0);
   if(!canvas.style.filter)throw Error('Blur ended early');
   fight.update(.06);
   render(0);
   if(canvas.style.filter)throw Error('Blur persisted after the hit effect ended');
  }
  results.push(sample);
 }
 return {attackAndDefenseCases:results.length};
};
window.testBoxing=()=>{
 if(!escapeMode)return;
 beginRun();body.x=GUARD_X;body.y=PLATFORMS[GOAL].y;checkBoarding();
 if(state!=='boxing'||fight.state().mode!=='intro')throw Error('Guard contact did not start boxing intro');
 fight.begin();let bout=fight.state(),guardHp=bout.enemy;
 const tap=(button)=>document.getElementById(button).click();
 const step=(ticks)=>{for(let i=0;i<ticks;i++)fight.update(.02);};
 if(guardHp<=530)throw Error('Boss health did not increase');
 tap('box-punch-left');step(16);
 if(bout.enemy!==guardHp||!bout.cue.startsWith('He dodged'))throw Error('First covered punch was not dodged');
 tap('box-punch-left');step(16);
 if(bout.enemy!==guardHp||!bout.cue.startsWith('He dodged'))throw Error('Second covered punch was not dodged');
 tap('box-punch-right');step(19);
 if(bout.enemy!==guardHp-3||bout.lastImpact!=='right')throw Error('Open right punch did not land');
 tap('box-uppercut');step(12);
 if(bout.enemy!==guardHp-9||bout.phase!=='stun'||bout.stars!==0||bout.timer!==3)throw Error('Uppercut did not break the guard and stun');
 const trentHealth=bout.hp;
 step(12);tap('box-punch-left');step(16);
 if(bout.enemy!==guardHp-11||bout.lastImpact!=='left'||bout.hp!==trentHealth)throw Error('Stun did not open both sides and prevent attacks');
 while(bout.timer>.04)step(1);
 if(bout.phase!=='stun')throw Error('Stun ended before three seconds');
 step(3);
 if(bout.phase!=='guard'||bout.guardSide!==1)throw Error('Guard did not switch sides after the stun');
 tap('box-punch-right');step(19);
 if(bout.enemy!==guardHp-11||!bout.cue.startsWith('He dodged'))throw Error('Covered right punch was not dodged');
 tap('box-punch-left');
 bout.timer=.02;step(5);
 if(bout.enemy!==guardHp-13||bout.lastImpact!=='left')throw Error('A punch aimed at an open side missed during a phase change');
 let ticks=0,leftHits=0,rightHits=0,upperHits=0,previousHp=bout.enemy;
 while(fight.state().mode==='fight'&&ticks++<30000){
  bout=fight.state();
  if(bout.phase==='tell'&&bout.dodgeCool<=0&&bout.timer<.27)fight.dodge(bout.attack==='left'?1:-1);
  const dodgingTight=bout.phase==='tell'&&bout.timer<.46;
  if(!bout.punch&&bout.stamina>=17&&!dodgingTight){
   if(bout.stars&&bout.phase!=='stun'&&bout.dodgeTime===0)tap('box-uppercut');
   else if(bout.phase!=='tell'||bout.dodgeTime===0) {
    const rightOpen=document.getElementById('box-punch-right').classList.contains('open-side');
    tap(rightOpen?'box-punch-right':'box-punch-left');
   }
  }
  fight.update(.02);
  if(bout.enemy<previousHp){
   if(bout.lastImpact==='left')leftHits++;
   if(bout.lastImpact==='right')rightHits++;
   if(bout.lastImpact==='upper')upperHits++;
   previousHp=bout.enemy;
  }
 }
 if(!leftHits||!rightHits||!upperHits)throw Error('Missing a successful hit type');
 const seconds=fight.state().time;
 if(fight.state().enemy!==0||seconds<270||seconds>350)throw Error('Bout balance or counters failed '+JSON.stringify({seconds,mode:fight.state().mode,hp:fight.state().hp,enemy:fight.state().enemy}));
 fight.update(1.3);if(state!=='win'||!bossBeaten)throw Error('Defeating Hitler did not win');
 beginRun();body.x=GUARD_X;body.y=PLATFORMS[GOAL].y;checkBoarding();fight.begin();
 for(let i=0;i<10000&&fight.state().mode==='fight';i++)fight.update(.02);
 if(fight.state().mode!=='lost')throw Error('Cannot lose boss fight');
 fight.begin();if(fight.state().enemy!==guardHp||fight.state().hp!==fight.state().max||fight.state().time!==0)throw Error('Retry is not a fresh continuous bout');
 document.getElementById('box-pause').click();const time=fight.state().time;fight.update(5);
 if(fight.state().time!==time)throw Error('Boxing pause failed');fight.begin();
 return {seconds,leftHits,rightHits,upperHits,continuous:true,fullRetry:true};
};
window.previewExpansion=()=>{
 beginRun();if(escapeMode){body.x=GUARD_X-190;body.y=PLATFORMS[GOAL].y;stood=GOAL;}
 else if(flags){body.x=objectives[0].x-200;body.y=objectives[0].y+200;}
 camSnap=true;render(.02);renderHud();
};
window.testMarkerRoutePhysics=()=>{
 if(!flags)return;
 beginRun();PLATFORMS.forEach(r=>{if(!r.permanent)r.destroyed=true});bombNext=Infinity;
 const permanent=PLATFORMS.map((r,i)=>({r,i})).filter(p=>p.r.permanent),reached=new Set([0]),queue=[0];let trials=0;
 for(let q=0;q<queue.length;q++){
  const source=PLATFORMS[queue[q]];
  const candidates=permanent.filter(p=>!reached.has(p.i)&&p.r.y-source.y>=-190&&p.r.y-source.y<=900&&Math.max(source.x-(p.r.x+p.r.w),p.r.x-(source.x+source.w),0)<270)
    .sort((a,b)=>Math.abs(a.r.y-source.y)+Math.abs(a.r.x-source.x)-Math.abs(b.r.y-source.y)-Math.abs(b.r.x-source.x)).slice(0,24);
  for(const candidate of candidates){
   const target=candidate.r;
   for(const variant of [0,1]){
    trials++;state='play';falls=0;placeOn(queue[q]);hurt=999;gunfire=null;hostileShots=[];bombNext=Infinity;fallingBomb=null;
    let center=target.x+target.w/2;
    const downOverlap=target.y>source.y&&target.x<source.x+source.w&&target.x+target.w>source.x;
    const outward=variant?1:target.x+target.w>source.x+source.w?1:-1;
    body.x=downOverlap?(outward>0?source.x+source.w-18:source.x+18):clamp(center,source.x+18,source.x+source.w-18);body.y=source.y;body.ground=true;
    held.left=held.right=held.climb=false;if(!downOverlap)requestJump();let second=false,departed=false,capJump=false;
    for(let tick=0;tick<440;tick++){
     let aim=center;if(downOverlap&&body.y<source.y+18)aim=outward>0?source.x+source.w+30:source.x-30;
     const dx=aim-body.x-body.vx*.1;held.left=dx<-10;held.right=dx>10;
     if(!downOverlap&&!second&&!body.ground&&body.vy>-70){requestJump();second=true;}
     held.climb=!!body.climbing||!!nearChimney();if(body.ground&&body.y<source.y-10&&!capJump){held.climb=false;requestJump();second=false;capJump=true;}played+=.01;update(.01);
     if(state==='boxing')return {reachablePermanent:reached.size,trials,goalReached:true};
     if(!body.ground||stood!==queue[q])departed=true;
     if(departed&&body.ground&&stood!==queue[q]&&PLATFORMS[stood].permanent){
      if(!reached.has(stood)){reached.add(stood);queue.push(stood);}
      if(reached.has(GOAL)&&objectives.every(item=>[...reached].some(i=>Math.abs(PLATFORMS[i].y-item.y)<1&&item.x>=PLATFORMS[i].x&&item.x<=PLATFORMS[i].x+PLATFORMS[i].w)))return {reachablePermanent:reached.size,trials,goalAndMarkersReached:true};
      break;
     }
     if(falls)break;
    }
   }
  }
 }
 throw Error('No physical permanent-only route to goal '+JSON.stringify({reached:reached.size,trials,maxX:Math.max(...[...reached].map(i=>PLATFORMS[i].x)),goal:PLATFORMS[GOAL].x}));
};
window.boxAssetsReady=()=>!fight||fight.ready();window.previewBoss=()=>{beginRun();state="boxing";fight.start();fight.begin();render(.02)};window.refreshPreview=()=>render(.02);
`;
(async()=>{const browser=await webkit.launch();try{
 const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});
 await page.addInitScript(()=>window.requestAnimationFrame=()=>0);
 await page.route('http://localhost/**',route=>{
  const pathname=new URL(route.request().url()).pathname,file=path.join(root,pathname.endsWith('/')?pathname+'index.html':pathname);
  if(pathname.endsWith('/chimney-road/game.js'))return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(file,'utf8').replace(/\}\)\(\);\s*$/,hook+'})();')});
  if(/\.(mp3|wav)$/.test(pathname))return route.fulfill({status:204});
  return fs.existsSync(file)?route.fulfill({path:file}):route.fulfill({status:404});
 });
 for(const stage of ['the-eaves','above-the-lanterns','']){
  await page.goto('http://localhost/chimney-road/?stage='+stage);
  console.log('MAP',await page.evaluate(()=>testExpansion()));
  console.log('CONTACT',await page.evaluate(()=>testSearchlightContact()));
  console.log('FIRE',await page.evaluate(()=>testPersistentGunfire()));
  console.log('MARKER ROUTE',await page.evaluate(()=>testMarkerRoutePhysics()));
  console.log('ROUTE',await page.evaluate(()=>testPermanentRoutePhysics()));
  console.log('INCOMING',await page.evaluate(()=>testIncomingBoxingDamage()));
  console.log('BOSS',await page.evaluate(()=>testBoxing()));
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
