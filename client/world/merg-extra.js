// Dettagli veri di Mergellina presi da OpenStreetMap: distributori, caserme e ambulatori veri (con cartello), semafori e strisce pedonali ai nodi con semaforo,
// barche ormeggiate ai pontili e barche che navigano al largo (posizione = orologio del server, uguale per tutti).
import * as THREE from '../vendor/three/three.module.min.js';
import {NAPOLI,napoliCell,napoliServices,signalPhase,napoliPlaces} from '/shared/napoli.js';
const H=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))|0;return Math.abs(h);};
const lam=(c,o={})=>new THREE.MeshLambertMaterial({color:c,...o}),bas=c=>new THREE.MeshBasicMaterial({color:c});
function sign(text,w,h,bg,fg='#fff'){const c=document.createElement('canvas');c.width=512;c.height=Math.round(512*h/w);const g=c.getContext('2d');g.fillStyle=bg;g.fillRect(0,0,c.width,c.height);g.strokeStyle=fg;g.lineWidth=5;g.strokeRect(5,5,c.width-10,c.height-10);g.fillStyle=fg;g.font='bold '+Math.round(c.height*.42)+'px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';
 let t=text;while(g.measureText(t).width>c.width-30&&t.length>6)t=t.slice(0,-2);if(t!==text)t+='…';g.fillText(t,c.width/2,c.height/2+2);const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tx,side:THREE.DoubleSide}));}
const box=(g,sx,sy,sz,x,y,z,m)=>{const q=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),m);q.position.set(x,y,z);g.add(q);return q;};
export class MergExtra{
 constructor(w){this.w=w;this.boats=[];this.sigMat=null;this.t=0;this.bt=0;this.built=false;}
 build(){const w=this.w,S=napoliServices(),Z=w.static;if(!S)return;
  // ---- distributori veri ----
  const red=lam('#d9262c'),white=lam('#f4f1ea'),gray=lam('#666b73');
  for(const f of S.fuel){const g=new THREE.Group();g.position.set(f.x,w.lev(f.x,f.y),f.y);g.rotation.y=f.h;
   box(g,9,.5,5.6,0,4.6,0,white);box(g,9.05,.2,5.65,0,4.3,0,red);for(const sx of [-3.9,3.9])for(const sz of [-2.2,2.2])box(g,.28,4.4,.28,sx,2.2,sz,gray);
   for(const dx of [-2.6,0,2.6]){box(g,.8,1.5,.55,dx,.75,0,red);box(g,.5,.4,.58,dx,1.2,0,lam('#1c2b39'));}
   const pole=box(g,.3,6,.3,-5.4,3,2.4,gray);const sg=sign(f.name,2.6,1.1,'#d9262c');sg.position.set(-5.4,6.4,2.4);g.add(sg);
   Z.add(g);w.col.c.push([f.x,f.y,3.2]);}
  // ---- caserme/ambulatori veri: cartello sulla porta, mezzi davanti, lampeggiante ----
  for(const kind of ['police','hospital']){for(const f of S[kind]){const g=new THREE.Group();g.position.set(f.x,w.lev(f.x,f.y),f.y);g.rotation.y=f.h;const blue=kind==='police';
    box(g,.25,4.4,.25,-1.6,2.2,0,gray);const sg=sign(f.name,3.4,1.1,blue?'#16357a':'#c0262d');sg.position.set(-1.6,4.6,.05);g.add(sg);
    const lamp=new THREE.Mesh(new THREE.SphereGeometry(.22,8,6),bas(blue?'#2a5cff':'#ff2a2a'));lamp.position.set(-1.6,5.4,0);g.add(lamp);f.lamp=lamp;
    for(let k=0;k<2;k++){const lx=1.6+k*2.6,lz=1.6,gx=f.x+Math.cos(f.h)*lx+Math.sin(f.h)*lz,gz=f.y-Math.sin(f.h)*lx+Math.cos(f.h)*lz;if(!napoliCell(gx,gz))continue;
     const car=w.car(blue?'sedan':'suv',blue?'#f4f7fb':'#f4f4f4');if(!car)continue;if(blue)w.bx(car,.05,.28,2.6,.93,.8,0,'#1e40af');else w.bx(car,2.05,.28,2.6,0,1.05,-.2,'#d62828');car.position.set(lx,0,lz+1.2);car.rotation.y=Math.PI/2;g.add(car);}
    Z.add(g);this.beacons=(this.beacons||[]);this.beacons.push(f);}}
  // ---- semafori e strisce pedonali ----
  {const D=NAPOLI.data,NOT=new Set(['footway','steps','path','cycleway','pedestrian']),mats={};for(const ax of ['A','B'])mats[ax]={r:bas('#ff2a1a'),y:bas('#ffb300'),g:bas('#22e06b')};this.sigMat=mats;
   const heads=new THREE.Group(),poleG=new THREE.BoxGeometry(.14,3.6,.14),headG=new THREE.BoxGeometry(.4,1.1,.3),lampG=new THREE.SphereGeometry(.13,6,5),poleM=lam('#2b2f36');const stripes=[];
   for(const s of D.signals||[]){for(const r of D.roads){if(NOT.has(r.k)||r.tn)continue;const j=r.p.findIndex(q=>Math.hypot(q[0]-s[0],q[1]-s[1])<1.2);if(j<0)continue;
     for(const dj of [-1,1]){const q=r.p[j+dj];if(!q)continue;let dx=q[0]-s[0],dy=q[1]-s[1];const L=Math.hypot(dx,dy);if(L<9)continue;dx/=L;dy/=L;const ax=Math.abs(dx)>=Math.abs(dy)?'A':'B',nx=-dy,ny=dx,rw=r.w||6;
      const px=s[0]+dx*8+nx*(rw/2+.9),pz=s[1]+dy*8+ny*(rw/2+.9);if(napoliCell(px,pz)||true){const g=new THREE.Group();g.position.set(px,w.lev(px,pz),pz);g.rotation.y=Math.atan2(dx,dy);const p=new THREE.Mesh(poleG,poleM);p.position.y=1.8;g.add(p);const hd=new THREE.Mesh(headG,poleM);hd.position.set(0,3.7,.05);g.add(hd);
       [['r',.34],['y',0],['g',-.34]].forEach(([c,y])=>{const l=new THREE.Mesh(lampG,mats[ax][c]);l.position.set(0,3.7+y,.22);g.add(l);});heads.add(g);}
      for(let k=-Math.floor(rw/2)+.5;k<rw/2;k+=1.1)stripes.push([s[0]+dx*5.2+nx*k,s[1]+dy*5.2+ny*k,Math.atan2(dx,dy)]);}}}
   w.static.add(heads);
   if(stripes.length){const im=new THREE.InstancedMesh(new THREE.BoxGeometry(.55,.02,3.2),new THREE.MeshLambertMaterial({color:'#f4f2ea',polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}),stripes.length),o=new THREE.Object3D();stripes.forEach((s,i)=>{o.position.set(s[0],.045,s[1]);o.rotation.y=s[2];o.updateMatrix();im.setMatrixAt(i,o.matrix);});im.frustumCulled=false;w.static.add(im);}}
  try{this.buildCiro();}catch(e){console.warn('Ciro',e);}
  this.built=true;}
 // Chalet Ciro (Via Caracciolo, Mergellina): padiglione basso crema con vetrate, tende a strisce blu e bianche, siepi sul tetto, insegna, tavolini; scooter in fila sul marciapiede e platani lungo la strada.
 // Interno di Chalet Ciro visto dalla vetrina: pavimento a scacchi, banco con vetrina dei dolci, scaffali di bottiglie, tavolini e lampade calde.
 ciroInside(g,Wd,Dp,H,dl){const B=(c)=>new THREE.MeshBasicMaterial({color:c}),warm=B('#f6e3c0'),wood=lam('#7a4f2c');
  {const c=document.createElement('canvas');c.width=c.height=64;const q=c.getContext('2d');for(let j=0;j<8;j++)for(let i=0;i<8;i++){q.fillStyle=(i+j)%2?'#1c2a4a':'#f3efe6';q.fillRect(i*8,j*8,8,8);}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(Wd/2,Dp/2);t.magFilter=THREE.NearestFilter;
   const fl=new THREE.Mesh(new THREE.PlaneGeometry(Wd-.4,Dp-.4),new THREE.MeshLambertMaterial({map:t}));fl.rotation.x=-Math.PI/2;fl.position.y=.02;g.add(fl);}
  box(g,Wd-.5,H-.1,.05,0,H/2,-Dp/2+.27,warm);for(const s of [-1,1])box(g,.05,H-.1,Dp-.5,s*(Wd/2-.27),H/2,0,warm);box(g,Wd-.5,.05,Dp-.5,0,H-.05,0,B('#fff6e2'));
  const cz=-Dp/2+2.2,cw=Math.min(9,Wd*.5);box(g,cw,1.05,.8,0,.52,cz,wood);box(g,cw+.1,.06,.9,0,1.08,cz,lam('#efe6d6'));
  box(g,cw*.55,.5,.7,-cw*.2,1.36,cz+.05,new THREE.MeshLambertMaterial({color:'#d9eef7',transparent:true,opacity:.35,depthWrite:false}));
  const P=['#f2c14e','#e86aa5','#7b3f1d','#f4f1ea','#c1272d','#8fd16a'];for(let i=0;i<12;i++)box(g,.26,.12,.22,-cw*.2-cw*.24+(i%6)*cw*.1,1.18+Math.floor(i/6)*.2,cz+(i%2?-.12:.14),B(P[(i*5)%6]));
  for(let r=0;r<3;r++){box(g,cw+1,.05,.35,0,1.6+r*.55,-Dp/2+.48,wood);for(let i=0;i<14;i++)box(g,.1,.32,.1,-cw/2+.2+i*(cw+.6)/14,1.79+r*.55,-Dp/2+.48,B(['#2f6b3c','#7a1f2b','#e8b026','#3a6ea5'][(i+r)%4]));}
  box(g,1.1,.7,.6,cw/2-.7,1.45,cz,lam('#9aa0a6'));
  for(const [x,z] of [[-Wd/2+2.2,Dp/2-2.2],[-Wd/2+4.8,Dp/2-2.4],[Wd/2-2.4,Dp/2-2.2],[Wd/2-5,Dp/2-2.6],[-Wd/2+2.4,-.2],[Wd/2-2.6,0]]){if(Math.abs(x-dl)<1.6&&z>0)continue;const t=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.04,12),lam('#faf7f0'));t.position.set(x,.76,z);g.add(t);box(g,.06,.74,.06,x,.38,z,lam('#444'));for(const s of [-1,1])box(g,.4,.45,.4,x+s*.72,.25,z,lam('#2a3a5c'));}
  for(let i=0;i<4;i++){const x=-Wd/2+Wd*(i+.5)/4,l=new THREE.Mesh(new THREE.SphereGeometry(.22,10,8),B('#ffd98a'));l.position.set(x,H-.55,0);g.add(l);box(g,.02,.4,.02,x,H-.25,0,lam('#333'));}}
 buildCiro(){const w=this.w,D=NAPOLI.data,b=D.buildings.find(q=>q.name==='Chalet Ciro');if(!b)return;const xs=b.p.map(q=>q[0]),ys=b.p.map(q=>q[1]),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2,Wd=Math.max(...ys)-Math.min(...ys)+.6,Dp=Math.max(...xs)-Math.min(...xs)+.4,gy=w.groundY||.12,g=new THREE.Group();
  g.position.set(cx,gy,cy);g.rotation.y=Math.PI/2;const L=(c)=>lam(c),cream=L('#f0e8d6'),white=L('#faf7f0'),navy=L('#1c2a4a'),green=L('#2e6a34'),glass=new THREE.MeshLambertMaterial({color:'#bcd6e6',transparent:true,opacity:.22,depthWrite:false});
  const H=3.7,door=napoliPlaces().doors.find(q=>q.name==='Chalet Ciro'),dl=door?cy-door.y:0;
  // Padiglione vuoto dentro: muri, tetto, pavimento; la facciata è una vetrina con la porta (dl) da cui si vede l'interno.
  box(g,Wd,H,.25,0,H/2,-Dp/2+.12,cream);for(const s of [-1,1])box(g,.25,H,Dp,s*(Wd/2-.12),H/2,0,cream);box(g,Wd+.5,.3,Dp+.5,0,H+.15,0,white);
  box(g,Wd,.55,.25,0,.27,Dp/2-.12,cream);box(g,Wd,H-2.95,.25,0,(H+2.95)/2,Dp/2-.12,cream);for(const s of [-1,1])box(g,.6,2.4,.25,s*(Wd/2-.3),1.75,Dp/2-.12,cream);
  this.ciroInside(g,Wd,Dp,H,dl);
  // vetrate e montanti
  {const L0=-Wd/2+.6,R0=Wd/2-.6,d0=dl-.8,d1=dl+.8;if(d0>L0)box(g,d0-L0,2.4,.08,(L0+d0)/2,1.75,Dp/2-.12,glass);if(R0>d1)box(g,R0-d1,2.4,.08,(d1+R0)/2,1.75,Dp/2-.12,glass);
   for(let x=-Wd/2+1.2;x<=Wd/2-1.2;x+=2.4)if(Math.abs(x-dl)>1)box(g,.1,2.5,.16,x,1.75,Dp/2-.05,white);for(const s of [-1,1])box(g,.14,2.6,.2,dl+s*.85,1.3,Dp/2-.05,L('#6b4a2b'));box(g,1.84,.16,.2,dl,2.62,Dp/2-.05,L('#6b4a2b'));
   const dm=new THREE.Mesh(new THREE.PlaneGeometry(1.6,.3),new THREE.MeshBasicMaterial({color:'#ffe9a8'}));dm.position.set(dl,.03,Dp/2+.6);dm.rotation.x=-Math.PI/2;g.add(dm);}box(g,Wd-.8,.12,.2,0,2.98,Dp/2+.06,white);
  // siepi sul tetto
  for(const z of [-1,1])box(g,Wd+.5,.75,.55,0,H+.3+.37,z*(Dp/2+.0),green);for(const x of [-1,1])box(g,.55,.75,Dp+.5,x*(Wd/2+.0),H+.3+.37,0,green);
  for(let i=0;i<7;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(.55,8,6),green);s.position.set(-Wd/2+1.5+i*2.6,H+1.1,Dp/2+.05);g.add(s);}
  // tende a strisce
  const c=document.createElement('canvas');c.width=128;c.height=64;{const q=c.getContext('2d');for(let i=0;i<8;i++){q.fillStyle=i%2?'#ffffff':'#1c2a4a';q.fillRect(i*16,0,16,64);}}const st=new THREE.CanvasTexture(c);st.colorSpace=THREE.SRGBColorSpace;const am=new THREE.MeshLambertMaterial({map:st});
  const n=Math.max(3,Math.round((Wd-1)/3.4)),aw=(Wd-1)/n;for(let i=0;i<n;i++){const a=box(g,aw-.1,.07,2.1,-Wd/2+.5+aw*(i+.5),3.15,Dp/2+1.0,am);a.rotation.x=.26;box(g,aw-.1,.28,.06,-Wd/2+.5+aw*(i+.5),2.62,Dp/2+2.0,am);}
  // insegna Chalet Ciro (blu corsivo su fondo bianco) sulla facciata e sul lato
  const sc=document.createElement('canvas');sc.width=512;sc.height=128;{const q=sc.getContext('2d');q.fillStyle='#ffffff';q.fillRect(0,0,512,128);q.fillStyle='#1d5fb0';q.font='italic bold 66px "Brush Script MT","Segoe Script",cursive,serif';q.textAlign='center';q.textBaseline='middle';q.fillText('Chalet Ciro',256,56);q.font='italic 26px serif';q.fillText('dal 1936 · Mergellina',256,108);}const sx=new THREE.CanvasTexture(sc);sx.colorSpace=THREE.SRGBColorSpace;
  for(const [px,pz,ry,sw] of [[0,Dp/2+.35,0,4.8],[-Wd/2-.3,0,-Math.PI/2,4.2],[Wd/2+.3,0,Math.PI/2,4.2]]){const pl=new THREE.Mesh(new THREE.PlaneGeometry(sw,sw/4),new THREE.MeshBasicMaterial({map:sx,side:THREE.DoubleSide}));pl.position.set(px,H+2.0,pz);pl.rotation.y=ry;g.add(pl);box(g,sw+.2,sw/4+.2,.1,px,H+2.0,pz-.08*(ry?0:1),white).rotation.y=ry;}
  // tavolini sotto le tende
  const chair=L('#2a3a5c'),top=white;for(let i=0;i<Math.floor(Wd/3);i++){const x=-Wd/2+1.8+i*3;const t=new THREE.Mesh(new THREE.CylinderGeometry(.46,.46,.05,10),top);t.position.set(x,.76,Dp/2+1.4);g.add(t);box(g,.07,.74,.07,x,.38,Dp/2+1.4,L('#555'));for(const sd of [-1,1])box(g,.42,.5,.42,x+sd*.75,.27,Dp/2+1.4,chair);}
  w.static.add(g);
  // scooter in fila lungo il marciapiede davanti allo chalet, platani lungo la strada
  const cols=['#1b1b1f','#c7ccd4','#b3261e','#1d4e89'],mk=[(c)=>w.scooter(c,{top:true}),(c)=>w.moto(c,'xadv'),(c)=>w.scooter(c,{top:true}),(c)=>w.moto(c,'africa')],byc=cols.map(()=>[]);let k=0;const dy0=napoliPlaces().doors.find(q=>q.name==='Chalet Ciro')?.y;for(let y=cy-Wd/2+1;y<cy+Wd/2-.5;y+=1.15){const x=cx+Dp/2+4.4;if(dy0!=null&&Math.abs(y-dy0)<1.8){k++;continue;}if(napoliCell(x,y)){const e=[x,y,Math.PI+ (k%3-1)*.06],c=[x,y,.45];byc[k%4].push(e);w.col.c.push(c);(w.stealSpots||(w.stealSpots=[])).push({e,x,y,kind:'scooter',col:[c]});globalThis.humanaSteal=w;}k++;}
  byc.forEach((l,i)=>{if(l.length)w.instanced(mk[i](cols[i]),l);});
  const T=[[],[],[]];let kk=0;for(const x of [cx+Dp/2+5.4,cx+Dp/2+23.5])for(let y=cy-70;y<=cy+70;y+=12.5){if(Math.abs(y-cy)<Wd/2+1&&x<cx+10)continue;if(napoliCell(x,y)&&napoliCell(x+.8,y)&&napoliCell(x-.8,y)&&!w.onRoad?.(x,y)){T[kk%3].push([x,y,0]);w.col.c.push([x,y,.4]);kk++;}}
  for(let v=0;v<3;v++)w.instanced(w.tree(1,v),T[v]);}
 // barche ormeggiate ai pontili e tre barche che navigano al largo
 buildBoats(){const w=this.w,D=NAPOLI.data,Z=w.static,mob=w.mobile,cand=[];
  for(const p of D.piers||[]){if(p.k!=='pier')continue;for(let i=1;i<p.p.length;i++){const a=p.p[i-1],b=p.p[i],L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<8)continue;const tx=(b[0]-a[0])/L,ty=(b[1]-a[1])/L,nx=-ty,ny=tx;
    for(let d=5;d<L-3;d+=7)for(const sd of [1,-1]){const x=a[0]+tx*d+nx*sd*3.4,y=a[1]+ty*d+ny*sd*3.4;if(napoliCell(x,y)||napoliCell(x+nx*sd*3,y+ny*sd*3))continue;cand.push([x,y,Math.atan2(tx,ty),H(x.toFixed(0)+','+y.toFixed(0))]);}}}
  cand.sort((a,b)=>a[3]-b[3]);const N=mob?12:26;const used=[];
  for(const c of cand){if(used.length>=N)break;if(used.some(u=>Math.hypot(u[0]-c[0],u[1]-c[1])<6))continue;used.push(c);const b=w.boat(c[3]%7);if(!b)continue;b.position.set(c[0],0,c[1]);b.rotation.y=c[2];b.scale.setScalar(.85);b.visible=false;Z.add(b);this.boats.push({o:b,x:c[0],z:c[1],moor:true,ph:c[3]%100/10});}
  // rotte al largo, parallele alla costa vicino al porto (lato mare = quello con meno terra calpestabile)
  try{const C=D.coast[0],cut=C.findIndex(q=>q[0]>3000),cs=cut>0?C.slice(0,cut):C,c0=[253,306];let near=cs.map((q,i)=>[Math.hypot(q[0]-c0[0],q[1]-c0[1]),i]).sort((a,b)=>a[0]-b[0])[0][1];const path=[];
   for(let i=Math.max(2,near-90);i<Math.min(cs.length-2,near+90);i+=3){const a=cs[i-2],b=cs[i+2],tx=b[0]-a[0],ty=b[1]-a[1],L=Math.hypot(tx,ty)||1,nx=-ty/L,ny=tx/L;let l1=0,l2=0;for(let k=15;k<=60;k+=9){if(napoliCell(cs[i][0]+nx*k,cs[i][1]+ny*k))l1++;if(napoliCell(cs[i][0]-nx*k,cs[i][1]-ny*k))l2++;}const s=l1<=l2?1:-1;path.push([cs[i][0]+nx*s*(80+(i%2)*0),cs[i][1]+ny*s*80]);}
   if(path.length>6){const cum=[0];for(let i=1;i<path.length;i++)cum.push(cum[i-1]+Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]));
    for(let k=0;k<(mob?2:3);k++){const b=w.boat(k+3);if(!b)continue;b.scale.setScalar(1.2);b.visible=false;Z.add(b);this.boats.push({o:b,path,cum,sp:2.6+k*.7,ph:k*cum.at(-1)/3,moor:false});}}}catch(e){console.warn('rotte',e);}}
 update(T,px,pz,dt){if(!this.built){try{this.build();}catch(e){console.warn('extra mergellina',e);this.built=true;}}
  this.t+=dt;if(this.t>.5){this.t=0;const m=this.sigMat;if(m)for(const ax of ['A','B']){const ph=signalPhase(T,ax);m[ax].r.color.set(ph==='r'?'#ff2a1a':'#3a1410');m[ax].y.color.set(ph==='y'?'#ffb300':'#3a2c08');m[ax].g.color.set(ph==='g'?'#22e06b':'#0c2a18');}}
  const fl=Math.floor(T*2.5)%2===0;for(const f of this.beacons||[])if(f.lamp)f.lamp.visible=fl;
  this.bt+=dt;if(!this.boatsBuilt&&this.bt>2){this.boatsBuilt=true;try{this.buildBoats();}catch(e){console.warn('barche',e);}}
  for(const b of this.boats){if(b.moor){const near=Math.hypot(b.x-px,b.z-pz)<220;b.o.visible=near;if(near){b.o.position.y=-.05+Math.sin(T*1.1+b.ph)*.04;b.o.rotation.z=Math.sin(T*.9+b.ph)*.025;}continue;}
   const L=b.cum.at(-1),u=((T*b.sp+b.ph)%(2*L)),s=u<L?u:2*L-u,fwd=u<L?1:-1;let i=1;while(i<b.cum.length-1&&b.cum[i]<s)i++;const A=b.path[i-1],B=b.path[i],seg=b.cum[i]-b.cum[i-1]||1,t=(s-b.cum[i-1])/seg,x=A[0]+(B[0]-A[0])*t,z=A[1]+(B[1]-A[1])*t;
   b.o.visible=Math.hypot(x-px,z-pz)<260;if(b.o.visible){b.o.position.set(x,-.05+Math.sin(T*1.3+b.ph)*.05,z);b.o.rotation.y=Math.atan2((B[0]-A[0])*fwd,(B[1]-A[1])*fwd);b.o.rotation.z=Math.sin(T*.8+b.ph)*.04;}}}
}
