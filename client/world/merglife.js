// Vita nelle strade di Mergellina (mappa vera OpenStreetMap): pedoni sui marciapiedi lungo le strade vere, passeggiata e jogging sul lungomare,
// pescatori sui pontili, gente seduta ai tavolini dei locali, fattorini che consegnano, spazzini e camion ESI, auto, furgoni e scooter.
// Costruito sopra CityLife (stesso gruppo di personaggi riutilizzati). Niente calcolo di percorsi: si cammina/guida lungo le linee delle strade
// e a ogni incrocio vero (nodo condiviso) si può cambiare strada. Chi è lontano dal giocatore sparisce e riappare vicino: pochi oggetti sempre.
import * as THREE from '../vendor/three/three.module.min.js';
import {CityLife} from './citylife.js';
import {NAPOLI,napoliStand,napoliPlaces} from '/shared/napoli.js';
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
const between=(h,a,b)=>a<=b?h>=a&&h<b:h>=a||h<b;
const hourNow=w=>((w.r2d.seconds()%2400)/2400*24);
const CAR_ROADS=new Set(['primary','secondary','tertiary','residential','unclassified','living_street','service','trunk']);
const SPEED={primary:9,trunk:10,secondary:8,tertiary:7,residential:5.5,unclassified:5.5,living_street:3,service:3};
const PROM=/Caracciolo|Partenope|Mergellina|Riviera|Eldorado|Sannazaro|Posillipo/;
const DENS={walker:h=>between(h,6.5,9.5)?1:between(h,16,19.5)?.9:between(h,9.5,16)?.5:between(h,19.5,23)?.5:.08,
 stroll:h=>between(h,15,20)?1:between(h,10,15)?.5:between(h,20,23)?.6:.08,jogger:h=>between(h,6,9)?1:between(h,17.5,20)?.7:0,
 fisher:h=>between(h,5,10)?1:between(h,17,21)?.7:between(h,10,17)?.15:.05,sitter:h=>between(h,12,15)?1:between(h,19,24)?1:between(h,8,12)?.5:between(h,15,19)?.6:.05,
 courier:h=>between(h,11,14)||between(h,18,22)?1:.2,sweeper:h=>between(h,6,12)?1:between(h,16,18)?.5:0,crew:h=>between(h,6,13)?1:0};
const COUNT={walker:[8,14],stroll:[4,6],jogger:[2,3],fisher:[3,4],sitter:[5,8],courier:[2,3],sweeper:[2,3],crew:[2,4]};
const carDensity=h=>between(h,7,9.5)||between(h,17,20)?1:between(h,9.5,17)?.72:between(h,20,23)?.55:.28;
// ---- rete stradale dalle strade vere ----
class Net{constructor(D){this.roads=[];for(const r of D.roads){const p=r.p,cum=[0];for(let k=1;k<p.length;k++)cum.push(cum[k-1]+Math.hypot(p[k][0]-p[k-1][0],p[k][1]-p[k-1][1]));if(cum.at(-1)<4)continue;this.roads.push({p,cum,len:cum.at(-1),k:r.k,w:r.w||5,ow:r.ow,name:r.name||'',car:CAR_ROADS.has(r.k)&&!r.tn&&(r.w||5)>=3,walk:r.k!=='motorway'&&r.k!=='trunk',prom:PROM.test(r.name||'')});}
  this.node=new Map();const nk=q=>Math.round(q[0]*2)+','+Math.round(q[1]*2);this.key=nk;for(const r of this.roads)r.p.forEach((q,j)=>{const k=nk(q);(this.node.get(k)||this.node.set(k,[]).get(k)).push([r,j]);});
  this.grid=new Map();for(const r of this.roads){const seen=new Set();for(let j=1;j<r.p.length;j++){const a=r.p[j-1],b=r.p[j],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/40));for(let t=0;t<=n;t++){const k=Math.floor((a[0]+(b[0]-a[0])*t/n)/100)+','+Math.floor((a[1]+(b[1]-a[1])*t/n)/100);if(!seen.has(k)){seen.add(k);(this.grid.get(k)||this.grid.set(k,[]).get(k)).push(r);}}}}}
 near(x,y,R){const out=new Set(),c=Math.ceil(R/100),cx=Math.floor(x/100),cy=Math.floor(y/100);for(let a=-c;a<=c;a++)for(let b=-c;b<=c;b++)for(const r of this.grid.get((cx+a)+','+(cy+b))||[])out.add(r);return [...out];}
 at(r,s){s=Math.max(0,Math.min(r.len,s));let lo=1;while(lo<r.cum.length-1&&r.cum[lo]<s)lo++;const a=r.p[lo-1],b=r.p[lo],seg=r.cum[lo]-r.cum[lo-1]||1,t=(s-r.cum[lo-1])/seg;return {x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,dx:(b[0]-a[0])/seg,dy:(b[1]-a[1])/seg,j:lo};}}
export class MergLife extends CityLife{
 constructor(w){super(w);this.radius=this.rcap=w.mobile?52:68;this.max=this.cap=w.mobile?8:14;this.agents=[];this.cars=[];this.tc=[];this.pool=new Map();this.built=false;this.ready=false;}
 build(){const D=NAPOLI.data;this.net=new Net(D);const m=this.w.mobile?0:1;let n=0;
  for(const [kind,cnt] of Object.entries(COUNT)){for(let k=0;k<cnt[m];k++)this.agents.push({kind,k,id:n++,u:(k+.5)/cnt[m],on:false,state:'walk',x:0,z:0,yaw:0,t:0,speed:kind==='jogger'?rnd(2.8,3.6):kind==='stroll'?rnd(.8,1.1):kind==='sweeper'?rnd(.55,.7):rnd(1.05,1.45),dir:1,side:Math.random()<.5?1:-1,acc:0,rig:null,retry:0,hide:false});}
  const nc=this.w.mobile?6:12;for(let i=0;i<nc;i++)this.cars.push({kind:['auto','auto','furgone','scooter','cabrio','scooter'][i%6],on:false,v:0,u:(i+.5)/nc,road:null,s:0,dir:1,park:0,x:0,y:0,h:0,id:i});
  this.cars.push({kind:'rifiuti',on:false,v:0,u:0,road:null,s:0,dir:1,park:0,x:0,y:0,h:0,id:99,work:true,hours:[6,13],gap:rnd(30,60)});
  for(let i=0;i<(this.w.mobile?1:2);i++)this.tc.push({path:{pointAt:()=>({x:this.truckPos?.x||0,y:this.truckPos?.y||0,direction:this.truckPos?.h||0})},s:0,side:1.4,off:true,park:null});
  this.built=true;this.ready=true;}
 // i camion ESI visti dal personale (stessa interfaccia di Traffic)
 trucks(){return this.tc;}
 // ---- posizionamento ----
 walkPos(a){const r=a.r,q=this.net.at(r,a.s),tx=q.dx*a.dir,ty=q.dy*a.dir,off=(r.car?r.w/2+1.0:r.k==='steps'?0:.6)*a.side;a.x=q.x-ty*off;a.z=q.y+tx*off;a.yaw=Math.atan2(tx,ty);return napoliStand(a.x,a.z,.3);}
 near2(a,px,pz,lo,hi){const d=Math.hypot(a.x-px,a.z-pz);return d>=lo&&d<=hi;}
 spawn(a,px,pz){const R=this.radius,N=this.net;a.on=false;a.hide=false;a.r=null;a.door=null;
  for(let tries=0;tries<10;tries++){
   if(a.kind==='sitter'){const T=(this.w.napoliTables||[]).filter(t=>Math.hypot(t[0]-px,t[1]-pz)>14&&Math.hypot(t[0]-px,t[1]-pz)<R-6);if(!T.length)return;const t=pick(T),ang=rnd(0,6.283),sx=t[0]+Math.cos(ang)*.95,sz=t[1]+Math.sin(ang)*.95;if(!napoliStand(sx,sz,.3)||this.agents.some(o=>o!==a&&o.on&&o.state==='sit'&&Math.hypot(o.x-sx,o.z-sz)<.9))continue;Object.assign(a,{on:true,state:'sit',x:sx,z:sz,yaw:Math.atan2(t[0]-sx,t[1]-sz),act:'Idle',t:rnd(40,120)});return;}
   if(a.kind==='fisher'){const P=(NAPOLI.data.piers||[]).filter(p=>p.k==='pier'||p.k==='quay'||p.k==='breakwater');const cand=[];for(const p of P)for(let i=1;i<p.p.length;i++){const m=[(p.p[i][0]+p.p[i-1][0])/2,(p.p[i][1]+p.p[i-1][1])/2],d=Math.hypot(m[0]-px,m[1]-pz);if(d>16&&d<R-6)cand.push([p.p[i-1],p.p[i]]);}if(!cand.length)return;const [A,B]=pick(cand),t=Math.random(),x=A[0]+(B[0]-A[0])*t,y=A[1]+(B[1]-A[1])*t,L=Math.hypot(B[0]-A[0],B[1]-A[1])||1;for(const sg of [1,-1]){const nx=-(B[1]-A[1])/L*sg,ny=(B[0]-A[0])/L*sg,sx=x+nx*.9,sz=y+ny*.9;if(napoliStand(sx,sz,.3)&&!napoliStand(x+nx*5,y+ny*5,.3)&&!this.agents.some(o=>o!==a&&o.on&&o.state==='fish'&&Math.hypot(o.x-sx,o.z-sz)<5)){Object.assign(a,{on:true,state:'fish',x:sx,z:sz,yaw:Math.atan2(nx,ny),act:'Idle',t:rnd(60,200)});return;}}continue;}
   if(a.kind==='courier'){const D=napoliPlaces().doors.filter(d=>Math.hypot(d.x-px,d.y-pz)<R-8&&Math.hypot(d.x-px,d.y-pz)>20);if(!D.length)return;const d=pick(D),ang=rnd(0,6.283),L=rnd(22,40),sx=d.x+Math.cos(ang)*L,sz=d.y+Math.sin(ang)*L;let ok=napoliStand(sx,sz,.3);for(let k=1;k<12&&ok;k++)ok=napoliStand(sx+(d.x-sx)*k/12,sz+(d.y-sz)*k/12,.3);if(!ok||Math.hypot(sx-px,sz-pz)<12)continue;Object.assign(a,{on:true,state:'toDoor',x:sx,z:sz,door:{x:d.x,y:d.y},start:{x:sx,y:sz},act:'Walk',speed:1.7,yaw:0});return;}
   // camminatori su strada
   const roads=N.near(px,pz,R).filter(r=>r.walk&&(a.kind==='walker'||a.kind==='sweeper'?r.len>12:r.prom||a.kind!=='stroll'&&a.kind!=='jogger'));const pr=roads.filter(r=>r.prom);const list=(a.kind==='stroll'||a.kind==='jogger')&&pr.length?pr:roads;if(!list.length)return;const r=pick(list);a.r=r;a.s=rnd(0,r.len);a.dir=Math.random()<.5?1:-1;if(!this.walkPos(a)||!this.near2(a,px,pz,14,R-6)){a.r=null;continue;}a.on=true;a.state='walk';a.act=a.kind==='jogger'?'Run':a.kind==='walker'&&a.speed>1.3?'Walk':'Stroll';a.hold=0;return;}}
 // ---- passo di ogni abitante ----
 step(a,dt){
  if(a.state==='crew'||a.state==='party'||a.state==='wait'||a.state==='chat')return super.step(a,dt);
  if(a.state==='sit'||a.state==='fish'){a.t-=dt;a.act='Idle';if(a.t<=0)a.on=false;return;}
  if(a.state==='in'){a.t-=dt;if(a.t<=0){a.state='leave';a.x=a.door.x;a.z=a.door.y;a.on=true;}return;}
  if(a.state==='toDoor'||a.state==='leave'){const tg=a.state==='toDoor'?a.door:a.start,dx=tg.x-a.x,dz=(tg.y)-a.z,d=Math.hypot(dx,dz),v=Math.min(d,a.speed*dt);a.act='Walk';if(d>1e-6){a.x+=dx/d*v;a.z+=dz/d*v;a.yaw=Math.atan2(dx,dz);}
   if(d<.15){if(a.state==='toDoor'){a.state='in';a.t=rnd(12,30);this.release(a);}else a.on=false;}return;}
  // camminata lungo la strada
  const r=a.r;if(!r){a.on=false;return;}const prev=a.s;a.s+=a.dir*a.speed*dt;
  // incroci: ai nodi condivisi si può cambiare strada; alla fine della strada si gira o si prosegue su un'altra
  let cross=null;for(let j=1;j<r.cum.length-1;j++){const c=r.cum[j];if((prev<c&&a.s>=c)||(prev>c&&a.s<=c)){cross=j;break;}}if(a.s<=0&&a.dir<0)cross=0;if(a.s>=r.len&&a.dir>0)cross=r.p.length-1;
  if(cross!==null){const nodes=(this.net.node.get(this.net.key(r.p[cross]))||[]).filter(([o])=>o!==r&&o.walk);const end=cross===0||cross===r.p.length-1;
   if(nodes.length&&(end||Math.random()<.35)){const [o,j]=pick(nodes);a.r=o;a.s=o.cum[j];a.dir=j===0?1:j===o.p.length-1?-1:Math.random()<.5?1:-1;}else if(end){a.dir=-a.dir;a.s=Math.max(0,Math.min(r.len,a.s));}}
  if(!this.walkPos(a)){a.side=-a.side;if(!this.walkPos(a)){a.dir=-a.dir;a.on=false;}}}
 // ---- auto, furgoni, scooter, camion ESI ----
 mesh(c){const w=this.w;let m=c.mesh;if(m)return m;const pool=this.pool.get(c.kind)||[];m=pool.pop();if(!m){const col=['#c7ccd4','#0d2a5c','#7a0c14','#f5f5f4','#1f3b2f','#d4a73a','#3b3f47','#e8e2d0'][c.id%8];m=c.kind==='rifiuti'?w.garbageTruck():c.kind==='scooter'?w.trafficScooter(col):w.car(c.kind==='furgone'?'suv':c.kind==='cabrio'?'super':'sedan',col,false);this.group.add(m);}m.visible=true;c.mesh=m;return m;}
 freeMesh(c){if(!c.mesh)return;c.mesh.visible=false;(this.pool.get(c.kind)||this.pool.set(c.kind,[]).get(c.kind)).push(c.mesh);c.mesh=null;}
 spawnCar(c,px,pz){const N=this.net,R=this.radius+55;const roads=N.near(px,pz,R).filter(r=>r.car&&r.w>=(c.kind==='scooter'?3:5)&&r.len>25);if(!roads.length)return;
  for(let t=0;t<8;t++){const r=pick(roads),s=rnd(0,r.len),q=N.at(r,s),d=Math.hypot(q.x-px,q.y-pz);if(d<30||d>R-10)continue;if(this.cars.some(o=>o!==c&&o.on&&Math.hypot(o.x-q.x,o.y-q.y)<14))continue;c.road=r;c.s=s;c.dir=r.ow?1:Math.random()<.5?1:-1;c.v=0;c.park=0;c.on=true;this.place(c);return;}}
 place(c){const r=c.road,q=this.net.at(r,c.s),tx=q.dx*c.dir,ty=q.dy*c.dir,off=r.ow?0:r.w/4;c.x=q.x-ty*off;c.y=q.y+tx*off;c.h=Math.atan2(ty,tx);}
 stepCar(c,dt,h,px,pz){const r=c.road;if(!r){c.on=false;return;}
  if(c.park>0){c.park-=dt;c.v=Math.max(0,c.v-8*dt);}
  else{let lim=(SPEED[r.k]||5)*(c.kind==='rifiuti'?.55:c.kind==='scooter'?1.15:1);
   for(const o of this.cars){if(o===c||!o.on||o.road!==r||o.dir!==c.dir)continue;const gap=(o.s-c.s)*c.dir;if(gap>0&&gap<10)lim=Math.min(lim,Math.max(0,(gap-4.5)*1.3));}
   if(Math.hypot(c.x-px,c.y-pz)<7){const dx=px-c.x,dy=px===undefined?0:pz-c.y,ah=Math.cos(c.h)*dx+Math.sin(c.h)*dy;if(ah>0&&ah<9)lim=Math.min(lim,Math.max(0,(ah-3.5)*1.2));}
   c.v+=Math.max(-9*dt,Math.min(3*dt,lim-c.v));
   if(c.work||Math.random()<.0015){c.gap=(c.gap??40)-c.v*dt;if(c.work?c.gap<=0:r.w>=6&&c.v>2){c.park=c.work?rnd(6,10):rnd(5,12);c.gap=rnd(35,70);}}}
  const prev=c.s;c.s+=c.dir*c.v*dt;let cross=null;for(let j=1;j<r.cum.length-1;j++){const k=r.cum[j];if((prev<k&&c.s>=k)||(prev>k&&c.s<=k)){cross=j;break;}}if(c.s<=0&&c.dir<0)cross=0;if(c.s>=r.len&&c.dir>0)cross=r.p.length-1;
  if(cross!==null){const nodes=(this.net.node.get(this.net.key(r.p[cross]))||[]).filter(([o])=>o!==r&&o.car&&(!o.ow||true));const end=cross===0||cross===r.p.length-1;
   if(nodes.length&&(end||Math.random()<.3)){const [o,j]=pick(nodes);c.road=o;c.s=o.cum[j];c.dir=o.ow?1:j===0?1:j===o.p.length-1?-1:Math.random()<.5?1:-1;if(o.ow&&j===o.p.length-1){c.on=false;}}else if(end){if(r.ow)c.on=false;else{c.dir=-c.dir;c.s=Math.max(0,Math.min(r.len,c.s));}}}
  if(c.on)this.place(c);}
 // ---- ciclo principale ----
 update(dt,list){const w=this.w;if(!this.built){if(!this.bad){try{this.build();}catch(e){this.bad=1;console.warn('merglife',e);}}if(!this.ready)return;}
  this.group.visible=true;const h=hourNow(w),px=w.target.x,pz=w.target.z;
  this.ema=(this.ema??dt)*.96+Math.min(dt,.2)*.04;this.qt=(this.qt||0)+dt;if(this.qt>2.5){this.qt=0;if(this.ema>.046&&this.max>4){this.max--;this.radius=Math.max(34,this.radius-3);}else if(this.ema<.03&&this.max<this.cap){this.max++;this.radius=Math.min(this.rcap,this.radius+3);}}
  // abitanti: si accendono vicino al giocatore secondo l'ora, si spengono se lontani o fuori orario
  let tries=2;for(const a of this.agents){if(a.manual)continue;if(a.kind==='crew'){const T=this.cars.find(c=>c.kind==='rifiuti'&&c.on);if(!T&&a.on){a.on=false;this.release(a);}if(T&&!a.on&&a.u<(DENS.crew(h))){Object.assign(a,{on:true,state:'crew',hide:true,truck:this.tc[Math.floor(a.k/2)]||null});if(!a.truck)a.on=false;}continue;}
   const want=a.u<(DENS[a.kind](h)*(this.weather??1));const far=Math.hypot(a.x-px,a.z-pz)>this.radius*1.15;
   if(a.on&&a.state!=='in'&&(far||!want&&!a.rig)){a.on=false;this.release(a);}
   else if(!a.on&&a.state!=='in'&&want&&tries>0){a.retry-=dt;if(a.retry<=0){a.retry=rnd(.6,1.6);tries--;this.spawn(a,px,pz);}}}
  for(const a of this.agents){if(!a.on&&a.state!=='in')continue;if(a.talk>0){a.talk-=dt;a.act='Wave';}else this.step(a,dt);}
  // veicoli
  const dens=carDensity(h);let ct=1;for(const c of this.cars){const want=c.kind==='rifiuti'?between(h,6,13):c.u<dens;const far=Math.hypot(c.x-px,c.y-pz)>this.radius+110;
   if(c.on&&(far||!want)){c.on=false;this.freeMesh(c);}else if(!c.on&&want&&ct>0&&(c.retry=(c.retry||0)-dt)<=0){c.retry=rnd(1,3);ct--;this.spawnCar(c,px,pz);}
   if(c.on){this.stepCar(c,dt,h,px,pz);if(c.on){const m=this.mesh(c);m.position.set(c.x,w.lev(c.x,c.y),c.y);m.rotation.y=w.hd(c.h);if(m.userData.beacon)m.userData.beacon.material.color.setHex(Math.floor(w.clock*3)%2?0xffb300:0x4a3000);if(c.kind==='rifiuti'){this.truckPos={x:c.x,y:c.y,h:c.h};const T=this.tc[0];T.s=0;T.off=false;T.park=c.park>0?{}:null;T.side=c.road&&!c.road.ow?c.road.w/4+1.4:1.4;}}else this.freeMesh(c);}}
  const tr=this.cars.find(c=>c.kind==='rifiuti');if(!tr?.on)for(const T of this.tc){T.off=true;T.park=null;}
  this.bins();this.assign(px,pz,dt);this.props();}
 // oggetti in mano: canna da pesca ai pescatori, pacco ai fattorini (si accendono secondo chi usa quel personaggio)
 props(){for(const a of this.agents){const r=a.rig;if(!r?.o||r.type!=='gen')continue;if(!r.pp){r.pp=true;const root=r.o.root,hand=root.getObjectByName('Bip01_R_Hand'),sp=root.getObjectByName('Bip01_Spine1');
   if(hand){const g=new THREE.Group(),m=new THREE.Mesh(new THREE.CylinderGeometry(.5,.9,190,5).rotateZ(Math.PI/2),new THREE.MeshStandardMaterial({color:'#2b2b2b'}));m.position.set(60,0,0);g.add(m);g.rotation.z=.9;g.visible=false;hand.add(g);r.rod=g;}
   if(sp){const bx=new THREE.Mesh(new THREE.BoxGeometry(34,30,38),new THREE.MeshStandardMaterial({color:'#b8793a'}));bx.position.set(-2,22,0);bx.visible=false;sp.add(bx);r.box=bx;}}
  if(r.rod)r.rod.visible=a.kind==='fisher';if(r.box)r.box.visible=a.kind==='courier';}}
 activeKinds(){return this.agents.filter(a=>a.on).length;}
 hide(){this.group.visible=false;}
}
