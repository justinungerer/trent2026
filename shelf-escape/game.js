const canvas = document.querySelector('#field');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
const world = { w: 620, h: 1260 };
const start = { x: 315, y: 1160 };
const cage = { x: 449, y: 564 };
const hatch = { x: 310, y: 112 };
const cover = [
 [84,1025,180,85],[357,1000,188,104],[119,839,164,70],
 [349,810,186,81],[75,671,129,105],[265,639,263,38],
 [83,486,167,71],[293,426,240,62],[92,305,163,70],
 [361,264,177,81],[111,145,130,55],[384,131,157,48]
];
const routes = [
 [[66,953],[312,953],[312,1119],[72,1119]],
 [[553,747],[238,747],[238,594],[553,594]],
 [[63,414],[278,414],[278,237],[63,237]],
 [[566,217],[313,217],[313,72],[566,72]]
];
const prefersStill = matchMedia('(prefers-reduced-motion: reduce)');
const params = new URLSearchParams(location.search);
const suppliedCharges = params.get('charges');
const initialCharges = suppliedCharges === '1' ? 1 : 2;
const reinforced = params.get('patrol') === 'close';
const controller = { x:0, y:0 };
const keys = new Set();
const view = { w:0,h:0,x:0,y:0,scale:1 };
let drag = null, audio, sound = false, priorTime = 0;
let state = 'brief', player, guards, distraction, carried, alert, ammo, clock, particles;
let session = null;

function reset(){
 player = { ...start, facing:-Math.PI/2, stride:0 };
 guards = routes.map((route,i)=>({x:route[0][0],y:route[0][1],route,next:1,face:0,speed:(reinforced?83:70)+i*7}));
 distraction=null;carried=false;alert=0;ammo=initialCharges;clock=0;particles=[];
 view.x=0;view.y=world.h;
}
function stopInput(){
 drag=null;controller.x=0;controller.y=0;keys.clear();$('knob').style.transform='';
}
function show(title, body, label, action){
 $('overlay').hidden=false;
 $('overlay').innerHTML='<div class="card"><h2>'+title+'</h2>'+body+'<button id="overlay-action">'+label+'</button></div>';
 $('overlay-action').onclick=action;
 $('overlay-action').focus({preventScroll:true});
}
function begin(){
 state='play';$('overlay').hidden=true;$('pause').disabled=false;
 if(sound) initAudio();
}
function pause(){
 if(state!=='play')return;
 stopInput();state='paused';$('pause').disabled=true;
 show('Paused','<p>Sprout says he can hold this pose all day. He’s had practice.</p>','Resume',begin);
}
function briefing(){
 show('Get Sprout out','<p>Sprout’s trapped halfway up the depot. Find his display case, then lead him to the mail hatch.</p><ul><li><strong>Move</strong> with the thumbstick, arrow keys, or WASD.</li><li><strong>Hide</strong> behind shelves until the flashlight passes. The alert meter fills while you’re exposed.</li><li><strong>Decoy</strong> throws a wind-up nutcracker ahead. Nearby guards turn toward the noise.</li></ul>','Infiltrate the depot',begin);
}
function end(won){
 state=won?'won':'caught';stopInput();$('pause').disabled=true;playTone(won?660:155,.25);
 if(won&&session){
  window.parent.postMessage({type:'trent:complete',version:1,mission:'shelf-escape',runId:session.runId,seconds:Math.round(clock),chargesUsed:initialCharges-ammo},session.origin);
 }
 show(won?'Sprout is out':'Caught in the light',won?'<p>“I know where Santa is. I also stole their stapler. Let’s discuss priorities on the way out.”</p><p>Escape time: '+Math.round(clock)+' seconds.</p>':'<p>The guard files Sprout under <em>Seasonal Equipment</em>. Try another route through the shelves.</p>',won?'Play again':'Retry Shelf Escape',()=>{reset();begin()});
}

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function blocked(x,y,r=0){
 return x<34+r||y<35+r||x>world.w-34-r||y>world.h-35-r||
  cover.some(([left,top,w,h])=>x>left-r&&x<left+w+r&&y>top-r&&y<top+h+r);
}
function visible(a,b){
 const count=Math.ceil(distance(a,b)/11);
 for(let i=1;i<count;i++)if(blocked(a.x+(b.x-a.x)*i/count,a.y+(b.y-a.y)*i/count))return false;
 return true;
}
function deploy(){
 if(state!=='play'||ammo===0||distraction)return;
 let reach=148;
 for(let i=20;i<148;i+=12){
  if(blocked(player.x+Math.cos(player.facing)*i,player.y+Math.sin(player.facing)*i,5)){reach=i-12;break}
 }
 const target={x:player.x+Math.cos(player.facing)*reach,y:player.y+Math.sin(player.facing)*reach};
 distraction={...target,fromX:player.x,fromY:player.y,time:0};
 ammo--;playTone(348,.1);
}
function step(dt){
 clock+=dt;
 const horizontal=Number(keys.has('arrowright')||keys.has('d'))-Number(keys.has('arrowleft')||keys.has('a'));
 const vertical=Number(keys.has('arrowdown')||keys.has('s'))-Number(keys.has('arrowup')||keys.has('w'));
 const x=horizontal||controller.x,y=vertical||controller.y;
 const magnitude=Math.hypot(x,y);
 if(magnitude>.08){
  player.facing=Math.atan2(y,x);player.stride+=dt*12;
  const speed=(carried?143:165)*dt/Math.max(1,magnitude);
  if(!blocked(player.x+x*speed,player.y,12))player.x+=x*speed;
  if(!blocked(player.x,player.y+y*speed,12))player.y+=y*speed;
 }
 if(distraction){distraction.time+=dt;if(distraction.time>4)distraction=null}
 let exposed=false;
 for(const g of guards){
  const [tx,ty]=g.route[g.next];
  const target={x:tx,y:ty};
  const gap=distance(g,target);
  if(gap<6)g.next=(g.next+1)%g.route.length;
  const lulled=distraction&&distraction.time>.34&&distance(g,distraction)<250;
  const look=lulled?distraction:target;
  const desired=Math.atan2(look.y-g.y,look.x-g.x);
  g.face+=angleDiff(desired,g.face)*Math.min(1,dt*7);
  if(!lulled&&gap>=6){g.x+=(tx-g.x)/gap*g.speed*dt;g.y+=(ty-g.y)/gap*g.speed*dt}
  const range=distance(player,g), heading=Math.atan2(player.y-g.y,player.x-g.x);
  if((range<28||range<180&&Math.abs(angleDiff(heading,g.face))<.45)&&visible(g,player))exposed=true;
 }
 alert=clamp(alert+(exposed?1.06:-.58)*dt,0,1);
 if(alert>=1){end(false);return}
 if(!carried&&distance(player,cage)<43){carried=true;burst(cage);playTone(525,.16)}
 if(carried&&distance(player,hatch)<36)end(true);
 for(const p of particles){p.life-=dt;p.x+=p.dx*dt;p.y+=p.dy*dt;p.dy+=100*dt}
 particles=particles.filter(p=>p.life>0);
}
function burst(at){
 for(let i=0;i<24;i++)particles.push({...at,life:.4+Math.random()*.6,dx:(Math.random()-.5)*190,dy:-Math.random()*130});
}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h)}
function circle(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
function poly(points,color){
 ctx.fillStyle=color;ctx.beginPath();
 points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();
}
function text(x,y,value,color='#e6ca8f'){
 ctx.fillStyle=color;ctx.font='bold 13px monospace';ctx.textAlign='center';ctx.fillText(value,x,y);
}
function glow(x,y,r,color){
 const g=ctx.createRadialGradient(x,y,2,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');circle(x,y,r,g);
}
function actor(x,y,face,body,stride,hat){
 ctx.save();ctx.translate(x,y);ctx.rotate(face);
 const bob=Math.sin(stride)*5;
 circle(-5,4,14,'#10151488');
 rect(-10+bob,-10,14,6,'#192221');rect(-10-bob,4,14,6,'#192221');
 circle(-1,0,12,body);circle(8,0,8,hat);rect(12,-6,4,12,'#ae9d72');
 ctx.restore();
}
function cone(g){
 const points=[[g.x,g.y]];
 for(let i=0;i<=22;i++){
  const angle=g.face-.45+i*.9/22;
  let reach=180;
  for(let test=8;test<=180;test+=6)if(blocked(g.x+Math.cos(angle)*test,g.y+Math.sin(angle)*test)){reach=test;break}
  points.push([g.x+Math.cos(angle)*reach,g.y+Math.sin(angle)*reach]);
 }
 const light=ctx.createRadialGradient(g.x,g.y,2,g.x,g.y,185);
 light.addColorStop(0,'#fff0a370');light.addColorStop(1,'#eec77f16');poly(points,light);
}
function draw(){
 const desiredScale=Math.min(view.w/560,view.h/440);
 view.scale=desiredScale;
 const maxX=Math.max(0,world.w-view.w/desiredScale),maxY=Math.max(0,world.h-view.h/desiredScale);
 view.x=clamp(player.x-view.w/(2*desiredScale),0,maxX);
 view.y=clamp(player.y-view.h/(2*desiredScale),0,maxY);
 const centered=Math.max(0,(view.w-world.w*desiredScale)/2);
 ctx.save();rect(0,0,view.w,view.h,'#10191a');
 ctx.translate(centered-view.x*desiredScale,-view.y*desiredScale);ctx.scale(desiredScale,desiredScale);
 rect(0,0,world.w,world.h,'#232d2a');
 for(let y=26;y<world.h;y+=32){rect(25,y,570,30,y%64===26?'#3c4540':'#38443e');for(let x=38+(y%64);x<590;x+=92)rect(x,y+2,2,26,'#293834')}
 rect(22,30,10,1190,'#75604a');rect(589,30,10,1190,'#75604a');
 for(let i=0;i<7;i++){const y=102+i*177;glow(i%2?560:58,y,124,'#d7a45f58');circle(i%2?579:39,y,6,'#ffce84')}
 for(const [x,y,w,h] of cover){
  rect(x+5,y+8,w,h,'#1019188c');rect(x,y,w,h,'#302c25');rect(x+3,y+3,w-6,h-6,'#67543b');rect(x+4,y+4,w-8,4,'#9c7850');
  for(let offset=12;offset<w-17;offset+=39){rect(x+offset,y+14,27,h-23,'#494137');rect(x+offset+2,y+16,23,3,'#8c7657')}
  rect(x,y+h-6,w,6,'#221e1a');
 }
 rect(hatch.x-25,hatch.y-18,50,36,'#527c71');rect(hatch.x-21,hatch.y-14,42,5,'#94c4a6');text(hatch.x,hatch.y+35,'MAIL HATCH','#acf3c4');
 if(!carried){
  glow(cage.x,cage.y,65,'#ecc36769');rect(cage.x-19,cage.y-21,38,42,'#ad8954');rect(cage.x-16,cage.y-18,32,36,'#526259');circle(cage.x,cage.y,9,'#b94145');
  rect(cage.x-12,cage.y-18,2,35,'#dbc595');rect(cage.x+10,cage.y-18,2,35,'#dbc595');text(cage.x,cage.y-28,'SPROUT');
 }
 for(const g of guards){cone(g);actor(g.x,g.y,g.face,'#686c59',clock*12,'#9d8864')}
 if(distraction){
  const time=distraction.time,k=Math.min(1,time/.34);
  const x=distraction.fromX+(distraction.x-distraction.fromX)*k,y=distraction.fromY+(distraction.y-distraction.fromY)*k;
  const hop=prefersStill.matches?0:Math.sin(k*Math.PI)*25;
  circle(x,y,9,'#10191899');actor(x,y-hop,clock*7,'#bf5248',0,'#ffca76');
  if(time>.34){ctx.strokeStyle='#f5bc7780';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,14+((time-.34)%1)*48,0,Math.PI*2);ctx.stroke()}
 }
 if(carried) actor(player.x-Math.cos(player.facing)*22,player.y-Math.sin(player.facing)*22,player.facing,'#b64047',player.stride,'#d85c55');
 actor(player.x,player.y,player.facing,'#507968',player.stride,'#a0ac85');
 for(const p of particles)circle(p.x,p.y,2,'rgba(255,203,111,'+p.life+')');
 if(alert){ctx.strokeStyle='#fb8068';ctx.lineWidth=3;ctx.beginPath();ctx.arc(player.x,player.y,22,-Math.PI/2,-Math.PI/2+Math.PI*2*alert);ctx.stroke()}
 ctx.restore();
}
function frame(time){
 const dt=Math.min(.045,(time-priorTime)/1000);priorTime=time;
 if(state==='play')step(dt);
 draw();
 const status=alert>.65?'ABOUT TO BE CAUGHT':alert>.05?'SPOTTED':'HIDDEN';
 $('danger').textContent=status;
 $('danger').style.color=alert>.05?'#ff9e84':'#a9e2b4';
 $('objective').textContent=carried?'Escort Sprout to the mail hatch':'Find Sprout’s display case';
 $('ammo').textContent=ammo;
 $('decoy').disabled=state!=='play'||!ammo||Boolean(distraction);
 requestAnimationFrame(frame);
}
function resize(){
 const bounds=canvas.getBoundingClientRect(), ratio=Math.min(2,devicePixelRatio||1);
 view.w=Math.max(1,bounds.width);view.h=Math.max(1,bounds.height);
 canvas.width=Math.round(view.w*ratio);canvas.height=Math.round(view.h*ratio);
 ctx.setTransform(ratio,0,0,ratio,0,0);
}
function initAudio(){
 const Audio=window.AudioContext||window.webkitAudioContext;
 if(!Audio)return;
 try{audio ||= new Audio();audio.resume().catch(()=>{})}catch{}
}
function playTone(hz,length){
 if(!audio||!sound||audio.state!=='running')return;
 const oscillator=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;
 oscillator.type='triangle';oscillator.frequency.setValueAtTime(hz,now);oscillator.frequency.exponentialRampToValueAtTime(hz*.7,now+length);
 gain.gain.setValueAtTime(.075,now);gain.gain.exponentialRampToValueAtTime(.001,now+length);oscillator.connect(gain).connect(audio.destination);
 oscillator.start(now);oscillator.stop(now+length);
}
const pad=$('pad');
function dragPad(event){
 if(drag!==event.pointerId)return;
 const bounds=pad.getBoundingClientRect(), radius=bounds.width*.38;
 const x=event.clientX-bounds.left-bounds.width/2,y=event.clientY-bounds.top-bounds.height/2;
 const reach=Math.max(radius,Math.hypot(x,y));
 controller.x=x/reach;controller.y=y/reach;
 $('knob').style.transform='translate('+controller.x*radius+'px,'+controller.y*radius+'px)';
}
pad.addEventListener('pointerdown',event=>{if(state==='play'&&drag===null){drag=event.pointerId;pad.setPointerCapture(drag);dragPad(event)}});
pad.addEventListener('pointermove',dragPad);
for(const action of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(action,event=>{if(event.pointerId===drag)stopInput()});
window.addEventListener('keydown',event=>{
 if(state!=='play')return;
 const key=event.key.toLowerCase();
 if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' '].includes(key)){
  event.preventDefault();if(key===' '){if(!event.repeat)deploy()}else keys.add(key);
 }
 if(key==='escape')pause();
});
window.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
window.addEventListener('blur',stopInput);
$('decoy').onclick=deploy;
$('pause').onclick=pause;
$('sound').onclick=()=>{sound=!sound;if(sound){initAudio();playTone(400,.15)}$('sound').textContent=sound?'Sound on':'Sound off';$('sound').setAttribute('aria-pressed',String(sound))};
new ResizeObserver(resize).observe(canvas);

const originParam=params.get('parentOrigin');
if(window.parent!==window&&originParam){
 try{
  const parentOrigin=new URL(originParam);
  if(parentOrigin.protocol==='https:'&&parentOrigin.origin===originParam){
   window.addEventListener('message',event=>{
    if(event.source!==window.parent||event.origin!==parentOrigin.origin||event.data?.type!=='trent:init'||event.data.version!==1||typeof event.data.runId!=='string'||session)return;
    session={runId:event.data.runId,origin:event.origin};
   });
   window.parent.postMessage({type:'trent:ready',version:1,mission:'shelf-escape'},parentOrigin.origin);
  }
 }catch{}
}
reset();resize();briefing();requestAnimationFrame(frame);
