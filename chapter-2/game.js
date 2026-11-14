'use strict';
const canvas=document.querySelector('canvas');
const ctx=canvas.getContext('2d');
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
 [[210,380],[410,380],[410,105],[210,105]],
 [[655,110],[655,411],[890,411],[890,110]],
 [[415,610],[960,610],[960,370],[672,370],[672,610]]
];
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const keys=new Set(), camera={x:0,y:0};
const art=Object.fromEntries(['yard','elf','guard','shelf','mail'].map(name=>{
 const image=new Image();image.src='./art/'+name+'.webp';return [name,image];
}));
const clamp=(n,low,high)=>Math.max(low,Math.min(high,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const radius=14;
let mode='intro',run,drag,last=0;
function reset(){
 keys.clear();drag=null;
 run={player:{...spawn,dirX:1,dirY:0,hull:3,shield:0,moving:false,stride:0},
  guards:patrols.map(route=>({x:route[0][0],y:route[0][1],route,index:1,angle:0})),
  mail:caches.map(p=>({...p,taken:false})),prints:[],count:0,charges:3,toy:null,time:0,notice:'Find Sprout’s three dispatches',noticeUntil:5};
 camera.x=spawn.x;camera.y=spawn.y;sync();
}
function sync(){
 ui.status.textContent='♥'.repeat(run.player.hull)+'♡'.repeat(3-run.player.hull)+' · '+run.count+'/3';
 ui.decoy.textContent='DECOY · '+run.charges;
 ui.decoy.disabled=mode!=='play'||run.charges===0;
}
function announce(message){run.notice=message;run.noticeUntil=run.time+3.5;}
function show(next,title,copy,label){
 mode=next;keys.clear();drag=null;
 ui.title.textContent=title;ui.copy.textContent=copy;ui.start.textContent=label;ui.panel.hidden=false;sync();
}
function pause(){if(mode==='play')show('paused','Hold the mail','Trent stops to check whether the stamps have diplomatic immunity.','Resume');}
ui.start.onclick=()=>{if(mode!=='paused')reset();mode='play';ui.panel.hidden=true;sync();};
ui.pause.onclick=pause;
function blocked(x,y,r){
 if(x<r||y<r||x>world.w-r||y>world.h-r)return true;
 return shelves.some(s=>Math.hypot(x-clamp(x,s.x,s.x+s.w),y-clamp(y,s.y,s.y+s.h))<r);
}
function walk(actor,dx,dy,r){
 if(!blocked(actor.x+dx,actor.y,r))actor.x+=dx;
 if(!blocked(actor.x,actor.y+dy,r))actor.y+=dy;
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
canvas.addEventListener('pointerdown',event=>{
 if(mode!=='play'||drag)return;
 drag={id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,dy:0};canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove',event=>{
 if(drag?.id!==event.pointerId)return;
 drag.dx=event.clientX-drag.x;drag.dy=event.clientY-drag.y;
});
for(const name of ['pointerup','pointercancel','lostpointercapture']){
 canvas.addEventListener(name,event=>{if(drag?.id===event.pointerId)drag=null;});
}
function update(dt){
 run.time+=dt;
 const p=run.player;
 const held=(a,b)=>Number(keys.has(a)||keys.has(b));
 let dx=held('d','arrowright')-held('a','arrowleft'),dy=held('s','arrowdown')-held('w','arrowup');
 if(drag&&Math.hypot(drag.dx,drag.dy)>6){dx=drag.dx;dy=drag.dy;}
 const magnitude=Math.hypot(dx,dy);
 p.moving=magnitude>0;
 if(p.moving){
  const before={x:p.x,y:p.y};
  p.dirX=dx/magnitude;p.dirY=dy/magnitude;
  walk(p,p.dirX*178*dt,p.dirY*178*dt,radius);
  const traveled=distance(before,p);
  p.moving=traveled>.01;
  p.stride+=traveled;
  if(Math.floor(p.stride/16)!==Math.floor((p.stride-traveled)/16)){
   const side=Math.floor(p.stride/16)%2?1:-1;
   run.prints.push({x:p.x-p.dirY*side*5,y:p.y+p.dirX*side*5,angle:Math.atan2(p.dirY,p.dirX),until:run.time+3});
  }
 }
 run.prints=run.prints.filter(print=>print.until>run.time);
 if(run.toy&&run.toy.until<=run.time)run.toy=null;
 for(const guard of run.guards){
  const [x,y]=guard.route[guard.index];
  const distracted=run.toy&&distance(guard,run.toy)<240;
  const target=distracted?run.toy:{x,y};
  const d=distance(guard,target);
  if(d>5){
   const step=Math.min(d,(distracted?96:69)*dt);
   guard.angle=Math.atan2(target.y-guard.y,target.x-guard.x);
   walk(guard,Math.cos(guard.angle)*step,Math.sin(guard.angle)*step,12);
  }else if(!distracted)guard.index=(guard.index+1)%guard.route.length;
  if(distance(guard,p)<29&&p.shield<=run.time){
   p.hull--;p.shield=run.time+1.8;announce('Inspector citation!');sync();
   if(!p.hull){show('lost','Return to sender','The inspectors impounded Trent for unauthorized festivity.','Try again');return;}
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
const snow=Array.from({length:60},(_,i)=>[i*137.7%1080,i*97.3%720,1+i%3]);
function render(){
 const width=canvas.width,height=canvas.height;
 const zoom=Math.min(width/370,height/460);
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
  glow(g.x+Math.cos(g.angle)*21,g.y+Math.sin(g.angle)*21,43,'#ffc16b80');
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
 if(run.noticeUntil>run.time){
  ctx.setTransform(zoom,0,0,zoom,0,0);label(run.notice,vw/2,25);
 }
}
function resize(){
 const b=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
 canvas.width=Math.max(1,Math.round(b.width*dpr));canvas.height=Math.max(1,Math.round(b.height*dpr));
}
window.addEventListener('resize',resize);
function frame(now){
 const dt=last?Math.min((now-last)/1000,.04):0;last=now;
 if(mode==='play')update(dt);
 render();requestAnimationFrame(frame);
}
reset();resize();requestAnimationFrame(frame);
