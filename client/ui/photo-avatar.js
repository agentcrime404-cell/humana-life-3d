// «Crea avatar dalla foto» (solo HUMANA life 3D).
// La foto viene letta SOLO sul telefono (canvas): non viene caricata né salvata. Si toccano la guancia e i capelli per prendere due colori,
// si sceglie Uomo/Donna e il gioco propone la persona realistica più vicina; di tutto resta solo il nome del modello e due colori.
// Limite onesto: non copia la forma del viso, solo carnagione e capelli (vedi CONTINUA.md per il passo successivo con un servizio di scansione 3D).
import {PHOTO_MODELS} from '/shared/avatar.js';
const MEN=PHOTO_MODELS.filter(n=>n.startsWith('Male')),WOMEN=PHOTO_MODELS.filter(n=>n.startsWith('Female'));
const hex=(r,g,b)=>'#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
const hsl=(r,g,b)=>{r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let h=0,s=0;if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?((g-b)/d+(g<b?6:0)):mx===g?(b-r)/d+2:(r-g)/d+4;h/=6;}return [h,s,l];};
const rgb=(h,s,l)=>{const f=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;return t<1/6?p+(q-p)*6*t:t<1/2?q:t<2/3?p+(q-p)*(2/3-t)*6:p;};if(!s)return [l*255,l*255,l*255];const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;return [f(p,q,h+1/3)*255,f(p,q,h)*255,f(p,q,h-1/3)*255];};
// Colore tipico del punto toccato (mediana di una macchia di pixel, per non farsi ingannare da riflessi e puntini).
const sample=(ctx,x,y,r=6)=>{const W=ctx.canvas.width,H=ctx.canvas.height,x0=Math.max(0,Math.round(x-r)),y0=Math.max(0,Math.round(y-r)),w=Math.min(W-x0,r*2+1),h=Math.min(H-y0,r*2+1),d=ctx.getImageData(x0,y0,w,h).data,R=[],G=[],B=[];for(let i=0;i<d.length;i+=4){R.push(d[i]);G.push(d[i+1]);B.push(d[i+2]);}const med=a=>a.sort((p,q)=>p-q)[a.length>>1];return [med(R),med(G),med(B)];};
// La luce della foto sposta i colori: la pelle viene riportata in un intervallo credibile (non troppo scura/chiara, un po' di colore).
const fixSkin=c=>{let [h,s,l]=hsl(...c);l=Math.max(.2,Math.min(.8,l));s=Math.max(.22,Math.min(.65,s));h=Math.max(.02,Math.min(.1,h));return rgb(h,s,l);};
const fixHair=c=>{let [h,s,l]=hsl(...c);l=Math.max(.05,Math.min(.85,l));return rgb(h,Math.min(.8,s),l);};
const dist=(a,b)=>a&&b?Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]):0;
export function openPhotoAvatar({modal,el,button,notify,closeModal,base='',onPick}){
 const box=modal('📷 Avatar dalla foto');box.append(el('p','Scegli una foto tua (del viso o intera). Resta solo sul tuo telefono: non viene caricata né salvata. Il gioco prende carnagione e capelli e sceglie la persona più simile.'));
 const st={skin:null,hair:null,fem:null,i:0,meta:null};
 fetch(base+'/assets/world/napoli/characters/persone-vere/_colori.json').then(r=>r.json()).then(j=>{st.meta=j;}).catch(()=>{});
 const file=el('input');file.type='file';file.accept='image/*';file.style.display='none';
 const pickBtn=button('🖼️ Scegli una foto',()=>{file.removeAttribute('capture');file.click();}),selfieBtn=button('🤳 Scatta un selfie',()=>{file.setAttribute('capture','user');file.click();});
 const info=el('p',''),cv=document.createElement('canvas');cv.style.cssText='display:none;max-width:100%;border-radius:12px;touch-action:none;background:#000';
 const chips=el('div');chips.style.cssText='display:flex;gap:10px;align-items:center;margin:8px 0';
 const gen=el('div');gen.style.cssText='display:flex;gap:8px;margin:8px 0';
 const sw=(c)=>{const d=document.createElement('span');d.style.cssText='display:inline-block;width:34px;height:34px;border-radius:50%;border:2px solid #fff8;background:'+(c||'#333');return d;};
 const modelRow=el('div');modelRow.style.cssText='display:flex;align-items:center;gap:8px;margin:8px 0';
 box.append(file,pickBtn,selfieBtn,info,cv,chips,gen,modelRow);
 const ctx=cv.getContext('2d',{willReadFrequently:true});let step=0;
 const names=()=>st.fem?WOMEN:MEN;
 const best=()=>{const L=names();if(!st.meta)return 0;let b=0,bd=1e9;L.forEach((n,i)=>{const m=st.meta[n]||{},d=dist(st.skin,m.skin)+.5*dist(st.hair,m.hair);if(d<bd){bd=d;b=i;}});return b;};
 const refresh=()=>{chips.replaceChildren(el('span','Pelle'),sw(st.skin&&hex(...st.skin)),el('span','Capelli'),sw(st.hair&&hex(...st.hair)));
  gen.replaceChildren();modelRow.replaceChildren();
  if(step<2)return;
  for(const [label,fem] of [['👨 Uomo',false],['👩 Donna',true]]){const b=button(label,()=>{st.fem=fem;st.i=best();refresh();});if(st.fem===fem)b.style.outline='2px solid #f5b81c';gen.append(b);}
  if(st.fem===null)return;const L=names();
  const prev=button('‹',()=>{st.i=(st.i+L.length-1)%L.length;refresh();}),next=button('›',()=>{st.i=(st.i+1)%L.length;refresh();});
  modelRow.append(prev,el('span','Persona '+(st.i+1)+' di '+L.length+' (cambia con le frecce)'),next);
  modelRow.append(button('✅ Usa questo avatar',()=>{const name=L[st.i],look=(st.fem?1:0)+(Math.min(3,L.indexOf(name)%4))*2;onPick(look,{model:name,skin:st.skin?hex(...st.skin):null,hair:step>=3&&st.hair?hex(...st.hair):null});}));};
 const say=()=>{if(typeof skip!=='undefined')skip.hidden=step!==2;info.textContent=step===0?'':step===1?'1/2 · Tocca la tua guancia (la pelle del viso) nella foto.':step===2?'2/2 · Tocca i capelli. Se sei senza capelli, salta questo passo.':'Fatto! Scegli Uomo o Donna.';};
 file.onchange=()=>{const f=file.files?.[0];if(!f)return;const url=URL.createObjectURL(f),im=new Image();im.onload=()=>{const k=Math.min(1,560/Math.max(im.width,im.height));cv.width=Math.round(im.width*k);cv.height=Math.round(im.height*k);ctx.drawImage(im,0,0,cv.width,cv.height);cv.style.display='block';URL.revokeObjectURL(url);step=1;st.skin=st.hair=null;st.fem=null;say();refresh();
   // Se il telefono sa riconoscere i volti, il punto per la pelle viene proposto da solo (si può comunque toccare per correggerlo).
   try{if('FaceDetector' in window)new window.FaceDetector({fastMode:true,maxDetectedFaces:1}).detect(cv).then(F=>{const b=F[0]?.boundingBox;if(b&&step===1){st.skin=fixSkin(sample(ctx,b.x+b.width*.3,b.y+b.height*.62,Math.max(3,b.width*.05)));const hy=Math.max(4,b.y-b.height*.08);st.hair=fixHair(sample(ctx,b.x+b.width*.5,hy,Math.max(3,b.width*.05)));step=3;say();refresh();}}).catch(()=>{});}catch{}};
  im.onerror=()=>notify('Non riesco a leggere questa foto');im.src=url;};
 const tap=e=>{if(step<1||step>2)return;const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)*cv.width/r.width,y=(e.clientY-r.top)*cv.height/r.height;const c=sample(ctx,x,y,Math.max(3,Math.round(cv.width/70)));
  if(step===1){st.skin=fixSkin(c);step=2;}else{st.hair=fixHair(c);step=3;}say();refresh();
  // un segno sulla foto dove si è toccato
  ctx.save();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,9,0,6.3);ctx.stroke();ctx.restore();};
 cv.addEventListener('pointerdown',tap);
 const skip=button('Salta i capelli',()=>{if(step===2){st.hair=null;step=3;say();refresh();}});box.append(skip);
 say();refresh();
}
