'use strict';
const canvas = document.querySelector('canvas');
const g = canvas.getContext('2d');
const W = 480, H = 760;
const ui = Object.fromEntries(['score','hull','phase','pause','sheet','title','brief','controls','action'].map(id => [id,document.getElementById(id)]));
const clamp = (n,a,b) => Math.max(a,Math.min(n,b));
const colors = {red:'#e34751',gold:'#ffce71',ice:'#81f4ff',blue:'#4b899d',dark:'#203349'};
function loadArt(name) {
  const image = new Image();
  image.src = './art/' + name + '.webp';
  return image;
}
const art = Object.fromEntries(['valley','sleigh','drone','boss'].map(name => [name,loadArt(name)]));
function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * ratio;
  canvas.height = H * ratio;
  g.setTransform(ratio,0,0,ratio,0,0);
}
resizeCanvas();
window.addEventListener('resize',resizeCanvas);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const ready = image => image.complete && image.naturalWidth > 0;
function ship(kind,x,y,width,bank) {
  const sprite = art[kind];
  if (!ready(sprite)) return;
  const height = width * sprite.naturalHeight / sprite.naturalWidth;
  g.save();
  g.translate(x,y);
  g.rotate(bank);
  g.scale(1-Math.abs(bank)*.22,1);
  g.drawImage(sprite,-width/2,-height/2,width,height);
  g.restore();
}
const keys=new Set();
let state='intro',player,enemies,shots,bolts,sparks,parcels,time,score,wave,shotAt,bossSpawned,aim,drag,wraps,recoil,shake;
const stars=Array.from({length:95},(_,i)=>({x:(i*179.31)%W,y:(i*117.69)%H,s:1+i%3}));
function reset(){
  player={x:W/2,y:625,hull:3,bank:0,shield:0};enemies=[];shots=[];bolts=[];sparks=[];parcels=[];
  wraps=[];recoil=0;shake=0;time=0;score=0;wave=0;shotAt=0;bossSpawned=false;aim=null;drag=null;
  ui.score.textContent='000000';ui.hull.textContent='◆◆◆';ui.phase.textContent='THE FROZEN VALLEY';
}
function overlay(next,title,brief,label){
  state=next;drag=null;aim=null;keys.clear();ui.title.textContent=title;ui.brief.textContent=brief;
  ui.action.textContent=label;ui.sheet.hidden=false;
}
ui.action.onclick=()=>{
  if(state!=='paused')reset();
  state='playing';ui.sheet.hidden=true;canvas.focus();
};
function pause(){if(state==='playing')overlay('paused','HOLD POSITION','Quinn says this is an excellent time to check whether the fruitcake has stopped glowing.','Resume flight');}
ui.pause.onclick=pause;
window.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k)&& state==='playing'){e.preventDefault();keys.add(k);}
  if(k==='escape'&&!e.repeat){if(state==='paused')ui.action.click();else pause();}
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
function pointer(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
canvas.addEventListener('pointerdown',e=>{
  if(state!=='playing'||drag)return;
  const p=pointer(e);drag={id:e.pointerId,dx:player.x-p.x,dy:player.y-p.y};
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
  if(drag?.id!==e.pointerId)return;const p=pointer(e);aim={x:p.x+drag.dx,y:p.y+drag.dy};
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(drag?.id===e.pointerId){drag=null;aim=null;}});
function burst(x,y,color,n=14){
  for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=35+Math.random()*160;sparks.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.35+Math.random()*.35,color});}
}
function spawn(){
  const next=wave++;
  for(let i=0;i<5;i++)enemies.push({x:60+i*90,y:-60-i*20,base:60+i*90,age:0,fire:2+i*.37,hp:2,kind:'drone',mode:next%3,side:next%2?1:-1});
}
function hit(){
  if(player.shield>0)return;
  shake=.28;player.hull--;player.shield=1.6;burst(player.x,player.y,colors.gold,23);
  ui.hull.textContent='◆'.repeat(player.hull)+'◇'.repeat(3-player.hull);
  if(!player.hull)overlay('lost','SLEIGH DOWN','The fruitcake survived. Quinn would prefer that you do likewise. Score: '+score+'.','Retry the intercept');
}
function update(dt){
  time+=dt;recoil=Math.max(0,recoil-dt);shake=Math.max(0,shake-dt);for(const w of wraps)w.age+=dt;wraps=wraps.filter(w=>w.age<.8);player.shield=Math.max(0,player.shield-dt);
  const down=(...names)=>names.some(k=>keys.has(k));
  const x0=player.x;
  if(aim){player.x+=(aim.x-player.x)*Math.min(dt*19,1);player.y+=(aim.y-player.y)*Math.min(dt*19,1);}
  else{
    player.x+=((down('d','arrowright')?1:0)-(down('a','arrowleft')?1:0))*290*dt;
    player.y+=((down('s','arrowdown')?1:0)-(down('w','arrowup')?1:0))*250*dt;
  }
  player.x=clamp(player.x,25,W-25);player.y=clamp(player.y,315,H-55);
  player.bank+=(clamp((player.x-x0)*.12,-.65,.65)-player.bank)*Math.min(dt*13,1);
  if(time>=shotAt){shotAt=time+.16;recoil=.10;for(const x of [-16,16])shots.push({x:player.x+x,y:player.y-17});}
  if(wave<9&&time>=1.5+wave*5.3)spawn();
  if(time>51&&!bossSpawned){
    bossSpawned=true;enemies.push({kind:'boss',x:240,y:-100,age:0,fire:2,hp:55});
    ui.phase.textContent='CONVOY FLAGSHIP / DESTROY THE SIGNAL JAMMER';
  }
  for(const enemy of enemies){
    enemy.age+=dt;enemy.impact=Math.max(0,(enemy.impact||0)-dt);enemy.fire-=dt;
    if(enemy.kind==='boss'){enemy.y=Math.min(144,enemy.y+65*dt);enemy.x=240+Math.sin(enemy.age*1.1)*113;}
    else{
      enemy.y+=(enemy.mode===2?110:78)*dt;
      enemy.x=clamp(enemy.base+Math.sin(enemy.age*(enemy.mode===0?2:1.1))*enemy.side*(enemy.mode===1?64:38),24,456);
    }
    if(enemy.y>15&&enemy.y<440&&enemy.fire<=0){
      enemy.fire=enemy.kind==='boss'?.88:2.5;
      const a=Math.atan2(player.y-enemy.y,player.x-enemy.x);
      for(const offset of (enemy.kind==='boss'?[-.42,-.21,0,.21,.42]:[0]))bolts.push({x:enemy.x,y:enemy.y+10,vx:Math.cos(a+offset)*175,vy:Math.sin(a+offset)*175});
    }
  }
  for(const shot of shots){
    shot.y-=590*dt;
    for(const enemy of enemies){
      if(enemy.hp<=0||Math.abs(shot.x-enemy.x)>(enemy.kind==='boss'?48:23)||Math.abs(shot.y-enemy.y)>(enemy.kind==='boss'?34:16))continue;
      shot.y=-100;enemy.hp--;enemy.impact=.12;burst(shot.x,enemy.y,colors.ice,3);
      if(!enemy.hp){
        const boss=enemy.kind==='boss';wraps.push({x:enemy.x,y:enemy.y,age:0,kind:enemy.kind});score+=boss?2500:180;burst(enemy.x,enemy.y,colors.gold,boss?60:22);
        if(!boss&&score%720===0)parcels.push({x:enemy.x,y:enemy.y});
        if(boss){overlay('won','SIGNAL RECOVERED','Santa’s last broadcast: “I am being kidnapped. Please bring my slippers.” Trent has a heading. Score: '+score+'.','Fly again');const skyDetail={score,hull:player.hull};window.dispatchEvent(new CustomEvent('frosted-skies:complete',{detail:skyDetail}));if(window.parent!==window){const skyRelay={type:'frosted-skies:complete',detail:skyDetail};try{const skyRun=new URLSearchParams(location.search).get('runId');if(skyRun)skyRelay.runId=skyRun;}catch(ignore){}window.parent.postMessage(skyRelay,(location.protocol==='http:'||location.protocol==='https:')?location.origin:'*');}}
        ui.score.textContent=String(score).padStart(6,'0');
      }
      break;
    }
    if(state!=='playing')break;
  }
  if(state!=='playing')return;
  for(const b of bolts){
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    if(Math.hypot(b.x-player.x,b.y-player.y)<16){b.y=900;hit();if(state!=='playing')return;}
  }
  for(const enemy of enemies)if(enemy.hp>0&&Math.hypot(enemy.x-player.x,enemy.y-player.y)<27){hit();if(state!=='playing')return;}
  for(const p of parcels){
    p.y+=92*dt;
    if(Math.hypot(p.x-player.x,p.y-player.y)<28){p.y=900;player.hull=Math.min(3,player.hull+1);ui.hull.textContent='◆'.repeat(player.hull)+'◇'.repeat(3-player.hull);burst(p.x,player.y,colors.ice);}
  }
  enemies=enemies.filter(e=>e.hp>0&&e.y<H+40);shots=shots.filter(s=>s.y>0);bolts=bolts.filter(b=>b.y>-30&&b.y<H+20&&b.x>-30&&b.x<W+30);parcels=parcels.filter(p=>p.y<H+25);
  for(const p of sparks){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}
  sparks=sparks.filter(p=>p.life>0);
}
function polygon(color,points){
  g.fillStyle=color;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();
}
function render(){
  const sky=g.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#11243d');sky.addColorStop(.55,'#28637d');sky.addColorStop(1,'#101f37');g.fillStyle=sky;g.fillRect(0,0,W,H);
  const scroll=time*115;
  const valley=art.valley;
  if(ready(valley)){
    const height=W*valley.naturalHeight/valley.naturalWidth;
    const index=Math.floor(scroll/height);
    for(let offset=-2;offset<=1;offset++){
      g.save();
      g.translate(0,scroll%height+offset*height);
      if((index-offset)%2){g.translate(0,height);g.scale(1,-1);}
      g.drawImage(valley,0,0,W,height+.5);
      g.restore();
    }
  }
  const fog=g.createLinearGradient(0,0,W,H);
  fog.addColorStop(0,'#06132780');fog.addColorStop(.46,'#3faec91a');fog.addColorStop(1,'#060d20aa');
  g.fillStyle=fog;g.fillRect(0,0,W,H);
  for(const st of stars){
    if(reduceMotion.matches&&st.s>1)continue;
    const y=(st.y+scroll*(.6+st.s*.32))%H;
    const x=st.x+Math.sin(y*.012+st.x)*13;
    g.fillStyle='rgba(220,248,255,'+(.12+st.s*.12)+')';
    g.beginPath();g.ellipse(x,y,st.s*.56,st.s*1.24,.3,0,Math.PI*2);g.fill();
  }
  g.save();
  if(shake>0&&!reduceMotion.matches)g.translate(Math.sin(time*115)*shake*16,Math.cos(time*120)*shake*12);
  for(const enemy of enemies){
    if(enemy.hp<=0)continue;
    const size=enemy.kind==='boss'?125:57;
    const bank=Math.cos(enemy.age*(enemy.kind==='boss'?1.1:2))*.13;
    ship(enemy.kind,enemy.x,enemy.y,size,bank);
    if(enemy.impact>0){
      g.globalAlpha=enemy.impact*4;
      g.strokeStyle='#fff1b1';g.lineWidth=2;
      g.beginPath();g.arc(enemy.x,enemy.y,10+(.12-enemy.impact)*140,0,Math.PI*2);g.stroke();
      g.globalAlpha=1;
    }
    if(enemy.kind==='boss'){g.fillStyle='#061629';g.fillRect(enemy.x-49,enemy.y-45,98,5);g.fillStyle=colors.gold;g.fillRect(enemy.x-49,enemy.y-45,98*enemy.hp/55,5);}
  }
  for(const s of shots){g.fillStyle='#3eaec7';g.fillRect(s.x-3,s.y,6,15);g.fillStyle='#c9ffff';g.fillRect(s.x-1,s.y,2,11);}
  for(const b of bolts){g.fillStyle='#ffad52';g.beginPath();g.arc(b.x,b.y,5,0,7);g.fill();g.fillStyle='#fff4c0';g.fillRect(b.x-1,b.y-2,2,4);}
  for(const p of parcels){g.fillStyle='#68dbea';g.fillRect(p.x-9,p.y-9,18,18);g.fillStyle='#fff';g.fillRect(p.x-5,p.y-1,10,2);g.fillRect(p.x-1,p.y-5,2,10);}
  const {x,y,bank,shield}=player;
  if(shield<=0||reduceMotion.matches||Math.floor(shield*11)%2===0){
    for(const dx of [-16,16]){
      const flame=g.createLinearGradient(0,y+38,0,y+72);flame.addColorStop(0,'#d5fdff');flame.addColorStop(.38,'#6ad7ff');flame.addColorStop(1,'#49abff00');
      polygon(flame,[[x+dx-5,y+39],[x+dx+5,y+39],[x+dx-bank*15,y+70+Math.sin(time*45)*8]]);
    }
    ship('sleigh',x,y+recoil*30,62,bank*.52);
    if(shield>0&&reduceMotion.matches){
      g.strokeStyle='#ffe3a6';g.lineWidth=2;g.beginPath();g.ellipse(x,y,33,46,0,0,Math.PI*2);g.stroke();
    }
    if(recoil>.045)for(const dx of [-16,16]){
      const flare=g.createRadialGradient(x+dx,y-23,0,x+dx,y-23,15);
      flare.addColorStop(0,'#fff');flare.addColorStop(.25,'#84ffff');flare.addColorStop(1,'#42e3ff00');
      g.fillStyle=flare;g.fillRect(x+dx-15,y-38,30,30);
    }
  }
  for(const w of wraps){
    const t=w.age/.8;
    if(t<.42){
      const span=(w.kind==='boss'?60:28)*(1-t);
      ship(w.kind,w.x,w.y,span*2,0);
      g.strokeStyle='#ffd788';g.lineWidth=3;
      for(let i=0;i<3;i++){
        g.beginPath();g.ellipse(w.x,w.y+(i-1)*7,span,8+i*2,t*2+i*.35,0,Math.PI*(.5+t*3.5));g.stroke();
      }
      continue;
    }
    const size=w.kind==='boss'?49:23;
    g.save();g.translate(w.x,w.y+w.age*39);g.rotate(t*.75);g.globalAlpha=1-t;
    g.fillStyle='#cc294e';g.beginPath();g.roundRect(-size*.5,-size*.44,size,size*.88,5);g.fill();
    g.strokeStyle='#ffe193';g.lineWidth=size*.15;g.beginPath();g.moveTo(-size*.5,0);g.lineTo(size*.5,0);g.moveTo(0,-size*.44);g.lineTo(0,size*.44);g.stroke();
    g.lineWidth=2;
    for(const side of [-1,1]){g.beginPath();g.ellipse(side*size*.16,-size*.14,size*.19,size*.085,side*.4,0,Math.PI*2);g.stroke();}
    g.restore();
  }
  for(const p of sparks){g.globalAlpha=clamp(p.life*2,0,1);g.fillStyle=p.color;g.fillRect(p.x,p.y,3,3);}g.globalAlpha=1;g.restore();
}
reset();let last=0;
function frame(now){const dt=last?Math.min((now-last)/1000,.033):0;last=now;if(state==='playing')update(dt);else if(state==='won'){for(const w of wraps)w.age=Math.min(.8,w.age+dt);}render();requestAnimationFrame(frame);}
requestAnimationFrame(frame);
