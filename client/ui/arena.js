// Arena paintball (solo HUMANA life 3D): pannello dei punti, vita, munizioni, mirino e bottoni per sparare.
// Il server decide tutto (colpi, vita, punti): qui si manda solo "spara verso questa direzione" e si mostra cosa succede.
import {api} from '../networking/api.js';
import {ARENA} from '/shared/catalog.js';
export function installArena({net,getW3,notify}){
 const root=document.createElement('div');root.id='arena-hud';root.hidden=true;
 root.innerHTML='<div class="ar-score"><b class="r">🔴 0</b><span>PAINTBALL · primo a 15</span><b class="b">0 🔵</b></div><div class="ar-me"><div class="ar-hp"><i></i></div><div class="ar-ammo"></div></div><button type="button" id="ar-exit">✕ Esci dall’arena</button><div class="ar-cross"></div><div class="ar-down" hidden>💦 Colpito! Torni in gioco fra poco…</div><div class="ar-flash"></div><div class="ar-banner" hidden></div><button type="button" id="ar-reload" aria-label="Ricarica">⟳</button><button type="button" id="ar-fire" aria-label="Spara">💥</button>';
 document.body.append(root);
 const $=s=>root.querySelector(s);let prevMode=null,firing=false,last=0,mouse=null,mouseAt=0,score={red:0,blue:0},meNow=null,bannerT=0,flashT=0;
 const dirTo=()=>{const w3=getW3(),me=meNow;if(!w3||!me)return null;if(mouse&&performance.now()-mouseAt<4000){const q=w3.screenToWorld(mouse.x,mouse.y),dx=q.x-me.x,dy=q.y-me.y,l=Math.hypot(dx,dy);if(l>.4)return {x:dx/l,y:dy/l};}return w3.aimDir();};
 const fire=()=>{const me=meNow,A=me?.arena;if(!A||A.downUntil)return;const W=ARENA.weapons[A.weapon],now=performance.now();if(now-last<Math.max(80,W.cd*1000*.92))return;const d=dirTo();if(!d)return;last=now;net.send({type:'shoot',dx:d.x,dy:d.y});};
 const reload=()=>{if(meNow?.arena)net.send({type:'reload'});};
 const fb=$('#ar-fire');fb.onpointerdown=e=>{e.preventDefault();firing=true;try{fb.setPointerCapture(e.pointerId);}catch{}fb.classList.add('on');};for(const ev of ['pointerup','pointercancel','lostpointercapture'])fb['on'+ev]=()=>{firing=false;fb.classList.remove('on');};
 $('#ar-reload').onclick=reload;$('#ar-exit').onclick=async()=>{try{await api('/arena/leave','POST',{});}catch(e){notify(e.message);}};
 addEventListener('keydown',e=>{if(!meNow?.arena||e.target.closest?.('input,textarea'))return;if(e.code==='Space'||e.code==='KeyF'){firing=true;e.preventDefault();}if(e.code==='KeyR')reload();});addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='KeyF')firing=false;});
 // mouse: tasto sinistro sul mondo = spara verso il puntatore
 const world=document.getElementById('world');if(world){world.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){mouse={x:e.clientX,y:e.clientY};mouseAt=performance.now();}});
  world.addEventListener('pointerdown',e=>{if(meNow?.arena&&e.pointerType==='mouse'&&e.button===0){mouse={x:e.clientX,y:e.clientY};mouseAt=performance.now();firing=true;}});addEventListener('pointerup',e=>{if(e.pointerType==='mouse')firing=false;});}
 net.addEventListener('shot',e=>getW3()?.shot(e.detail));
 net.addEventListener('arenaScore',e=>{score=e.detail;});
 net.addEventListener('arenaHit',e=>{flashT=.35;try{navigator.vibrate?.(60);}catch{}});
 net.addEventListener('arenaEnd',e=>{const b=$('.ar-banner');b.hidden=false;b.textContent=(e.detail.winner==='red'?'🔴 ROSSI':'🔵 BLU')+' vincono! +'+e.detail.reward+' 🪙';bannerT=4;});
 return {update(me,dt=.016){meNow=me||null;const A=me?.arena,w3=getW3();if(w3)w3.arenaOn=!!A;
  // In arena la telecamera alta (2.5D) fa vedere tutto il campo anche dietro agli ostacoli; all'uscita si rimette quella di prima.
  if(w3){if(A&&prevMode===null){prevMode=w3.walkMode;w3.walkMode='25d';w3.autoYaw=true;}else if(!A&&prevMode!==null){w3.walkMode=prevMode;prevMode=null;}}root.hidden=!A;document.body.classList.toggle('in-arena',!!A);if(!A){firing=false;return;}
  const W=ARENA.weapons[A.weapon],down=A.downUntil>Date.now();$('.ar-score .r').textContent='🔴 '+score.red;$('.ar-score .b').textContent=score.blue+' 🔵';$('.ar-score span').textContent='PAINTBALL · primo a '+ARENA.target;
  $('.ar-hp i').style.width=Math.max(0,A.hp)+'%';$('.ar-hp i').style.background=A.hp>60?'#35d07f':A.hp>30?'#f5b83d':'#ef4444';
  $('.ar-ammo').textContent=W.emoji+' '+W.name+' · '+(A.reloadAt?'ricarica…':A.ammo+'/'+A.mag);$('.ar-down').hidden=!down;
  const b=$('.ar-banner');if(bannerT>0){bannerT-=dt;if(bannerT<=0)b.hidden=true;}if(flashT>0){flashT-=dt;}$('.ar-flash').style.opacity=flashT>0?String(Math.min(.55,flashT*1.6)):'0';
  if(firing&&!down)fire();}};
}
