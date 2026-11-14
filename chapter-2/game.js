'use strict';
const canvas=document.querySelector('canvas');
const ctx=canvas.getContext('2d');
const ui=Object.fromEntries(['status','panel','title','copy','help','start','pause','left','jump','right'].map(id=>[id,document.getElementById(id)]));
const ink='#21191e',paper='#f7e4b7',mint='#81d3b9',red='#e64c40';
const runway=95;
let mode='intro',run,last=0;
const lanes=[80,180,280];
const headlines=['THE COCOA EXPRESS','UNSCHEDULED BISCUIT STOP','DEPOT APPROACH'];
function reset(){
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
 run.jump=Math.max(0,run.jump-dt);
 run.x+=(lanes[run.lane]-run.x)*Math.min(1,dt*18);
 while(3+run.next*2.05<Math.min(runway,run.time+3.3))spawn(run.next++);
 for(const object of run.objects){
  if(object.checked||object.arrival>run.time)continue;
  object.checked=true;
  if(Math.abs(lanes[object.lane]-run.x)>46)continue;
  if(object.type==='mail'){
   run.mail++;announce('SPECIAL DELIVERY!');object.collected=true;
  }else if(object.type==='barrier'&&run.jump>.12&&run.jump<.65)announce('HOP!');
  else if(run.time>=run.invulnerable){
   run.hull--;run.invulnerable=run.time+1.2;announce('CLANG!');
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
 const palette=['#e29778','#b28daf','#83ada8'];
 rect(0,0,360,560,palette[district]);
 for(let y=0;y<560;y+=8)for(let x=0;x<360;x+=9){
  if(x>27&&x<333)continue;
  ctx.fillStyle='#33223b55';ctx.beginPath();ctx.arc(x,y,1.5,0,7);ctx.fill();
 }
 for(const x of lanes){
  rect(x-43,0,86,560,'#e8bd95');
  for(let y=(run.time*140)%35-35;y<560;y+=35)rect(x-37,y,74,7,'#825761');
  for(const offset of [-27,24]){rect(x+offset,0,6,560,ink);rect(x+offset+1,0,2,560,paper);}
 }
 for(const o of run.objects){
  const y=442+(run.time-o.arrival)*140,x=lanes[o.lane];
  if(y<-34||y>590)continue;
  if(o.type==='mail'){
   shape([[x-24,y-15],[x+24,y-15],[x+24,y+15],[x-24,y+15]],mint);
   shape([[x-22,y-13],[x,y+4],[x+22,y-13]],paper);
  }else if(o.type==='barrier'){
   rect(x-39,y-9,78,18,ink);
   for(let n=-35;n<33;n+=15)shape([[x+n,y+6],[x+n+7,y-6],[x+n+14,y-6],[x+n+7,y+6]],'#f4bd4e');
  }else{
   shape([[x-29,y-24],[x+19,y-24],[x+29,y-13],[x+29,y+20],[x-29,y+20]],'#aa5851');
   shape([[x-24,y-15],[x-15,y-15],[x+24,y+14],[x+15,y+14]],'#edb779');
  }
 }
 const jump=Math.sin(Math.PI*run.jump/.72)*47;
 const x=run.x,y=442-jump;
 rect(x-33,457,66,7,'#21191e80');
 if(run.time>=run.invulnerable||Math.floor(run.time*13)%2===0){
  for(const dx of [-25,25])rect(x+dx-6,y-14,12,34,ink);
  shape([[x-28,y-20],[x+27,y-20],[x+32,y+14],[x-31,y+14]],red);
  rect(x-24,y+6,48,5,'#f8b950');
  ctx.save();ctx.translate(x,y-10);
  ctx.rotate(Math.sin(run.time*12)*.16);
  shape([[-21,0],[22,0],[22,5],[-21,5]],ink);
  ctx.restore();
  shape([[x-11,y-5],[x-14,y-17],[x-6,y-34],[x+10,y-34],[x+16,y-19],[x+12,y-6]],'#315759');
  shape([[x-10,y-31],[x-5,y-44],[x+7,y-44],[x+14,y-31]],'#f1b752');
  rect(x+6,y-32,18,4,'#edcb9b');
 }
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
