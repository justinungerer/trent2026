let ctx, art, scene;
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
const params = new URLSearchParams(location.search);
const unlocked = params.get('weapon') !== 'locked';
const initialCharges = unlocked ? (params.get('charges') === '2' ? 2 : 4) : 0;
const fastReload = params.get('reload') !== 'slow';
const hitsToWrap = params.get('ribbon') === 'plain' ? 2 : 1;
let shot, cooldown, boxed;
const reinforced = params.get('patrol') === 'close';
const controller = { x:0, y:0 };
const keys = new Set();
const view = { w:0,h:0,x:0,y:0,scale:1 };
let drag = null, audio, sound = false;
let state = 'brief', player, guards, carried, alert, ammo, clock, particles;
let session = null;

function reset(){
 player = { ...start, facing:-Math.PI/2, stride:0 };
 guards = routes.map((route,i)=>({x:route[0][0],y:route[0][1],route,next:1,face:0,speed:(reinforced?83:70)+i*7}));
 shot=null;cooldown=0;boxed=0;carried=false;alert=0;ammo=initialCharges;clock=0;particles=[];
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
 show('Get Sprout out','<p>The colonel has entered Sprout in the depot’s annual decoration contest. Sprout is winning in three categories, including Best Use of Interrogation Time. Free him before judging.</p><ul><li><strong>Move</strong> with the thumbstick, arrow keys, or WASD.</li><li><strong>Hide</strong> behind shelves until the flashlight passes. The alert meter fills while you’re exposed.</li><li><strong>Wrap</strong> or Space fires the Gift-Wrap Gun after Sprout takes over. Get a clear line to a guard and look for the gold targeting ring.</li></ul><p>'+ (unlocked ? initialCharges+' shots · '+hitsToWrap+' hit'+(hitsToWrap===1?'':'s')+' to wrap a guard.' : 'Gift-Wrap Gun locked. Sprout can slip past the patrols.')+'</p>','Infiltrate the depot',begin);
}
function end(won){
 state=won?'won':'caught';stopInput();$('pause').disabled=true;playTone(won?660:155,.25);
 if(won&&session){
  window.parent.postMessage({type:'trent:complete',version:1,mission:'shelf-escape',runId:session.runId,seconds:Math.round(clock),chargesUsed:initialCharges-ammo,guardsWrapped:boxed},session.origin);
 }
 show(won?'Sprout is out':'Caught in the light',won?'<p>“I found Santa’s transport order. The colonel filed it under Seasonal Plumbing.” Sprout holds up a stapler. “I brought his second-in-command in for questioning.”</p><p>Escape time: '+Math.round(clock)+' seconds.</p>':'<p>The guard files Sprout under <em>Seasonal Equipment</em>. Try another route through the shelves.</p>',won?'Play again':'Retry Shelf Escape',()=>{reset();begin()});
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
function targetGuard(){
 return guards.filter(guard=>!guard.wrapped&&distance(player,guard)<234&&visible(player,guard))
  .sort((a,b)=>distance(player,a)-distance(player,b))[0];
}
function deploy(){
 if(state!=='play'||!carried||ammo===0||cooldown>0)return;
 const guard=targetGuard();
 if(!guard)return;
 ammo--;
 cooldown=fastReload?.42:.97;
 shot={x:player.x,y:player.y,target:guard,time:0};
 playTone(430,.16);
}
function step(dt){
 clock+=dt;
 cooldown=Math.max(0,cooldown-dt);
 if(shot){
  shot.time+=dt;
  if(shot.time>=.14){
   const guard=shot.target;
   if(visible(shot,guard)){
    guard.hits=(guard.hits??0)+1;
    guard.wrapped=guard.hits>=hitsToWrap;
    guard.tangled=clock+2;
    if(guard.wrapped)boxed++;
    burst(guard);playTone(guard.wrapped?620:260,.2);
   }
   shot=null;
  }
 }
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
 let exposed=false;
 for(const g of guards){
  if(g.wrapped||g.tangled>clock)continue;
  const [tx,ty]=g.route[g.next];
  const target={x:tx,y:ty};
  const gap=distance(g,target);
  if(gap<6)g.next=(g.next+1)%g.route.length;
  const look=target;
  const desired=Math.atan2(look.y-g.y,look.x-g.x);
  g.face+=angleDiff(desired,g.face)*Math.min(1,dt*7);
  if(gap>=6){g.x+=(tx-g.x)/gap*g.speed*dt;g.y+=(ty-g.y)/gap*g.speed*dt}
  const range=distance(player,g), heading=Math.atan2(player.y-g.y,player.x-g.x);
  if((range<28||range<180&&Math.abs(angleDiff(heading,g.face))<.45)&&visible(g,player))exposed=true;
 }
 alert=clamp(alert+(exposed?1.06:-.58)*dt,0,1);
 if(alert>=1){end(false);return}
 if(!carried&&distance(player,cage)<43){carried=true;burst(cage);playTone(525,.16);state='brief';stopInput();show('Sprout takes over','<p>“Trent, hold my trophy. The mail hatch is upstairs. If anyone asks, I’m the centerpiece.”</p><p>'+(unlocked?'The Gift-Wrap Gun is ready. Aim for the gold ring.':'Time your moves between the patrols.')+'</p>','Play as Sprout',begin)}
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
 for(let i=0;i<290;i++){
  const x=33+(i*191)%551,y=35+(i*137)%1180;
  rect(x,y,6+i%19,1,i%2?'#c0ad802b':'#131c1b48');
 }
 for(const [y,name] of [[1131,'FREIGHT INTAKE'],[781,'CONTEST STAGING'],[612,'EXHIBITION FLOOR'],[176,'OUTGOING MAIL']]){
  ctx.save();ctx.translate(310,y);ctx.rotate(-.04);text(0,0,name,'#bfb5969c');ctx.restore();
 }
 rect(22,30,10,1190,'#75604a');rect(589,30,10,1190,'#75604a');
 for(let i=0;i<7;i++){const y=102+i*177;glow(i%2?560:58,y,124,'#d7a45f58');circle(i%2?579:39,y,6,'#ffce84')}
 for(const [x,y,w,h] of cover){
  rect(x+5,y+8,w,h,'#1019188c');rect(x,y,w,h,'#302c25');rect(x+3,y+3,w-6,h-6,'#67543b');rect(x+4,y+4,w-8,4,'#9c7850');
  for(let offset=12;offset<w-17;offset+=39){rect(x+offset,y+14,27,h-23,'#494137');rect(x+offset+2,y+16,23,3,'#8c7657')}
  rect(x,y+h-6,w,6,'#221e1a');
  for(let offset=17;offset<w-20;offset+=48){
   const color=offset%3===2?'#943d3b':'#3b6760';
   rect(x+offset,y+21,20,16,color);rect(x+offset+8,y+21,4,16,'#d3a85c');
   rect(x+offset,y+27,20,3,'#dcba77');
  }
 }
 rect(hatch.x-25,hatch.y-18,50,36,'#527c71');rect(hatch.x-21,hatch.y-14,42,5,'#94c4a6');text(hatch.x,hatch.y+35,'MAIL HATCH','#acf3c4');
 if(!carried){
  glow(cage.x,cage.y,65,'#ecc36769');rect(cage.x-19,cage.y-21,38,42,'#ad8954');rect(cage.x-16,cage.y-18,32,36,'#526259');circle(cage.x,cage.y,9,'#b94145');
  text(cage.x,cage.y+37,'FIRST PRIZE','#f4d183');
  rect(cage.x-12,cage.y-18,2,35,'#dbc595');rect(cage.x+10,cage.y-18,2,35,'#dbc595');text(cage.x,cage.y-28,'SPROUT');
 }
 for(const guard of guards){
  if(guard.wrapped){
   rect(guard.x-15,guard.y-14,30,30,'#ad4443');rect(guard.x-3,guard.y-14,6,30,'#e9b260');rect(guard.x-15,guard.y-3,30,6,'#ffe09a');
   circle(guard.x-5,guard.y-15,5,'#e8aa59');circle(guard.x+5,guard.y-15,5,'#e8aa59');
   continue;
  }
  if(!(guard.tangled>clock))cone(guard);
  actor(guard.x,guard.y,guard.face,'#686c59',clock*12,'#9d8864');
 }
 const target=carried&&ammo>0&&targetGuard();
 if(target){
  ctx.strokeStyle='#ffca73';ctx.lineWidth=2;ctx.beginPath();ctx.arc(target.x,target.y,21+Math.sin(clock*8)*2,0,Math.PI*2);ctx.stroke();
 }
 if(shot){
  const k=Math.min(1,shot.time/.14);
  const x=Phaser.Math.Linear(shot.x,shot.target.x,k),y=Phaser.Math.Linear(shot.y,shot.target.y,k);
  glow(x,y,29,'#ffb344ac');circle(x,y,5,'#fff0a7');
 }
 actor(player.x,player.y,player.facing,carried?'#be434d':'#507968',player.stride,carried?'#e87056':'#a0ac85');
 for(const p of particles)circle(p.x,p.y,2,'rgba(255,203,111,'+p.life+')');
 if(alert){ctx.strokeStyle='#fb8068';ctx.lineWidth=3;ctx.beginPath();ctx.arc(player.x,player.y,22,-Math.PI/2,-Math.PI/2+Math.PI*2*alert);ctx.stroke()}
 ctx.restore();
 const vignette=ctx.createRadialGradient(view.w/2,view.h/2,view.w*.25,view.w/2,view.h/2,Math.hypot(view.w,view.h)*.58);
 vignette.addColorStop(0,'#07131700');vignette.addColorStop(1,'#081113ba');rect(0,0,view.w,view.h,vignette);
}
function frame(time,delta){
 const dt=Math.min(.045,delta/1000);
 if(state==='play')step(dt);
 if(!view.w||!view.h)return;
 draw();
 art.refresh();
 const status=alert>.65?'ABOUT TO BE CAUGHT':alert>.05?'SPOTTED':'HIDDEN';
 $('danger').textContent=status;
 $('danger').style.color=alert>.05?'#ff9e84':'#a9e2b4';
 $('objective').textContent=carried?'Sprout • Reach the mail hatch':'Find Sprout’s display case';
 $('ammo').textContent=ammo;
 $('decoy').disabled=state!=='play'||!carried||!ammo||cooldown>0||!targetGuard();

}
function resize(){
 if(!scene)return;
 const bounds=$('field').getBoundingClientRect();
 view.w=Math.max(1,Math.round(bounds.width));view.h=Math.max(1,Math.round(bounds.height));
 scene.scale.resize(view.w,view.h);
 const ratio=Math.min(2,devicePixelRatio||1);
 art.setSize(Math.round(view.w*ratio),Math.round(view.h*ratio));
 ctx.setTransform(ratio,0,0,ratio,0,0);
 scene.children.getByName('depot').setDisplaySize(view.w,view.h);
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
new ResizeObserver(resize).observe($('field'));

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
reset();
if(!window.Phaser){
 show('Game engine unavailable','<p>Reload to retry loading the game.</p>','Reload',()=>location.reload());
}else{
 new Phaser.Game({
  type:Phaser.AUTO,parent:'field',width:640,height:640,backgroundColor:'#10191a',
  scene:{
   create(){
    scene=this;
    art=this.textures.createCanvas('depot-frame',640,640);
    ctx=art.getContext();
    this.add.image(0,0,'depot-frame').setOrigin(0).setName('depot');
    resize();
    briefing();
   },
   update:frame
  }
 });
}
