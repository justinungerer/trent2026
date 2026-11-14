'use strict';
const app=document.getElementById('app');
const questions=[
 {level:'Easy',scene:'depot',place:'Rail depot · 23:17',chapter:'The Potato Desk',
 story:'Trent reaches a frozen supply office. Through the window, a clerk is stamping individual snowflakes REJECTED. Sprout has found the ammunition shipment, but the emergency frequency also serves the canteen. One wrong signal and the gun gets a catering delivery.',
 dialogue:'“Say it clearly,” Sprout whispers. “Last week I requested extraction and they sent a dentist.”',
 question:'What does SOS signal?',answers:['A request for emergency help','A change of radio frequency','A shipment has arrived','An order to turn off the radio'],correct:0,
 stake:'ribbon ammunition',good:'24 shots loaded',bad:'12 shots loaded',
 beforeGood:'Correct → 24 shots for the mission.',beforeBad:'Wrong → 12 shots and one quiz strike.',
 win:'The ammunition crate arrives. Twenty-four cartridges, each tied with a tiny bow. The quartermaster demands a signature. Sprout signs “Father Christmas, Acting Potato.” The quartermaster salutes the potato.',
 lose:'Trent reaches the canteen. The clerk asks whether his emergency is boiled or mashed. Half the ammunition arrives in a gravy boat. “Twelve shots,” Sprout says. “On the bright side, we can now defeat a roast.”',
 explain:'SOS is a distress signal, conventionally represented in Morse code as three dots, three dashes, and three dots.',
 effectGood:'You start with 24 ribbon shots. Every shot consumes ammunition, including misses.',effectBad:'You start with 12 ribbon shots. Use cover and line up your shots to stretch the supply.'},
 {level:'Medium',scene:'office',place:'Officers’ lounge · 23:24',chapter:'A Medal for the Tea Trolley',
 story:'The gun’s loading mechanism is stuck. Quinn can fix it if Trent buys her forty seconds. Outside, three guards have formed an escort around the tea trolley. A fourth is arguing that the biscuits outrank him. Trent needs a convincing explanation to keep the ceremony going.',
 dialogue:'“They’ve pinned a medal on the kettle,” Quinn says. “It’s the first officer here to accomplish anything under pressure.”',
 question:'Why did Allied merchant ships sail in convoys?',answers:['To navigate by following the fastest ship','To get protection from attacks','To unload cargo while at sea','To save fuel by following the tide'],correct:1,
 stake:'the reload mechanism',good:'Fast cycling installed',bad:'Slow cycling installed',beforeGood:'Correct → one shot every 0.27 seconds.',beforeBad:'Wrong → one shot every 0.57 seconds and one strike.',
 win:'Trent explains collective protection. The guards tighten their formation around the biscuits. Quinn repairs the feed and replaces a spring labeled OPTIONAL OPTIMISM. The kettle receives another medal.',
 lose:'Trent claims the trolley is saving fuel by following the tide. Everyone looks at the carpet. Quinn bolts the gun shut before the guards return, trapping a spring inside. It fires, but needs a long, judgmental pause between shots.',
 explain:'Convoys grouped merchant ships so naval escorts could protect them against attacks.',
 effectGood:'Holding the right thumbstick fires approximately 3.7 shots per second.',effectBad:'The mechanism limits continuous fire to approximately 1.75 shots per second.'},
 {level:'Hard',scene:'workshop',place:'Toy-shop field workshop · 23:31',chapter:'Wrapping Paper of Mass Inconvenience',
 story:'Quinn opens a locked box of enchanted ribbon. The instructions are encrypted. Ordinary ribbon tangles a guard. Enchanted ribbon turns him into a parcel with a perfectly centered bow. Sprout has printed a gift tag reading SOME ASSEMBLY REGRETTABLE.',
 dialogue:'“Does the gun have a warranty?” Trent asks. “Yes,” says Quinn. “If it breaks, you have to explain it to Mrs. Claus.”',
 question:'Which wartime machine helped British codebreakers find Enigma settings?',answers:['Colossus','Lorenz','Bombe','ENIAC'],correct:2,
 stake:'ribbon strength',good:'Enchanted ribbon unlocked',bad:'Ordinary ribbon fitted',beforeGood:'Correct → one hit wraps a guard.',beforeBad:'Wrong → two hits wrap a guard and one strike.',
 win:'Trent cracks the label. Quinn feeds enchanted ribbon through the brass rollers. A test shot wraps a chair, adds a bow, and thanks it for its service. “One hit per guard,” says Quinn. “Chair has volunteered for a second tour.”',
 lose:'Trent reads the label upside down and activates the musical gift tag. It plays one aggressive note for eleven seconds. Quinn unplugs it and loads ordinary ribbon. “Two hits per guard. Think of it as double wrapping.”',
 explain:'The Bombe helped codebreakers narrow down possible Enigma machine settings.',
 effectGood:'A single direct hit defeats a guard. Every shot, including a miss, consumes ammunition.',effectBad:'Each guard takes two direct hits. The first hit briefly stuns the guard so you can finish wrapping him.'}
];
let state={index:0,answers:[],screen:'intro'},activeRun=null;
const strikes=()=>state.answers.filter(v=>v===false).length;
function save(){try{sessionStorage.setItem('trent-quiz-cinema2',JSON.stringify(state))}catch{}}
function display(html){app.innerHTML=html;window.scrollTo(0,0);app.querySelector('h1,h2')?.focus({preventScroll:true})}
function picture(key,classes='',caption=''){
 const names={depot:'Sprout outside a snowy railway depot',workshop:'Quinn’s workshop and brass Gift-Wrap Gun',office:'An officer interrogates a nutcracker while Sprout sneaks past'};
 return '<div class="scene '+classes+'"><img src="./assets/'+key+'.webp" alt="'+names[key]+'"><div class="snow" aria-hidden="true"></div><span class="caption">'+caption+'</span></div>';
}
function click(id,fn){document.getElementById(id).onclick=fn}
function intro(){
 state={index:0,answers:[],screen:'intro'};save();
 display(picture('depot','cover','CHRISTMAS EVE · OCCUPIED EUROPE')+'<section class="intro"><span class="eyebrow">Chapter 3 · The shelf operative</span><h1 tabindex="-1">Christmas has<br>a personnel problem.</h1><p class="lead">Santa is missing. His best spy is being judged in a decoration contest. You are Trent. Command has given you one radio and a fruitcake rated for structural use.</p><p>Sprout stole Santa’s transport orders, then got caught inside the colonel’s trophy. The colonel assumed he was a prize and entered him in another competition. The entire chain of command is now waiting for him to light up.</p><div class="brief"><p><strong>Your answers build Sprout’s gun.</strong> These three questions determine ammunition, reload speed, and ribbon strength in Operation Ribbonfall.</p><p>Three wrong answers end the quiz run. The action mission has its own retries.</p></div><button class="primary" id="start">Begin the rescue</button><p class="muted" style="margin-top:14px">Playable chapter preview · 3 questions, then Operation Ribbonfall</p></section>');
 click('start',question);
}
function question(){
 state.screen='question';save();const q=questions[state.index];
 display('<section class="layout">'+picture(q.scene,'',q.place)+'<div class="content"><div class="topline"><span class="eyebrow">'+q.level+' · Question '+(state.index+1)+' of 3</span><span class="strikes">'+strikes()+' / 3 strikes</span></div><div class="progress"><div style="width:'+((state.index+1)/3*100)+'%"></div></div><h2 tabindex="-1">'+q.chapter+'</h2><p>'+q.story+'</p><p class="dialogue">'+q.dialogue+'</p><div class="stakes"><strong>This answer changes '+q.stake+'.</strong><p>'+q.beforeGood+'</p><p>'+q.beforeBad+'</p></div><p class="lead"><strong>'+q.question+'</strong></p><div class="choices">'+q.answers.map((a,i)=>'<button class="choice" data-answer="'+i+'"><span class="letter">'+String.fromCharCode(65+i)+'</span>'+a+'</button>').join('')+'</div></div></section>');
 app.querySelectorAll('[data-answer]').forEach(button=>button.onclick=()=>{state.answers[state.index]=Number(button.dataset.answer)===q.correct;result()});
}
function result(){
 state.screen='result';save();const q=questions[state.index],right=state.answers[state.index];
 display(picture(right?'workshop':'office','outcome-image',right?'QUINN’S WORKSHOP · EQUIPMENT UPGRADED':'FIELD REPORT · COMPLICATION')+'<section class="result"><div class="topline"><span class="eyebrow">'+(right?'Correct answer':'Wrong answer')+'</span><span class="strikes">'+strikes()+' / 3 strikes</span></div><h2 tabindex="-1">'+(right?q.good:q.bad)+'</h2><p class="lead">'+(right?q.win:q.lose)+'</p><div class="reward '+(right?'':'bad')+'" role="status"><span class="eyebrow">Effect in Operation Ribbonfall</span><h3>'+(right?q.good:q.bad)+'</h3><p>'+(right?q.effectGood:q.effectBad)+'</p></div><p class="explain"><strong>Correct answer · '+q.answers[q.correct]+'</strong><br>'+q.explain+'</p><button class="primary" id="next">'+(strikes()===3?'Mission report':state.index===2?'Inspect your equipment':'Continue the story')+'</button></section>');
 click('next',()=>{if(strikes()===3)failed();else if(state.index<2){state.index++;question()}else loadout()});
}
function failed(){
 state.screen='failed';save();
 display(picture('office','cover')+'<section class="result"><span class="eyebrow">Three strikes</span><h2 tabindex="-1">Promoted to decorative.</h2><p>The colonel enters Trent in the same contest. Sprout places second. Trent places third. The winner is a kettle.</p><button class="primary" id="restart">Start a new rescue</button></section>');
 click('restart',intro);
}
function loadout(){
 state.screen='loadout';save();
 display(picture('workshop','cover','Q BRANCH · QUINN WOULD LIKE YOU TO STOP CALLING IT THAT')+'<section class="result"><span class="eyebrow">Equipment earned through your answers</span><h2 tabindex="-1">Operation Ribbonfall</h2><p>Trent opens Sprout’s case with the fruitcake. The fruitcake remains undamaged. You now play as Sprout. Retrieve the orders, cut the depot’s alarm relays, transmit the evidence, and escape.</p><div class="loadout"><div><strong>'+(state.answers[0]?24:12)+'</strong><span>Ribbon shots</span></div><div><strong>'+(state.answers[1]?'0.27s':'0.57s')+'</strong><span>Between shots</span></div><div><strong>'+(state.answers[2]?'1 hit':'2 hits')+'</strong><span>To wrap a guard</span></div></div><div class="brief"><p><strong>Left thumb moves. Right thumb aims and fires.</strong> Hold the right pad for continuous fire. Tap its center to aim at the nearest guard.</p><p>Wrapped guards stay defeated for the attempt. Retry the mission with the equipment you earned.</p></div><button class="primary" id="launch">Enter the depot</button></section>');click('launch',launch);
}
function launch(){
 const frame=document.getElementById('game'),url=new URL('./shelf-escape/',location.href);
 for(const [key,value] of Object.entries({build:'side6',charges:state.answers[0]?'4':'2',reload:state.answers[1]?'fast':'slow',ribbon:state.answers[2]?'enchanted':'plain',parentOrigin:location.origin}))url.searchParams.set(key,value);
 activeRun=String(Date.now())+'-'+Math.random().toString(36).slice(2);
 document.getElementById('mission').hidden=false;document.body.classList.add('playing');frame.src=url.href;
}
window.addEventListener('message',event=>{
 const frame=document.getElementById('game');
 if(!activeRun||event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.version!==1||event.data.mission!=='shelf-escape')return;
 if(event.data.type==='trent:ready')frame.contentWindow.postMessage({type:'trent:init',version:1,runId:activeRun},location.origin);
 if(event.data.type==='trent:complete'&&event.data.runId===activeRun){
  activeRun=null;frame.src='about:blank';document.getElementById('mission').hidden=true;document.body.classList.remove('playing');state.screen='complete';save();completed();
 }
});
function completed(){
 display(picture('depot','cover','CHAPTER COMPLETE')+'<section class="result"><span class="eyebrow">Santa’s location recovered</span><h2 tabindex="-1">Signed. Sealed.<br>Deeply inconvenient.</h2><p>Sprout slips through the mail hatch with Santa’s orders and a stolen stapler. Behind him, gift-wrapped guards request scissors through the proper channels.</p><p>“Why the stapler?” Trent asks. Sprout looks offended. “We can’t leave them with air superiority.”</p><p>The transport order points to Santa’s holding camp. Quinn unfolds the next plan. It is larger than the table. The fruitcake has been assigned its own vehicle.</p><button class="primary" id="again">Replay this chapter</button></section>');click('again',intro);
}
try{const previous=JSON.parse(sessionStorage.getItem('trent-quiz-cinema2'));if(previous&&Number.isInteger(previous.index)&&previous.index>=0&&previous.index<3&&Array.isArray(previous.answers)&&previous.answers.length<=3&&previous.answers.every(v=>typeof v==='boolean'))state=previous}catch{}
if(state.screen==='question')question();else if(state.screen==='result'&&typeof state.answers[state.index]==='boolean')result();else if(state.screen==='loadout'&&state.answers.length===3&&strikes()<3)loadout();else if(state.screen==='failed')failed();else if(state.screen==='complete')completed();else intro();
