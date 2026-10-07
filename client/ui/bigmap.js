// Mappa a tutto schermo (stile GTA) per HUMANA life 3D: si trascina, si zooma, si tocca un punto per impostare la
// destinazione (il personaggio ci va da solo e nel mondo compare un segnale luminoso). "← Indietro" o il tasto Indietro la chiudono.
import {MAPS,MODE,doors,cityEdge,SHORE,BEACH} from '/shared/world.js';
import {surface} from '/shared/district.js';
import {NAPOLI} from '/shared/napoli.js';import {DEALERS,BOATS,GAS,POLICE,gasGeom,policeGeom,VEHICLE} from '/shared/catalog.js';
const ICON={bar:'☕',pizzeria:'🍕',shop:'🛒',club:'🎵',bank:'🏦',burger:'🍔',osteria:'🍝',vesuvio:'🍷',trattoria:'🍝',panorama:'🍽',mall:'🛍',fashion:'👗',barber:'✂',casino:'🎰'};
const COL={water:'#3484c9',sand:'#ecd9a6',grass:'#86c060',garden:'#7cb35a',road:'#5d6170',roadline:'#5d6170',parking:'#6b6e78',crosswalk:'#e6e6e6',tiles:'#e8e0d2',marble:'#f0ece4',cobble:'#b9b1a5',stone:'#d6cdbd',sidewalk:'#d8cfbf',curb:'#cfc7b8',pool:'#4fc3e0',track:'#c0573f',playground:'#e58a4e',dirt:'#a7845c',wood:'#a8774f'};
const images=new Map();
// Immagine della zona (1 pixel = 1 metro), fatta una volta sola.
function zoneImage(room){if(images.has(room))return images.get(room);let out;
 if(room==='mergellina'&&NAPOLI.grid){const {w,h,x0,y0,grid,data}=NAPOLI,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d'),im=g.createImageData(w,h);
  for(let i=0;i<w*h;i++){const on=grid[i>>3]&(1<<(i&7)),k=i*4;im.data[k]=on?222:52;im.data[k+1]=on?212:132;im.data[k+2]=on?192:201;im.data[k+3]=255;}g.putImageData(im,0,0);
  g.fillStyle='#86c060';for(const pk of data.parks){g.beginPath();pk.forEach((q,i)=>i?g.lineTo(q[0]-x0,q[1]-y0):g.moveTo(q[0]-x0,q[1]-y0));g.fill();}
  g.lineCap='round';for(const r of data.roads){const car=!['footway','steps','path','cycleway','pedestrian'].includes(r.k);g.strokeStyle=car?'#6b6f7c':'#cfc4ae';g.lineWidth=r.w;g.beginPath();r.p.forEach((q,i)=>i?g.lineTo(q[0]-x0,q[1]-y0):g.moveTo(q[0]-x0,q[1]-y0));g.stroke();}
  g.fillStyle='#c98b5e';g.strokeStyle='#8a5a3a';g.lineWidth=.6;for(const b of data.buildings){g.beginPath();b.p.forEach((q,i)=>i?g.lineTo(q[0]-x0,q[1]-y0):g.moveTo(q[0]-x0,q[1]-y0));g.closePath();g.fill();g.stroke();}
  out={img:c,x0,y0,w,h};}
 else{const E=cityEdge(),M=40,SC=4,x0=Math.floor(E.x0-M),y0=Math.floor(E.y0-M),w=Math.ceil(E.x1+12)-x0,h=Math.ceil(E.y1+12)-y0,c=document.createElement('canvas');c.width=w*SC;c.height=h*SC;const g=c.getContext('2d');g.scale(SC,SC);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const sh=x+x0+y+y0+1;g.fillStyle=!MODE.front&&sh<SHORE-BEACH?(sh<SHORE-BEACH-3?'#3484c9':'#8fc4e8'):!MODE.front&&sh<SHORE?COL.sand:COL[surface(x+x0,y+y0)]||'#86c060';g.fillRect(x,y,1.02,1.02);}
  for(const b of MAPS.lungomare.buildings){g.fillStyle='rgba(0,0,0,.22)';g.fillRect(b.fx-x0+.5,b.fy-y0+.5,b.fw,b.fh);g.fillStyle='#d9a878';g.fillRect(b.fx-x0,b.fy-y0,b.fw,b.fh);g.fillStyle='#c98b5e';g.fillRect(b.fx-x0+.45,b.fy-y0+.45,b.fw-.9,b.fh-.9);g.strokeStyle='#7a4e32';g.lineWidth=.25;g.strokeRect(b.fx-x0,b.fy-y0,b.fw,b.fh);}
  out={img:c,x0,y0,w,h};}
 images.set(room,out);return out;}
export function openBigMap({me:getMe,players:getPlayers,pointer,w3,notify}){
 const me0=getMe();if(!me0)return false;const inside=!['lungomare','mergellina'].includes(me0.room),room=inside?(me0.from?.room==='mergellina'?'mergellina':'lungomare'):me0.room;if(room==='mergellina'&&!NAPOLI.grid)return false;const Z=zoneImage(room);
 const here=()=>{const m=getMe();if(!m)return null;if(!inside)return m;if(m.from&&m.from.room===room)return {x:m.from.x,y:m.from.y,direction:0};const b=MAPS.lungomare.buildings.find(q=>q.id===(m.room==='mall2'?'mall':m.room));return b?{x:b.door?.exitX??b.fx+b.fw/2,y:b.door?.exitY??b.fy+b.fh,direction:0}:null;};const h0=here()||{x:Z.x0+Z.w/2,y:Z.y0+Z.h/2};
 const root=document.createElement('div');root.id='bigmap';root.innerHTML='<canvas></canvas><div class="bm-top"><button class="bm-back" aria-label="Chiudi la mappa">← Indietro</button><strong></strong><span class="bm-zoom"><button aria-label="Rimpicciolisci">−</button><button aria-label="Ingrandisci">+</button></span></div><div class="bm-hint">Tocca un punto o un locale per andarci · trascina per spostare la mappa</div><button class="bm-clear" hidden>✖ Togli destinazione</button>';
 document.body.append(root);const cv=root.querySelector('canvas'),g=cv.getContext('2d');root.querySelector('strong').textContent=MAPS[room].name||'Mappa';if(inside)root.querySelector('.bm-hint').textContent='Sei dentro: '+(MAPS[me0.room]?.name||'un locale')+' · esci per andare in un altro posto';
 let cx=h0.x,cy=h0.y,k=room==='mergellina'?2:4,raf=0,drag=null,moved=false;const pinch=new Map();
 const places=doors(room).filter(d=>ICON[d.to]).map(d=>({x:d.exitX??d.x,y:d.exitY??d.y,name:d.name,icon:ICON[d.to]}));
 const streets=[];if(room==='mergellina'&&NAPOLI.data){const best=new Map();for(const r of NAPOLI.data.roads){if(!r.name||r.w<6)continue;let L=0;for(let i=1;i<r.p.length;i++)L+=Math.hypot(r.p[i][0]-r.p[i-1][0],r.p[i][1]-r.p[i-1][1]);if(L>(best.get(r.name)?.L||60))best.set(r.name,{L,r});}for(const [name,{r}] of best){const i=Math.max(1,r.p.length>>1),a=r.p[i-1],b=r.p[i];let an=Math.atan2(b[1]-a[1],b[0]-a[0]);if(an>Math.PI/2)an-=Math.PI;if(an<-Math.PI/2)an+=Math.PI;streets.push({name,x:(a[0]+b[0])/2,y:(a[1]+b[1])/2,a:an});}}
 const atms=(MAPS[room].props||[]).filter(p=>p.kind==='atm'||p.kind==='vending').map(p=>p.kind==='atm'?{x:p.x,y:p.y,name:'Bancomat',icon:'🏧'}:{x:p.x,y:p.y,name:'Distributore',icon:'🥤'}).concat(room==='lungomare'?DEALERS.map(d=>({x:d.x+d.w/2,y:d.y+d.h+1.2,name:d.name,icon:d.icon})):[]).concat(room==='lungomare'&&window.HUMANA_3D?[...GAS.map(g=>({x:gasGeom(g).cx,y:gasGeom(g).island.y+gasGeom(g).s*2.6,name:g.name,icon:'⛽'})),...POLICE.map(c=>({x:policeGeom(c).door.x,y:policeGeom(c).door.y+1.4,name:c.name,icon:'🚓'})),...(me0.myCars||[]).map(c=>({x:c.x,y:c.y,name:'La tua '+(VEHICLE[c.v]?.name||'auto')+' (parcheggiata qui)',icon:'🚗'}))]:[]).concat(BOATS[room]?[{x:BOATS[room].dock.x,y:BOATS[room].dock.y,name:BOATS[room].name,icon:'⛵'}]:[]);
 const toScreen=(x,y)=>[cv.width/2+(x-cx)*k,cv.height/2+(y-cy)*k],toWorld=(X,Y)=>({x:cx+(X-cv.width/2)/k,y:cy+(Y-cv.height/2)/k});
 let kMin=.4,ready=false;const clamp=()=>{k=Math.max(kMin,Math.min(14,k));cx=Math.max(Z.x0,Math.min(Z.x0+Z.w,cx));cy=Math.max(Z.y0,Math.min(Z.y0+Z.h,cy));};
 function draw(){const dpr=Math.min(2,devicePixelRatio||1);if(cv.width!==innerWidth*dpr){cv.width=innerWidth*dpr;cv.height=innerHeight*dpr;ready=false;}
  if(!ready){ready=true;const first=kMin===.4;kMin=Math.min(cv.width/Z.w,cv.height/Z.h)*.98;if(first){if(room==='mergellina')k=Math.max(kMin,2.4*dpr);else{k=Math.max(cv.width/Z.w,cv.height/Z.h)*.72;cx=Z.x0+Z.w/2;cy=Z.y0+Z.h/2;}}}clamp();const s=k*1;
  g.fillStyle=room==='mergellina'?'#3484c9':'#7fb65c';g.fillRect(0,0,cv.width,cv.height);g.imageSmoothingEnabled=true;
  const [ix,iy]=toScreen(Z.x0,Z.y0);g.drawImage(Z.img,ix,iy,Z.w*s,Z.h*s);
  const fs=Math.round(Math.max(14,Math.min(26,k*7))*dpr);g.font=fs+'px system-ui';g.textAlign='center';g.textBaseline='middle';
  for(const p of [...places,...atms]){const [x,y]=toScreen(p.x,p.y);if(x<-30||y<-30||x>cv.width+30||y>cv.height+30)continue;g.fillStyle='rgba(255,255,255,.95)';g.beginPath();g.arc(x,y,fs*.75,0,7);g.fill();g.strokeStyle='rgba(20,30,45,.35)';g.lineWidth=dpr;g.stroke();g.fillStyle='#000';g.fillText(p.icon,x,y+1);
   if(k>=(room==='mergellina'?3.2*dpr:2.2*dpr)){g.font='600 '+Math.round(12*dpr)+'px system-ui';g.lineWidth=3*dpr;g.strokeStyle='rgba(255,255,255,.9)';g.strokeText(p.name,x,y+fs*.75+9*dpr);g.fillStyle='#17202c';g.fillText(p.name,x,y+fs*.75+9*dpr);g.font=fs+'px system-ui';}}
  if(streets.length&&k>=1.3*dpr){g.font='600 '+Math.round(11*dpr)+'px system-ui';for(const st of streets){const [x,y]=toScreen(st.x,st.y);if(x<-80||y<-20||x>cv.width+80||y>cv.height+20)continue;g.save();g.translate(x,y);g.rotate(st.a);g.lineWidth=3*dpr;g.strokeStyle='rgba(255,255,255,.85)';g.strokeText(st.name,0,0);g.fillStyle='#39404e';g.fillText(st.name,0,0);g.restore();}g.font=fs+'px system-ui';}
  const me=here();for(const p of getPlayers()){if(p.room!==room||p.id===getMe()?.id)continue;const [x,y]=toScreen(p.x,p.y);g.fillStyle='#ffd23f';g.beginPath();g.arc(x,y,6*dpr,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=2*dpr;g.stroke();}
  const wp=w3.waypoint;if(wp&&wp.room===room){const [x,y]=toScreen(wp.x,wp.y);g.fillStyle='#e5484d';g.beginPath();g.moveTo(x,y);g.arc(x,y-22*dpr,11*dpr,Math.PI*.75,Math.PI*2.25);g.closePath();g.fill();g.fillStyle='#fff';g.beginPath();g.arc(x,y-22*dpr,4*dpr,0,7);g.fill();}
  if(me){const [x,y]=toScreen(me.x,me.y),a=me.direction||0;g.save();g.translate(x,y);g.rotate(a);g.fillStyle='#1e90ff';g.strokeStyle='#fff';g.lineWidth=2*dpr;g.beginPath();g.moveTo(12*dpr,0);g.lineTo(-8*dpr,8*dpr);g.lineTo(-4*dpr,0);g.lineTo(-8*dpr,-8*dpr);g.closePath();g.fill();g.stroke();g.restore();}
  root.querySelector('.bm-clear').hidden=!(wp&&wp.room===room);raf=requestAnimationFrame(draw);}
 const dpr=()=>Math.min(2,devicePixelRatio||1);
 function setTarget(X,Y){if(inside){notify('Esci dal locale per andarci');return;}const me=getMe();if(!me)return;const w=toWorld(X*dpr(),Y*dpr());
  // Un locale vicino al tocco ha la precedenza (si va davanti alla sua porta).
  const near=[...places,...atms].map(p=>({p,d:Math.hypot(p.x-w.x,p.y-w.y)})).sort((a,b)=>a.d-b.d)[0],hit=near&&near.d*k<28*dpr()?near.p:null,to=hit||w;
  if(pointer.go(me,to)){w3.waypoint={x:to.x,y:to.y,room,name:hit?.name};notify('📍 Destinazione: '+(hit?hit.name:Math.round(Math.hypot(to.x-me.x,to.y-me.y))+' m')+' · ci vai da solo');}else notify('Lì non si può arrivare');}
 cv.addEventListener('pointerdown',e=>{pinch.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pinch.size===1){drag={x:e.clientX,y:e.clientY,cx,cy};moved=false;}cv.setPointerCapture(e.pointerId);});
 cv.addEventListener('pointermove',e=>{if(!pinch.has(e.pointerId))return;const prev=pinch.get(e.pointerId);pinch.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pinch.size===2){const [a,b]=[...pinch.values()],d1=Math.hypot(a.x-b.x,a.y-b.y),o=[...pinch.entries()].find(([id])=>id!==e.pointerId)[1],d0=Math.hypot(prev.x-o.x,prev.y-o.y);if(d0>0)k=k*d1/d0;moved=true;return;}
  if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>6)moved=true;cx=drag.cx-dx*dpr()/k;cy=drag.cy-dy*dpr()/k;}});
 cv.addEventListener('pointerup',e=>{pinch.delete(e.pointerId);if(drag&&!moved&&pinch.size===0)setTarget(e.clientX,e.clientY);if(pinch.size===0)drag=null;});
 cv.addEventListener('wheel',e=>{e.preventDefault();k=k*(e.deltaY<0?1.15:1/1.15);},{passive:false});
 const [zo,zi]=root.querySelectorAll('.bm-zoom button');zo.onclick=()=>k=k/1.4;zi.onclick=()=>k=k*1.4;
 root.querySelector('.bm-clear').onclick=()=>{w3.waypoint=null;pointer.cancel();notify('Destinazione tolta');};
 const close=()=>{cancelAnimationFrame(raf);removeEventListener('keydown',key);root.remove();};
 const key=e=>{if(e.key==='Escape'||e.key==='m'||e.key==='M'){e.preventDefault();close();}};addEventListener('keydown',key);
 root.querySelector('.bm-back').onclick=close;draw();return true;}
