'use strict';
const canvas=document.querySelector('canvas');
const ctx=canvas.getContext('2d');
const ui=Object.fromEntries(['status','panel','title','copy','help','start','pause','left','jump','right'].map(id=>[id,document.getElementById(id)]));
const ink='#21191e',paper='#f7e4b7',mint='#81d3b9',red='#e64c40';
const runway=95;
const art=Object.fromEntries(['rail','cart-a','cart-b','crate','mail'].map(name=>{
 const image=new Image();image.src='./art/'+name+'.webp';return [name,image];
}));
const loaded=image=>image.complete&&image.naturalWidth;
function sprite(name,x,y,width){
 const image=art[name];
 if(!loaded(image))return false;
 const height=width*image.naturalHeight/image.naturalWidth;
 ctx.drawImage(image,x-width/2,y-height/2,width,height);
 return true;
}
const snow=Array.from({length:56},(_,i)=>({x:i*71.51%360,y:i*107.1%560,r:.5+i%4*.46}));
const particles=[];
function scatter(x,y,color){
 for(let i=0;i<18;i++){
  const a=Math.random()*Math.PI*2, speed=35+Math.random()*105;
  particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:.45+Math.random()*.33,color});
 }
}
let mode='intro',run,last=0;
const lanes=[80,180,280];
const headlines=['THE COCOA EXPRESS','UNSCHEDULED BISCUIT STOP','DEPOT APPROACH'];
function reset(){
 particles.length=0;
 run={time:0,lane:1,x:180,jump:0,hull:3,mail:0,invulnerable:0,objects:[],next:0,feedback:'',feedbackUntil:0};
}
function show(next,title,copy,button){
 mode=next;ui.title.textContent=title;ui.copy.textContent=copy;ui.start.textContent=button;ui.panel.hidden=false;
}
function move(amount){if(mode==='play')run.lane=Math.max(0,Math.min(2,run.lane+amount));}
function hop(){if(mode==='play'&&!run.jump)run.jump=.72;}
ui.left.onclick=()=>move(-1);
ui.right.onclick=()=>move(1);
ui.jump.onclick=hop;
function pause(){
 if(mode==='play')show('paused','Hold that edition','The handcar brake is a boot. Please respect the boot.','Resume');
}
ui.pause.onclick=pause;
ui.start.onclick=()=>{
 if(mode!=='paused')reset();
 mode='play';ui.panel.hidden=true;
};
window.addEventListener('keydown',e=>{
 if(e.repeat)return;
 if(e.key==='Escape'){if(mode==='paused')ui.start.click();else pause();return;}
 if(mode!=='play')return;
 if(e.key==='ArrowLeft'||e.key==='ArrowRight'||e.code==='Space'){
  e.preventDefault();
  if(e.code==='Space')hop();else move(e.key==='ArrowLeft'?-1:1);
 }
});
window.addEventListener('blur',pause);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
function announce(text){run.feedback=text;run.feedbackUntil=run.time+1.4;}
function spawn(index){
 const lane=(index*7+Math.floor(index/4))%3;
 const arrival=3+index*2.05;
 const mail=index%4===1;
 run.objects.push({lane,arrival,type:mail?'mail':index%3===0?'barrier':'crate',checked:false});
 if(index%5===4){
  run.objects.push({lane:(lane+1)%3,arrival,type:'crate',checked:false});
 }
}
function finish(){
 const won=run.hull>0&&run.mail>=3;
 if(won){
  show('won','Signed, sealed, escaped','Sprout’s postcards spell out the depot entrance. The final card reads: “If captured, tell them I’m a decorative pepper mill.”','Ride again');
  window.dispatchEvent(new CustomEvent('special-delivery:complete',{detail:{postcards:run.mail,hull:run.hull,seconds:Math.round(run.time)}}));
 }else{
  show('lost','Return to sender',run.hull?'Trent reached the depot with too few postcards. The only address he can decode is the staff canteen.':'The handcar has filed for early retirement. Trent asks for a replacement with fewer opinions.','Try again');
 }
}
function update(dt){
 run.time+=dt;
 for(let i=particles.length-1;i>=0;i--){
  const p=particles[i];p.life-=dt;
  if(p.life<=0){particles.splice(i,1);continue;}
  p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=70*dt;
 }
 run.jump=Math.max(0,run.jump-dt);
 run.x+=(lanes[run.lane]-run.x)*Math.min(1,dt*18);
 while(3+run.next*2.05<Math.min(runway,run.time+3.3))spawn(run.next++);
 for(const object of run.objects){
  if(object.checked||object.arrival>run.time)continue;
  object.checked=true;
  if(Math.abs(lanes[object.lane]-run.x)>46)continue;
  if(object.type==='mail'){
   run.mail++;scatter(run.x,420,mint);announce('SPECIAL DELIVERY!');object.collected=true;
  }else if(object.type==='barrier'&&run.jump>.12&&run.jump<.65)announce('HOP!');
  else if(run.time>=run.invulnerable){
   run.hull--;scatter(run.x,442,'#ffb86f');run.invulnerable=run.time+1.2;announce('CLANG!');
   if(!run.hull){finish();break;}
  }
 }
 run.objects=run.objects.filter(o=>o.arrival>run.time-.8&&!o.collected);
 ui.status.textContent='♥'.repeat(run.hull)+'♡'.repeat(3-run.hull)+' · '+Math.min(3,run.mail)+'/3';
 if(mode==='play'&&run.time>=runway)finish();
}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function shape(points,color){
 ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
 ctx.fillStyle=color;ctx.fill();ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.stroke();
}
function render(){
 const {width,height}=canvas;
 ctx.setTransform(width/360,0,0,height/560,0,0);
 rect(0,0,360,560,paper);
 const district=Math.min(2,Math.floor(run.time/32));
 rect(0,0,360,560,'#181e31');
 const terrain=art.rail;
 if(loaded(terrain)){
  const height=360*terrain.naturalHeight/terrain.naturalWidth;
  const distance=run.time*140, tile=Math.floor(distance/height);
  for(let i=-2;i<=1;i++){
   ctx.save();ctx.translate(0,distance%height+i*height);
   if((tile-i)%2){ctx.translate(0,height);ctx.scale(1,-1);}
   ctx.drawImage(terrain,0,0,360,height+.6);ctx.restore();
  }
  rect(0,0,360,560,['#171c300d','#26225325','#2015234a'][district]);
 }else for(const x of lanes){
  rect(x-43,0,86,560,'#7c8193');
  for(let y=(run.time*140)%35-35;y<560;y+=35)rect(x-37,y,74,7,'#422d36');
  for(const offset of [-27,24])rect(x+offset,0,6,560,ink);
 }
 for(const flake of snow){
  const y=(flake.y+run.time*(125+flake.r*49))%560;
  const x=flake.x+Math.sin(y*.03+flake.x)*7;
  ctx.fillStyle='rgba(234,244,255,'+(.19+flake.r*.24)+')';
  ctx.beginPath();ctx.ellipse(x,y,flake.r,flake.r*1.4,0,0,7);ctx.fill();
 }
 for(const o of run.objects){
  const y=442+(run.time-o.arrival)*140,x=lanes[o.lane];
  if(y<-34||y>590)continue;
  if(o.type==='mail'){
   if(sprite('mail',x,y+Math.sin(run.time*7)*4,42))continue;
   shape([[x-24,y-15],[x+24,y-15],[x+24,y+15],[x-24,y+15]],mint);
   shape([[x-22,y-13],[x,y+4],[x+22,y-13]],paper);
  }else if(o.type==='barrier'){
   rect(x-39,y-9,78,18,ink);
   for(let n=-35;n<33;n+=15)shape([[x+n,y+6],[x+n+7,y-6],[x+n+14,y-6],[x+n+7,y+6]],'#f4bd4e');
  }else{
   if(sprite('crate',x,y,61))continue;
   shape([[x-29,y-24],[x+19,y-24],[x+29,y-13],[x+29,y+20],[x-29,y+20]],'#aa5851');
   shape([[x-24,y-15],[x-15,y-15],[x+24,y+14],[x+15,y+14]],'#edb779');
  }
 }
 const jump=Math.sin(Math.PI*run.jump/.72)*47;
 const x=run.x,y=442-jump;
 ctx.fillStyle='rgba(9,13,25,'+(.44-jump*.005)+')';
 ctx.beginPath();ctx.ellipse(x,453,30+jump*.13,9,0,0,7);ctx.fill();
 if(run.time>=run.invulnerable||Math.floor(run.time*13)%2===0){
  ctx.save();ctx.translate(x,y);
  ctx.rotate((lanes[run.lane]-x)*.004);
  const phase=run.time*2%1;
  const blend=(1-Math.cos(phase*2*Math.PI))/2;
  ctx.globalAlpha=1-blend;
  const painted=sprite('cart-a',0,0,91+jump*.12);
  ctx.globalAlpha=blend;
  const alternate=sprite('cart-b',0,0,91+jump*.12);
  ctx.globalAlpha=1;
  if(!painted&&!alternate)shape([[-30,-25],[30,-25],[30,18],[-30,18]],red);
  ctx.restore();
 }
 for(const p of particles){
  ctx.globalAlpha=Math.min(1,p.life*2);
  rect(p.x,p.y,3,3,p.color);
 }
 ctx.globalAlpha=1;
 rect(0,0,360,28,ink);rect(0,27,360*Math.min(1,run.time/runway),3,mint);
 ctx.font='900 13px system-ui';ctx.fillStyle=paper;ctx.textAlign='center';ctx.fillText(headlines[district],180,19);
 if(run.feedbackUntil>run.time){
  shape([[72,344],[99,330],[260,330],[291,347],[263,372],[101,373]],paper);
  ctx.font='1000 22px system-ui';ctx.fillStyle=ink;ctx.fillText(run.feedback,180,359);
 }
}
function resize(){
 const bounds=canvas.getBoundingClientRect(), dpr=Math.min(devicePixelRatio||1,2);
 canvas.width=Math.max(1,Math.round(bounds.width*dpr));
 canvas.height=Math.max(1,Math.round(bounds.height*dpr));
}
window.addEventListener('resize',resize);
function frame(now){
 const dt=last?Math.min((now-last)/1000,.05):0;last=now;
 if(mode==='play')update(dt);
 render();requestAnimationFrame(frame);
}
reset();resize();requestAnimationFrame(frame);
