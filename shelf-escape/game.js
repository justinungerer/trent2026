'use strict';
const $=id=>document.getElementById(id);
const canvas=$('world'),g=canvas.getContext('2d'),W=960,H=540;
const params=new URLSearchParams(location.search);
const startingAmmo=params.get('weapon')==='locked'?0:params.get('charges')==='2'?12:24;
const damage=params.get('ribbon')==='plain'?1:2;
const reload=params.get('reload')==='slow'?.57:.27;
const art=Object.fromEntries(['elf-idle','elf-walk','elf-fire','elf-hurt','elf-die','guard-idle','guard-walk','guard-attack','guard-hurt','guard-die'].map(name=>{const img=new Image();img.src='./art/animated/'+name+'.png';return [name,img]}));
const keys=new Set(),sticks={move:{id:null,x:0,y:0},fire:{id:null,x:0,y:0}};
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
const snow=Array.from({length:80},(_,i)=>({x:(i*197.37)%W,y:(i*113.91)%H,size:0.6+i%3*.45,speed:14+i%4*11,depth:i%2?.28:.65}));
const worldEnd=14300, crates=[420,1000,1600,2300,3000,3500,4200,5000,5750,6300,7000,7800,8500,9200,9800,10400,11200,12200,13200,13800];
const supplies=[300,2900,5700,8500,10300,11400,12500];
let state='intro',player,guards,shots,guardShots,particles,wraps,relays,documents,gates,locks,terminal,elapsed,camera,ammo,shotsUsed,nextShot,transmit,finished,session,atSupply,medicalUsed,alarmNotice,fireQueued=false;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const origin=params.get('parentOrigin');
if(parent!==window&&origin){try{const u=new URL(origin);if(u.origin===origin&&(u.protocol==='https:'||(u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname)))){
 window.addEventListener('message',e=>{if(e.source===parent&&e.origin===origin&&e.data?.type==='trent:init'&&e.data.version===1&&typeof e.data.runId==='string')session={origin,runId:e.data.runId}});
 parent.postMessage({type:'trent:ready',version:1,mission:'shelf-escape'},origin);
}}catch{}}
function clearInput(){keys.clear();fireQueued=false;for(const name of ['move','fire']){Object.assign(sticks[name],{id:null,x:0,y:0});$(name).querySelector('span').style.transform=''}}
for(const name of ['move','fire']){
 const pad=$(name),stick=sticks[name];
 function move(e){if(stick.id!==e.pointerId)return;const r=pad.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,scale=Math.max(r.width*.36,Math.hypot(x,y));stick.x=x/scale;stick.y=y/scale;pad.querySelector('span').style.transform=`translate(${stick.x*28}px,${stick.y*28}px)`}
 pad.addEventListener('pointerdown',e=>{if(state!=='playing'||stick.id!==null)return;stick.id=e.pointerId;if(name==='fire')fireQueued=ammo>0&&elapsed>=nextShot;pad.setPointerCapture(e.pointerId);move(e)});
 pad.addEventListener('pointermove',move);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(type,e=>{if(stick.id===e.pointerId){if(type!=='pointerup'&&name==='fire')fireQueued=false;stick.id=null;stick.x=stick.y=0;pad.querySelector('span').style.transform=''}});
}
function reset(){
 player={x:100,hp:3,shield:0,face:1,aim:0,fire:0,dying:0,moving:false};guards=[700,1450,2200,3200,4100,5000,6000,6900,7700,8650,9600,10350,11200,12150,13200,13800].map((x,i)=>({x,home:x,hp:2,dir:i%2?1:-1,stun:0,attack:0,cooldown:1.8+i%3*.4}));
 shots=[];guardShots=[];particles=[];wraps=[];
 documents=[{x:1600,name:'transport orders',found:false,pages:[{x:1350,found:false},{x:1600,found:false},{x:2250,found:false}]},{x:4300,name:'switchyard key',found:false,routes:[3150,4850,3700],route:0},{x:7000,name:'radio cipher',found:false,power:[7700,6600],step:0}];
 relays=[950,3500,6200].map(x=>({x,progress:0,done:false}));gates=[2600,5400,8100];locks=[10650,11650,12650].map(x=>({x,done:false}));terminal={x:9000};elapsed=0;camera=0;ammo=startingAmmo;shotsUsed=0;nextShot=0;transmit=0;finished=false;atSupply=-1;medicalUsed=new Set();alarmNotice=0;clearInput();updateHud();
}
function overlay(mode,title,brief,label){
 state=mode;clearInput();$('title').textContent=title;$('brief').textContent=brief;
 $('equipment').textContent=`${startingAmmo} shots · ${reload===.27?'fast':'slow'} reload · ${damage===2?'enchanted':'plain'} ribbon`;
 $('action').textContent=label;$('sheet').hidden=false;
}
function start(){if(state==='intro'||state==='lost'||state==='won')reset();state='playing';$('sheet').hidden=true;clearInput()}
$('action').onclick=()=>{if(state==='won'&&session){if(!finished){finished=true;parent.postMessage({type:'trent:complete',version:1,mission:'shelf-escape',runId:session.runId,seconds:Math.round(elapsed),chargesUsed:shotsUsed},session.origin)}}else start()};
function pause(){if(state==='playing')overlay('paused','HOLD POSITION','Sprout calls this a tactical pause. The depot can wait.','Resume mission')}
$('pause').onclick=pause;
window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if([' ','arrowleft','arrowright','arrowup','arrowdown','w','a','s','d'].includes(key)){if(state==='playing')e.preventDefault();keys.add(key)}if(key==='escape'&&!e.repeat){if(state==='paused')start();else pause()}});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function burst(x,y,color,n=12){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=30+Math.random()*110;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.35+Math.random()*.35,color})}}
function missionTarget(){
 const count=relays.filter(r=>r.done).length,doc=documents[count];
 if(count===0&&!doc.found){const page=doc.pages.find(p=>!p.found);return {x:page.x,title:'Collect the transport orders',hint:`ORDER PAGES ${doc.pages.filter(p=>p.found).length}/3`}}
 if(count===1&&doc.found&&doc.route<doc.routes.length)return {x:doc.routes[doc.route],title:'Set the rail switches',hint:`SWITCH ${doc.route+1}/3`};
 if(count===2&&doc.found&&doc.step<doc.power.length)return {x:doc.power[doc.step],title:doc.step?'Install the signal fuse':'Start the generator',hint:doc.step?'SIGNAL FUSE':'GENERATOR'};
 if(count<3)return doc.found?{x:relays[count].x,title:'Return to the alarm relay',hint:'ALARM RELAY'}:{x:doc.x,title:`Find the ${doc.name}`,hint:doc.name.toUpperCase()};
 if(transmit<3)return {x:[8500,9250,9700][transmit],title:'Connect the radio aerials',hint:`AERIAL ${transmit+1}/3`};
 if(transmit<4)return {x:terminal.x,title:'Send the transport orders',hint:'RADIO'};
 const lock=locks.find(l=>!l.done);if(lock)return {x:lock.x-120,title:'Free the mail train',hint:`SHOOT LOCK ${locks.filter(l=>l.done).length+1}/3`,action:'shoot'};
 return {x:14100,title:'Reach the mail hatch',hint:'MAIL HATCH'};
}
function updateHud(){
 const count=relays.filter(r=>r.done).length,target=missionTarget();
 $('objective').textContent=target.title;
 $('progress').textContent=alarmNotice>0?'ALARM · REINFORCEMENT INBOUND':count<3?`${['Freight yard','Switchyard','Signal yard'][count]} · ${count} / 3 relays`:transmit<3?`${transmit} / 3 aerials` :transmit<4?'Return to the radio':locks.some(l=>!l.done)?`${locks.filter(l=>l.done).length} / 3 locks`:'Exit is open';
 $('health').textContent='♥'.repeat(player.hp)+'♡'.repeat(3-player.hp);
 $('ammo').textContent=ammo+' SHOTS';
 $('hint').innerHTML=`${target.x<player.x?'‹':'›'} ${target.hint} <span>${target.x<player.x?'‹':'›'}</span>`;
}
function update(dt){
 elapsed+=dt;alarmNotice=Math.max(0,alarmNotice-dt);player.shield=Math.max(0,player.shield-dt);player.fire=Math.max(0,player.fire-dt);
 if(player.dying){player.dying+=dt;if(player.dying>.8){updateHud();overlay('lost','SEASONAL SETBACK','A guard puts Sprout back on display. The label reads: “Interactive. Batteries confiscated.”','Retry the mission')}return}
 const axis=sticks.move.x+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
 player.moving=Math.abs(axis)>.1;
 player.hidden=!player.moving&&!keys.has(' ')&&sticks.fire.id===null&&!fireQueued&&(keys.has('s')||keys.has('arrowdown')||sticks.move.y>.5)&&crates.some(x=>Math.abs(player.x-x)<35);
 if(Math.abs(axis)>.1){const before=player.x;player.x=clamp(player.x+clamp(axis,-1,1)*190*dt,35,worldEnd-30);for(let i=0;i<gates.length;i++)if(!relays[i].done&&before<gates[i]&&player.x>=gates[i]-20)player.x=gates[i]-20;for(let i=0;i<locks.length;i++){const barrier=locks[i].x+270;if(!locks[i].done&&before<barrier&&player.x>=barrier-20)player.x=barrier-20}player.face=Math.sign(axis)}
 const count=relays.filter(r=>r.done).length;
 if(count<3){const doc=documents[count],r=relays[count];
  if(count===0){for(const p of doc.pages)if(!p.found&&Math.abs(player.x-p.x)<35){p.found=true;burst(p.x,360,'#f9d487',16)}if(!doc.found&&doc.pages.every(p=>p.found)){doc.found=true;raiseAlarm(0,1190)}}
  else if(!doc.found&&Math.abs(player.x-doc.x)<35){doc.found=true;burst(doc.x,360,'#f9d487',25);raiseAlarm(count,count===1?3800:6700)}
  else if(count===1&&doc.found&&doc.route<doc.routes.length&&Math.abs(player.x-doc.routes[doc.route])<30){burst(player.x,350,'#8feafa',12);doc.route++}
  else if(count===2&&doc.found&&doc.step<doc.power.length&&Math.abs(player.x-doc.power[doc.step])<30){burst(player.x,350,'#8feafa',12);doc.step++}
  const ready=doc.found&&(count!==1||doc.route===doc.routes.length)&&(count!==2||doc.step===doc.power.length);
  if(ready&&!r.done&&Math.abs(player.x-r.x)<44){r.progress=Math.min(1.2,r.progress+dt);if(r.progress>=1.2){r.done=true;burst(r.x,330,'#8feafa',24)}}}
 if(count===3&&transmit<3&&Math.abs(player.x-[8500,9250,9700][transmit])<28){burst(player.x,350,'#8feafa',12);transmit++}
 if(count===3&&transmit===3&&Math.abs(player.x-terminal.x)<28){transmit=4;burst(player.x,350,'#8feafa',20)}
 if(count===3&&transmit===4&&locks.every(l=>l.done)&&player.x>14060){overlay('won','MESSAGE RECEIVED','Sprout slips out with Santa’s orders and a stolen stapler. Command calls that a successful extraction.',session?'Continue the story':'Play again');return}
 const station=supplies.findIndex(x=>Math.abs(player.x-x)<28);
 if(station!==-1&&station!==atSupply){if(startingAmmo)ammo=startingAmmo;if(player.hp<3&&!medicalUsed.has(station)){player.hp++;medicalUsed.add(station)}burst(supplies[station],390,'#c7e9ae',8)}atSupply=station;
 const wantsShot=fireQueued||sticks.fire.id!==null||keys.has(' ');fireQueued=false;
 if(wantsShot&&elapsed>=nextShot&&ammo>0){
  let dx=sticks.fire.x,dy=sticks.fire.y;
  if(Math.hypot(dx,dy)<.2){const target=guards.filter(q=>q.hp>0&&Math.abs(q.x-player.x)<350).sort((a,b)=>Math.abs(a.x-player.x)-Math.abs(b.x-player.x))[0]||(transmit===4?locks.find(l=>!l.done&&Math.abs(l.x-player.x)<400):null);dx=target?Math.sign(target.x-player.x)||player.face:player.face;dy=0;player.face=dx}else{const n=Math.hypot(dx,dy);dx/=n;dy/=n;player.face=Math.sign(dx)||player.face}
  player.aim=Math.atan2(dy,Math.abs(dx));shots.push({x:player.x+player.face*24,y:394,vx:dx*560,vy:dy*560});ammo--;shotsUsed++;nextShot=elapsed+reload;player.fire=.35;burst(player.x+player.face*25,394,'#ffd895',5);
 }
 for(const shot of shots){
  shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;
  for(const guard of guards)if(guard.hp>0&&Math.abs(shot.x-guard.x)<23&&shot.y>340&&shot.y<450){guard.hp-=damage;guard.stun=.35;guard.attack=0;guard.windup=0;shot.y=-100;if(guard.hp<=0)wraps.push({x:guard.x,age:0,dir:guard.dir});burst(guard.x,380,guard.hp<=0?'#f8cb7b':'#9aeaf0',guard.hp<=0?24:7);break}
  const lock=transmit===4?locks.find(l=>!l.done&&Math.abs(shot.x-l.x)<23&&shot.y>365&&shot.y<425):null;if(lock){lock.done=true;shot.y=-100;burst(lock.x,394,'#ffd895',20)}
 }
 shots=shots.filter(s=>s.y>0&&s.y<H&&s.x>0&&s.x<worldEnd);
 for(const guard of guards){
  if(guard.hp<=0)continue;guard.stun=Math.max(0,guard.stun-dt);guard.attack=Math.max(0,(guard.attack||0)-dt);
  guard.cooldown=Math.max(0,(guard.cooldown||0)-dt);
  if(guard.windup>0){guard.windup=Math.max(0,guard.windup-dt);if(guard.windup===0&&!player.hidden){guard.attack=.48;guardShots.push({x:guard.x+guard.dir*35,y:420,vx:guard.dir*340});burst(guard.x+guard.dir*35,420,'#ffd895',4)}}
  guard.moving=false;
  const distance=Math.abs(player.x-guard.x),sector=guard.home<2600?0:guard.home<5400?1:guard.home<8100?2:3;
  const alerted=sector===3||!relays[sector].done;
  if(!guard.stun&&!guard.attack&&!guard.windup){const sees=!player.hidden&&distance<(alerted?350:220);if(sees){guard.dir=Math.sign(player.x-guard.x)||guard.dir;if(guard.cooldown<=0){guard.windup=alerted?.8:1.2;guard.cooldown=alerted?3.5:5}else if(distance>170)guard.moving=true}else{if(Math.abs(guard.x-guard.home)>90)guard.dir*=-1;guard.moving=(elapsed+guard.home/100)%4>.65}if(guard.moving)guard.x=clamp(guard.x+guard.dir*46*dt,35,worldEnd-30)}
  if(!player.hidden&&distance<22&&player.shield<=0){player.hp--;player.shield=1.8;burst(player.x,380,'#f7c37a',18);if(player.hp<=0){player.dying=.001;clearInput();return}}
 }
 for(const bullet of guardShots){const old=bullet.x;bullet.x+=bullet.vx*dt;if(crates.some(x=>(old-x)*(bullet.x-x)<=0)){bullet.dead=true;burst(bullet.x,420,'#f4d18e',3);continue}if(!player.hidden&&player.shield<=0&&(old-player.x)*(bullet.x-player.x)<=0){bullet.dead=true;player.hp--;player.shield=1.8;burst(player.x,400,'#f7c37a',12);if(player.hp<=0){player.dying=.001;clearInput()}}}
 guardShots=guardShots.filter(b=>!b.dead&&b.x>0&&b.x<worldEnd);
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);
 for(const w of wraps)w.age+=dt;
 camera+=(clamp(player.x-W*.32,0,worldEnd-W)-camera)*Math.min(1,dt*4);updateHud();
}
function raiseAlarm(sector,x){if(relays[sector].done)return;guards.push({x,home:x,hp:2,dir:1,stun:0,attack:0,cooldown:1.2});alarmNotice=3}
function glow(x,y,r,color){const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,color);gr.addColorStop(1,'#0000');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2)}
function sprite(name,x,y,frame,flip=false,scale=1){const img=art[name];if(!img.complete||!img.naturalWidth)return;const count=img.naturalWidth/192,width=name.startsWith('elf-')?123:192;g.save();g.translate(x,y);if(flip)g.scale(-1,1);g.drawImage(img,(Math.floor(frame)%count)*192,0,width,160,-96*scale,-155*scale,width*scale,160*scale);g.restore()}
function launcher(){
 if(player.dying)return;
 let angle=player.aim;if(sticks.fire.id!==null&&Math.hypot(sticks.fire.x,sticks.fire.y)>.2)angle=Math.atan2(sticks.fire.y,Math.abs(sticks.fire.x));
 g.save();g.translate(player.x+player.face*13,397);g.scale(player.face,1);g.rotate(angle);g.lineWidth=3;g.strokeStyle='#553e33';
 g.fillStyle='#885c3c';g.fillRect(-6,4,9,16);g.strokeRect(-6,4,9,16);
 g.fillStyle='#d9ad55';g.fillRect(-10,-8,40,17);g.strokeRect(-10,-8,40,17);
 g.fillStyle='#ba5950';g.fillRect(22,-6,12,13);g.strokeRect(22,-6,12,13);
 g.fillStyle='#e7d08b';g.beginPath();g.arc(5,-9,9,0,7);g.fill();g.stroke();g.strokeStyle='#b35c51';g.lineWidth=3;g.beginPath();g.moveTo(-2,-9);g.lineTo(12,-9);g.stroke();g.restore();
}
function building(x,y,w,h,roof){
 g.fillStyle='#192e43';g.strokeStyle='#102333';g.lineWidth=5;g.fillRect(x,y,w,h);g.strokeRect(x,y,w,h);
 g.fillStyle=roof;g.beginPath();g.moveTo(x-12,y);g.lineTo(x+w/2,y-54);g.lineTo(x+w+12,y);g.closePath();g.fill();g.stroke();
 g.strokeStyle='#d9eced';g.lineWidth=7;g.beginPath();g.moveTo(x-5,y-3);g.lineTo(x+w/2,y-51);g.lineTo(x+w+5,y-3);g.stroke();
 for(let a=x+23;a<x+w-12;a+=46){g.fillStyle='#f3c76e';g.fillRect(a,y+27,24,35);g.strokeStyle='#855e45';g.lineWidth=3;g.strokeRect(a,y+27,24,35);g.beginPath();g.moveTo(a+12,y+27);g.lineTo(a+12,y+62);g.moveTo(a,y+44);g.lineTo(a+24,y+44);g.stroke()}
}
function scenery(){
 const sky=g.createLinearGradient(0,0,0,360);sky.addColorStop(0,'#1b385c');sky.addColorStop(1,'#7896a4');g.fillStyle=sky;g.fillRect(0,0,W,H);
 g.fillStyle='#f8e6ab';g.beginPath();g.arc(758,72,29,0,7);g.fill();
 g.fillStyle='#314d62';g.beginPath();g.moveTo(0,275);for(let x=0;x<=W+100;x+=120)g.lineTo(x,215+Math.sin((x+camera*.08)/170)*34);g.lineTo(W,390);g.lineTo(0,390);g.fill();
 const shift=(camera*.28)%330;for(let i=-1;i<5;i++)building(i*330-shift,191+(i%2)*18,280,198,i%2?'#844c4a':'#5f4b52');
 g.save();g.translate(-camera*.62,0);
 for(let x=70;x<worldEnd*.62+1000;x+=630){if(x<camera*.62-550||x>camera*.62+W+100)continue;
  g.fillStyle='#234d55';g.strokeStyle='#132b35';g.lineWidth=5;g.fillRect(x,260,430,105);g.strokeRect(x,260,430,105);
  g.fillStyle='#42747a';g.fillRect(x+12,270,406,18);for(let j=0;j<5;j++){g.fillStyle='#f3cb7c';g.fillRect(x+26+j*76,300,48,31);g.strokeRect(x+26+j*76,300,48,31)}
  g.fillStyle='#284851';g.fillRect(x-70,292,70,72);g.strokeRect(x-70,292,70,72);g.fillStyle='#406b6d';g.fillRect(x-82,307,45,57);g.strokeRect(x-82,307,45,57);g.fillStyle='#284851';g.fillRect(x-65,268,17,28);g.fillStyle='#dcebea';g.fillRect(x-70,264,27,5);g.fillStyle='#f7d58d';g.beginPath();g.arc(x-77,320,8,0,7);g.fill();
  g.fillStyle='#1b2b36';for(let j=0;j<4;j++){g.beginPath();g.arc(x+55+j*105,370,15,0,7);g.fill();g.fillStyle='#90aeb0';g.beginPath();g.arc(x+55+j*105,370,6,0,7);g.fill();g.fillStyle='#1b2b36'}
  g.fillStyle='#e7f2ef';g.fillRect(x+8,254,414,8);
 }
 g.restore();
 g.fillStyle='#dcebea';g.fillRect(0,373,W,13);
}
function render(){
 scenery();
 const motion=reduceMotion.matches?0:elapsed;
 for(const flake of snow){
  const x=((flake.x-camera*flake.depth+Math.sin(motion*.7+flake.y)*6)%W+W)%W;
  const y=(flake.y+motion*flake.speed)%H;
  g.fillStyle=flake.depth>.5?'#d9f4f4aa':'#d7e9ef66';
  g.beginPath();g.ellipse(x,y,flake.size,flake.size*1.5,.15,0,Math.PI*2);g.fill();
 }
 if(!reduceMotion.matches){
  const width=630,shift=(camera*.62)%width;
  for(let i=-1;i<4;i++){
   const base=i*width-shift+14;
   for(let j=0;j<4;j++){
    const phase=(elapsed*.19+j*.25+i*.12+10)%1;
    g.globalAlpha=Math.sin(phase*Math.PI)*.22;
    g.fillStyle='#edf8ef';g.beginPath();g.ellipse(base+Math.sin(phase*4+i)*12,255-phase*100,12+phase*18,7+phase*12,0,0,Math.PI*2);g.fill();
   }
  }
  g.globalAlpha=1;
 }
 g.save();g.translate(-camera,0);
 g.fillStyle='#769598';g.fillRect(0,386,worldEnd,154);g.fillStyle='#b8d2cf';g.fillRect(0,386,worldEnd,13);g.strokeStyle='#506e73';g.lineWidth=4;
 for(let x=0;x<worldEnd;x+=86){if(x<camera-100||x>camera+W)continue;g.beginPath();g.moveTo(x,454);g.lineTo(x+76,454);g.stroke()}g.fillStyle='#4b686e';g.fillRect(0,471,worldEnd,7);g.fillRect(0,509,worldEnd,7);
 for(let x=160;x<worldEnd;x+=470){if(x<camera-500||x>camera+W+50)continue;
  g.fillStyle='#5e4140';g.fillRect(x,170,11,214);g.fillStyle='#a7754a';g.fillRect(x-19,185,49,12);g.fillStyle='#f7d58d';g.fillRect(x-10,197,30,30);glow(x+5,213,50,'#f9d77544');
  g.strokeStyle='#d7e9e1';g.lineWidth=3;g.beginPath();g.moveTo(x+4,170);g.quadraticCurveTo(x+235,220,x+474,170);g.stroke();
  for(let j=1;j<10;j++){const px=x+j*47,py=170+Math.sin(j*Math.PI/10)*23;g.fillStyle=(j+Math.floor(motion*2))%3?'#f2c56f':'#e86f72';g.beginPath();g.arc(px,py+5,4,0,7);g.fill()}
 }
 for(let x=190;x<worldEnd;x+=760){if(x<camera-150||x>camera+W)continue;g.fillStyle='#694b3c';g.fillRect(x,330,125,55);g.fillStyle='#916548';g.fillRect(x+5,335,115,46);g.strokeStyle='#49392f';g.strokeRect(x,330,125,55);g.fillStyle='#d7bd86';g.fillRect(x+38,335,10,46);g.fillRect(x+85,335,10,46);g.fillStyle='#f1d8a2';g.font='bold 11px system-ui';g.fillText('NORTH DEPOT',x+20,362)}
 for(const r of relays){glow(r.x,340,65,r.done?'#86d2a433':'#7deaff77');g.fillStyle=r.done?'#496f64':'#8bd5df';g.fillRect(r.x-12,328,24,34);g.strokeStyle='#e7d199';g.lineWidth=2;g.strokeRect(r.x-12,328,24,34);if(!r.done&&r.progress){g.strokeStyle='#f8d48f';g.lineWidth=4;g.beginPath();g.arc(r.x,338,24,-Math.PI/2,-Math.PI/2+Math.PI*2*r.progress/1.2);g.stroke()}}
 for(const doc of documents){const items=doc.pages||[doc];for(const item of items)if(!item.found){glow(item.x,345,75,'#ffd27488');g.fillStyle='#f7d89a';g.fillRect(item.x-14,331,28,21);g.fillStyle='#a65c44';g.fillRect(item.x-11,335,22,2)}}
 for(let i=0;i<documents[1].routes.length;i++){const x=documents[1].routes[i];g.fillStyle=i<documents[1].route?'#5eac80':'#966553';g.strokeStyle='#e7d09b';g.lineWidth=3;g.fillRect(x-19,337,38,33);g.strokeRect(x-19,337,38,33);g.beginPath();g.moveTo(x,344);g.lineTo(x+(i<documents[1].route?9:-9),331);g.stroke();g.fillStyle='#eff4dd';g.font='bold 10px system-ui';g.fillText('SW '+(i+1),x-14,360)}
 for(let i=0;i<documents[2].power.length;i++){const x=documents[2].power[i];g.fillStyle=i<documents[2].step?'#528e73':'#855b55';g.strokeStyle='#e7d09b';g.lineWidth=3;g.fillRect(x-22,330,44,40);g.strokeRect(x-22,330,44,40);g.fillStyle='#f1e4b7';g.font='bold 9px system-ui';g.fillText(i?'FUSE':'POWER',x-17,354)}
 const marker=missionTarget();if(marker.x!==terminal.x&&marker.x!==14100){const markerX=marker.action==='shoot'?locks.find(l=>!l.done).x:marker.x;glow(markerX,305,50,'#ffe29166');g.fillStyle='#ffe291';g.beginPath();g.moveTo(markerX,325);g.lineTo(markerX-10,307);g.lineTo(markerX+10,307);g.closePath();g.fill()}
 for(let i=0;i<supplies.length;i++){const x=supplies[i];g.fillStyle='#3f785b';g.strokeStyle='#cbe9b7';g.lineWidth=3;g.fillRect(x-24,410,48,32);g.strokeRect(x-24,410,48,32);g.fillStyle='#ecf4c9';g.font='bold 10px system-ui';g.fillText(medicalUsed.has(i)?'AMMO':'AMMO +',x-22,430)}
 for(let i=0;i<gates.length;i++){const x=gates[i];g.fillStyle=relays[i].done?'#5c8b74':'#9a4a4b';g.fillRect(x-7,250,14,140);g.fillStyle=relays[i].done?'#97e4a4':'#f6b36a';g.beginPath();g.arc(x,249,10,0,7);g.fill();if(!relays[i].done){g.strokeStyle='#e9aa81';g.lineWidth=5;g.beginPath();g.moveTo(x-60,370);g.lineTo(x+60,370);g.stroke()}}
 glow(terminal.x,340,85,'#87eadb55');g.fillStyle='#315c62';g.fillRect(terminal.x-24,320,48,42);g.strokeStyle='#a8ddd0';g.lineWidth=3;g.strokeRect(terminal.x-24,320,48,42);g.fillStyle='#b9eedb';g.fillRect(terminal.x-15,327,30,6);
 if(relays.every(r=>r.done)&&transmit<3){for(let i=0;i<3;i++){const x=[8500,9250,9700][i],active=transmit===i;g.fillStyle=active?'#ffe291':'#8aa9a5';g.beginPath();g.moveTo(x,365);g.lineTo(x-12,346);g.lineTo(x+12,346);g.closePath();g.fill();if(active)glow(x,352,45,'#ffe29188')}}
 for(let i=0;i<locks.length;i++){const lock=locks[i],x=lock.x;g.fillStyle='#714a42';g.strokeStyle='#e7d09b';g.lineWidth=3;g.fillRect(x-18,378,36,39);g.strokeRect(x-18,378,36,39);g.fillStyle=lock.done?'#88c39a':'#f2be69';g.fillRect(x-8,387,16,15);g.fillStyle='#fff3cc';g.font='bold 10px system-ui';g.fillText(''+(i+1),x-3,399);g.fillStyle=lock.done?'#5c8b74':'#9a4a4b';g.fillRect(x+263,250,14,140);g.fillStyle=lock.done?'#97e4a4':'#f6b36a';g.beginPath();g.arc(x+270,249,10,0,7);g.fill()}
 g.fillStyle=transmit>=4&&locks.every(l=>l.done)?'#74c5a6':'#355b60';g.fillRect(14080,270,55,96);g.strokeStyle='#badcc4';g.lineWidth=3;g.strokeRect(14080,270,55,96);g.fillStyle='#d2e8db';g.font='bold 11px system-ui';g.fillText('MAIL',14091,291);
 for(const guard of guards){if(guard.hp<=0)continue;g.fillStyle='#071a1a77';g.beginPath();g.ellipse(guard.x,447,32,8,0,0,7);g.fill();const anim=guard.stun?'hurt':guard.attack?'attack':guard.moving?'walk':'idle';const f=guard.stun?( .35-guard.stun)*25:guard.attack?(.48-guard.attack)*20:motion*(guard.moving?9:5);sprite('guard-'+anim,guard.x,445,f,guard.dir<0,.82);if(guard.windup>0){g.fillStyle='#ffe18b';g.font='bold 20px system-ui';g.fillText('!',guard.x-4,318)}}
 for(const w of wraps){if(w.age<.7){sprite('guard-die',w.x,445,Math.min(9,w.age*14),w.dir<0,.82);continue}const scale=Math.min(1,(w.age-.7)*5);g.save();g.translate(w.x,437);g.scale(scale,scale);g.fillStyle='#a73f4e';g.fillRect(-18,-31,36,31);g.fillStyle='#f0ce84';g.fillRect(-3,-31,6,31);g.fillRect(-18,-21,36,5);g.strokeStyle='#f0ce84';g.lineWidth=2;g.beginPath();g.ellipse(-6,-34,7,4,-.4,0,7);g.ellipse(6,-34,7,4,.4,0,7);g.stroke();g.restore()}
 g.fillStyle='#071a1a88';g.beginPath();g.ellipse(player.x,447,33,8,0,0,7);g.fill();const pose=player.dying?'die':player.shield>1.45?'hurt':player.fire?'fire':player.moving?'walk':'idle';const poseFrame=player.dying?Math.min(4,player.dying*6):pose==='hurt'?(1.8-player.shield)*14:pose==='fire'?(.35-player.fire)*14:motion*(pose==='walk'?9:5);sprite('elf-'+pose,player.x,445,poseFrame,player.face<0,.85);launcher();
 for(const x of crates){g.fillStyle='#8c5c3b';g.strokeStyle='#533c34';g.lineWidth=4;g.fillRect(x-35,406,70,42);g.strokeRect(x-35,406,70,42);g.beginPath();g.moveTo(x-30,410);g.lineTo(x+30,444);g.moveTo(x+30,410);g.lineTo(x-30,444);g.stroke();g.fillStyle='#e2f1e7';g.fillRect(x-35,402,70,5)}
 if(player.hidden){g.fillStyle='#e8f7e9';g.font='bold 12px system-ui';g.fillText('HIDDEN',player.x-25,330)}
 for(const s of shots){glow(s.x,s.y,18,'#8cf8ff88');g.fillStyle='#d8ffff';g.beginPath();g.arc(s.x,s.y,4,0,7);g.fill()}
 for(const s of guardShots){g.fillStyle='#ffd38a';g.beginPath();g.ellipse(s.x,s.y,6,3,0,0,7);g.fill()}
 for(const p of particles){g.globalAlpha=clamp(p.life*2,0,1);g.fillStyle=p.color;g.fillRect(p.x,p.y,4,4)}g.globalAlpha=1;
 g.restore();
 const vignette=g.createRadialGradient(W/2,H/2,180,W/2,H/2,600);vignette.addColorStop(0,'#0000');vignette.addColorStop(1,'#06101caa');g.fillStyle=vignette;g.fillRect(0,0,W,H);
}
reset();overlay('intro','OPERATION RIBBONFALL','Recover the orders, key and cipher; return each to its alarm relay to open the next yard. Connect the aerials, transmit, shoot the three mail-train locks and reach the hatch. Left thumb or A / D moves; right thumb or Space fires. Pull down behind a crate to hide. Green boxes refill ammo and restore one heart once.','Begin escape');
let last=0;
function frame(now){let remaining=last?clamp((now-last)/1000,0,.25):0;last=now;while(state==='playing'&&remaining>0){const dt=Math.min(remaining,1/60);update(dt);remaining-=dt}render();requestAnimationFrame(frame)}
requestAnimationFrame(frame);
