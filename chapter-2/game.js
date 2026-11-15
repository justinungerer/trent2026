'use strict';
const canvas=document.querySelector('canvas');
const ctx=canvas.getContext('2d');
const pad=document.getElementById('pad');
const knob=document.getElementById('knob');
const ui=Object.fromEntries(['status','panel','title','copy','start','pause','decoy'].map(id=>[id,document.getElementById(id)]));
const world={w:1080,h:720};
const depot={x:981,y:94};
const shelves=[
 {x:215,y:497,w:185,h:64},{x:450,y:465,w:180,h:64},{x:759,y:518,w:155,h:64},
 {x:129,y:267,w:215,h:64},{x:451,y:233,w:161,h:64},{x:725,y:266,w:190,h:64}
];
const spawn={x:95,y:613};
const caches=[{x:145,y:142},{x:534,y:359},{x:942,y:598}];
const patrols=[
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
const sightRange=200;
const sightDot=Math.cos(0.85);
const mineReach=26;
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const keys=new Set(), camera={x:0,y:0};
const art=Object.fromEntries(['yard','elf','guard','shelf','mail'].map(name=>{
 const image=new Image();image.src='./art/'+name+'.webp';return [name,image];
}));
const clamp=(n,low,high)=>Math.max(low,Math.min(high,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const radius=14;
let mode='intro',run,stick,last=0;
function placeKnob(x,y){knob.style.transform='translate(calc(-50% + '+x+'px), calc(-50% + '+y+'px))';}
function releaseStick(){stick=null;placeKnob(0,0);}
function reset(notice){
 keys.clear();releaseStick();
 run={player:{...spawn,dirX:1,dirY:0,hull:3,shield:0,moving:false,stride:0},
  guards:patrols.map(route=>{
   const angle=Math.atan2(route[1][1]-route[0][1],route[1][0]-route[0][0]);
   return {x:route[0][0],y:route[0][1],route,index:1,angle,chase:false};
  }),
  lights:beams.map(beam=>({route:beam.route,r:beam.r,speed:beam.speed,x:beam.route[0][0],y:beam.route[0][1],index:1})),
  mail:caches.map(p=>({...p,taken:false})),prints:[],count:0,charges:3,toy:null,time:0,alarm:0,flash:notice?0.45:0,
  notice:notice||'Find Sprout’s three dispatches',noticeUntil:notice?3.5:5};
 camera.x=spawn.x;camera.y=spawn.y;sync();
}
function sync(){
 ui.status.textContent='♥'.repeat(run.player.hull)+'♡'.repeat(3-run.player.hull)+' · '+run.count+'/3';
 ui.decoy.textContent='DECOY · '+run.charges;
 ui.decoy.disabled=mode!=='play'||run.charges===0;
}
function announce(message){run.notice=message;run.noticeUntil=run.time+3.5;}
function show(next,title,copy,label){
 mode=next;keys.clear();releaseStick();
 ui.title.textContent=title;ui.copy.textContent=copy;ui.start.textContent=label;ui.panel.hidden=false;sync();
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
function sees(guard,target){
 const dx=target.x-guard.x,dy=target.y-guard.y,dist=Math.hypot(dx,dy);
 if(dist>sightRange||dist<1)return false;
 const facing=(Math.cos(guard.angle)*dx+Math.sin(guard.angle)*dy)/dist;
 return facing>=sightDot&&!lineBlocked(guard,target);
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
function decoy(){
 if(mode!=='play'||!run.charges)return;
 const p=run.player,toy={x:p.x,y:p.y,until:run.time+5};
 for(let i=0;i<12;i++)walk(toy,p.dirX*9,p.dirY*9,7);
 run.toy=toy;run.charges--;announce('Wind-up penguin deployed');sync();
}
ui.decoy.onclick=decoy;
const movement=['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'];
window.addEventListener('keydown',event=>{
 const key=event.key.toLowerCase();
 if(key==='escape'&&!event.repeat){if(mode==='paused')ui.start.click();else pause();return;}
 if(mode!=='play')return;
 if(movement.includes(key)){event.preventDefault();keys.add(key);}
 if(event.code==='Space'&&!event.repeat){event.preventDefault();decoy();}
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
 const idle=run.guards.filter(guard=>!guard.chase).sort((a,b)=>distance(a,run.player)-distance(b,run.player));
 idle.slice(0,quota).forEach(guard=>{guard.chase=true;});
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
 p.moving=magnitude>0;
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
 if(mines.some(mine=>distance(p,mine)<mineReach)){
  reset('A yard mine popped. Back to the gate.');
  return;
 }
 run.prints=run.prints.filter(print=>print.until>run.time);
 if(run.toy&&run.toy.until<=run.time)run.toy=null;
 let spotted=false;
 for(const guard of run.guards){
  const distracted=run.toy&&distance(guard,run.toy)<240;
  if(distracted){
   guard.chase=false;
   guard.aim=run.toy;
   along(guard,96,dt,12);
  }else if(guard.chase||sees(guard,p)){
   if(!guard.chase)spotted=true;
   guard.chase=true;
   guard.aim=p;
   along(guard,trentSpeed*0.9,dt,12);
  }else{
   const [x,y]=guard.route[guard.index];
   guard.aim={x,y};
   if(!along(guard,69,dt,12))guard.index=(guard.index+1)%guard.route.length;
  }
  if(distance(guard,p)<29&&p.shield<=run.time){
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
 for(const item of run.mail){
  if(!item.taken&&distance(p,item)<30){item.taken=true;run.count++;announce(run.count===3?'All dispatches found. Head to the mail hatch.':'Dispatch found · '+run.count+'/3');sync();}
 }
 if(distance(p,depot)<40&&run.count===3){
  show('won','Signed, sealed, escaped','Sprout’s dispatches identify the depot entrance. The last one says: “If captured, tell them I’m a decorative pepper mill.”','Explore again');
  const deliveryDetail={postcards:run.count,hull:p.hull,seconds:Math.round(run.time)};
  window.dispatchEvent(new CustomEvent('special-delivery:complete',{detail:deliveryDetail}));
  if(window.parent!==window){
    const deliveryRelay={type:'special-delivery:complete',detail:deliveryDetail};
    try{const deliveryRun=new URLSearchParams(location.search).get('runId');if(deliveryRun)deliveryRelay.runId=deliveryRun;}catch(ignore){}
    window.parent.postMessage(deliveryRelay,(location.protocol==='http:'||location.protocol==='https:')?location.origin:'*');
  }
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
function drawMine(mine){
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
 camera.x=clamp(run.player.x-vw/2,0,Math.max(0,world.w-vw));
 camera.y=clamp(run.player.y-vh/2,0,Math.max(0,world.h-vh));
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
 for(const mine of mines)drawMine(mine);
 for(const light of run.lights){
  glow(light.x,light.y,light.r,'#fff1b8aa');
  ctx.strokeStyle='#fff6c888';ctx.lineWidth=2;ctx.beginPath();ctx.arc(light.x,light.y,light.r,0,7);ctx.stroke();
 }
 glow(depot.x,depot.y,52,run.count===3?'#72f7c8aa':'#cf903f84');
 ctx.fillStyle=run.count===3?'#3c806b':'#5b4e44';ctx.fillRect(depot.x-24,depot.y-18,48,36);
 label(run.count===3?'MAIL HATCH OPEN':'MAIL HATCH · LOCKED',depot.x,depot.y-24);
 for(const item of run.mail){
  if(item.taken)continue;
  const lift=Math.sin(run.time*5+item.x)*4;
  glow(item.x,item.y,41,'#69fbd18a');
  if(!sprite('mail',item.x,item.y+lift,36,29)){ctx.fillStyle='#96feda';ctx.fillRect(item.x-15,item.y-10,30,20);}
 }
 if(run.toy){
  glow(run.toy.x,run.toy.y,45,'#ffb96c96');
  label('♫',run.toy.x,run.toy.y-17);
  ctx.fillStyle='#2b3447';ctx.beginPath();ctx.ellipse(run.toy.x,run.toy.y,10,15,0,0,7);ctx.fill();
  ctx.fillStyle='#ffe8bf';ctx.beginPath();ctx.ellipse(run.toy.x,run.toy.y+3,6,9,0,0,7);ctx.fill();
 }
 for(const print of run.prints){
  ctx.fillStyle='rgba(35,48,71,'+Math.min(.28,(print.until-run.time)*.12)+')';
  ctx.beginPath();ctx.ellipse(print.x,print.y,5,2.8,print.angle,0,7);ctx.fill();
 }
 for(const g of run.guards){
  const bob=reducedMotion.matches?0:Math.sin(run.time*12+g.x*.03)*1.4;
  const beam=g.chase?'#ff8a3d99':'#ffc16b80';
  glow(g.x+Math.cos(g.angle)*21,g.y+Math.sin(g.angle)*21,g.chase?56:43,beam);
  sprite('guard',g.x,g.y-11+bob,49,55,Math.cos(g.angle)<0);
 }
 const p=run.player;
 if(p.shield<=run.time||reducedMotion.matches||Math.floor(run.time*12)%2===0){
  ctx.fillStyle='#13192791';ctx.beginPath();ctx.ellipse(p.x,p.y+10,18,7,0,0,7);ctx.fill();
  const step=p.moving&&!reducedMotion.matches?Math.sin(p.stride/16*Math.PI):0;
  ctx.save();ctx.translate(p.x,p.y+8);ctx.rotate(step*.07);
  sprite('elf',0,-22+step*2,68,45,p.dirX<0);
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
 render();requestAnimationFrame(frame);
}
reset();resize();requestAnimationFrame(frame);
