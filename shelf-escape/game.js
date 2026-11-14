'use strict';
const $=id=>document.getElementById(id);
const parameters=new URLSearchParams(location.search);
const startingAmmo=parameters.get('weapon')==='locked'?0:parameters.get('charges')==='2'?12:24;
const damage=parameters.get('ribbon')==='plain'?1:2;
const reload=parameters.get('reload')==='slow'?570:270;
const input={move:{x:0,y:0,id:null},fire:{x:0,y:0,id:null}};
const keys=new Set();
let mission,session,complete=false,fireQueued=false;
function stopInput(){
 fireQueued=false;
 for(const name of ['move','fire']){
  Object.assign(input[name],{x:0,y:0,id:null});
  $(name).querySelector('span').style.transform='';
 }
 keys.clear();
}
for(const name of ['move','fire']){
 const pad=$(name),stick=input[name];
 function position(event){
  if(stick.id!==event.pointerId)return;
  const r=pad.getBoundingClientRect(),x=event.clientX-r.left-r.width/2,y=event.clientY-r.top-r.height/2;
  const scale=Math.max(r.width*.36,Math.hypot(x,y));
  stick.x=x/scale;stick.y=y/scale;
  pad.querySelector('span').style.transform='translate('+stick.x*30+'px,'+stick.y*30+'px)';
 }
 pad.onpointerdown=event=>{if(stick.id===null){if(name==='fire')fireQueued=true;stick.id=event.pointerId;pad.setPointerCapture(event.pointerId);position(event)}};
 pad.onpointermove=position;
 for(const type of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(type,event=>{
  if(stick.id===event.pointerId){Object.assign(stick,{x:0,y:0,id:null});pad.querySelector('span').style.transform=''}
 });
}
function panel(title,body,label,action){
 stopInput();$('modal').hidden=false;
 $('modal').innerHTML='<div class="card"><small>THE SHELF OPERATIVE</small><h1>'+title+'</h1><p>'+body+'</p><button id="continue">'+label+'</button></div>';
 $('continue').onclick=action;
}
function resume(){stopInput();$('modal').hidden=true;mission.active=true}
function pause(){if(!mission?.active)return;mission.active=false;panel('Strategic stillness','Sprout insists this counts as reconnaissance.','Resume',resume)}
$('pause').onclick=pause;
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
window.addEventListener('blur',pause);
window.onkeydown=e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys.add(e.key.toLowerCase())};
window.onkeyup=e=>keys.delete(e.key.toLowerCase());
const distance=(a,b)=>Phaser.Math.Distance.Between(a.x,a.y,b.x,b.y);
class Depot extends Phaser.Scene{
 create(){
  mission=this;complete=false;this.active=false;this.ammo=startingAmmo;this.nextShot=0;this.health=3;this.invulnerable=0;this.intel=false;this.timePlayed=0;
  this.physics.world.setBounds(0,0,1000,1600);
  const g=this.add.graphics();
  g.fillStyle(0x19323b).fillRect(0,0,1000,1600);
  for(let y=0;y<1600;y+=48)for(let x=0;x<1000;x+=80){
   g.fillStyle((x+y)%3?0x263f46:0x2d464d).fillRect(x+1,y+1,78,46);
   g.lineStyle(1,0x53666a,.2).lineBetween(x+5,y+4,x+72,y+4);
  }
  const maker=this.make.graphics({x:0,y:0,add:false});
  const texture=(name,draw)=>{maker.clear();draw(maker);maker.generateTexture(name,64,72)};
  texture('elf',p=>{p.fillStyle(0x061a23,.4).fillEllipse(32,60,42,17);p.fillStyle(0x1d3841).fillRoundedRect(15,43,13,22,5).fillRoundedRect(36,43,13,22,5);p.fillStyle(0xc64c58).fillRoundedRect(13,25,38,27,9);p.fillStyle(0xeee3bb).fillRect(15,28,34,5);p.fillStyle(0xf0ba8f).fillCircle(32,22,15);p.fillStyle(0xcd4f55).fillTriangle(13,13,41,0,51,14);p.fillStyle(0xffe8c2).fillCircle(42,3,5);p.fillStyle(0x253843).fillCircle(27,21,2).fillCircle(38,21,2);p.fillStyle(0xeac274).fillRoundedRect(42,30,19,9,3)});
  texture('guard',p=>{p.fillStyle(0x061a23,.4).fillEllipse(32,60,44,17);p.fillStyle(0x182b32).fillRoundedRect(15,44,13,21,4).fillRoundedRect(36,44,13,21,4);p.fillStyle(0x79867b).fillRoundedRect(11,26,42,26,8);p.fillStyle(0xd7ae88).fillCircle(32,20,14);p.fillStyle(0x56696a).fillRoundedRect(13,4,38,14,6);p.fillStyle(0x253c43).fillRect(10,14,44,6);p.fillStyle(0xdeb875).fillCircle(48,40,7)});
  texture('gift',p=>{p.fillStyle(0x081b23,.5).fillEllipse(32,62,49,14);p.fillStyle(0xb84a55).fillRoundedRect(8,17,48,44,5);p.fillStyle(0xf4cd7d).fillRect(27,17,10,44).fillRect(8,31,48,9);p.lineStyle(5,0xf4cd7d).strokeEllipse(23,13,19,13).strokeEllipse(41,13,19,13)});
  texture('ribbon',p=>{p.fillStyle(0xffe8a4).fillCircle(32,32,7);p.fillStyle(0xef6580).fillRect(4,29,25,6)});
  this.walls=this.physics.add.staticGroup();
  for(const [x,y,w,h] of [[110,240,230,90],[520,260,300,90],[100,520,320,95],[610,550,270,100],[180,830,240,100],[550,850,300,80],[100,1120,270,90],[590,1150,270,110]]){
   const wall=this.add.rectangle(x+w/2,y+h/2,w,h,0x523f36);this.physics.add.existing(wall,true);this.walls.add(wall);
   g.fillStyle(0x071b24,.5).fillRoundedRect(x+10,y+14,w,h,7);
   this.add.rectangle(x+w/2,y+7,w-4,12,0xa5845e);
   for(let offset=18;offset<w-35;offset+=54){
    this.add.rectangle(x+offset+18,y+45,35,37,offset%3?0x41635d:0xa94f50).setStrokeStyle(2,0xbc9665);
    this.add.rectangle(x+offset+18,y+45,5,37,0xd6b775);
   }
  }
  for(let y=170;y<1500;y+=300)for(const x of [45,955]){
   this.add.circle(x,y,95,0xffc878,.025);this.add.circle(x,y,55,0xffc878,.04);this.add.circle(x,y,9,0xffd391);
  }
  this.add.text(500,1380,'FREIGHT INTAKE',{fontSize:'24px',color:'#84999a'}).setOrigin(.5);
  this.add.text(500,680,'MINISTRY OF FESTIVE CONFISCATION',{fontSize:'16px',color:'#9ea7a0'}).setOrigin(.5);
  this.orders=this.add.rectangle(815,410,34,28,0xffdc8a).setStrokeStyle(3,0xffffff);
  this.tweens.add({targets:this.orders,y:400,duration:850,yoyo:true,repeat:-1});
  this.add.text(815,370,'TRANSPORT ORDERS',{fontSize:'13px',color:'#ffe4a4'}).setOrigin(.5);
  this.exit=this.add.rectangle(500,100,130,40,0x438c83).setStrokeStyle(3,0xb3e7c6);
  this.add.text(500,63,'MAIL HATCH',{fontSize:'15px',color:'#b3e7c6'}).setOrigin(.5);
  this.player=this.physics.add.sprite(500,1460,'elf').setScale(.72).setCollideWorldBounds(true);
  this.player.body.setSize(32,30).setOffset(16,30);this.physics.add.collider(this.player,this.walls);
  this.guards=this.physics.add.group();
  for(const [x,y] of [[480,1200],[440,960],[520,740],[490,470],[270,170]]){
   const enemy=this.guards.create(x,y,'guard').setScale(.8);
   enemy.body.setSize(36,36).setOffset(14,25);enemy.home={x,y};enemy.hp=2;enemy.direction=1;
  }
  this.physics.add.collider(this.guards,this.walls);
  this.bullets=this.physics.add.group();
  this.physics.add.collider(this.bullets,this.walls,bullet=>bullet.destroy());
  this.physics.add.overlap(this.bullets,this.guards,(bullet,guard)=>{
   if(!bullet.active||!guard.active)return;
   bullet.destroy();guard.hp-=damage;
   if(guard.hp<=0){
    const present=this.add.image(guard.x,guard.y,'gift').setScale(.8);guard.destroy();
    this.tweens.add({targets:present,angle:6,duration:100,yoyo:true,repeat:3});
   }else{guard.setTint(0xffb0b0);this.time.delayedCall(180,()=>{if(guard.active)guard.clearTint()})}
  });
  this.physics.add.overlap(this.player,this.guards,()=>{
   if(this.time.now<this.invulnerable||!this.active)return;
   this.health--;this.invulnerable=this.time.now+1800;
   this.cameras.main.shake(120,.004);
   if(!this.health)this.finish(false);
  });
  this.cameras.main.setBounds(0,0,1000,1600).startFollow(this.player,true,.1,.1).setZoom(Math.max(.65,Math.min(1.1,this.scale.width/620)));
  this.scale.on('resize',size=>this.cameras.main.setZoom(Math.max(.65,Math.min(1.1,size.width/620))));
  panel('Operation Ribbonfall','Trent cracked the case. You are Sprout. Steal Santa’s transport orders and escape through the mail hatch. The colonel has labeled the elf “ornamental.” This is about to become a personnel issue.<br><br><b>Left thumb</b> moves. <b>Right thumb</b> aims and fires while held. Tap the right pad to fire at the nearest guard. Collect the glowing orders before heading upstairs.<br><br>'+startingAmmo+' ribbon shots · '+(damage===2?'enchanted':'plain')+' ribbon.','Begin escape',resume);
 }
 finish(won){
  this.active=false;this.physics.pause();stopInput();
  if(won&&session&&!complete){complete=true;parent.postMessage({type:'trent:complete',version:1,mission:'shelf-escape',runId:session.runId,seconds:Math.round(this.timePlayed),chargesUsed:startingAmmo-this.ammo},session.origin)}
  panel(won?'Return to sender':'Seasonal setback',won?'Sprout escapes with the orders. Behind him, a neatly wrapped guard requests a transfer. “Gift receipt’s in the box,” Sprout calls. Santa’s destination is finally in your hands.':'A guard puts Sprout back on display. His new label reads “Interactive. Batteries confiscated.” Sprout begins drafting a strongly worded letter to the toy shop.', 'Play again',()=>this.scene.restart());
 }
 update(time,delta){
  if(!this.player)return;
  if(!this.active){this.physics.pause();return}
  this.physics.resume();this.timePlayed+=Math.min(delta,50)/1000;
  const x=input.move.x+Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
  const y=input.move.y+Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
  const length=Math.max(1,Math.hypot(x,y));
  this.player.setVelocity(x/length*185,y/length*185).setDepth(this.player.y);
  this.player.setAngle(Math.hypot(x,y)>.1?Math.sin(time*.016)*4:0);
  this.player.setAlpha(time<this.invulnerable?(Math.sin(time*.03)>.0?.35:1):1);
  this.guards.children.iterate(guard=>{
   if(!guard)return;
   const near=distance(guard,this.player)<230;
   if(near)this.physics.moveToObject(guard,this.player,98);
   else{if(Math.abs(guard.x-guard.home.x)>90)guard.direction*=-1;guard.setVelocity(guard.direction*52,0)}
   guard.setDepth(guard.y).setAngle(Math.sin(time*.012)*3);
  });
  if((fireQueued||input.fire.id!==null||keys.has(' '))&&time>=this.nextShot&&this.ammo>0){
   let angle=Math.atan2(input.fire.y,input.fire.x);
   if(Math.hypot(input.fire.x,input.fire.y)<.2){
    const target=this.guards.getChildren().sort((a,b)=>distance(a,this.player)-distance(b,this.player))[0];
    angle=target?Phaser.Math.Angle.Between(this.player.x,this.player.y,target.x,target.y):-Math.PI/2;
   }
   const bullet=this.bullets.create(this.player.x,this.player.y,'ribbon').setScale(.5).setRotation(angle);
   bullet.body.setCircle(7,25,25);this.physics.velocityFromRotation(angle,520,bullet.body.velocity);
   this.time.delayedCall(1000,()=>{if(bullet.active)bullet.destroy()});
   fireQueued=false;this.ammo--;this.nextShot=time+reload;
  }
  if(!this.intel&&distance(this.player,this.orders)<48){this.intel=true;this.orders.destroy();this.active=false;panel('Filed under plumbing','“Santa’s transport order. Filed under Seasonal Plumbing. Of course.” Sprout pockets it. A nearby notice demands the return of seventeen missing rolls of ribbon.<br><br>Reach the green mail hatch at the north end.','Head for the hatch',resume)}
  if(this.intel&&distance(this.player,this.exit)<55)this.finish(true);
  $('objective').textContent=this.intel?'Escape through the mail hatch':'Steal Santa’s transport orders';
  $('status').textContent='♥'.repeat(this.health)+' · '+this.ammo+' shots · '+this.guards.countActive()+' guards';
 }
}
const origin=parameters.get('parentOrigin');
if(parent!==window&&origin){try{if(new URL(origin).origin===origin&&origin.startsWith('https:')){
 window.addEventListener('message',event=>{if(event.source===parent&&event.origin===origin&&event.data?.type==='trent:init'&&event.data.version===1&&typeof event.data.runId==='string')session={origin,runId:event.data.runId}});
 parent.postMessage({type:'trent:ready',version:1,mission:'shelf-escape'},origin);
}}catch{}}
if(window.Phaser)new Phaser.Game({type:Phaser.AUTO,parent:'game',backgroundColor:'#071318',scale:{mode:Phaser.Scale.RESIZE,width:innerWidth,height:innerHeight},physics:{default:'arcade',arcade:{debug:false}},scene:Depot});
else panel('Loading interrupted','Reload to fetch the game engine.','Reload',()=>location.reload());
