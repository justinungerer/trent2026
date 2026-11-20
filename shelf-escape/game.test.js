'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'game.js'),'utf8');

function game(query=''){
 const listeners={};
 const element=()=>({style:{},textContent:'',innerHTML:'',hidden:false,handlers:{},addEventListener(type,fn){this.handlers[type]=fn},querySelector(){return {style:{}}},setPointerCapture(){},getBoundingClientRect(){return {left:0,top:0,width:100,height:100}}});
 const elements={};for(const id of ['world','move','fire','jump','title','brief','equipment','action','sheet','pause','objective','progress','health','ammo','hint'])elements[id]=element();
 elements.world.getContext=()=>({setTransform(){}});
 const host={messages:[],postMessage(message,origin){this.messages.push({message,origin})}};
 const sandbox={document:{getElementById:id=>elements[id],addEventListener(){},hidden:false},location:{search:query},parent:host,
  addEventListener:(type,fn)=>{listeners[type]=fn},URL,URLSearchParams,Math,Set,Image:class {},matchMedia:()=>({matches:false}),requestAnimationFrame(){}};
 sandbox.window=sandbox;
 vm.createContext(sandbox);vm.runInContext(source,sandbox);
 return {sandbox,host,listeners,elements,run:code=>vm.runInContext(code,sandbox)};
}

test('all reachable quiz loadouts complete through the actual mission update loop',()=>{
 for(const [charges,reload,ribbon] of [['2','slow','plain'],['4','fast','enchanted'],['2','fast','enchanted'],['4','slow','enchanted'],['4','fast','plain'],['2','slow','enchanted'],['2','fast','plain'],['4','slow','plain']]){
  const {run}=game(`?charges=${charges}&reload=${reload}&ribbon=${ribbon}`);
  const result=run(`start();let steps=0;while(state==='playing'&&steps++<30000){
   keys.clear();const count=relays.filter(r=>r.done).length;
   const target=missionTarget().x;
   let goal=target;
   if(ammo===0&&startingAmmo){const box=supplies.filter((x,index)=>!collectedSupplies.has(index)&&(x<=player.x||!gates.some((g,i)=>!relays[i].done&&player.x<=g-20&&x>g-20)&&!locks.some(l=>!l.done&&player.x<=l.x+250&&x>l.x+250))).sort((a,b)=>Math.abs(a-player.x)-Math.abs(b-player.x))[0];if(box!==undefined)goal=box}
   if(player.x<goal-3)keys.add('d');else if(player.x>goal+3)keys.add('a');
   const dir=goal>=player.x?1:-1;
   const hurdle=hurdles.find(o=>Math.sign(o.x-player.x)===dir&&Math.abs(o.x-player.x)<86&&player.y<o.clear);
   const alarm=missionTarget().hint==='ALARM RELAY'&&goal===target&&Math.abs(player.x-target)<48&&player.y<112;
   const threat=guards.some(g=>g.hp>0&&Math.abs(g.x-player.x)<200)||guardShots.some(s=>Math.abs(s.x-player.x)<180);
   if(hurdle||alarm||(threat&&player.y<12))keys.add('w');
   const enemy=guards.filter(x=>x.hp>0&&Math.abs(x.x-player.x)<340).sort((a,b)=>Math.abs(a.x-player.x)-Math.abs(b.x-player.x))[0];
   if((enemy||(missionTarget().action==='shoot'&&Math.abs(player.x-target)<10))&&!shots.length&&elapsed>=nextShot&&player.y<8)keys.add(' ');update(.02);
  } JSON.stringify({state,x:player.x,hp:player.hp,elapsed,documents:documents.filter(d=>d.found).length,relays:relays.filter(r=>r.done).length,transmit,locks:locks.filter(l=>l.done).length,ammo,startingAmmo,damage,reload})`);
  const value=JSON.parse(result);
  assert.equal(value.state,'won',`${charges} ${reload} ${ribbon} ${result}`);
  assert.equal(value.documents,3);assert.equal(value.relays,3);assert.equal(value.transmit,4);assert.equal(value.locks,3);
  assert.equal(value.startingAmmo,charges==='2'?12:24);
  assert.equal(value.damage,ribbon==='plain'?1:2);
  assert.equal(value.reload,reload==='slow'?.57:.27);
 }
});

test('Level 3 requires all three sorting bays, the radio, and the final delivery',()=>{
 const {run}=game('?stage=the-last-dispatch&charges=2&reload=slow&ribbon=plain');
 const result=JSON.parse(run(`start();player.x=exitX;update(0);
  const exitLocked=state==='playing';
  player.x=100;
  const firstLock=locks[0];
  shots=[{x:firstLock.x,y:394,vx:0,vy:0}];update(0);
  const earlyShotIgnored=!firstLock.done;
  shots=[];
  let steps=0;
  while(state==='playing'&&steps++<20000){
   keys.clear();
   const target=missionTarget(),dir=target.x>=player.x?1:-1;
   if(Math.abs(target.x-player.x)>3)keys.add(dir===1?'d':'a');
   const hurdle=hurdles.find(o=>Math.sign(o.x-player.x)===dir&&Math.abs(o.x-player.x)<86&&player.y<o.clear);
   const bell=target.hint==='ALARM RELAY'&&Math.abs(player.x-target.x)<36;
   const enemy=guards.find(g=>g.hp>0&&Math.abs(g.x-player.x)<190);
   const enemyShot=guardShots.some(shot=>Math.abs(shot.x-player.x)<180);
   if(hurdle||bell||((enemy||enemyShot)&&player.y<12&&Math.abs(target.x-player.x)>12))keys.add('w');
   if((enemy||(target.action==='shoot'&&Math.abs(target.x-player.x)<10))&&!shots.length&&elapsed>=nextShot&&player.y<8)keys.add(' ');
   update(.02);
  }
  JSON.stringify({exitLocked,earlyShotIgnored,state,papers:documents.flatMap(doc=>doc.pages).filter(page=>page.found).length,
   diverters:documents.filter(doc=>doc.diverted).length,alarms:relays.filter(relay=>relay.done).length,
   latches:locks.filter(lock=>lock.done).length,transmit,x:player.x})`));
 assert.ok(result.x>=8026,JSON.stringify(result));
 const {x,...completed}=result;
 assert.deepEqual(completed,{exitLocked:true,earlyShotIgnored:true,state:'won',papers:6,diverters:3,alarms:3,latches:3,transmit:4});
});

test('local handshake checks parent origin and source, then reports completion once',()=>{
 const origin='http://127.0.0.1:18764', {host,listeners,run}=game(`?parentOrigin=${encodeURIComponent(origin)}`);
 assert.equal(host.messages[0].message.type,'trent:ready');
 const init={type:'trent:init',version:1,runId:'current'};
 listeners.message({source:{},origin,data:init});
 listeners.message({source:host,origin:'http://evil.example',data:init});
 assert.equal(run('session ?? null'),null);
 listeners.message({source:host,origin,data:init});
 run(`start();overlay('won','won','won','continue');$('action').onclick();$('action').onclick()`);
 assert.equal(host.messages.length,2);
 assert.equal(host.messages[1].message.runId,'current');
 assert.equal(host.messages[1].message.type,'trent:complete');
 const remote=game('?parentOrigin=http%3A%2F%2Fexample.com');
 assert.equal(remote.host.messages.length,0);
});

test('failure retry resets the earned loadout and pause clears input',()=>{
 const {run}=game('?charges=2&ribbon=plain');
 const result=JSON.parse(run(`start();keys.add('d');pause();const paused=state==='paused'&&keys.size===0;
 start();let steps=0;while(state==='playing'&&steps++<2000){keys.add('d');update(.02)}
 const failed=state;start();JSON.stringify({paused,failed,ammo,hp:player.hp,x:player.x})`));
 assert.deepEqual(result,{paused:true,failed:'lost',ammo:12,hp:3,x:100});
});

test('crate concealment prevents ranged targeting until Buddy moves or fires',()=>{
 const {run}=game();
 const result=JSON.parse(run(`start();player.x=420;guards=[{x:540,home:540,hp:2,kind:'rifleman',dir:1,stun:0,attack:0,cooldown:0}];
 keys.add('s');update(.02);const hidden=player.hidden&&!guards[0].windup&&player.hp===3;
 keys.add(' ');update(.02);const exposed=!player.hidden&&guards[0].windup>0;
 keys.delete(' ');keys.add('d');update(.02);
 JSON.stringify({hidden,exposed,moving:!player.hidden})`));
 assert.deepEqual(result,{hidden:true,exposed:true,moving:true});
});

test('both guard types inflict one contact hit and drop two rounds per defeat in every level',()=>{
 for(const stage of ['out-of-the-cell','','the-last-dispatch']){
  for(const kind of ['rifleman','charger']){
   const {run}=game('?ribbon=plain&stage='+stage);
   const result=JSON.parse(run(`start();
    const guard={x:650,home:650,hp:2,kind:'${kind}',dir:-1,stun:1,attack:0,cooldown:10};
    guards=[guard];player.x=650;player.y=110;update(0);
    const jumped=player.hp===3;
    player.y=0;update(.02);update(.02);
    const contact=player.hp===2&&player.shield>0;
    player.x=500;ammo=0;
    shots=[{x:650,y:400,vx:0,vy:0}];update(.02);
    const nonfatal=guard.hp===1&&ammoDrops.length===0;
    shots=[{x:650,y:400,vx:0,vy:0}];update(.02);
    const defeated=guard.hp===0&&ammoDrops.length===1;
    player.x=650;
    update(.3);update(.02);
    const collected=ammo===2&&ammoDrops.length===0&&player.hp===2;
    JSON.stringify({jumped,contact,nonfatal,defeated,collected})`));
   assert.deepEqual(result,{jumped:true,contact:true,nonfatal:true,defeated:true,collected:true},stage+' '+kind);
  }
 }
});

test('shots and guard hits drive real animation state timers',()=>{
 const {run}=game('?ribbon=plain');
 const result=JSON.parse(run(`start();guards=[{x:160,home:160,hp:2,dir:-1,stun:0,attack:0,cooldown:2}];
 keys.add(' ');update(.02);const firing=player.fire>0;
 update(.05);const guardHurt=guards[0].stun>0;
 player.x=100;guards[0].x=240;player.shield=0;guards[0].stun=0;guards[0].cooldown=0;keys.clear();update(.02);for(let n=0;n<40;n++)update(.02);
 JSON.stringify({firing,guardHurt,guardAttack:guards[0].attack>0,guardProjectile:guardShots.length>0})`));
 assert.deepEqual(result,{firing:true,guardHurt:true,guardAttack:true,guardProjectile:true});
});

test('yard gates require their objectives and ammo boxes add two rounds once',()=>{
 const {run}=game('?charges=2');
 const result=JSON.parse(run(`start();guards=[];player.x=2579;keys.add('d');update(.02);
 const closed=player.x===2580;
 relays[0].done=true;update(.02);const open=player.x>2580;
 player.x=300;keys.clear();ammo=0;shotsUsed=19;player.hp=1;update(.02);
 const first={ammo,hp:player.hp,used:shotsUsed};player.x=350;update(.02);player.x=300;ammo=0;player.hp=1;update(.02);
 JSON.stringify({closed,open,first,second:{ammo,hp:player.hp,used:shotsUsed}})`));
 assert.deepEqual(result,{closed:true,open:true,first:{ammo:2,hp:2,used:19},second:{ammo:0,hp:1,used:19}});
});

test('a locked starting weapon can collect a two-shot ammo box once',()=>{
 const {run}=game('?weapon=locked&stage=out-of-the-cell');
 const result=JSON.parse(run(`start();guards=[];player.x=supplies[0];update(0);
 const first=ammo;player.x+=80;update(0);player.x=supplies[0];update(0);
 const second=ammo;overlay('lost','lost','lost','retry');start();
 const restored=collectedSupplies.size===0&&ammo===0;
 JSON.stringify({first,second,restored})`));
 assert.deepEqual(result,{first:2,second:2,restored:true});
});

test('boxes stop low rifle shots and the down stick evades high shots',()=>{
 const {run}=game();
 const result=JSON.parse(run(`start();guards=[];player.x=480;
 const rifle={x:350,dir:1};
 fireGuardShot(rifle);fireGuardShot(rifle);
 const heights=guardShots.map(shot=>shot.y);
 update(.4);
 const highCrossedBox=player.hp===2&&guardShots.length===0;
 player.shield=0;sticks.move.x=.16;sticks.move.y=.9;
 guardShots=[{x:350,y:highShotY,vx:340}];update(.4);
 const ducked=player.ducking&&player.x===480&&player.hp===2;
 player.x=650;
 guardShots=[{x:550,y:lowShotY,vx:340}];update(.4);
 const lowHitWhileDucking=player.hp===1;
 JSON.stringify({heights,highCrossedBox,ducked,lowHitWhileDucking})`));
 assert.deepEqual(result,{heights:[420,382],highCrossedBox:true,ducked:true,lowHitWhileDucking:true});
});

test('the exit key is the final pickup and is required in every level',()=>{
 for(const stage of ['out-of-the-cell','','the-last-dispatch']){
  const {run}=game('?stage='+stage);
  const result=JSON.parse(run(`start();guards=[];
   player.x=exitKeyX;update(0);
   const earlyKeyIgnored=!exitKeyFound;
   if(cell)packageFound=true;
   else{transmit=4;relays.forEach(relay=>relay.done=true);locks.forEach(lock=>lock.done=true);}
   player.x=exitX;update(0);
   const locked=state==='playing'&&missionTarget().hint==='EXIT KEY';
   player.x=exitKeyX;update(0);
   const collected=exitKeyFound&&missionTarget().x===exitX;
   player.x=exitX;update(0);
   JSON.stringify({earlyKeyIgnored,locked,collected,state})`));
  assert.deepEqual(result,{earlyKeyIgnored:true,locked:true,collected:true,state:'won'},stage);
 }
});

test('collecting the order pages triggers one alarm reinforcement',()=>{
 const {run}=game();
 const result=JSON.parse(run(`start();guards=[];documents[0].pages[0].found=true;documents[0].pages[1].found=true;
 player.x=documents[0].pages[2].x;update(.02);update(.02);
 JSON.stringify({found:documents[0].found,reinforcements:guards.length,notice:alarmNotice>0})`));
 assert.deepEqual(result,{found:true,reinforcements:1,notice:true});
});

test('completion reports total fired shots after resupply, not net magazine use',()=>{
 const origin='http://127.0.0.1:18764', {host,listeners,run}=game(`?charges=2&parentOrigin=${encodeURIComponent(origin)}`);
 listeners.message({source:host,origin,data:{type:'trent:init',version:1,runId:'refill'}});
 run(`start();shotsUsed=19;ammo=12;overlay('won','won','won','continue');$('action').onclick()`);
 assert.equal(host.messages[1].message.chargesUsed,19);
});

test('empty taps and cancelled touches cannot prevent hiding or fire after resupply',()=>{
 for(const end of ['pointerup','pointercancel','lostpointercapture']){
  const {run,elements}=game('?charges=2');
  run(`start();guards=[];ammo=0;player.x=420;keys.add('s')`);
  const event={pointerId:1,clientX:50,clientY:50};
  elements.fire.handlers.pointerdown(event);elements.fire.handlers[end](event);
  const result=JSON.parse(run(`update(.02);const hidden=player.hidden;player.x=300;keys.clear();update(.02);JSON.stringify({hidden,ammo,shotsUsed,queued:fireQueued})`));
  assert.deepEqual(result,{hidden:true,ammo:2,shotsUsed:0,queued:false},end);
 }
});

test('a short valid tap fires once, while cancellation and cooldown taps do not queue later shots',()=>{
 const {run,elements}=game();
 const event={pointerId:1,clientX:50,clientY:50};
 run('start();guards=[]');
 elements.fire.handlers.pointerdown(event);elements.fire.handlers.pointerup(event);
 assert.equal(run('update(.02);shotsUsed'),1);
 elements.fire.handlers.pointerdown(event);elements.fire.handlers.pointerup(event);
 assert.equal(run('update(.4);shotsUsed'),1);
 elements.fire.handlers.pointerdown(event);elements.fire.handlers.pointercancel(event);
 assert.equal(run('update(.02);shotsUsed'),1);
});

test('alarm bells need a jump and boxes block the ground',()=>{
 const {run}=game();
 const result=JSON.parse(run(`start();guards=[{x:500,home:500,hp:2,dir:-1,stun:0,attack:0,cooldown:0}];player.x=400;player.y=0;update(.02);const cooldown=guards[0].cooldown;
  guards=[];documents[0].found=true;documents[0].pages.forEach(p=>p.found=true);
  player.x=relays[0].x;player.y=0;player.vy=0;update(.02);const grounded=!relays[0].done;
  player.vy=760;for(let n=0;n<40;n++)update(.02);const jumped=relays[0].done;
  player.y=0;player.vy=0;player.x=hurdles[0].x-90;keys.add('d');for(let n=0;n<40;n++)update(.02);
  const blocked=player.x<hurdles[0].x-hurdles[0].half;
  keys.clear();player.y=90;player.vy=0;player.x=hurdles[0].x;keys.add('d');update(.02);
  const cleared=player.x>hurdles[0].x;
  JSON.stringify({grounded,jumped,blocked,cleared,cooldown,alertedFire,calmFire})`));
 assert.equal(result.grounded,true);
 assert.equal(result.jumped,true);
 assert.equal(result.blocked,true);
 assert.equal(result.cleared,true);
 assert.ok(Math.abs(result.cooldown-3.5/1.3)<1e-9);
 assert.ok(Math.abs(result.alertedFire-3.5/1.3)<1e-12);
 assert.ok(Math.abs(result.calmFire-5/1.3)<1e-12);
});

test('defeated guards return only when their defeat and patrol positions leave the view',()=>{
 for(const stage of ['', 'out-of-the-cell', 'the-last-dispatch']){
  const {run}=game('?stage='+stage);
  const result=JSON.parse(run(`start();W=960;
   const guard={x:500,home:950,hp:1,dir:-1,kind:'charger',stun:0,attack:0,cooldown:1};
   guards=[guard];shots=[{x:500,y:400,vx:0,vy:0}];update(.02);
   const defeated=guard.hp<=0&&wraps.length===1;
   player.x=supplies[0];update(.02);
   for(let tick=0;tick<125;tick++)update(.02);
   const afterPickup=guard.hp<=0&&wraps.length===1&&collectedSupplies.has(0);
   camera=630;updateDefeatedGuards(0);
   const stillInView=guard.hp<=0&&wraps.length===1;
   camera=1100;updateDefeatedGuards(0);
   const respawned=guard.hp===1&&guard.x===guard.home&&wraps.length===0;
   JSON.stringify({defeated,afterPickup,stillInView,respawned})`));
  assert.deepEqual(result,{defeated:true,afterPickup:true,stillInView:true,respawned:true},stage);
 }
});

test('low frame rates advance real time in small steps and bound long stalls',()=>{
 const {run}=game();
 const result=JSON.parse(run(`start();guards=[];render=()=>{};keys.add('d');last=0;
 frame(1000);frame(1050);const at20={elapsed,x:player.x};
 frame(1150);const at10={elapsed,x:player.x};
 frame(2150);JSON.stringify({at20,at10,stalled:{elapsed,x:player.x}})`));
 assert.ok(Math.abs(result.at20.elapsed-.05)<1e-9);
 assert.ok(Math.abs(result.at20.x-109.5)<1e-9);
 assert.ok(Math.abs(result.at10.elapsed-.15)<1e-9);
 assert.ok(Math.abs(result.at10.x-128.5)<1e-9);
 assert.ok(Math.abs(result.stalled.elapsed-.4)<1e-9);
 assert.ok(Math.abs(result.stalled.x-176)<1e-9);
});
