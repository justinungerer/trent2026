'use strict';
const soundtrack=document.getElementById('soundtrack');
const musicButton=document.getElementById('music');
soundtrack.volume=.3;
let wantsMusic=false;
function updateMusic(){musicButton.textContent=wantsMusic?'Music on':'Music off';musicButton.setAttribute('aria-pressed',String(wantsMusic))}
musicButton.onclick=async()=>{
 wantsMusic=!wantsMusic;
 if(wantsMusic){try{await soundtrack.play()}catch{wantsMusic=false}}else soundtrack.pause();
 updateMusic();
};
document.addEventListener('visibilitychange',()=>{
 if(document.hidden)soundtrack.pause();
 else if(wantsMusic)soundtrack.play().catch(()=>{wantsMusic=false;updateMusic()});
});
