'use strict';
const canvas=document.querySelector('canvas');
const ctx=canvas.getContext('2d');
const pad=document.getElementById('pad');
const knob=document.getElementById('knob');
const ui=Object.fromEntries(['status','panel','title','copy','start','pause','send-mac'].map(id=>[id,document.getElementById(id)]));
const macButton=ui['send-mac'];
const MAC_USES=2;
const MAC_SECONDS=6+(window.TrentMissionBonus||0)*0.75;
const MAC_SPEED=205;
const FLEE_RANGE=145;
const stage=new URLSearchParams(location.search).get('stage');
const freight=stage==='freight-gate';
const stable=stage==='the-stable-escape';
const world={w:1080,h:720};
const depot=stable?{x:982,y:602}:{x:981,y:94};
const shelves=freight?[
 {x:185,y:486,w:250,h:68},{x:528,y:468,w:261,h:72},
 {x:343,y:225,w:170,h:72},{x:699,y:267,w:250,h:70}
]:stable?[
 {x:235,y:443,w:240,h:76},{x:538,y:486,w:225,h:70},
 {x:321,y:260,w:310,h:67},{x:772,y:247,w:174,h:75}
]:[
 {x:215,y:497,w:185,h:64},{x:450,y:465,w:180,h:64},{x:759,y:518,w:155,h:64},
 {x:129,y:267,w:215,h:64},{x:451,y:233,w:161,h:64},{x:725,y:266,w:190,h:64}
];
const spawn={x:95,y:613};
const caches=freight?[{x:472,y:581},{x:818,y:201}]
 :stable?[{x:194,y:149},{x:695,y:192},{x:100,y:330},{x:920,y:430}]
 :[{x:145,y:142},{x:534,y:359},{x:942,y:598},{x:100,y:390},{x:868,y:160}];
const hearts=[{x:150,y:564},{x:560,y:370},{x:935,y:510}];
const patrols=freight?[
 [[115,508],[115,367],[455,367],[455,508]],
 [[520,580],[968,580],[968,388],[520,388]],
 [[195,180],[910,180],[910,95],[195,95]],
 [[550,236],[550,412],[647,412],[647,236]]
]:stable?[
 [[104,509],[104,240],[290,240],[290,416]],
 [[370,192],[950,192],[950,98],[370,98]],
 [[503,388],[913,388],[913,584],[503,584]],
 [[339,585],[931,585],[931,644],[339,644]],
 [[144,110],[306,110],[306,230],[144,230]],
 [[656,230],[656,435],[778,435],[778,361]],
 [[116,400],[209,400],[209,543],[116,543]],
 [[866,357],[1008,357],[1008,494],[866,494]]
]:[
 [[108,150],[108,450],[380,450],[380,150]],
 [[660,140],[660,400],[1000,400],[1000,140]],
 [[415,610],[960,610],[960,370],[672,370],[672,610]],
 [[480,120],[760,120],[760,180],[480,180]],
 [[400,390],[680,390]],
 [[220,590],[740,590]]
];
const mines=[
 {x:500,y:430},{x:590,y:120},{x:900,y:470},
 {x:210,y:210},{x:680,y:430},{x:150,y:360}
];
const beams=[
 {route:[[220,200],[480,200],[480,360],[220,360]],r:58,speed:64},
 {route:[[700,180],[990,180],[990,360],[700,360]],r:58,speed:58},
 {route:[[280,600],[860,600]],r:52,speed:90}
];
const trentSpeed=178;
const guardPace=freight?.9:stable?1.15:1;
const guardSpeedRatio=0.75*guardPace;
const sightRange=200;
const sightHalf=0.85*0.75;
const sightDot=Math.cos(sightHalf);
const lampOffset=21;
const mineReach=26;
const mineStunSeconds=2;
const macRadius=11;
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const keys=new Set(), camera={x:0,y:0};
const art=Object.fromEntries(['yard','elf','guard','shelf','mail','painted-mine','painted-mail-hatch',
 'painted-heart','painted-mac','painted-shock'].concat(stable?['rudolph','painted-stable-gate']:[]).map(name=>{
 const image=new Image();
 const file=name==='yard'?(stable?'stable-yard':freight?'inspection-yard':name):name;
 image.src='./art/'+file+'.webp';return [name,image];
}));
const clamp=(n,low,high)=>Math.max(low,Math.min(high,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const radius=14;
let mode='intro',run,stick,last=0;
let escapeTime=0;
const goal=freight?'Pass both inspection checkpoints and reach the freight office.'
 :stable?'Find Rudolph’s stall, the gate key, and two supply parcels, then reach the service gate.'
 :'Find Buddy’s five dispatches';
if(freight||stable){
 ui.title.textContent=freight?'Freight Gate':'The Stable Escape';
 ui.copy.textContent=goal;
}
function placeKnob(x,y){knob.style.transform='translate(calc(-50% + '+x+'px), calc(-50% + '+y+'px))';}
function releaseStick(){stick=null;placeKnob(0,0);}
function reset(notice){
 keys.clear();releaseStick();
 run={player:{...spawn,dirX:1,dirY:0,hull:3,shield:0,stunnedUntil:0,moving:false,stride:0},
  mines:mines.map(mine=>({...mine,spent:false})),
  guards:patrols.map(route=>{
   const angle=Math.atan2(route[1][1]-route[0][1],route[1][0]-route[0][0]);
   return {x:route[0][0],y:route[0][1],route,index:1,angle,chase:false};
  }),
  lights:beams.map(beam=>({route:beam.route,r:beam.r,speed:beam.speed,x:beam.route[0][0],y:beam.route[0][1],index:1})),
  hearts:hearts.map(p=>({...p,taken:false})),
  mail:caches.map(p=>({...p,taken:false})),prints:[],count:0,macUses:MAC_USES,mac:null,time:0,alarm:0,flash:notice?0.45:0,
  notice:notice||goal,noticeUntil:notice?3.5:5};
 camera.x=spawn.x;camera.y=spawn.y;sync();
}
function sync(){
 ui.status.textContent='♥'.repeat(run.player.hull)+'♡'.repeat(3-run.player.hull)+' · '+run.count+'/'+caches.length;
 macButton.textContent='SEND MAC · '+run.macUses;
 macButton.disabled=mode!=='play'||run.macUses===0||Boolean(run.mac);
}
function announce(message){run.notice=message;run.noticeUntil=run.time+3.5;}
function show(next,title,copy,label){
 mode=next;keys.clear();releaseStick();
 ui.title.textContent=title;ui.copy.textContent=copy;ui.start.textContent=label;ui.panel.hidden=false;sync();
 const restart=document.getElementById('restart-sequence');
 if(restart)restart.hidden=next!=='paused'&&next!=='lost';
}
function pause(){if(mode==='play')show('paused','Hold the mail','Trent stops to check whether the stamps have diplomatic immunity.','Resume');}
ui.start.onclick=()=>{if(mode!=='paused')reset();mode='play';ui.panel.hidden=true;document.getElementById('help').hidden=true;sync();};
ui.pause.onclick=pause;
function blocked(x,y,r){
 if(x<r||y<r||x>world.w-r||y>world.h-r)return true;
 return shelves.some(s=>Math.hypot(x-clamp(x,s.x,s.x+s.w),y-clamp(y,s.y,s.y+s.h))<r);
}
function lineBlocked(a,b){
 const steps=12;
 for(let i=1;i<steps;i++){
  const t=i/steps,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
  if(shelves.some(s=>x>=s.x&&x<=s.x+s.w&&y>=s.y&&y<=s.y+s.h))return true;
 }
 return false;
}
function lampPoint(guard){
 return {x:guard.x+Math.cos(guard.angle)*lampOffset,y:guard.y+Math.sin(guard.angle)*lampOffset};
}
function sees(guard,target){
 const origin=lampPoint(guard);
 const dx=target.x-origin.x,dy=target.y-origin.y,dist=Math.hypot(dx,dy);
 if(dist>sightRange||dist<1)return false;
 const facing=(Math.cos(guard.angle)*dx+Math.sin(guard.angle)*dy)/dist;
 return facing>=sightDot&&!lineBlocked(origin,target);
}
function walk(actor,dx,dy,r){
 if(!blocked(actor.x+dx,actor.y,r))actor.x+=dx;
 if(!blocked(actor.x,actor.y+dy,r))actor.y+=dy;
}
function along(actor,speed,dt,r){
 const d=distance(actor,actor.aim);
 if(d<=5)return false;
 const step=Math.min(d,speed*dt);
 actor.angle=Math.atan2(actor.aim.y-actor.y,actor.aim.x-actor.x);
 walk(actor,Math.cos(actor.angle)*step,Math.sin(actor.angle)*step,r);
 return true;
}
function glide(actor,speed,dt){
 const d=distance(actor,actor.aim);
 if(d<=4)return false;
 const step=Math.min(d,speed*dt);
 actor.x+=(actor.aim.x-actor.x)/d*step;
 actor.y+=(actor.aim.y-actor.y)/d*step;
 return true;
}
function steer(actor,heading,speed,dt,bodyRadius){
 const step=speed*dt;
 for(const offset of [0,.55,-.55,1.05,-1.05,1.55,-1.55,2.1,-2.1]){
  const angle=heading+offset,dx=Math.cos(angle),dy=Math.sin(angle);
  if(blocked(actor.x+dx*Math.max(step,13),actor.y+dy*Math.max(step,13),bodyRadius))continue;
  actor.angle=angle;
  walk(actor,dx*step,dy*step,bodyRadius);
  return;
 }
}
function sendMac(){
 if(mode!=='play'||!run.macUses||run.mac)return;
 const p=run.player;
 const target=nearestGuard(p);
 run.mac={x:p.x,y:p.y,angle:Math.atan2(target.y-p.y,target.x-p.x),until:run.time+MAC_SECONDS,
  target, waypoint:null,pathDue:0};
 run.macUses--;
 announce('Mac is after the guards.');
 sync();
}
macButton.onclick=sendMac;

function nearestGuard(actor){
 return run.guards.reduce((nearest,guard)=>distance(actor,guard)<distance(actor,nearest)?guard:nearest);
}

function clearDogPath(a,b){
 const steps=Math.max(1,Math.ceil(distance(a,b)/8));
 for(let i=1;i<=steps;i++){
  const t=i/steps;
  if(blocked(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,macRadius))return false;
 }
 return true;
}

function nextDogWaypoint(mac,target){
 const pad=macRadius+4;
 const nodes=[mac,target,...shelves.flatMap(({x,y,w,h})=>[
  {x:x-pad,y:y-pad},{x:x+w+pad,y:y-pad},
  {x:x-pad,y:y+h+pad},{x:x+w+pad,y:y+h+pad}
 ].filter(point=>!blocked(point.x,point.y,macRadius)))];
 const costs=nodes.map(()=>Infinity), firstHop=[], visited=new Set();
 costs[0]=0;
 for(let step=0;step<nodes.length;step++){
  let current=-1;
  for(let i=0;i<nodes.length;i++){
   if(!visited.has(i)&&costs[i]<(current<0?Infinity:costs[current]))current=i;
  }
  if(current===1)return firstHop[current];
  if(current<0)break;
  visited.add(current);
  for(let i=1;i<nodes.length;i++){
   const cost=costs[current]+distance(nodes[current],nodes[i]);
   if(!visited.has(i)&&cost<costs[i]&&clearDogPath(nodes[current],nodes[i])){
    costs[i]=cost;
    firstHop[i]=current===0?nodes[i]:firstHop[current];
   }
  }
 }
 return target;
}
const movement=['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'];
window.addEventListener('keydown',event=>{
 const key=event.key.toLowerCase();
 if(key==='escape'&&!event.repeat){if(mode==='paused')ui.start.click();else pause();return;}
 if(mode!=='play')return;
 if(movement.includes(key)){event.preventDefault();keys.add(key);}
 if(event.code==='Space'&&!event.repeat){event.preventDefault();sendMac();}
});
window.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
window.addEventListener('blur',pause);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
function readStick(event){
 const rect=pad.getBoundingClientRect();
 const max=Math.max(16,rect.width*0.5-24);
 let x=event.clientX-(rect.left+rect.width/2),y=event.clientY-(rect.top+rect.height/2);
 const mag=Math.hypot(x,y)||1;
 const clipped=Math.min(mag,max);
 placeKnob(x/mag*clipped,y/mag*clipped);
 stick.dx=x/mag*Math.min(1,mag/max);
 stick.dy=y/mag*Math.min(1,mag/max);
}
pad.addEventListener('pointerdown',event=>{
 if(mode!=='play'||stick)return;
 event.preventDefault();
 stick={id:event.pointerId,dx:0,dy:0};
 pad.setPointerCapture(event.pointerId);
 readStick(event);
});
pad.addEventListener('pointermove',event=>{
 if(stick?.id!==event.pointerId)return;
 readStick(event);
});
for(const name of ['pointerup','pointercancel','lostpointercapture']){
 pad.addEventListener(name,event=>{if(stick?.id===event.pointerId)releaseStick();});
}
function alertHalf(){
 const quota=Math.round(run.guards.length/2);
 const idle=run.guards.filter(guard=>!guard.chase&&!guard.fleeing).sort((a,b)=>distance(a,run.player)-distance(b,run.player));
 idle.slice(0,quota).forEach(guard=>{guard.angle=Math.atan2(run.player.y-guard.y,run.player.x-guard.x);});
 if(idle.length)announce('Spotlight. Half the yard is looking');
}
function update(dt){
 run.time+=dt;
 if(run.flash>0)run.flash=Math.max(0,run.flash-dt);
 const p=run.player;
 const held=(a,b)=>Number(keys.has(a)||keys.has(b));
 let dx=held('d','arrowright')-held('a','arrowleft'),dy=held('s','arrowdown')-held('w','arrowup');
 if(stick){
  dx=Math.hypot(stick.dx,stick.dy)>0.2?stick.dx:0;
  dy=Math.hypot(stick.dx,stick.dy)>0.2?stick.dy:0;
 }
 const magnitude=Math.hypot(dx,dy);
 p.moving=magnitude>0&&p.stunnedUntil<=run.time;
 if(p.moving){
  const before={x:p.x,y:p.y};
  p.dirX=dx/magnitude;p.dirY=dy/magnitude;
  walk(p,p.dirX*trentSpeed*dt,p.dirY*trentSpeed*dt,radius);
  const traveled=distance(before,p);
  p.moving=traveled>.01;
  p.stride+=traveled;
  if(Math.floor(p.stride/16)!==Math.floor((p.stride-traveled)/16)){
   const side=Math.floor(p.stride/16)%2?1:-1;
   run.prints.push({x:p.x-p.dirY*side*5,y:p.y+p.dirX*side*5,angle:Math.atan2(p.dirY,p.dirX),until:run.time+3});
  }
 }
 const mine=p.stunnedUntil<=run.time&&run.mines.find(item=>!item.spent&&distance(p,item)<mineReach);
 if(mine){
  mine.spent=true;
  p.stunnedUntil=run.time+mineStunSeconds;
  p.moving=false;
  keys.clear();
  releaseStick();
  run.flash=.16;
  announce('Mine shock. Stunned for two seconds.');
 }
 run.prints=run.prints.filter(print=>print.until>run.time);
 if(run.mac&&run.mac.until<=run.time){
  run.mac=null;
  sync();
 }
 if(run.mac){
  const mac=run.mac;
  const target=nearestGuard(mac);
  const before={x:mac.x,y:mac.y};
  if(clearDogPath(mac,target))mac.waypoint=null;
  else if(target!==mac.target||!mac.waypoint||run.time>=mac.pathDue||distance(mac,mac.waypoint)<7){
   mac.waypoint=nextDogWaypoint(mac,target);
   mac.pathDue=run.time+.25;
  }
  mac.target=target;
  const aim=mac.waypoint||target;
  const gap=distance(mac,aim);
  if(gap>(mac.waypoint?3:23)){
   const heading=Math.atan2(aim.y-mac.y,aim.x-mac.x);
   if(clearDogPath(mac,aim)){
    const step=Math.min(MAC_SPEED*dt,gap);
    mac.angle=heading;
    walk(mac,Math.cos(heading)*step,Math.sin(heading)*step,macRadius);
   }else steer(mac,heading,MAC_SPEED,dt,macRadius);
  }
  mac.running=distance(mac,before)>.1;
 }
 let spotted=false;
 for(const guard of run.guards){
  guard.fleeing=Boolean(run.mac&&distance(guard,run.mac)<FLEE_RANGE&&!lineBlocked(guard,run.mac));
  if(guard.fleeing){
   guard.chase=false;
   steer(guard,Math.atan2(guard.y-run.mac.y,guard.x-run.mac.x),155*guardPace,dt,12);
  }else if(sees(guard,p)){
   if(!guard.chase)spotted=true;
   guard.chase=true;
   guard.aim=p;
   along(guard,trentSpeed*guardSpeedRatio,dt,12);
  }else{
   guard.chase=false;
   const [x,y]=guard.route[guard.index];
   guard.aim={x,y};
   if(!along(guard,69*guardPace,dt,12))guard.index=(guard.index+1)%guard.route.length;
  }
  if(!guard.fleeing&&distance(guard,p)<29&&p.shield<=run.time){
   p.hull--;p.shield=run.time+1.8;announce('Inspector citation!');sync();
   if(!p.hull){show('lost','Return to sender','The inspectors impounded Trent for unauthorized festivity.','Try again');return;}
  }
 }
 if(spotted)announce('An inspector spotted you');
 for(const light of run.lights){
  const [x,y]=light.route[light.index];
  light.aim={x,y};
  if(!glide(light,light.speed,dt))light.index=(light.index+1)%light.route.length;
  if(distance(light,p)<light.r&&run.alarm<=run.time){
   run.alarm=run.time+3.2;
   alertHalf();
  }
 }
 for(const item of run.hearts){
  if(!item.taken&&p.hull<3&&distance(p,item)<25){item.taken=true;p.hull++;announce('Heart recovered');sync();}
 }
 for(const item of run.mail){
  if(stable&&item===run.mail[1]&&!run.mail[0].taken)continue;
  if(!item.taken&&distance(p,item)<30){
   item.taken=true;run.count++;
   announce(stable?(item===run.mail[0]?'Rudolph is here. Find the gate key and supply parcels.':item===run.mail[1]?'Gate key found. Collect the remaining supplies.':'Supply parcel found · '+run.count+'/'+caches.length)
    :freight?(run.count===caches.length?'Checkpoints cleared. Reach the freight office.':'Inspection checkpoint cleared.')
    :run.count===caches.length?'All dispatches found. Head to the mail hatch.':'Dispatch found · '+run.count+'/'+caches.length);
   sync();
  }
 }
 if(distance(p,depot)<40&&run.count===caches.length){
  if(stable){
   mode='escape';escapeTime=0;keys.clear();releaseStick();sync();
  }else finishDelivery();
 }
}
function finishDelivery(){
  show('won',stable?'Rudolph is free':freight?'Freight office reached':'Signed, sealed, escaped',
   stable?'Rudolph clears the service gate.':freight?'The route through the inspection yard is clear.'
    :'Buddy’s dispatches identify the depot entrance. The last one says: “If captured, tell them I’m a decorative pepper mill.”','Explore again');
  const p=run.player;
  const deliveryDetail={postcards:run.count,hull:p.hull,seconds:Math.round(run.time)};
  window.dispatchEvent(new CustomEvent('special-delivery:complete',{detail:deliveryDetail}));
  if(window.parent!==window){
    const deliveryRelay={type:'special-delivery:complete',detail:deliveryDetail};
    try{const deliveryRun=new URLSearchParams(location.search).get('runId');if(deliveryRun)deliveryRelay.runId=deliveryRun;}catch(ignore){}
    window.parent.postMessage(deliveryRelay,(location.protocol==='http:'||location.protocol==='https:')?location.origin:'*');
  }
}
function sprite(name,x,y,w,h,flip=false){
 const image=art[name];
 if(!image.complete||!image.naturalWidth)return false;
 ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);ctx.drawImage(image,-w/2,-h/2,w,h);ctx.restore();return true;
}
function glow(x,y,r,color){
 const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');
 ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}
function label(text,x,y){
 ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#151c2c';ctx.strokeText(text,x,y);
 ctx.fillStyle='#ffe8bf';ctx.fillText(text,x,y);
}
function visionReach(origin,angle){
 const dx=Math.cos(angle),dy=Math.sin(angle),steps=24;
 for(let i=1;i<=steps;i++){
  const dist=sightRange*i/steps,x=origin.x+dx*dist,y=origin.y+dy*dist;
  if(x<0||y<0||x>world.w||y>world.h)return sightRange*(i-1)/steps;
  if(shelves.some(s=>x>=s.x&&x<=s.x+s.w&&y>=s.y&&y<=s.y+s.h))return sightRange*(i-1)/steps;
 }
 return sightRange;
}
function drawVision(guard){
 const origin=lampPoint(guard),slices=18;
 ctx.save();
 ctx.beginPath();
 ctx.moveTo(origin.x,origin.y);
 for(let i=0;i<=slices;i++){
  const angle=guard.angle-sightHalf+(sightHalf*2)*i/slices;
  const dist=visionReach(origin,angle);
  ctx.lineTo(origin.x+Math.cos(angle)*dist,origin.y+Math.sin(angle)*dist);
 }
 ctx.closePath();
 ctx.clip();
 const beam=ctx.createRadialGradient(origin.x,origin.y,10,origin.x,origin.y,sightRange);
 if(guard.chase){
  beam.addColorStop(0,'rgba(255,110,40,0.62)');
  beam.addColorStop(1,'rgba(255,70,20,0.08)');
 }else{
  beam.addColorStop(0,'rgba(255,214,90,0.58)');
  beam.addColorStop(1,'rgba(255,190,60,0.1)');
 }
 ctx.fillStyle=beam;
 ctx.fillRect(origin.x-sightRange,origin.y-sightRange,sightRange*2,sightRange*2);
 ctx.restore();
 ctx.beginPath();
 ctx.moveTo(origin.x,origin.y);
 for(let i=0;i<=slices;i++){
  const angle=guard.angle-sightHalf+(sightHalf*2)*i/slices;
  const dist=visionReach(origin,angle);
  ctx.lineTo(origin.x+Math.cos(angle)*dist,origin.y+Math.sin(angle)*dist);
 }
 ctx.closePath();
 ctx.strokeStyle=guard.chase?'rgba(255,150,70,0.95)':'rgba(255,226,130,0.9)';
 ctx.lineWidth=2;
 ctx.stroke();
}
function drawMine(mine){
 if(sprite('painted-mine',mine.x,mine.y,36,33))return;
 ctx.fillStyle='#24180f';ctx.beginPath();ctx.arc(mine.x,mine.y,11,0,7);ctx.fill();
 ctx.strokeStyle='#efbd52';ctx.lineWidth=2;ctx.beginPath();ctx.arc(mine.x,mine.y,11,0,7);ctx.stroke();
 ctx.strokeStyle='#f3d48a';ctx.lineWidth=1.5;
 ctx.beginPath();ctx.moveTo(mine.x,mine.y-7);ctx.lineTo(mine.x,mine.y+7);ctx.moveTo(mine.x-7,mine.y);ctx.lineTo(mine.x+7,mine.y);ctx.stroke();
}
const snow=Array.from({length:60},(_,i)=>[i*137.7%1080,i*97.3%720,1+i%3]);
function render(){
 const width=canvas.width,height=canvas.height;
 let zoom=Math.min(width/370,height/460);
 if(!(zoom>0))zoom=1;
 if(height/zoom>world.h)zoom=height/world.h;
 if(width/zoom>world.w)zoom=width/world.w;
 const vw=width/zoom,vh=height/zoom;
 const mac=run.mac;
 const focusX=run.player.x+(mac?clamp((mac.x-run.player.x)*.5,-vw*.26,vw*.26):0);
 const focusY=run.player.y+(mac?clamp((mac.y-run.player.y)*.5,-vh*.19,vh*.19):0);
 camera.x=clamp(focusX-vw/2,0,Math.max(0,world.w-vw));
 camera.y=clamp(focusY-vh/2,0,Math.max(0,world.h-vh));
 const offsetX=Math.max(0,(vw-world.w)/2),offsetY=Math.max(0,(vh-world.h)/2);
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#101624';ctx.fillRect(0,0,width,height);
 ctx.setTransform(zoom,0,0,zoom,(offsetX-camera.x)*zoom,(offsetY-camera.y)*zoom);
 const yard=art.yard;
 if(yard.complete&&yard.naturalWidth)ctx.drawImage(yard,0,0,world.w,world.h);
 else{ctx.fillStyle='#465365';ctx.fillRect(0,0,world.w,world.h);}
 for(const s of shelves){
  ctx.fillStyle='#10162475';ctx.fillRect(s.x+4,s.y+9,s.w,s.h);
  if(!sprite('shelf',s.x+s.w/2,s.y+s.h/2,s.w,s.h)){ctx.fillStyle='#774b34';ctx.fillRect(s.x,s.y,s.w,s.h);}
 }
 for(const mine of run.mines)if(!mine.spent)drawMine(mine);
 for(const light of run.lights){
  glow(light.x,light.y,light.r,'#fff1b8aa');
  ctx.strokeStyle='#fff6c888';ctx.lineWidth=2;ctx.beginPath();ctx.arc(light.x,light.y,light.r,0,7);ctx.stroke();
 }
 const exitReady=run.count===caches.length;
 const exitLabel=stable?'SERVICE GATE':freight?'FREIGHT OFFICE':'MAIL HATCH';
 glow(depot.x,depot.y,52,exitReady?'#72f7c8aa':'#cf903f84');
 if((!stable||mode!=='escape')&&!sprite(stable?'painted-stable-gate':'painted-mail-hatch',depot.x,depot.y,65,55)){ctx.fillStyle=exitReady?'#3c806b':'#5b4e44';ctx.fillRect(depot.x-24,depot.y-18,48,36);}
 label(exitLabel+(exitReady?(stable&&mode!=='escape'?' · READY':' OPEN'):' · LOCKED'),depot.x,depot.y-24);
 for(const item of run.hearts){
  if(item.taken)continue;
  if(sprite('painted-heart',item.x,item.y,37,34))continue;
  ctx.save();ctx.translate(item.x,item.y);
  ctx.fillStyle='#f06471';ctx.strokeStyle='#761e3c';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(0,10);ctx.bezierCurveTo(-26,-9,-8,-20,0,-9);
  ctx.bezierCurveTo(8,-20,26,-9,0,10);ctx.fill();ctx.stroke();ctx.restore();
 }
 for(const item of run.mail){
  if(item.taken)continue;
  if(stable&&item===run.mail[1]&&!run.mail[0].taken)continue;
  const lift=Math.sin(run.time*5+item.x)*4;
  glow(item.x,item.y,41,'#69fbd18a');
  if(!sprite('mail',item.x,item.y+lift,36,29)){ctx.fillStyle='#96feda';ctx.fillRect(item.x-15,item.y-10,30,20);}
  if(stable||freight)label(freight?'CHECKPOINT':item===run.mail[0]?'RUDOLPH’S STALL':item===run.mail[1]?'GATE KEY':'SUPPLY PARCEL',item.x,item.y-24);
 }
 if(run.mac){
  const mac=run.mac;
  const stride=reducedMotion.matches||!mac.running?0:Math.sin(run.time*19);
  const bob=Math.abs(stride)*4;
  ctx.fillStyle='#13192770';ctx.beginPath();ctx.ellipse(mac.x,mac.y+7,20,7,0,0,7);ctx.fill();
  ctx.save();ctx.translate(mac.x,mac.y-13-bob);ctx.rotate(stride*.07);
  if(!sprite('painted-mac',0,0,76,51,Math.cos(mac.angle)<0))label('MAC',0,0);
  ctx.restore();
 }
 for(const print of run.prints){
  ctx.fillStyle='rgba(35,48,71,'+Math.min(.28,(print.until-run.time)*.12)+')';
  ctx.beginPath();ctx.ellipse(print.x,print.y,5,2.8,print.angle,0,7);ctx.fill();
 }
 for(const g of run.guards)if(!g.fleeing)drawVision(g);
 for(const g of run.guards){
  const bob=reducedMotion.matches?0:Math.sin(run.time*12+g.x*.03)*1.4;
  const lamp=lampPoint(g);
  const beam=g.chase?'#ff8a3d99':'#ffc16b80';
  glow(lamp.x,lamp.y,16,beam);
  sprite('guard',g.x,g.y-11+bob,49,55,Math.cos(g.angle)<0);
 }
 const p=run.player;
 if(mode==='escape'){
  const phase=escapeTime/2;
  sprite('rudolph',depot.x-98+phase*150,depot.y-4-Math.abs(Math.sin(escapeTime*12))*8,100,67);
 }
 const stunned=p.stunnedUntil>run.time;
 if(stunned||p.shield<=run.time||reducedMotion.matches||Math.floor(run.time*12)%2===0){
  ctx.fillStyle='#13192791';ctx.beginPath();ctx.ellipse(p.x,p.y+10,18,7,0,0,7);ctx.fill();
  const step=p.moving&&!reducedMotion.matches?Math.sin(p.stride/16*Math.PI):0;
  ctx.save();ctx.translate(p.x,p.y+8);ctx.rotate(step*.07);
  if(!stunned||!sprite('painted-shock',0,-26,59,68,p.dirX<0)){
   sprite('elf',0,-22+step*2,68,45,p.dirX<0);
  }
  ctx.restore();
  if(reducedMotion.matches&&p.shield>run.time){
   ctx.strokeStyle='#ffce8b';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y+10,20,9,0,0,7);ctx.stroke();
  }
 }
 for(const [x0,y0,r] of snow){
  if(reducedMotion.matches&&r>1)continue;
  const x=(x0+run.time*r*15)%world.w,y=(y0+run.time*r*24)%world.h;
  ctx.fillStyle='rgba(235,246,255,'+(.14+r*.13)+')';ctx.beginPath();ctx.arc(x,y,r*.65,0,7);ctx.fill();
 }
 if(run.flash>0){
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle='rgba(255,244,214,'+(run.flash*0.5)+')';
  ctx.fillRect(0,0,width,height);
 }
 if(run.noticeUntil>run.time){
  const css=canvas.getBoundingClientRect();
  const headerBottom=document.querySelector('header').getBoundingClientRect().bottom-css.top;
  const viewY=clamp((headerBottom/Math.max(css.height,1))*vh+16,20,vh-20);
  ctx.setTransform(zoom,0,0,zoom,0,0);label(run.notice,vw/2,viewY);
 }
}
function resize(){
 const b=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
 canvas.width=Math.max(1,Math.round(b.width*dpr));canvas.height=Math.max(1,Math.round(b.height*dpr));
}
window.addEventListener('resize',resize);
function frame(now){
 const dt=last?Math.min((now-last)/1000,.04):0;last=now;
 if(mode==='play'&&!window.TrentGameOrientation?.blocked())update(dt);
 if(mode==='escape'&&!window.TrentGameOrientation?.blocked()){
  escapeTime+=dt;
  if(escapeTime>=2)finishDelivery();
 }
 render();requestAnimationFrame(frame);
}
reset();resize();requestAnimationFrame(frame);
