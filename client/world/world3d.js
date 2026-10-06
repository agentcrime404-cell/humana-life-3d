// Mondo 3D (prova): stessa città, stessi giocatori e stesso server, ma visti in 3D con la telecamera che gira a 360°.
// Coordinate: il mondo di gioco (x, y) in metri diventa (X = x, Z = y) in three.js, con Y verso l'alto.
const FIG=1.3/83; // metri per punto della figura 2D
import * as THREE from '../vendor/three/three.module.min.js';
import {GLTFLoader} from '../vendor/three/GLTFLoader.js';
import {clone as cloneSkinned} from '../vendor/three/SkeletonUtils.js';
import {RGBELoader} from '../vendor/three/RGBELoader.js';import {mergeGeometries} from '../vendor/three/BufferGeometryUtils.js';import {OutlineEffect} from '../vendor/three/OutlineEffect.js';
import {MAPS,MODE,F,doors,cityEdge,SHORE,BEACH} from '/shared/world.js';
import {JUKEBOX,DEALERS,VEHICLES_3D,MALL_SHOPS,BOATS} from '/shared/catalog.js';import {LOOKS} from '/shared/looks.js';import {avatarSpec,buildAvatar,poseAvatar} from './avatar3d.js';import {surface,STREETS,busPosition,VILLA_LOTS,FENCE_GATES,LANDMARKS} from '/shared/district.js';import {Traffic} from '/shared/traffic.js';import {VEHICLE} from '/shared/catalog.js';import {NAPOLI,napoliStand,napoliCell,napoliPlaces} from '/shared/napoli.js';

const GROUND={grass:'#7fae5a',garden:'#7c9959',track:'#c0573f',playground:'#e58a4e',parking:'#5f5e68',pool:'#4fc3e0',road:'#55545d',roadline:'#5d5c66',crosswalk:'#e9e9e9',curb:'#bfb7aa',cobble:'#77716a',dirt:'#a7845c',rock:'#8b8a86',snow:'#f4f7fa',water:'#3d9bd0',tiles:'#ddd6ca',marble:'#ece8e1',sand:'#ead39f',wood:'#a8774f',stone:'#c9c2b6',sidewalk:'#c4bdb1'};
const CHARS=['male-a','male-b','male-c','male-d','male-e','male-f','female-a','female-b','female-c','female-d','female-e','female-f'];
const CARS={auto:['car/sedan.glb',4.2],furgone:['car/van.glb',4.8],cabrio:['car/sedan-sports.glb',4.3],scooter:['car/kart-oobi.glb',1.9],bici:['car/kart-oodi.glb',1.7],monopattino:['car/kart-ooli.glb',1.5]};
const hash=s=>{let h=0;for(const ch of String(s))h=(h*31+ch.charCodeAt(0))|0;return Math.abs(h);};
const heading=d=>Math.PI/2-d;

export class World3D{
 constructor(base2d){
  this.r2d=base2d;this.toon=false;this.gfx=(()=>{let g=null;try{g=localStorage.getItem('humana-gfx');}catch{}if(g==='toon')g='min';return ['min','med','high','ultra'].includes(g)?g:matchMedia('(pointer:coarse)').matches?'med':'high';})();this.lite=this.gfx==='min';document.body.classList.add('is3d');if(this.lite)this.scale=.72;this.yaw=0;this.pitch=0;this.walkMode=(()=>{try{const v=localStorage.getItem('humana-cam');return ['25d','third','first'].includes(v)?v:'third';}catch{return 'third';}})();this.carMode='car-chase';this.camEye=new THREE.Vector3(0,30,30);this.camLook=new THREE.Vector3();this.solid=[];this.ray=new THREE.Raycaster();this.snap=true;this.autoYaw=true;this.players=new Map();this.sig='';this.hit=[];this.target=new THREE.Vector3();this.ready=false;
  const canvas=this.canvas=document.createElement('canvas');canvas.id='world3d';canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;display:none;z-index:0';
  document.getElementById('world').before(canvas);
  // Grafica minima: come su un telefono lento (niente ombre vere, materiali semplici, meno oggetti, risoluzione più bassa).
  const mobile=this.gfx==='min'||this.gfx==='med';this.mobile=mobile;
  this.gl=new THREE.WebGLRenderer({canvas,antialias:!mobile,powerPreference:'high-performance'});this.gl.setPixelRatio(Math.min(devicePixelRatio,mobile?1.25:2));
  this.gl.shadowMap.enabled=!mobile;this.gl.shadowMap.type=THREE.PCFShadowMap;this.gl.outputColorSpace=THREE.SRGBColorSpace;this.gl.toneMapping=THREE.ACESFilmicToneMapping;this.gl.toneMappingExposure=.95;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#9fd3f2');this.scene.fog=new THREE.Fog('#b9def3',140,520);
  this.camera=new THREE.PerspectiveCamera(50,1,.3,1500);
  this.hemi=new THREE.HemisphereLight('#e8f4ff','#6b7d55',.55);this.scene.add(this.hemi);
  // Grafica realistica: cielo fotografico (CC0) usato come sfondo e come luce d'ambiente con i suoi riflessi.
  if(!this.toon)new RGBELoader().load(this.url('sky/kloofendal_48d_partly_cloudy_puresky.hdr'),hdr=>{const pm=new THREE.PMREMGenerator(this.gl);this.scene.environment=pm.fromEquirectangular(hdr).texture;pm.dispose();hdr.mapping=THREE.EquirectangularReflectionMapping;this.hdr=hdr;
   // Dove sta il sole nella foto del cielo (il punto più luminoso): la luce del gioco arriva da lì, così ombre e cielo vanno d'accordo.
   {const d=hdr.image.data,W=hdr.image.width,H=hdr.image.height;let best=0,bu=0,bv=0;for(let y=0;y<H;y+=3)for(let x=0;x<W;x+=3){const i=(y*W+x)*4,l=d[i]+d[i+1]+d[i+2];if(l>best){best=l;bu=x;bv=y;}}
    const phi=((bu+.5)/W-.5)*Math.PI*2,th=Math.max(.55,Math.min(1.15,Math.abs((.5-(bv+.5)/H)*Math.PI)));this.hdrSun=new THREE.Vector3(Math.cos(th)*Math.cos(phi),Math.sin(th),Math.cos(th)*Math.sin(phi));}
   this.env();});
  const sun=this.sun=new THREE.DirectionalLight('#fff1d6',2.6);sun.castShadow=!mobile;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-60,right:60,top:60,bottom:-60,near:1,far:220});sun.shadow.normalBias=.06;sun.shadow.bias=-.0005;if(!this.toon){sun.shadow.radius=2.5;this.gl.toneMappingExposure=.98;}this.gl.shadowMap.autoUpdate=false;this.scene.add(sun,sun.target);
  // Stile cartone: luce a 3 gradini (come nei cartoni animati) e contorno nero attorno a ogni oggetto.
  {const g=new THREE.DataTexture(new Uint8Array([90,90,90,255,175,175,175,255,255,255,255,255]),3,1);g.minFilter=g.magFilter=THREE.NearestFilter;g.needsUpdate=true;this.grad=g;}
  this.outline=new OutlineEffect(this.gl,{defaultThickness:.0045,defaultColor:[.08,.06,.05]});this.toonMats=new Map();
  if(this.toon)this.gl.toneMapping=THREE.NoToneMapping;this.scene.background=this.outBg=new THREE.Color('#cfe9fb');this.scene.fog.color.set('#cfe9fb');
  this.static=new THREE.Group();this.scene.add(this.static);this.dynamic=new THREE.Group();this.scene.add(this.dynamic);this.zones=new Map();this.glow=new Set();this.poolM=[];this.sunDir=new THREE.Vector3(40,70,25).normalize();this.tint=new THREE.Color('#ffffff');this.skyInit();this.preload().then(()=>{const z=this.zones.get('lungomare');if(z){z.sig=null;if(this.cur===z)this.sig=null;}});
  // Solo in locale: maniglia per le prove dal browser.
  if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname))window.__w3=this;
  this.loader=new GLTFLoader();this.cache=new Map();this.clock=0;
  // Cruscotto dell'abitacolo: volante e plancia davanti alla telecamera.
  {const d=this.dash=new THREE.Group(),m=new THREE.MeshLambertMaterial({color:'#1f2328'});const board=new THREE.Mesh(new THREE.BoxGeometry(1.6,.25,.5),m);board.position.set(0,-.55,-.9);const wheel=new THREE.Mesh(new THREE.TorusGeometry(.19,.025,8,24),new THREE.MeshLambertMaterial({color:'#111'}));wheel.position.set(-.32,-.38,-.62);wheel.rotation.x=-.35;d.add(board,wheel);d.visible=false;this.scene.add(d);}
  this.resize();addEventListener('resize',()=>this.resize());
  this.controls();
 }
 resize(){this.w=innerWidth;this.h=innerHeight;this.gl.setSize(this.w,this.h,false);this.camera.aspect=this.w/this.h;this.camera.updateProjectionMatrix();}
 // Asset del mondo in /assets/world/napoli/<categoria>/ (licenze in LICENZE.md). I percorsi brevi del codice vengono tradotti qui.
 url(p){const N={'car/':'vehicles/kenney-car-kit/','chars/':'characters/kenney-mini-characters/','people/':'characters/','city/':'buildings/kenney-city-commercial/','sub/':'buildings/kenney-city-suburban/','roads/':'street_furniture/kenney-roads/','furn/':'street_furniture/kenney-furniture/','nature/':'vegetation/kenney-nature/','alberi/':'vegetation/alberi-veri/sagome/','tex/waternormals':'textures/threejs/waternormals','tex/':'textures/polyhaven/','sky/':'lighting/sky/'};
  const PH={street_lamp_01:'street_furniture',street_lamp_02:'street_furniture',modular_street_seating:'street_furniture',outdoor_table_chair_set_01:'bars',round_wooden_table_01:'bars',bar_chair_round_01:'bars',CoffeeCart_01:'bars',wine_barrel_01:'restaurants',potted_plant_01:'vegetation',potted_plant_02:'vegetation',planter_pot_clay:'vegetation',planter_box_01:'vegetation'};
  let q=p;if(p.startsWith('ph/')){const id=p.split('/')[1];q=PH[id]+'/'+p.slice(3);}else for(const [k,v] of Object.entries(N))if(p.startsWith(k)){q=v+p.slice(k.length);break;}
  return (this.r2d.assetBase||'')+'/assets/world/napoli/'+q;}
 load(p){if(!this.cache.has(p))this.cache.set(p,new Promise(ok=>this.loader.load(this.url(p),g=>{g.scene.traverse(o=>{if(o.isMesh){o.castShadow=!this.mobile;o.receiveShadow=true;}});ok(g);},undefined,()=>ok(null))));return this.cache.get(p);}
 // Copia di un modello, ridimensionata: {height} oppure {length} (lato più lungo) oppure {w,d} (impronta a terra).
 async model(p,size,skinned=false){const g=await this.load(p);if(!g)return null;const o=skinned?cloneSkinned(g.scene):g.scene.clone(true);const box=new THREE.Box3().setFromObject(o),s=box.getSize(new THREE.Vector3());
  let k=1;if(size.height)k=size.height/s.y;else if(size.length)k=size.length/Math.max(s.x,s.z);
  const wrap=new THREE.Group();o.position.set(-(box.min.x+box.max.x)/2,-box.min.y,-(box.min.z+box.max.z)/2);wrap.add(o);
  if(size.w){wrap.scale.set(size.w/s.x,size.h3?size.h3/s.y:Math.min(size.w/s.x,size.d/s.z)*1.15,size.d/s.z);}else wrap.scale.setScalar(k);
  const outer=new THREE.Group();outer.add(wrap);outer.userData.clips=g.animations;return outer;}
 // Comandi della telecamera: Q / E, tasto destro trascinato, due dita che ruotano, pulsanti ⟲ ⟳.
 controls(){
  addEventListener('keydown',e=>{if(!this.active||e.target.closest?.('input,textarea'))return;if(e.key==='q'||e.key==='Q'){this.spin=-1;this.autoYaw=false;}if(e.key==='e'||e.key==='E'){this.spin=1;this.autoYaw=false;}});
  addEventListener('keyup',e=>{if(e.key==='q'||e.key==='Q'||e.key==='e'||e.key==='E')this.spin=0;});
  const world=document.getElementById('world');let drag=null,twist=null;
  world.addEventListener('contextmenu',e=>{if(this.active)e.preventDefault();});
  world.addEventListener('pointerdown',e=>{if(this.active&&e.button===2){drag=e.clientX;this.autoYaw=false;}});
  {let L=null;const end=()=>{if(L){clearTimeout(L.tm);if(L.mode)this.suppressClick=performance.now();L=null;this.hold=null;}};
   world.addEventListener('pointerdown',e=>{if(!this.active||e.button!==0||e.pointerType!=='mouse'||e.target!==world&&e.target.tagName!=='CANVAS')return;end();try{world.setPointerCapture(e.pointerId);}catch{}const l=L={x0:e.clientX,y0:e.clientY,x:e.clientX,y:e.clientY,mode:null,t:performance.now()};l.tm=setTimeout(()=>{if(L===l&&!l.mode){l.mode='run';this.hold={x:l.x,y:l.y};}},240);});
   this.holdCheck=()=>{if(L&&L.mode==='run'&&(!document.hasFocus()||document.hidden))end();};
   addEventListener('pointermove',e=>{if(!L)return;if(!(e.buttons&1)){end();return;}if(!L.mode&&Math.hypot(e.clientX-L.x0,e.clientY-L.y0)>8){L.mode='rot';clearTimeout(L.tm);this.autoYaw=false;}
    if(L.mode==='rot'){this.yaw-=(e.clientX-L.x)*.006;this.pitch=Math.max(-.6,Math.min(.6,this.pitch-(e.clientY-L.y)*.004));}L.x=e.clientX;L.y=e.clientY;if(L.mode==='run')this.hold={x:L.x,y:L.y};});
   for(const ev of ['pointerup','pointercancel','lostpointercapture','mouseup','contextmenu'])addEventListener(ev,end,true);addEventListener('blur',end);document.addEventListener('visibilitychange',end);document.addEventListener('mouseleave',end);}
  addEventListener('pointermove',e=>{if(drag!==null){this.yaw-=(e.clientX-drag)*.006;drag=e.clientX;if(this.lastY!=null)this.pitch=Math.max(-.6,Math.min(.6,this.pitch-(e.clientY-this.lastY)*.004));this.lastY=e.clientY;}});
  addEventListener('pointerup',()=>{drag=null;this.lastY=null;});
  const ang=t=>Math.atan2(t[1].clientY-t[0].clientY,t[1].clientX-t[0].clientX);
  let twoX=null;const midX=t=>(t[0].clientX+t[1].clientX)/2;
  world.addEventListener('touchstart',e=>{if(this.active&&e.touches.length===2){twist=ang(e.touches);twoX=midX(e.touches);}},{passive:true});
  world.addEventListener('touchmove',e=>{if(twist!==null&&e.touches.length===2){const a=ang(e.touches),x=midX(e.touches);this.yaw-=(a-twist)+(x-twoX)*.006;twist=a;twoX=x;this.autoYaw=false;}},{passive:true});
  world.addEventListener('touchend',e=>{if(e.touches.length<2)twist=null;});
  // Telefono: un dito che scorre sullo schermo (fuori da joystick e bottoni) gira la visuale, anche mentre l'altro pollice tiene premuto il joystick.
  // Con due dita sullo schermo resta il gesto "ruota" di sopra, così i due movimenti non si sommano.
  {const T=new Map();
   world.addEventListener('pointerdown',e=>{if(!this.active||e.pointerType!=='touch'||e.target!==world&&e.target.tagName!=='CANVAS')return;T.set(e.pointerId,{x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY,moved:false});});
   addEventListener('pointermove',e=>{const t=T.get(e.pointerId);if(!t)return;const dx=e.clientX-t.x,dy=e.clientY-t.y;t.x=e.clientX;t.y=e.clientY;if(!t.moved){if(Math.hypot(e.clientX-t.x0,e.clientY-t.y0)<8)return;t.moved=true;}this.suppressClick=performance.now();if(T.size===1){this.yaw-=dx*.006;this.pitch=Math.max(-.6,Math.min(.6,this.pitch-dy*.004));this.autoYaw=false;}});
   for(const ev of ['pointerup','pointercancel'])addEventListener(ev,e=>{T.delete(e.pointerId);},true);}
  const bar=this.bar=document.createElement('div');bar.id='cam3d';bar.hidden=true;
  const f=document.createElement('button');f.type='button';f.textContent='🎥';f.setAttribute('aria-label','Cambia telecamera (C)');f.onclick=()=>this.cycle();bar.append(f);const tv=document.createElement('button');tv.type='button';tv.textContent='🗺️';tv.setAttribute('aria-label','Vai a Mergellina / torna al Lungomare');tv.onclick=()=>{dispatchEvent(new CustomEvent('humana-travel',{detail:this.room==='mergellina'?'lungomare':'mergellina'}));this.camLabel.textContent=this.room==='mergellina'?'Lungomare…':'Mergellina…';};bar.append(tv);this.travelBtn=tv;{const gf=document.createElement('button');gf.type='button';gf.textContent={min:'⚡',med:'✨',high:'💎',ultra:'🎬'}[this.gfx];gf.title='Grafica: '+{min:'Bassa (telefoni lenti)',med:'Media (telefoni)',high:'Alta (PC)',ultra:'Ultra (PC potenti: immagine più nitida e contrastata)'}[this.gfx]+' — tocca per cambiare';gf.setAttribute('aria-label',gf.title);gf.onclick=()=>{try{localStorage.setItem('humana-gfx',{min:'med',med:'high',high:'ultra',ultra:'min'}[this.gfx]);}catch{}location.reload();};bar.append(gf);}this.camLabel=document.createElement('small');this.camLabel.className='cam-label';bar.append(this.camLabel);
  addEventListener('keydown',e=>{if(this.active&&(e.key==='c'||e.key==='C')&&!e.target.closest?.('input,textarea'))this.cycle();});
  document.body.append(bar);
 }
 mode(me){this.inCar=!!me.vehicle;return this.inCar?this.carMode:this.walkMode;}
 cycle(){const W=['25d','third','first'],C=['car-chase','car-orbit','car-hood','car-cockpit'],N={'25d':'2.5D','third':'Terza persona','first':'Prima persona','car-chase':'Dietro l’auto','car-orbit':'Esterna','car-hood':'Cofano','car-cockpit':'Abitacolo'};
  if(this.inCar)this.carMode=C[(C.indexOf(this.carMode)+1)%C.length];else{this.walkMode=W[(W.indexOf(this.walkMode)+1)%W.length];try{localStorage.setItem('humana-cam',this.walkMode);}catch{}}this.autoYaw=true;const m=this.inCar?this.carMode:this.walkMode;this.camLabel.textContent=N[m];clearTimeout(this.lt);this.lt=setTimeout(()=>this.camLabel.textContent='',1800);}
 // Joystick/tastiera: "su" va sempre avanti rispetto alla telecamera.
 worldInput(input){const sx=(input.x-input.y)/Math.SQRT2,sy=(input.x+input.y)/Math.SQRT2,c=Math.cos(this.yaw),s=Math.sin(this.yaw);return {...input,x:c*sx+s*sy,y:-s*sx+c*sy};}
 screenToWorld(X,Y){const v=new THREE.Vector3((X/this.w)*2-1,-(Y/this.h)*2+1,.5).unproject(this.camera),o=this.camera.position,dir=v.sub(o).normalize();if(Math.abs(dir.y)<1e-4)return {x:o.x,y:o.z};const t=-o.y/dir.y;if(t<0||t>600)return {x:this.target.x,y:this.target.z};return {x:o.x+dir.x*t,y:o.z+dir.z*t};}
 show(on){this.active=on;this.canvas.style.display=on?'block':'none';this.bar.hidden=!on;document.getElementById('world').style.opacity=on?'0':'';}
 // ---- Città (si ricostruisce quando cambiano mappa o modifiche dell'editor) ----
 // Materiali realistici (Poly Haven, CC0): colore, rilievo e ruvidità; "size" = metri coperti da una ripetizione.
 tex(id,name){const k=id+'/'+name;(this.texCache??=new Map());if(!this.texCache.has(k)){const t=new THREE.TextureLoader().load(this.url('tex/'+id+'/'+name+'.jpg'));t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;if(name==='diff')t.colorSpace=THREE.SRGBColorSpace;this.texCache.set(k,t);}return this.texCache.get(k);}
 pbr(id,opts={}){(this.matCache??=new Map());const k=id+JSON.stringify(opts);if(!this.matCache.has(k))this.matCache.set(k,new THREE.MeshStandardMaterial({map:this.tex(id,'diff'),normalMap:this.tex(id,'nor'),roughnessMap:this.tex(id,'rough'),roughness:1,metalness:0,...opts}));return this.matCache.get(k);}
 img(id){(this.imgCache??=new Map());if(!this.imgCache.has(id))this.imgCache.set(id,new Promise(ok=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>ok(i);i.onerror=()=>ok(null);i.src=this.url('tex/'+id+'/diff.jpg');}));return this.imgCache.get(id);}
 async preload(){if(this.pre)return this.pre;return this.pre=Promise.all(['yellow_plaster','red_plaster_weathered','painted_plaster_wall','white_plaster_rough_01','worn_plaster_wall','volcanic_rock_tiles'].map(async id=>[id,await this.img(id)])).then(async l=>{this.imgs=Object.fromEntries(l);const fc=await Promise.all([0,1,2,3,4,5,6,7].map(n=>new Promise(ok=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>ok(null);i.src=this.url('sky/').replace('lighting/sky/','buildings/facciate/'+(n<4?'partenope-':'caracciolo-')+n%4+'.jpg');})));this.fac=fc.every(Boolean)?fc:null;});}
 // Ogni zona (Lungomare, Mergellina, ogni locale) si costruisce una volta sola e poi viene solo mostrata o nascosta:
 // entrare e uscire da un locale non ricostruisce più la città (niente scatti e niente memoria sprecata).
 swap(){const ZK=['solid','groundY','onRoad','boats','fx','center','roadGrid','foam','col','lod'],old=this.cur;if(old){for(const k of ZK)old[k]=this[k];old.g.visible=false;}
  let z=this.zones.get(this.room);if(z&&z.sig!==this.sig){z.dead=true;this.scene.remove(z.g);this.zones.delete(this.room);z=null;}
  if(z){this.cur=z;this.static=z.g;for(const k of ZK)this[k]=z[k];z.g.visible=true;}
  else{z=this.cur={g:new THREE.Group(),sig:this.sig,room:this.room,solid:[]};this.zones.set(this.room,z);this.scene.add(z.g);this.static=z.g;this.solid=z.solid;this.groundY=0;this.onRoad=null;this.fx=null;this.foam=null;this.boats=[];this.col={c:[],r:[]};this.lod=null;this.rebuildNow(z);this.fpsT=-8;this.fpsN=0;
   // Al massimo 6 locali in memoria: i più vecchi vengono liberati.
   const ins=[...this.zones.values()].filter(q=>q!==z&&this.indoor(q.room));while(ins.length>6){const q=ins.shift();q.dead=true;this.scene.remove(q.g);this.zones.delete(q.room);q.g.traverse(o=>{if(!o.isMesh)return;o.geometry.dispose();for(const mt of [].concat(o.material)){mt.map?.dispose();mt.dispose();}});}}
  this.env();}
 // Atmosfera della zona: dentro i locali niente cielo e luce fissa; fuori nebbia e distanza visibile della zona, luce secondo l'ora.
 env(){const inR=this.indoor(this.room),big=this.room==='mergellina';this.skyG.visible=!inR;this.dome.visible=this.toon||!this.hdr;this.scene.background=inR?(this.inBg??=new THREE.Color('#151823')):!this.toon&&this.hdr?this.hdr:this.outBg;
  this.scene.fog.near=inR?80:big?420:140;this.scene.fog.far=inR?300:big?3400:520;this.camera.far=big?9000:2800;this.camera.updateProjectionMatrix();
  if(inR){this.sun.color.set('#fff1d6');this.sun.intensity=this.theme(this.room).dark?1.1:2.2;this.hemi.color.set('#e8f4ff');this.hemi.groundColor.set('#b3a48c');this.hemi.intensity=.55;this.sunDir.set(40,70,25).normalize();this.tint.set('#ffffff');this.scene.environmentIntensity=.35;}
  else this.daylight(0,true);}
 rebuildNow(z){if(this.indoor(this.room))return this.buildInterior(this.room);
  if(this.room==='mergellina')return this.buildNapoli(z);
  const m=MAPS.lungomare;this.ground();this.landmarks();
  for(const b of m.buildings)this.building(b,z);
  for(const p of m.props)this.prop(p,z);
  this.fence();this.villaFences();this.roadSigns();this.lightPools(m.props.filter(p=>p.kind==='lamp').map(p=>[p.x,p.y,this.lev(p.x,p.y)]));this.bake(z.g);this.toonify(z.g);}
 // ---- Cielo: cupola dipinta (sfumatura e nuvole) che segue la telecamera, con sole, luna e stelle; cambia con l'ora del gioco ----
 skyInit(){const g=this.skyG=new THREE.Group();this.scene.add(g);const cv=this.skyCv=document.createElement('canvas');cv.width=1024;cv.height=512;const t=this.skyTex=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;
  const dm=new THREE.MeshBasicMaterial({map:t,side:THREE.BackSide,fog:false,depthTest:false,depthWrite:false});dm.userData.outlineParameters={visible:false};
  const dome=this.dome=new THREE.Mesh(new THREE.SphereGeometry(480,32,16),dm);dome.renderOrder=-10;dome.frustumCulled=false;dome.userData.toon=true;g.add(dome);
  // Nuvole: posizione e grandezza decise una volta; il colore segue l'ora (bianche di giorno, rosa al tramonto, scure di notte).
  this.clouds=[];for(let i=0;i<34;i++){const r=k=>(hash('nuvola'+i+':'+k)%1000)/1000;this.clouds.push({u:r(1),v:.016+r(2)*.15,s:.6+r(3)*.8,n:3+Math.floor(r(4)*4),seed:i});}
  const disc=(inner,outer,size)=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),gr=x.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,inner);gr.addColorStop(size,inner);gr.addColorStop(size+.08,outer);gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,128,128);const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;return new THREE.Sprite(new THREE.SpriteMaterial({map:tx,fog:false,transparent:true,depthWrite:false}));};
  this.sunS=disc('#fffbe6','rgba(255,236,170,.45)',.2);this.sunS.scale.set(120,120,1);this.moonS=disc('#f2f5ff','rgba(190,205,255,.22)',.2);this.moonS.scale.set(64,64,1);g.add(this.sunS,this.moonS);
  const P=[];for(let i=0;i<320;i++){const a=(hash('stella'+i)%6283)/1000,h=.08+(hash('alta'+i)%900)/1000,r=Math.sqrt(1-h*h);P.push(Math.cos(a)*r*470,h*470,Math.sin(a)*r*470);}
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(P,3));this.stars=new THREE.Points(sg,new THREE.PointsMaterial({color:'#ffffff',size:2,sizeAttenuation:false,transparent:true,opacity:0,fog:false,depthWrite:false}));this.stars.frustumCulled=false;g.add(this.stars);}
 skyPaint(top,mid,hor,cloud,shade){const x=this.skyCv.getContext('2d'),W=1024,H=512,gr=x.createLinearGradient(0,0,0,H/2);gr.addColorStop(0,top);gr.addColorStop(.5,top);gr.addColorStop(.86,mid);gr.addColorStop(1,hor);x.fillStyle=gr;x.fillRect(0,0,W,H/2);x.fillStyle=hor;x.fillRect(0,H/2,W,H/2);
  for(const c of this.clouds){const cy=H/2-c.v*H,R=8.5*c.s,len=(c.n-1)*R*.95;for(const dx of [-W,0,W]){const cx=c.u*W+dx;if(cx<-200||cx>W+200)continue;x.save();x.beginPath();x.rect(cx-len/2-R*2,cy-R*3,len+R*4,R*3+R*.32);x.clip();
    for(const [col,oy] of [[shade,R*.3],[cloud,0]]){x.fillStyle=col;x.beginPath();for(let k=0;k<c.n;k++){const px=cx+(k-(c.n-1)/2)*R*.95,rr=R*(.62+((c.seed*7+k*13)%5)*.1),py=cy+oy-(k%2?R*.3:0);x.moveTo(px+rr,py);x.arc(px,py,rr,0,Math.PI*2);}x.fill();}x.restore();}}
  this.skyTex.needsUpdate=true;}
 // Ora del gioco (un giorno = 40 minuti, come nel 2D): colori del cielo e della nebbia, sole o luna, luci della sera.
 daylight(dt,force){this.dayT=(this.dayT||0)+dt;if(!force&&this.dayT<.3)return;this.dayT=0;if(this.indoor(this.room))return;
  const now=this.r2d.seconds?this.r2d.seconds()*1000:Date.now(),ph=(now%2400000)/2400000,a=(ph-.25)*Math.PI*2,e=Math.sin(a),cl=v=>Math.max(0,Math.min(1,v)),nW=cl((-e-.05)/.3),dW=cl(1-Math.abs(e)/.32);
  const K=this.dayC??={a:new THREE.Color(),b:new THREE.Color()},mix=(day,dusk,night,out)=>out.set(day).lerp(K.a.set(night),nW).lerp(K.b.set(dusk),dW*.92);this.night=nW;
  const hor=mix('#d9f0ff','#ffd29a','#22335f',this.outBg);this.scene.fog.color.copy(hor);
  const key=Math.round(ph*200);if(key!==this.skyK){this.skyK=key;const h=c=>'#'+c.getHexString(),T=new THREE.Color();this.skyPaint(h(mix('#3d8fe0','#3b4f96','#070d24',T)),h(mix('#8cc8f5','#f09a6e','#101c44',T)),h(hor),h(mix('#ffffff','#ffd9c0','#46578a',T)),h(mix('#c3d4e8','#d58c74','#27345c',T)));}
  const day=e>=0,kI=cl(.3+Math.abs(e)*2.4);this.sunDir.set(Math.cos(a)*.75*(day?1:-1),Math.max(.38,Math.abs(e)),.45).normalize();
  this.sun.color.set('#ffa868').lerp(K.a.set(day?'#fff1d6':'#9db4ff'),cl(Math.abs(e)/(day?.35:.22)));this.sun.intensity=(day?2.6:2.6-1.35*cl(-e/.22))*kI;
  this.hemi.color.set('#e8f4ff').lerp(K.a.set('#8196d8'),nW).lerp(K.b.set('#ffc7a0'),dW*.6);this.hemi.groundColor.set('#b3a48c').lerp(K.a.set('#2c3552'),nW);this.hemi.intensity=.55+.25*nW+.45*dW;
  this.tint.set('#ffffff').lerp(K.a.set('#98a8da'),nW*.7).lerp(K.b.set('#ffd9b8'),dW*.3);
  this.sunS.position.set(Math.cos(a)*.75,e,.45).normalize().multiplyScalar(440);this.sunS.visible=this.toon&&e>-.15;this.moonS.position.set(-Math.cos(a)*.75,-e,.45).normalize().multiplyScalar(440);this.moonS.visible=e<.1;this.moonS.material.opacity=cl(nW+.25);this.stars.material.opacity=nW*.9;this.stars.visible=nW>.02;
  // Grafica realistica: il cielo fotografico si scurisce verso sera, la luce arriva dal sole della foto, l'ambiente illumina meno di notte.
  if(!this.toon){const dF=cl(.06+(e+.12)*2.2);this.scene.backgroundIntensity=Math.max(.035,dF*.95);this.scene.environmentIntensity=.1+.36*dF;this.hemi.intensity*=1.95;this.sun.intensity*=1.14;if(this.hdrSun){this.sunDir.copy(this.hdrSun);this.moonS.position.copy(this.hdrSun).multiplyScalar(440);}
   if(this.hdr&&this.dome){const dm=this.dome.material;if(!dm.transparent){dm.transparent=true;dm.depthTest=true;dm.needsUpdate=true;}dm.opacity=Math.min(.58,dW*.8);this.dome.visible=dW>.04;this.dome.renderOrder=11;}}
  // Luci della sera: finestre accese, lanterne dei lampioni e cerchi di luce a terra.
  for(const m of this.glow)m.emissiveIntensity=m.userData.glow*nW;if(this.lampGlass)this.lampGlass.color.set('#efe7d2').lerp(K.a.set('#ffdf8a'),nW);for(const p of this.poolM){p.opacity=.6*nW;p.visible=nW>.02;}
  if(this.foamM)this.foamM.color.copy(this.tint);}
 poolTexture(){if(!this.poolTex){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),gr=x.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,210,120,1)');gr.addColorStop(.45,'rgba(255,200,110,.45)');gr.addColorStop(1,'rgba(255,190,100,0)');x.fillStyle=gr;x.fillRect(0,0,64,64);this.poolTex=new THREE.CanvasTexture(c);this.poolTex.colorSpace=THREE.SRGBColorSpace;}return this.poolTex;}
 // Cerchi di luce calda a terra sotto i lampioni (si accendono di sera): un'unica mesh per zona.
 lightPools(list){if(!list.length)return;const P=[],U=[],I=[],R=4.4;list.forEach(([x,z,y],i)=>{const o=i*4;P.push(x-R,y+.05,z-R,x+R,y+.05,z-R,x+R,y+.05,z+R,x-R,y+.05,z+R);U.push(0,0,1,0,1,1,0,1);I.push(o,o+2,o+1,o,o+3,o+2);});
  this.poolTexture();
  const gm=new THREE.BufferGeometry();gm.setAttribute('position',new THREE.Float32BufferAttribute(P,3));gm.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));gm.setIndex(I);
  const mt=new THREE.MeshBasicMaterial({map:this.poolTex,transparent:true,opacity:.6*(this.night||0),depthWrite:false,blending:THREE.AdditiveBlending,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});mt.visible=(this.night||0)>.02;const mesh=new THREE.Mesh(gm,mt);mesh.userData.toon=true;mesh.renderOrder=2;this.static.add(mesh);this.poolM.push(mt);}
 // Mare in stile cartone: creste chiare su fondo blu che scorrono piano (una sola texture ripetuta ogni 26 m).
 seaTex(){if(this.seaT)return this.seaT;const Z=256,c=document.createElement('canvas');c.width=c.height=Z;const g=c.getContext('2d');g.fillStyle='#1b7fbf';g.fillRect(0,0,Z,Z);
  for(let k=0;k<500;k++){g.fillStyle=k%2?'rgba(0,40,90,.10)':'rgba(255,255,255,.06)';g.fillRect((k*97+k*k)%Z,(k*61+k*k*5)%Z,7,2);}
  g.lineCap='round';for(let k=0;k<28;k++){const y=(k*53)%Z,x=(k*97)%Z,w=26+(k*31)%46;g.strokeStyle=k%3?'rgba(120,200,240,.6)':'rgba(238,250,255,.8)';g.lineWidth=k%3?3:2;for(const dx of [-Z,0,Z])for(const dy of [-Z,0,Z]){g.beginPath();g.moveTo(x+dx,y+dy);g.quadraticCurveTo(x+dx+w/2,y+dy-7,x+dx+w,y+dy);g.stroke();}}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return this.seaT=t;}
 // Increspature dell'acqua calcolate dal codice (somma di onde che si ripete senza giunte).
 seaNormal(){if(this.seaN)return this.seaN;const Z=256,c=document.createElement('canvas');c.width=c.height=Z;const g=c.getContext('2d'),im=g.createImageData(Z,Z),WV=[[3,1,.9,0],[5,-2,.6,1.3],[2,4,.7,2.1],[7,3,.35,.7],[-4,6,.3,3.3],[9,-5,.2,5]],T=Math.PI*2/Z;
  for(let y=0;y<Z;y++)for(let x=0;x<Z;x++){let dx=0,dy=0;for(const [a,b,k,p] of WV){const cs=Math.cos((a*x+b*y)*T+p)*k;dx+=cs*a;dy+=cs*b;}const nx=-dx*.07,ny=-dy*.07,l=Math.hypot(nx,ny,1),i=(y*Z+x)*4;im.data[i]=(nx/l*.5+.5)*255;im.data[i+1]=(ny/l*.5+.5)*255;im.data[i+2]=(1/l*.5+.5)*255;im.data[i+3]=255;}
  g.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return this.seaN=t;}
 sea(S,y){const geo=new THREE.PlaneGeometry(S,S),uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*S/26,uv.getY(i)*S/26);const mt=this.toon?new THREE.MeshToonMaterial({map:this.seaTex(),gradientMap:this.grad}):new THREE.MeshStandardMaterial({color:'#0f5d82',roughness:.14,metalness:.3,normalMap:this.seaNormal(),normalScale:new THREE.Vector2(.5,.5)});mt.userData.outlineParameters={visible:false};
  if(!this.toon)mt.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <normal_fragment_maps>',THREE.ShaderChunk.normal_fragment_maps.replace('texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;','( mix( vec3( 0.5, 0.5, 1.0 ), texture2D( normalMap, vNormalMapUv ).xyz, clamp( 1.0 - length( fwidth( vNormalMapUv ) ) * 7.0, 0.0, 1.0 ) ) + mix( vec3( 0.5, 0.5, 1.0 ), texture2D( normalMap, mat2( 0.84, -0.54, 0.54, 0.84 ) * vNormalMapUv * 0.31 + vec2( 0.37, 0.11 ) ).xyz, clamp( 1.0 - length( fwidth( vNormalMapUv ) ) * 2.4, 0.0, 1.0 ) ) * 1.3 + texture2D( normalMap, mat2( 0.36, 0.93, -0.93, 0.36 ) * vNormalMapUv * 0.083 ).xyz * 1.3 ) / 3.6 * 2.0 - 1.0;')).replace('#include <color_fragment>','#include <color_fragment>\n#ifdef USE_NORMALMAP\n diffuseColor.rgb *= 0.74 + 0.5 * texture2D( normalMap, vNormalMapUv * 0.011 ).r;\n#endif');};
  const m=new THREE.Mesh(geo,mt);m.rotation.x=-Math.PI/2;m.position.y=y;m.receiveShadow=true;m.userData.toon=true;m.renderOrder=10;return m;} // disegnato per ultimo: dove è coperto dalla città non costa nulla
 // Schiuma sulla battigia: striscia bianca a onde che va e viene sulla sabbia.
 foamMat(){if(this.foamM)return this.foamM;const c=document.createElement('canvas');c.width=256;c.height=64;const g=c.getContext('2d');g.fillStyle='rgba(255,255,255,.92)';g.beginPath();for(let i=0;i<8;i++){g.moveTo(i*32+34,24);g.arc(i*32+16,24,18,0,Math.PI,true);}g.fill();g.fillStyle='rgba(255,255,255,.6)';g.fillRect(0,23,256,14);const gr=g.createLinearGradient(0,37,0,64);gr.addColorStop(0,'rgba(255,255,255,.4)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,37,256,27);
  const t=this.foamT=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;const m=new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});m.userData.outlineParameters={visible:false};return this.foamM=m;}
 // Materiali a tinta unita condivisi (uno per colore): i pezzi fermi che li usano vengono poi uniti in un'unica mesh per zona.
 sm(col){(this.sms??=new Map());let m=this.sms.get(col);if(!m){m=this.toon?new THREE.MeshStandardMaterial({color:col}):new THREE.MeshLambertMaterial({color:col});m.userData.merge=true;this.sms.set(col,m);}return m;}
 share(o){o.traverse(c=>{const m=c.material;if(c.isMesh&&m&&!Array.isArray(m)&&(m.isMeshStandardMaterial||m.isMeshLambertMaterial)&&!m.map&&!m.transparent&&!m.vertexColors&&m.side===THREE.FrontSide&&!m.userData.merge&&!(m.emissive&&m.emissive.getHex()))c.material=this.sm('#'+m.color.getHexString());});}
 // Unisce tutti i pezzi fermi con lo stesso materiale (lampioni, panchine, balconi, cornici, tetti…) in poche mesh:
 // centinaia di chiamate di disegno in meno, quindi più FPS sui PC lenti.
 bake(g){g.updateMatrixWorld(true);const by=new Map();g.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&!Array.isArray(o.material)&&o.material.userData.merge&&!o.userData.keep&&!o.userData.baked&&o.geometry.attributes.normal)(by.get(o.material)||by.set(o.material,[]).get(o.material)).push(o);});
  for(const [mat,list] of by){if(list.length<2)continue;const keep=['position','normal','uv','color'].filter(k=>list.every(c=>c.geometry.attributes[k]));
   const geo=mergeGeometries(list.map(c=>{const q=c.geometry.index?c.geometry.toNonIndexed():c.geometry.clone();for(const k of Object.keys(q.attributes))if(!keep.includes(k))q.deleteAttribute(k);q.applyMatrix4(c.matrixWorld);
    // Oggetti specchiati (scala negativa): i triangoli vanno rigirati, altrimenti si vedono da dentro e restano scuri.
    if(c.matrixWorld.determinant()<0)for(const at of Object.values(q.attributes)){const a=at.array,n=at.itemSize;for(let i=0;i<at.count;i+=3)for(let k=0;k<n;k++){const t=a[(i+1)*n+k];a[(i+1)*n+k]=a[(i+2)*n+k];a[(i+2)*n+k]=t;}}return q;}));if(!geo)continue;
   for(const c of list)c.parent.remove(c);const m=new THREE.Mesh(geo,mat);m.castShadow=!this.mobile&&!mat.userData?.noShadow;m.receiveShadow=!this.mobile;m.userData.baked=true;g.add(m);}}
 saleMat(){if(this.saleM)return this.saleM;const c=document.createElement('canvas');c.width=128;c.height=64;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,128,64);g.strokeStyle='#c8432f';g.lineWidth=6;g.strokeRect(3,3,122,58);g.fillStyle='#c8432f';g.font='bold 20px system-ui';g.textAlign='center';g.fillText('VENDESI',64,27);g.fillText('AFFITTASI',64,50);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.MeshBasicMaterial({map:t});m.userData.merge=true;return this.saleM=m;}
 // ---- Mezzi: carrozzerie disegnate dal codice. Il profilo laterale viene "estruso" e smussato: linee morbide, da auto di lusso. ----
 // Ogni tipo ha tre pezzi: vernice (prende il colore dell'auto), resto (vetri, ruote, cerchi, griglia) e luci (fari e stop sempre accesi).
 carParts(type){(this.carP??={});if(this.carP[type])return this.carP[type];
  const ext=(pts,W,bev=.06)=>{const sh=new THREE.Shape();pts.forEach((p,i)=>i?(p.length===4?sh.quadraticCurveTo(p[0],p[1],p[2],p[3]):sh.lineTo(p[0],p[1])):sh.moveTo(p[0],p[1]));const g=new THREE.ExtrudeGeometry(sh,{depth:W-bev*2,bevelEnabled:true,bevelThickness:bev,bevelSize:bev,bevelSegments:2,curveSegments:6});g.translate(0,0,-(W-bev*2)/2);return g.rotateY(-Math.PI/2);};
  const tint=(g,hex)=>{g.userData.gl=hex==='#18222c';const c=new THREE.Color(hex),n=g.attributes.position.count,a=new Float32Array(n*3);for(let i=0;i<n;i++){a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g;};
  const bx=(w,h,d,x,y,z)=>new THREE.BoxGeometry(w,h,d).translate(x,y,z),wheels=(x,z,r)=>[x,-x].flatMap(sx=>[z,-z].flatMap(sz=>{const o=Math.sign(sx),P=[[r*.6,-.13],[r*.93,-.13],[r,-.085],[r,.085],[r*.93,.13],[r*.6,.13]].map(p=>new THREE.Vector2(p[0],p[1])),at=(g,dx=0)=>g.translate(sx+o*dx,r,sz),out=[tint(at(new THREE.LatheGeometry(P,12).rotateZ(Math.PI/2)),'#141518'),tint(at(new THREE.CylinderGeometry(r*.62,r*.62,.2,10).rotateZ(Math.PI/2)),'#2a2c31'),tint(at(new THREE.CylinderGeometry(r*.15,r*.15,.05,6).rotateZ(Math.PI/2),.115),'#e3e5ea'),tint(new THREE.TorusGeometry(r*1.13,.05,3,7,Math.PI).rotateY(Math.PI/2).translate(sx+o*.02,r*.98,sz),'#0c0d0f')];for(let k=0;k<5;k++)out.push(tint(at(new THREE.BoxGeometry(.035,r*.6,.075).translate(0,r*.3,0).rotateX(k*Math.PI*.4),.105),'#d5d8de'));return out;}));
  // loft: sezioni lungo l'auto [z, mezza larghezza, y sotto, y sopra]; ogni sezione è un rettangolo molto arrotondato; normali morbide.
  const loft=(S,N=18,pw=3.2)=>{const P=[],I=[];for(const [z,w,y0,y1] of S)for(let k=0;k<N;k++){const t=k/N*Math.PI*2,c=Math.cos(t),sn=Math.sin(t);P.push(w*Math.sign(c)*Math.pow(Math.abs(c),2/pw),(y0+y1)/2+(y1-y0)/2*Math.sign(sn)*Math.pow(Math.abs(sn),2/pw),z);}
   for(let i=0;i<S.length-1;i++)for(let k=0;k<N;k++){const a=i*N+k,b=i*N+(k+1)%N,c=a+N,d=b+N;I.push(a,b,c,b,d,c);}
   for(const [i,fl] of [[0,0],[S.length-1,1]]){const o=P.length/3,[z,,y0,y1]=S[i];P.push(0,(y0+y1)/2,z);for(let k=0;k<N;k++){const a=i*N+k,b=i*N+(k+1)%N;fl?I.push(o,b,a):I.push(o,a,b);}}
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setIndex(I);g.computeVertexNormals();return g;};
  const join=l=>mergeGeometries(l.map(g=>{const q=g.index?g.toNonIndexed():g;q.deleteAttribute('uv');return q;}));
  const G='#18222c',K='#101114',HL='#fff4c2',TL='#e11d2e';let body,rest,lights,glass=null;const joinR=l=>{const gl=l.filter(q=>q.userData.gl);glass=gl.length?join(gl):null;return join(l.filter(q=>!q.userData.gl));};
  if(type==='super'){ // sportiva scoperta: muso basso a cuneo, abitacolo aperto con sedili in pelle, alettone
   body=join([loft([[-2.2,.72,.44,.74],[-2.05,.9,.3,.84],[-1.3,.97,.25,.87],[-.4,.97,.24,.84],[.5,.96,.24,.8],[1.3,.93,.26,.7],[1.9,.86,.3,.58],[2.2,.68,.36,.5]]),bx(1.7,.05,.32,0,1.02,-1.9),bx(.08,.22,.2,.7,.9,-1.9),bx(.08,.22,.2,-.7,.9,-1.9),bx(.1,.08,.2,1,.86,.55),bx(.1,.08,.2,-1,.86,.55)]);
   rest=joinR([tint(ext([[.62,.8],[.2,1.12],[.14,1.12],[.5,.8]],1.5,.03),G),tint(bx(1.5,.1,1.45,0,.83,-.25),'#17181c'),tint(loft([[-.62,.2,.84,1.2],[-.3,.22,.84,1.22],[-.05,.2,.84,.98]],10).translate(.4,0,0),'#5a3a26'),tint(loft([[-.62,.2,.84,1.2],[-.3,.22,.84,1.22],[-.05,.2,.84,.98]],10).translate(-.4,0,0),'#5a3a26'),tint(new THREE.CylinderGeometry(.42,.42,.2,16).rotateZ(Math.PI/2).translate(.9,.35,1.36),K),tint(new THREE.CylinderGeometry(.42,.42,.2,16).rotateZ(Math.PI/2).translate(-.9,.35,1.36),K),tint(new THREE.CylinderGeometry(.42,.42,.2,16).rotateZ(Math.PI/2).translate(.9,.35,-1.36),K),tint(new THREE.CylinderGeometry(.42,.42,.2,16).rotateZ(Math.PI/2).translate(-.9,.35,-1.36),K),...wheels(.88,1.36,.35),tint(bx(1.3,.1,.06,0,.36,2.26),K),tint(bx(1.96,.08,4,0,.28,0),K)]);
   lights=join([tint(bx(.5,.07,.06,.62,.5,2.2),HL),tint(bx(.5,.07,.06,-.62,.5,2.2),HL),tint(bx(1.5,.07,.06,0,.66,-2.22),TL)]);}
  else if(type==='suv'){ // fuoristrada di lusso: alto, cofano lungo, vetri scuri
   body=join([loft([[-2.36,.76,.52,1],[-2.22,.94,.42,1.08],[-1,.98,.4,1.1],[.6,.98,.4,1.08],[1.6,.96,.42,1.02],[2.2,.9,.46,.88],[2.36,.74,.52,.76]]),loft([[-1.9,.72,1.6,1.73],[-.6,.76,1.62,1.75],[.5,.72,1.6,1.73]],14),bx(.12,.1,.24,1.03,1.16,.95),bx(.12,.1,.24,-1.03,1.16,.95)]);
   rest=joinR([tint(loft([[-2.2,.8,1.02,1.12],[-1.95,.84,1.02,1.62],[-.6,.86,1.02,1.67],[.45,.84,1.02,1.64],[.95,.82,1.02,1.48],[1.38,.84,1.02,1.1]],14,2.6),G),...wheels(.9,1.5,.42),tint(bx(1.2,.3,.06,0,.7,2.41),K),tint(bx(1.98,.14,4.4,0,.4,0),K)]);
   lights=join([tint(bx(.4,.14,.06,.68,.9,2.36),HL),tint(bx(.4,.14,.06,-.68,.9,2.36),HL),tint(bx(.2,.4,.06,.8,1,-2.43),TL),tint(bx(.2,.4,.06,-.8,1,-2.43),TL)]);}
  else if(type==='van'){ // furgone: cassone alto e parabrezza inclinato
   body=join([loft([[-2.45,.86,.44,1.88],[-2.34,.96,.38,1.95],[-.5,.98,.36,1.97],[1,.98,.36,1.95],[1.42,.97,.38,1.9],[1.92,.95,.4,1.28],[2.3,.92,.42,1.02],[2.43,.78,.5,.84]],18,4),bx(.12,.16,.22,1.06,1.34,1.5),bx(.12,.16,.22,-1.06,1.34,1.5)]);
   rest=joinR([tint(new THREE.BoxGeometry(1.62,.66,.05).rotateX(-.69).translate(0,1.6,1.7),G),tint(bx(.05,.44,.62,.975,1.52,1.02),G),tint(bx(.05,.44,.62,-.975,1.52,1.02),G),tint(bx(.62,.42,.05,.42,1.5,-2.44),G),tint(bx(.62,.42,.05,-.42,1.5,-2.44),G),tint(bx(.03,1.3,.03,.985,1.1,.55),K),tint(bx(.03,1.3,.03,-.985,1.1,.55),K),tint(bx(.03,1.3,.03,.985,1.1,-.6),K),tint(bx(.03,1.3,.03,0,1.1,-2.47),K),...wheels(.9,1.55,.38),tint(bx(1.2,.2,.06,0,.62,2.49),K),tint(bx(1.97,.1,4.6,0,.36,0),K)]);
   lights=join([tint(bx(.36,.16,.06,.7,.9,2.46),HL),tint(bx(.36,.16,.06,-.7,.9,2.46),HL),tint(bx(.16,.4,.06,.85,1,-2.52),TL),tint(bx(.16,.4,.06,-.85,1,-2.52),TL)]);}
  else if(({city:1,coupe:1,wedge:1,gt:1})[type]){const D={
    city:{b:[[-1.6,.62,.42,.9],[-1.5,.8,.3,1.02],[-.6,.84,.26,1.05],[.6,.84,.26,1],[1.3,.8,.28,.86],[1.6,.6,.36,.66]],g:[[-1.45,.7,.95,1.3],[-1.1,.74,.95,1.5],[-.2,.76,.95,1.55],[.5,.72,.95,1.45],[1,.72,.95,1]],r:[[-1.1,.6,1.5,1.58],[.3,.6,1.5,1.58]],w:[.78,1.05,.3],ly:.72,pw:3.2},
    coupe:{b:[[-2.25,.7,.4,.78],[-2.1,.92,.3,.9],[-1.2,.99,.24,.92],[-.2,.98,.22,.86],[.8,.97,.22,.76],[1.6,.93,.24,.64],[2.1,.82,.28,.52],[2.25,.6,.34,.46]],g:[[-1.5,.72,.84,.92],[-1,.7,.84,1.16],[-.3,.72,.84,1.2],[.3,.7,.82,1.1],[.95,.72,.78,.8]],r:[[-.95,.56,1.14,1.22],[-.2,.58,1.16,1.24],[.2,.54,1.1,1.16]],w:[.9,1.4,.36],ly:.52,pw:3.2,wing:1},
    wedge:{b:[[-2.3,.8,.42,.86],[-2.15,.98,.3,.92],[-1.2,1.02,.24,.9],[0,1,.22,.8],[1,.97,.2,.64],[1.9,.9,.2,.46],[2.3,.7,.22,.36]],g:[[-1.2,.74,.82,.9],[-.7,.72,.82,1.1],[-.1,.7,.8,1.12],[1.1,.74,.62,.66]],r:[[-.65,.56,1.08,1.14],[0,.56,1.08,1.14]],w:[.94,1.42,.36],ly:.4,pw:5,wing:1},
    gt:{b:[[-2.35,.7,.42,.8],[-2.2,.9,.32,.92],[-1.4,.96,.28,.96],[-.3,.96,.26,.92],[1,.95,.26,.86],[1.9,.9,.28,.74],[2.35,.66,.36,.56]],g:[[-1.8,.72,.9,.98],[-1.3,.72,.9,1.26],[-.5,.74,.9,1.3],[.1,.72,.9,1.2],[.6,.74,.88,.92]],r:[[-1.25,.58,1.24,1.32],[-.4,.6,1.26,1.34],[0,.56,1.2,1.26]],w:[.9,1.5,.37],ly:.66,pw:3.2}}[type];
   const z0=D.b[0][0],z1=D.b[D.b.length-1][0],mw=Math.max(...D.b.map(q=>q[1]));
   body=join([loft(D.b,18,D.pw),loft(D.r,14),bx(.1,.08,.2,mw+.02,D.g[1][2]+.12,D.g[D.g.length-1][0]-.25),bx(.1,.08,.2,-mw-.02,D.g[1][2]+.12,D.g[D.g.length-1][0]-.25),...(D.wing?[bx(mw*1.7,.05,.3,0,D.b[1][3]+.2,z0+.25),bx(.07,.2,.18,mw*.6,D.b[1][3]+.1,z0+.25),bx(.07,.2,.18,-mw*.6,D.b[1][3]+.1,z0+.25)]:[])]);
   rest=joinR([tint(loft(D.g,14,2.6),G),...wheels(D.w[0],D.w[1],D.w[2]),tint(bx(mw*1.1,.12,.06,0,D.b[D.b.length-2][2]+.1,z1-.03),K),tint(bx(mw*1.96,.09,(z1-z0)*.9,0,D.b[2][2]+.04,0),K)]);
   lights=join([tint(bx(.42,.09,.06,mw*.6,D.ly,z1-.06),HL),tint(bx(.42,.09,.06,-mw*.6,D.ly,z1-.06),HL),tint(bx(mw*1.5,.07,.06,0,D.b[1][3]-.14,z0+.02),TL)]);}
  else{ // berlina elegante: tre volumi, tetto basso, vetri fumé
   body=join([loft([[-2.3,.7,.42,.82],[-2.15,.86,.32,.9],[-1.3,.92,.28,.94],[-.2,.92,.27,.94],[.9,.91,.27,.9],[1.7,.88,.3,.82],[2.15,.8,.34,.68],[2.3,.62,.4,.58]]),loft([[-.82,.6,1.33,1.43],[-.2,.66,1.35,1.45],[.36,.6,1.33,1.43]],14),bx(.1,.09,.22,.96,1,.72),bx(.1,.09,.22,-.96,1,.72)]);
   rest=joinR([tint(loft([[-1.42,.74,.86,.95],[-.95,.72,.86,1.36],[-.2,.74,.86,1.4],[.4,.72,.86,1.36],[1.2,.76,.86,.93]],14,2.6),G),...wheels(.85,1.42,.34),tint(bx(1,.16,.06,0,.5,2.35),K),tint(bx(1.86,.1,4.3,0,.32,0),K)]);
   lights=join([tint(bx(.46,.12,.06,.58,.7,2.24),HL),tint(bx(.46,.12,.06,-.58,.7,2.24),HL),tint(bx(.6,.1,.06,.52,.74,-2.37),TL),tint(bx(.6,.1,.06,-.52,.74,-2.37),TL)]);}
  return this.carP[type]={body,rest,lights,glass};}
 // Un'auto: tipo (sedan, super, suv, van), colore della vernice e, per quelle che si muovono, il fascio dei fari sull'asfalto di sera.
 car(type,color,beam,drive){const P=this.carParts(type),g=new THREE.Group();this.carRest??=Object.assign(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.42,metalness:.35}),{userData:{merge:true}});this.carLit??=Object.assign(new THREE.MeshBasicMaterial({vertexColors:true}),{userData:{merge:true,outlineParameters:{visible:false}}});
  const b=new THREE.Mesh(P.body,this.toon?this.sm(color):this.paint(color)),r=new THREE.Mesh(P.rest,this.carRest),l=new THREE.Mesh(P.lights,this.carLit);b.castShadow=r.castShadow=!this.mobile;g.add(b,r,l);
   // Vetri: scuri e pieni sulle auto ferme; su quella che si guida sono trasparenti, con il posto di guida e la portiera che si apre.
   if(P.glass){this.carGlassT??=new THREE.MeshStandardMaterial({color:'#33454f',transparent:true,opacity:.42,roughness:.06,metalness:.5,depthWrite:false});g.add(new THREE.Mesh(P.glass,drive?this.carGlassT:this.carRest));}
   if(drive){const S={sedan:[.36,1.4,.05,.93,.62],city:[.36,1.55,0,.85,.66],coupe:[.36,1.2,-.25,.99,.56],wedge:[.36,1.12,-.35,1.02,.54],gt:[.36,1.3,-.5,.97,.6],suv:[.4,1.67,-.1,.99,.74],van:[.42,1.9,1.02,.99,.9],super:[.4,1.36,-.32,.98,.56]}[type]||[.36,1.4,.05,.93,.62];
    g.userData.seat={x:S[0],y:S[1]-.06-1.74,z:S[2],hw:S[3]};const piv=new THREE.Group(),dp=new THREE.Mesh(new THREE.BoxGeometry(.03,type==='van'?.8:.5,.96),b.material);dp.position.set(0,0,-.48);piv.add(dp);piv.position.set(S[3]-.02,S[4],S[2]+.55);g.add(piv);g.userData.door=piv;}
  if(beam){if(!this.beamM){this.beamM=new THREE.MeshBasicMaterial({map:this.poolTexture(),transparent:true,opacity:.6*(this.night||0),depthWrite:false,blending:THREE.AdditiveBlending});this.beamM.visible=(this.night||0)>.02;this.beamM.userData.outlineParameters={visible:false};this.poolM.push(this.beamM);}
   const q=new THREE.Mesh(this.beamG??=new THREE.PlaneGeometry(3.4,7).rotateX(-Math.PI/2),this.beamM);q.position.set(0,.06,5.4);q.userData.toon=true;g.add(q);}
  return g;}
 paint(col){(this.paints??=new Map());let m=this.paints.get(col);if(!m){m=new THREE.MeshStandardMaterial({color:col,metalness:.6,roughness:.28});m.userData.merge=true;this.paints.set(col,m);}return m;}
 // Piano terra di un locale: il palazzo sopra resta pieno, sotto c'è una stanza vera profonda 3 m dietro il vetro,
 // con parete di fondo illuminata, pavimento e arredi secondo il tipo di locale (manichini e scaffali, bancone e tavolini, slot, poltrone…).
 shopInside(g,b,w,d,seed,L,ins=0){const D=Math.min(3.2,d-.8),zf=d/2,zb=zf-D,kind=b.interior||b.style||b.id,dark=kind==='casino'||kind==='club',food=['bar','cafe','pizzeria','restaurant','burger','osteria','vesuvio','trattoria','panorama'].includes(kind),C=['#e5484d','#ffc928','#2f9e5b','#3fa7d6','#8a5cff','#f4f1ea'];
  this.glassM??=Object.assign(new THREE.MeshStandardMaterial({color:'#cfe9f7',transparent:true,opacity:.2,roughness:.08,metalness:.4,depthWrite:false}),{userData:{merge:true,outlineParameters:{visible:false}}});
  const lit=this.neonMat(dark?'#3a1f5c':'#fff1d0'),B=(...a)=>this.bx(g,...a);
  B(w-ins*2,3.3,d-D-ins,0,1.65,-D/2+ins/2,'#d8cfbf');for(const sx of [-1,1])B(.35,3.3,D,sx*(w/2-.175-ins),1.65,zb+D/2,'#d8cfbf');B(w,.5,.35,0,3.05,zf-.18,L?.accent||'#3a2c22');B(w-.7,.08,D,0,.16,zb+D/2,dark?'#2a1f45':'#cfc6b4');
  const back=new THREE.Mesh(new THREE.PlaneGeometry(w-.7,2.7),lit);back.position.set(0,1.5,zb+.02);g.add(back);B(w-.7,.06,D,0,2.83,zb+D/2,dark?'#1a1330':'#f4f1ea');
  const gl=new THREE.Mesh(new THREE.PlaneGeometry(w-.7,2.6),this.glassM);gl.position.set(0,1.5,zf-.06);g.add(gl);for(const x of [-.75,.75])B(.08,2.6,.1,x,1.5,zf-.06,'#22272d');B(1.5,.08,.1,0,2.4,zf-.06,'#22272d');for(let x=-w/2+.35;x<=w/2-.3;x+=Math.max(1.6,(w-.7)/Math.round((w-.7)/2)))B(.07,2.6,.08,x,1.5,zf-.06,'#22272d');
  const zm=zb+D*.45,man=(x,z,c)=>{this.cy(g,.2,.24,.05,x,.22,z,'#8a8f98');this.cy(g,.05,.05,.8,x,.6,z,'#e9e4da',6);this.cy(g,.17,.13,.6,x,1.25,z,c,10);this.cy(g,.14,.17,.5,x,.85,z,C[(seed+Math.round(x*3))%5]);const h=new THREE.Mesh(new THREE.SphereGeometry(.11,10,8),this.sm('#e9e4da'));h.position.set(x,1.72,z);g.add(h);};
  if(food){B(w*.5,1,.5,-w*.15,.7,zb+.6,'#745345');B(w*.52,.06,.58,-w*.15,1.22,zb+.6,'#422f28');for(let i=0;i<8;i++)B(.1,.3,.1,-w*.38+i*w*.065,1.95,zb+.2,C[i%5]);B(w*.55,.05,.25,-w*.15,1.78,zb+.2,'#5a3a26');
   for(const x of [w*.22,w*.36]){if(x>w/2-.6)continue;this.cy(g,.4,.4,.05,x,.95,zm+.5,'#f4f1ea',12);this.cy(g,.04,.05,.75,x,.57,zm+.5,'#2b2f36',6);for(const k of [-.55,.55])this.cy(g,.17,.17,.5,x+k,.45,zm+.5,'#9a6a3e',8);}}
  else if(kind==='casino'){for(let i=0;i<Math.floor((w-1)/1.3);i++){const x=-w/2+1+i*1.3;B(.8,1.6,.6,x,1,zb+.6,'#3b1d5c');B(.86,.16,.66,x,1.88,zb+.6,'#ffd35a');const sc=new THREE.Mesh(new THREE.PlaneGeometry(.55,.4),this.neonMat(C[i%5]));sc.position.set(x,1.35,zb+.91);g.add(sc);}}
  else if(kind==='club'){for(let i=0;i<5;i++){const n=new THREE.Mesh(new THREE.BoxGeometry(.08,2,.08),this.neonMat(['#ff4fd8','#3fffe2','#566dff','#ffd352'][i%4]));n.position.set(-w/2+.8+i*(w-1.6)/4,1.4,zb+.15);g.add(n);}B(w*.4,1,.5,0,.7,zm,'#1c1530');}
  else if(kind==='barber'){for(const x of [-w*.22,w*.22]){this.cy(g,.3,.36,.12,x,.26,zm,'#6b6b72');B(.6,.14,.6,x,.72,zm,'#a0303f');B(.6,.7,.12,x,1.12,zm-.3,'#7a1f2b');const mr=new THREE.Mesh(new THREE.PlaneGeometry(.8,1.1),this.neonMat('#cfe8f3'));mr.position.set(x,1.7,zb+.05);g.add(mr);}}
  else if(kind==='bank'){B(w*.6,1.05,.6,0,.72,zb+.8,'#1f5d4c');B(w*.62,.06,.7,0,1.27,zb+.8,'#e9e4da');for(const x of [-w*.2,w*.2])B(.5,.4,.05,x,1.55,zb+.8,'#22272d');}
  else{const n=Math.max(2,Math.floor((w-1.2)/1.5));for(let i=0;i<n;i++){const x=-w/2+1+i*(w-2)/(n-1||1);if(Math.abs(x)<.9)continue;man(x,zf-.75,C[(seed+i)%6]);}
   for(let r=0;r<3;r++){B(w-1.2,.05,.3,0,.75+r*.6,zb+.2,'#9aa3a9');for(let i=0;i<Math.floor((w-1.4)/.45);i++)B(.3,.28+((i+r)%3)*.08,.22,-w/2+.9+i*.45,.92+r*.6,zb+.2,C[(i*3+r+seed)%6]);}
   for(const x of [-w*.25,w*.25]){B(1.3,.04,.04,x,1.5,zm,'#9aa3a9');for(const k of [-.6,.6])this.cy(g,.03,.03,1.3,x+k,.82,zm,'#9aa3a9',6);for(let i=0;i<5;i++)B(.06,.7,.42,x-.48+i*.24,1.12,zm,C[(i+seed)%6]);}}}
 cy(g,r1,r2,h,x,y,z,c,n=12){const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,n),this.sm(c));o.position.set(x,y,z);g.add(o);return o;}
 // Giostre del luna park in 3D vero (prima erano le figure piatte del 2D messe in piedi): S = larghezza a terra in metri.
 funfair(art,S){const g=new THREE.Group(),W='#f4f1ea',R='#d9262c',C=['#e5484d','#ffc928','#2f9e5b','#3fa7d6','#8a5cff','#ff8a3d'],T=Math.PI*2;
  if(art==='ruota-panoramica'){const r=S*.48,cy=r+1.4;for(const z of [-.7,.7]){const t=new THREE.Mesh(new THREE.TorusGeometry(r,.11,6,36),this.sm(R));t.position.set(0,cy,z);g.add(t);const t2=new THREE.Mesh(new THREE.TorusGeometry(r*.55,.07,5,28),this.sm(W));t2.position.set(0,cy,z);g.add(t2);
    for(let i=0;i<12;i++)this.bx(g,.07,r,.07,Math.sin(i/12*T)*r/2,cy+Math.cos(i/12*T)*r/2,z,W).rotation.z=-i/12*T;
    for(const sx of [-1,1])this.bx(g,.28,cy*1.12,.28,sx*cy*.28,cy/2,z*1.5,W).rotation.z=sx*.5;}
   this.cy(g,.35,.35,2.2,0,cy,0,'#8a8f98').rotation.x=Math.PI/2;for(let i=0;i<12;i++){const x=Math.sin(i/12*T)*r,y=cy+Math.cos(i/12*T)*r;this.bx(g,.06,.06,1.4,x,y,0,W);this.bx(g,.9,.75,.9,x,y-.55,0,C[i%6]);this.bx(g,.95,.08,.95,x,y-.14,0,W);}
   this.bx(g,S*.7,.25,3.2,0,.12,0,'#8a8f98');}
  else if(art==='giostra-cavalli'){const r=S*.46;this.cy(g,r,r,.35,0,.17,0,R,24);this.cy(g,r*.96,r*.96,.06,0,.37,0,'#f1d99a',24);this.cy(g,.35,.35,3.6,0,2.1,0,'#f1d99a');this.cy(g,r,r,.5,0,3.7,0,W,24);const cone=new THREE.Mesh(new THREE.ConeGeometry(r*1.06,1.8,24),this.sm(R));cone.position.y=4.85;g.add(cone);this.cy(g,.12,.12,.5,0,5.9,0,'#ffc928');
   for(let i=0;i<8;i++){const a=i/8*T,x=Math.cos(a)*r*.72,z=Math.sin(a)*r*.72,h=1.15+(i%2)*.35;this.cy(g,.035,.035,3.2,x,2,z,'#d4a73a',6);const b=this.bx(g,.3,.42,.95,x,h,z,i%2?W:C[i%6]);b.rotation.y=-a;const hd=this.bx(g,.2,.42,.26,x-Math.sin(a)*.5,h+.36,z+Math.cos(a)*.5,i%2?W:C[i%6]);hd.rotation.y=-a;for(const k of [-.3,.3])this.bx(g,.08,.5,.08,x+Math.sin(a)*-k,h-.42,z+Math.cos(a)*k,'#3a2a1e');}}
  else if(art==='autoscontri'){const a=S*.5,b=S*.36;this.bx(g,a*2,.3,b*2,0,.15,0,'#3a3f45');this.bx(g,a*1.9,.04,b*1.9,0,.32,0,'#6b7480');for(const [x,z] of [[-a,-b],[a,-b],[-a,b],[a,b]])this.cy(g,.14,.14,3.4,x*.96,1.9,z*.96,W);this.bx(g,a*2.1,.25,b*2.1,0,3.7,0,R);this.bx(g,a*2.15,.3,.2,0,3.45,b*1.04,'#ffc928');
   for(const [sx,sz,l,d] of [[0,-1,a*2,.25],[0,1,a*2,.25],[-1,0,.25,b*2],[1,0,.25,b*2]])this.bx(g,l,.45,d,sx*a,.5,sz*b,'#ffc928');
   for(let i=0;i<6;i++){const x=(i%3-1)*a*.55,z=(i<3?-1:1)*b*.42,c=C[i%6];this.cy(g,.62,.62,.22,x,.46,z,'#15161a',14);this.bx(g,.8,.4,1,x,.68,z,c).rotation.y=i*1.1;this.cy(g,.025,.025,2.7,x,2.2,z-.35,'#8a8f98',5);}}
  else if(art==='calcinculo'){const r=S*.42;this.cy(g,r*.5,r*.6,.4,0,.2,0,R,18);this.cy(g,.3,.4,6,0,3.3,0,W);this.cy(g,r,r*.85,.5,0,6.3,0,R,20);const top=new THREE.Mesh(new THREE.ConeGeometry(r*.9,1.2,20),this.sm('#ffc928'));top.position.y=7.15;g.add(top);
   for(let i=0;i<12;i++){const a=i/12*T,x0=Math.cos(a)*r*.9,z0=Math.sin(a)*r*.9,x1=Math.cos(a)*r*1.25,z1=Math.sin(a)*r*1.25;const ch=this.bx(g,.03,3.6,.03,(x0+x1)/2,4.35,(z0+z1)/2,'#8a8f98');ch.rotation.set(Math.sin(a)*-.2,0,Math.cos(a)*.2);this.bx(g,.45,.4,.45,x1,2.45,z1,C[i%6]);}}
  else if(art==='tazze'){const r=S*.46;this.cy(g,r,r,.3,0,.15,0,'#f1d99a',24);this.cy(g,r*.98,r*.98,.05,0,.32,0,'#e98ab0',24);const pot=new THREE.Mesh(new THREE.SphereGeometry(.9,14,10),this.sm(W));pot.position.y=1.15;g.add(pot);this.cy(g,.2,.3,.4,0,2.1,0,C[1]);
   for(let i=0;i<6;i++){const a=i/6*T,x=Math.cos(a)*r*.66,z=Math.sin(a)*r*.66;this.cy(g,.85,.6,.85,x,.78,z,C[i],16);this.cy(g,.7,.7,.06,x,1.1,z,'#3a2a1e',14);const h=new THREE.Mesh(new THREE.TorusGeometry(.3,.07,5,12),this.sm(C[i]));h.position.set(x+Math.cos(a)*.95,.8,z+Math.sin(a)*.95);h.rotation.y=-a;g.add(h);}}
  else if(art==='montagne-russe'){const a=S*.48,b=S*.3,pts=[];for(let i=0;i<14;i++){const t=i/14*T;pts.push(new THREE.Vector3(Math.cos(t)*a*(1+.18*Math.sin(t*3)),2.2+3.2*(.5+.5*Math.sin(t*2+.6))+2.2*Math.max(0,Math.sin(t*3)),Math.sin(t)*b*(1+.25*Math.cos(t*2))));}
   const cv=new THREE.CatmullRomCurve3(pts,true);for(const off of [-.32,.32]){const rail=new THREE.Mesh(new THREE.TubeGeometry(cv,140,.08,5,true),this.sm(R));rail.position.z=off;g.add(rail);}
   for(let i=0;i<70;i++){const p=cv.getPointAt(i/70),tg=cv.getTangentAt(i/70);const tie=this.bx(g,.1,.06,.9,p.x,p.y-.06,p.z,'#8a1c22');tie.rotation.y=Math.atan2(tg.x,tg.z)+Math.PI/2;if(i%2===0){this.cy(g,.09,.09,p.y,p.x,p.y/2,p.z,W,6);this.bx(g,.5,.2,.5,p.x,.1,p.z,'#bfb7aa');}}
   for(let i=0;i<4;i++){const p=cv.getPointAt(.05+i*.012),tg=cv.getTangentAt(.05+i*.012),c=this.bx(g,.8,.55,1.05,p.x,p.y+.4,p.z,C[i%6]);c.rotation.y=Math.atan2(tg.x,tg.z);}
   this.bx(g,4,.3,2.6,a*.2,.15,b*1.25,'#8a8f98');this.bx(g,4,.2,2.6,a*.2,3,b*1.25,R);for(const x of [-1.8,1.8])this.cy(g,.1,.1,2.8,a*.2+x,1.5,b*1.25,W,6);}
  else return null;
  g.traverse(o=>{if(o.isMesh)o.castShadow=!this.mobile;});return g;}
 bx(g,w,h,d,x,y,z,c){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),this.sm(c));o.position.set(x,y,z);g.add(o);return o;}
 // Scooter (stile Vespa), bici e monopattino: pochi pezzi, uniti per colore.
 // Moto: due ruote, telaio, serbatoio, sella, manubrio e scarico; la forma cambia col tipo (naked, enduro, custom, sportiva carenata).
 moto(col,kind='naked'){const g=new THREE.Group(),dark=this.sm('#17181c'),steel=this.sm('#c9ccd3'),eng=this.sm('#6a6e75'),paint=this.sm(col),K={naked:{wb:.74,r:.31,seat:.8,bar:1.02,tank:.92},enduro:{wb:.8,r:.34,seat:.92,bar:1.16,tank:1},cruiser:{wb:.9,r:.32,seat:.66,bar:1.08,tank:.82},sport:{wb:.74,r:.31,seat:.84,bar:.9,tank:.94}}[kind]||{wb:.74,r:.31,seat:.8,bar:1.02,tank:.92};
  // Forme tonde vere: tubi tra due punti (telaio, forcella, scarico), gusci a goccia (serbatoio, sella, codone, carena), parafanghi ad arco.
  const V=(x,y,z)=>new THREE.Vector3(x,y,z),up=V(0,1,0),T=(p,q,r,m,r2=r)=>{const dv=q.clone().sub(p),o=new THREE.Mesh(new THREE.CylinderGeometry(r2,r,dv.length(),8),m);o.position.copy(p).addScaledVector(dv,.5);o.quaternion.setFromUnitVectors(up,dv.normalize());g.add(o);return o;};
  const E=(sx,sy,sz,x,y,z,m,rx=0)=>{const o=new THREE.Mesh(new THREE.SphereGeometry(.5,12,8),m);o.scale.set(sx,sy,sz);o.position.set(x,y,z);o.rotation.x=rx;g.add(o);return o;};
  const B=(w,h,d,x,y,z,m,rx=0)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.rotation.x=rx;g.add(o);return o;};
  const fat=kind==='cruiser'?.11:.09,bar=K.wb-.38;
  for(const z of [-K.wb,K.wb]){const tw=z<0?fat+.015:fat,w=new THREE.Mesh(new THREE.TorusGeometry(K.r-tw,tw,8,20).rotateY(Math.PI/2),dark);w.position.set(0,K.r,z);const h=new THREE.Mesh(new THREE.CylinderGeometry(K.r-tw*1.7,K.r-tw*1.7,.04,14).rotateZ(Math.PI/2),steel);h.position.set(0,K.r,z);const dk=new THREE.Mesh(new THREE.CylinderGeometry(K.r*.5,K.r*.5,.015,14).rotateZ(Math.PI/2),eng);dk.position.set(.07,K.r,z);g.add(w,h,dk);
   const fe=new THREE.Mesh(new THREE.TorusGeometry(K.r+.045,.035,6,10,Math.PI*(kind==='cruiser'?.85:.6)).rotateY(Math.PI/2).rotateX(Math.PI*(z>0?(kind==='cruiser'?.1:.25):(kind==='cruiser'?.02:.05))),paint);fe.scale.x=kind==='cruiser'?3.4:2.6;fe.position.set(0,K.r,z);if(kind!=='enduro'||z<0)g.add(fe);}
  // forcella, manubrio, faro
  for(const x of [-.09,.09]){T(V(x,K.r,K.wb),V(x,K.r+(K.bar-K.r)*.55,K.wb-(K.wb-bar)*.55),.026,steel);T(V(x,K.r+(K.bar-K.r)*.5,K.wb-(K.wb-bar)*.5),V(x,K.bar-.06,bar),.036,dark);}
  const hw=kind==='cruiser'?.4:kind==='enduro'?.38:kind==='sport'?.27:.33,hz=kind==='cruiser'?bar-.14:bar;T(V(-hw,K.bar,hz),V(hw,K.bar,hz),.017,kind==='cruiser'?steel:dark);if(kind==='cruiser')for(const x of [-.1,.1])T(V(x,K.bar-.06,bar),V(x*2,K.bar,hz),.016,steel);
  for(const x of [-1,1]){T(V(x*(hw-.1),K.bar,hz),V(x*hw,K.bar,hz),.026,dark);if(kind!=='sport'){T(V(x*(hw-.08),K.bar,hz),V(x*(hw+.02),K.bar+.16,hz-.03),.008,dark);E(.1,.07,.03,x*(hw+.03),K.bar+.18,hz-.03,dark);}}
  E(.24,.24,.22,0,K.bar-.15,K.wb-.27,dark);E(.19,.19,.1,0,K.bar-.15,K.wb-.19,this.neonMat('#fff4c2'));
  // telaio, motore, scarico
  T(V(0,K.tank-.06,bar-.02),V(0,K.r+.04,.32),.03,dark);T(V(0,K.tank-.06,bar-.02),V(0,K.seat-.06,-.2),.032,dark);T(V(0,K.seat-.07,-.74),V(0,K.r+.26,-.12),.024,dark);
  for(const x of [-.1,.1])T(V(x,K.r+.1,-.1),V(x,K.r,-K.wb),.03,dark);T(V(.09,K.seat-.1,-.42),V(.1,K.r+.04,-K.wb+.1),.022,steel);
  E(.32,.34,.52,0,K.r+.2,.06,eng);for(const z of [.2,-.06]){const c=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.36,12).rotateZ(Math.PI/2),dark);c.position.set(0,K.r+.1,z);g.add(c);}
  T(V(0,K.r+.3,.14),V(0,K.tank-.14,.26),.1,eng,.09);
  const ex=x=>{T(V(x,K.r+.12,.3),V(x*1.1,K.r-.04,-.05),.028,steel);T(V(x*1.1,K.r-.04,-.05),V(x*1.2,K.r+.02,-.36),.028,steel);T(V(x*1.2,K.r+.02,-.36),V(x*1.3,K.r+(kind==='cruiser'?.04:.22),-K.wb-.08),.05,steel,.062);};ex(.15);if(kind==='cruiser')ex(-.15);
  // serbatoio, sella, codone, fanale
  E(kind==='cruiser'?.3:.34,.25,kind==='cruiser'?.5:.58,0,K.tank,.2,paint);E(.3,.12,kind==='cruiser'?.5:.66,0,K.seat,-.3,dark);
  if(kind!=='cruiser')E(.22,.13,.42,0,K.seat+.05,-.66,paint,.22);B(.12,.05,.04,0,K.seat+(kind==='cruiser'?-.04:.04),-K.wb-(kind==='cruiser'?.2:.12),this.neonMat('#e11d2e'));
  if(kind==='sport'){E(.4,.5,.72,0,K.tank-.16,.5,paint,-.4);E(.3,.24,.76,0,K.r+.12,.1,paint);E(.24,.2,.22,0,K.bar+.07,bar+.1,this.sm('#1f2c38'),-.5);}
  if(kind==='enduro'){E(.16,.07,.56,0,K.r*2+.16,K.wb+.02,paint,-.25);E(.3,.3,.08,0,K.bar+.1,bar+.12,this.sm('#1f2c38'),-.3);B(.36,.26,.32,0,K.seat+.2,-.78,dark);B(.36,.03,.34,0,K.seat+.34,-.78,eng);for(const x of [-1,1])E(.06,.1,.14,x*hw,K.bar,hz+.06,dark);}
  if(kind==='cruiser'){E(.26,.1,.34,0,K.seat+.08,-.62,dark);for(const x of [-.12,.12])T(V(x,K.seat,-.74),V(x,K.seat+.42,-.86),.012,steel);T(V(-.12,K.seat+.42,-.86),V(.12,K.seat+.42,-.86),.012,steel);E(.26,.22,.06,0,K.seat+.3,-.83,dark,-.25);}
  return this.mergeGroup(g);}
 scooter(col){const g=new THREE.Group(),dark=this.sm('#15161a'),steel=this.sm('#c9ccd3'),paint=this.sm(col),V=(x,y,z)=>new THREE.Vector3(x,y,z),up=V(0,1,0);
  // Scooter a scocca tonda: scudo curvo davanti, pedana, fianchi bombati dietro, sella lunga, manubrio con faro tondo.
  const T=(p,q,r,m,r2=r)=>{const dv=q.clone().sub(p),o=new THREE.Mesh(new THREE.CylinderGeometry(r2,r,dv.length(),8),m);o.position.copy(p).addScaledVector(dv,.5);o.quaternion.setFromUnitVectors(up,dv.normalize());g.add(o);return o;};
  const E=(sx,sy,sz,x,y,z,m,rx=0)=>{const o=new THREE.Mesh(new THREE.SphereGeometry(.5,12,8),m);o.scale.set(sx,sy,sz);o.position.set(x,y,z);o.rotation.x=rx;g.add(o);return o;};
  for(const z of [-.6,.6]){const w=new THREE.Mesh(new THREE.TorusGeometry(.15,.075,8,16).rotateY(Math.PI/2),dark);w.position.set(0,.225,z);const h=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,.1,12).rotateZ(Math.PI/2),steel);h.position.set(0,.225,z);g.add(w,h);}
  const fe=new THREE.Mesh(new THREE.TorusGeometry(.27,.04,6,10,Math.PI*.7).rotateY(Math.PI/2).rotateX(Math.PI*.2),paint);fe.scale.x=3;fe.position.set(0,.225,.6);g.add(fe);
  E(.46,.84,.15,0,.7,.47,paint,-.25);
  this.bx(g,.36,.06,.62,0,.3,.06,'#3a3f45');E(.44,.5,.86,0,.5,-.5,paint);E(.34,.12,.66,0,.82,-.4,this.sm('#2b2118'));
  T(V(0,.5,.52),V(0,1.12,.62),.035,steel);E(.2,.18,.2,0,1.16,.63,paint);T(V(-.3,1.18,.62),V(.3,1.18,.62),.018,dark);for(const x of [-1,1]){T(V(x*.2,1.18,.62),V(x*.3,1.18,.62),.026,dark);T(V(x*.22,1.18,.62),V(x*.3,1.34,.6),.008,dark);E(.09,.07,.03,x*.31,1.36,.6,dark);}
  E(.14,.14,.08,0,1.14,.73,this.neonMat('#fff6c9'));this.bx(g,.12,.05,.04,0,.6,-.93,'#e11d2e');T(V(.16,.3,-.3),V(.18,.3,-.8),.045,steel);
  return this.mergeGroup(g);}
 bike(col,kind){const g=new THREE.Group();if(kind==='cargo'||kind==='ebike'){const o=new THREE.Mesh(new THREE.BoxGeometry(kind==='cargo'?.36:.1,kind==='cargo'?.22:.3,kind==='cargo'?.3:.34),this.sm(kind==='cargo'?'#b98a55':'#17181c'));o.position.set(0,kind==='cargo'?.92:.62,kind==='cargo'?.62:0);g.add(o);}for(const z of [-.52,.52]){const w=new THREE.Mesh(this.bikeW??=new THREE.TorusGeometry(.33,.03,6,18).rotateY(Math.PI/2),this.sm('#15161a'));w.position.set(0,.36,z);g.add(w);}
  this.bx(g,.045,.045,.72,0,.8,.02,col);this.bx(g,.045,.045,.78,0,.58,.1,col).rotation.x=.62;this.bx(g,.045,.52,.045,0,.62,-.3,col);this.bx(g,.045,.045,.5,0,.4,-.42,col).rotation.x=-.12;this.bx(g,.045,.58,.045,0,.64,.46,col).rotation.x=-.2;this.bx(g,.14,.05,.26,0,.92,-.32,'#2b2118');this.bx(g,.5,.04,.04,0,.96,.4,'#2b2f36');return this.mergeGroup(g);}
 kick(col){const g=new THREE.Group();for(const z of [-.42,.42]){const w=new THREE.Mesh(this.kickW??=new THREE.CylinderGeometry(.1,.1,.06,10).rotateZ(Math.PI/2),this.sm('#15161a'));w.position.set(0,.1,z);g.add(w);}
  this.bx(g,.16,.04,.74,0,.14,-.02,col);this.bx(g,.045,.96,.045,0,.6,.4,'#8a8a92').rotation.x=-.12;this.bx(g,.42,.04,.04,0,1.08,.34,'#2b2f36');return this.mergeGroup(g);}
 // Mezzo di un giocatore, con il colore del catalogo (lo stesso del 2D).
 ride(v,color,beam){const V=VEHICLE[v];if(V?.model){const c=color||V.color,b=V.base;return b==='bici'?this.bike(c,V.model):b==='scooter'?(V.model==='scooter'?this.scooter(c):this.moto(c,V.model)):this.car(V.model,c,beam,beam);}
  const c=color||VEHICLE[v]?.color||'#2563eb';return v==='auto'?this.car('sedan',c,beam,beam):v==='cabrio'?this.car('super',c,beam,beam):v==='furgone'?this.car('van',c,beam,beam):v==='scooter'?this.scooter(c):v==='bici'?this.bike(c):v==='monopattino'?this.kick(c):null;}
 // Autobus urbano: cassa con spigoli arrotondati, finestrini separati dai montanti, parabrezza e lunotto, due porte, paraurti, fari, cerchi e display di linea.
 bus(){const g=new THREE.Group(),B=(...a)=>this.bx(g,...a),G='#1b2733',OR='#f28c28',W='#f6f2ea';
  B(2.5,.9,9.6,0,.95,0,OR);B(2.5,1.25,9.6,0,2.02,0,W);B(2.42,.16,9.3,0,2.72,0,W);B(2.56,.12,9.64,0,1.4,0,'#d9741a');B(2.56,.22,9.7,0,.52,0,'#2b2f36');
  for(let i=0;i<6;i++){const z=-3.9+i*1.32;for(const sx of [-1,1])B(.04,.82,1.12,sx*1.26,2.06,z,G);}                      // finestrini laterali
  B(2.2,1.05,.05,0,2,4.81,G);B(2.2,.8,.05,0,2.1,-4.81,G);B(1.5,.22,.06,0,2.62,4.82,'#0b0c0f');                              // parabrezza, lunotto, display
  for(const z of [3.6,-.4])B(.05,1.9,1,1.265,1.45,z,'#22303c');                                                             // porte (lato marciapiede)
  for(const sx of [-.85,.85]){const l=new THREE.Mesh(new THREE.BoxGeometry(.36,.16,.05),this.neonMat('#fff4c2'));l.position.set(sx,.8,4.82);g.add(l);const r=new THREE.Mesh(new THREE.BoxGeometry(.3,.16,.05),this.neonMat('#e11d2e'));r.position.set(sx,.9,-4.82);g.add(r);}
  for(const z of [-3,3])for(const x of [-1.15,1.15]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,.3,16).rotateZ(Math.PI/2),this.sm('#15161a'));w.position.set(x,.5,z);g.add(w);const h=new THREE.Mesh(new THREE.CylinderGeometry(.26,.26,.32,12).rotateZ(Math.PI/2),this.sm('#c9ccd3'));h.position.set(x,.5,z);g.add(h);}
  this.mergeGroup(g);g.add(this.label('HUMANA BUS',0,3.25,0,'#f28c28','#ffffff',.5));return g;}
 // Autobus e traffico del Lungomare: stesse corsie, precedenze e fermate del 2D (shared/traffic.js e busPosition).
 city(list,dt){const on=this.room==='lungomare'&&!MODE.front;if(!this.cityG){if(!on)return;this.cityG=new THREE.Group();this.dynamic.add(this.cityG);this.busO=this.bus();this.cityG.add(this.busO);this.traf=[];}this.cityG.visible=on;if(!on)return;
  const b=busPosition(this.r2d.seconds()),tr=this.r2d.traffic??=new Traffic(),LUX=['#0b0b0f','#c7ccd4','#7a0c14','#f5f5f4','#0d2a5c','#d4a73a','#1f3b2f','#d90429','#3b3f47','#e8e2d0'];
  tr.update(dt,[{...b,bus:true},...list.filter(p=>p.room==='lungomare'&&!p.seat)]);this.busO.position.set(b.x,0,b.y);this.busO.rotation.y=heading(b.direction);
  tr.entities().forEach((c,i)=>{let o=this.traf[i];if(!o){o=this.traf[i]=this.car(c.v==='furgone'?'suv':c.v==='cabrio'?'super':'sedan',LUX[i%LUX.length],true);this.cityG.add(o);}o.position.set(c.x,0,c.y);o.rotation.y=heading(c.direction);});
  if(!this.npcs){this.npcs=[];const mat=this.avatarMat??=this.toon?new THREE.MeshToonMaterial({vertexColors:true,gradientMap:this.grad}):new THREE.MeshStandardMaterial({vertexColors:true,roughness:.74,metalness:0});
   const H=STREETS.filter(q=>q.w>=q.h&&q.w>24);for(let i=0;i<Math.min(this.mobile?6:10,H.length*2);i++){const st=H[i%H.length],side=i%2?st.y+st.h+.5:st.y-.5,x0=st.x+3+(i*7)%10,x1=Math.min(st.x+st.w-3,x0+26+(i*5)%14);
    try{const AKn=this.avatarKind(),q3=AKn==='q3d'||AKn==='real',fg=q3?null:this.figure(),av={root:q3?new THREE.Group():fg.sprite},k=(i*3+1)%10,rec={};if(q3)(AKn==='real'?this.realPerson(null,'passante'+i*7):this.person(null,'passante'+i*7)).then(o=>{if(!o)return;av.root.add(o.root);rec.n.mix=o.mixer;const w=o.actions.Stroll||o.actions.Walk;if(w){w.timeScale=o.real?(1.1+(i%3)*.2)/(o.real.meta.velocita?.Stroll||1.35):.9+(i%3)*.12;w.play();}});this.cityG.add(av.root);this.npcs.push(rec.n={fg,pt:i*.03,p:{id:'passante'+i,npc:true,look:k,moving:true,avatar:{color:['#e5484d','#ffffff','#2f9e5b','#ffc928','#3b4250','#ff7ab6','#2a6fd6','#ffc928','#c9a77a','#8a5cff'][k],accessory:['none','none','cap','none','flower'][i%5],body:['regular','slim','regular','broad'][i%4],glasses:i%6===0}},av,a:x0,b:x1,z:side,x:x0+(x1-x0)*((i*37)%100)/100,dir:i%2?1:-1,v:1.1+(i%3)*.2});}catch(e){console.warn('passante',e);}}}
  for(const n of this.npcs){if(!this.blocked(n.x,n.z,.3)&&this.blocked(n.x+n.dir*.6,n.z,.3))n.dir=-n.dir;n.x+=n.dir*n.v*dt;if(n.x>n.b){n.x=n.b;n.dir=-1;}else if(n.x<n.a){n.x=n.a;n.dir=1;}const far=Math.abs(n.x-this.target.x)+Math.abs(n.z-this.target.z)>50;n.av.root.visible=!far;if(far)continue;n.av.root.position.set(n.x,this.lev(n.x,n.z),n.z);if(n.fg){n.pt+=dt;if(n.pt>=.1){n.pt=0;n.p.direction=n.dir>0?0:Math.PI;n.fg.sprite.material.color.copy(this.tint);this.paint2d(n.fg,n.p,{id:''});}}else{n.av.root.rotation.y=n.dir>0?Math.PI/2:-Math.PI/2;n.mix?.update(dt);}}}
 // Alberi disegnati dal codice: 0 = pino a ombrello (tipico del golfo), 1 = chioma tonda, 2 = cipresso.
 // Chioma: sfera deformata (bozzi irregolari) con normali morbide; trama di foglie disegnata, uguale per tutti gli alberi.
 crownG(){const dt=this.mobile||this.room==='mergellina'?1:2;(this.blobGeos??={});if(this.blobGeos[dt])return this.blobGeos[dt];const g=new THREE.IcosahedronGeometry(1,dt),p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,v=new THREE.Vector3();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const k=1+.17*Math.sin(v.x*5.1+v.y*3.3)+.13*Math.sin(v.z*6.7+v.x*2.1)+.09*Math.sin(v.y*9+v.z*4.3)-(v.y<-.5?(-.5-v.y)*.5:0);n.setXYZ(i,v.x,v.y,v.z);v.multiplyScalar(k);p.setXYZ(i,v.x,v.y,v.z);uv.setXY(i,uv.getX(i)*4,uv.getY(i)*2);}return this.blobGeos[dt]=g;}
 leafM(col){(this.leafMs??=new Map());if(this.leafMs.has(col))return this.leafMs.get(col);if(!this.leafT){const Z=256,c=document.createElement('canvas');c.width=c.height=Z;const q=c.getContext('2d');q.fillStyle='#9c9c9c';q.fillRect(0,0,Z,Z);
   for(let k=0;k<2600;k++){const x=(k*97+k*k*3)%Z,y=(k*61+k*k*7)%Z,l=k%7,a=(k*37%360)*Math.PI/180,r=3+k%4;q.fillStyle=l<2?'rgba(30,30,30,.55)':l<5?'rgba(190,190,190,.6)':'rgba(255,255,255,.75)';for(const [ox,oy] of [[0,0],[Z,0],[-Z,0],[0,Z],[0,-Z]]){q.beginPath();q.ellipse(x+ox,y+oy,r,r*.45,a,0,6.283);q.fill();}}
   const t=this.leafT=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;}
  const m=new THREE.MeshLambertMaterial({map:this.leafT,color:new THREE.Color(col).multiplyScalar(2.5)});m.userData.merge=true;this.leafMs.set(col,m);return m;}
 barkM(){if(!this.barkMat){this.barkMat=this.toon?this.sm('#6e5238'):new THREE.MeshLambertMaterial({map:this.tex('bark_brown_02','diff'),color:this.photoTint('bark_brown_02','#77593f')});this.barkMat.userData.merge=true;}return this.barkMat;}
 // Alberi veri. Ogni albero è la fotografia (davanti, di lato, dall'alto) di un modello 3D di Poly Haven (CC0) fatta con scripts/converti-modelli.mjs:
 // nel gioco sono tre piani incrociati, 12 triangoli, ma con tronco, rami e foglie fotografici. 0 = pino a ombrello, 1 = latifoglie (ulivo, albero da viale, albero basso), 2 = cipresso.
 tree(kind,seed=0){const K=kind===0?['pino',10.4,11.442/10.308,.8]:kind===2?['cipresso',7.8,1.754/8.237,0]:[['tondo',5.8,5.322/5.107,.64],['strada',6.6,5.994/4.623,.7],['basso',4.4,6.09/3.457,.62]][seed%3];return this.sagoma(K[0],+(K[1]*(1+(((seed*7)%5)-2)*.035)).toFixed(1),K[2],K[3]);}
 sagoma(name,H,asp,topAt){const W=H*asp,file={pino:'pino',cipresso:'cipresso',tondo:'albero-tondo',strada:'albero-strada',basso:'albero-basso',palma:'palma',nana:'palma-nana'}[name],mat=(k,shadow)=>{const mk=name+k;(this.sagM??=new Map());if(!this.sagM.has(mk)){const t=new THREE.TextureLoader().load(this.url('alberi/'+file+'-'+k+'.png'));t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
     const m=new THREE.MeshLambertMaterial({map:t,alphaTest:this.mobile?.42:.38,alphaToCoverage:!this.mobile});if(name==='nana')m.color.setRGB(1.25,1.22,1.1);else m.color.setRGB(2,1.95,1.8);m.userData.merge=true;m.userData.noShadow=!shadow;m.userData.outlineParameters={visible:false};this.sagM.set(mk,m);}return this.sagM.get(mk);};
  // un piano visibile dai due lati: due facce con lo stesso disegno e le normali verso l'alto (così prende la luce come il terreno e non diventa nero da dietro)
  const plane=(c,m)=>{const P=[],U=[],N=[],uv=[[0,0],[1,0],[1,1],[0,1]];for(const i of [0,1,2,0,2,3,0,2,1,0,3,2]){P.push(...c[i]);U.push(...uv[i]);N.push(0,1,0);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));const o=new THREE.Mesh(g,m);o.castShadow=!this.mobile&&!m.userData.noShadow;o.receiveShadow=false;o.userData.toon=o.userData.real=true;return o;};
  const g=new THREE.Group(),w=W/2;g.add(plane([[-w,0,0],[w,0,0],[w,H,0],[-w,H,0]],mat('front',!topAt)),plane([[0,0,w],[0,0,-w],[0,H,-w],[0,H,w]],mat('side',!topAt)));
  if(topAt){const y=H*topAt;g.add(plane([[-w,y,w],[w,y,w],[w,y,-w],[-w,y,-w]],mat('top',true)));}return g;}
 // Recinzioni delle ville (nel 2D ci sono e bloccano il passo): muretto, ringhiera di ferro, pilastri ai cancelli.
 villaFences(){if(MODE.front)return;const y=this.groundY,wall=this.sm('#f1ece2'),bars=this.railMat(),S=this.static;
  const seg=(ax,ay,bx,by)=>{const L=Math.hypot(bx-ax,by-ay),a=-Math.atan2(by-ay,bx-ax),w=new THREE.Mesh(new THREE.BoxGeometry(L,.4,.16),wall),pg=new THREE.PlaneGeometry(L,.62),uv=pg.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,uv.getX(i)*L/1.7);
   const r=new THREE.Mesh(pg,bars);w.position.set((ax+bx)/2,y+.2,(ay+by)/2);r.position.set((ax+bx)/2,y+.71,(ay+by)/2);w.rotation.y=r.rotation.y=a;S.add(w,r);};
  for(const l of VILLA_LOTS){seg(l.x,l.y,l.x+l.w,l.y);seg(l.x,l.y,l.x,l.y+l.h);seg(l.x+l.w,l.y,l.x+l.w,l.y+l.h);let x=l.x;const yb=l.y+l.h;
   for(const [a,b] of FENCE_GATES(l)){if(a>x)seg(x,yb,a,yb);for(const px of [a,b]){const p=new THREE.Mesh(new THREE.BoxGeometry(.3,1.25,.3),wall);p.position.set(px,y+.62,yb);S.add(p);}x=b;}if(x<l.x+l.w)seg(x,yb,l.x+l.w,yb);}}
 // ---- Cartelli stradali: frecce di direzione su palo (blu = città, marrone = posti da visitare) e pannelli grandi blu ----
 // Una freccia: targa a punta con il nome scritto in bianco; due facce (davanti e dietro) così si legge da tutti e due i lati.
 signMat(name,col,back){const k=name+'|'+col+'|'+back;(this.sgT??=new Map());if(this.sgT.has(k))return this.sgT.get(k);const c=document.createElement('canvas');c.width=256;c.height=52;const g=c.getContext('2d');g.fillStyle=col;g.beginPath();
  if(back){g.moveTo(2,26);g.lineTo(28,3);g.lineTo(253,3);g.lineTo(253,49);g.lineTo(28,49);}else{g.moveTo(254,26);g.lineTo(228,3);g.lineTo(3,3);g.lineTo(3,49);g.lineTo(228,49);}g.closePath();g.fill();g.strokeStyle='#ffffff';g.lineWidth=3;g.stroke();
  g.fillStyle='#ffffff';g.textBaseline='middle';g.textAlign='center';let px=25,t=name;g.font='bold '+px+'px system-ui,sans-serif';while(g.measureText(t).width>204&&px>15){px--;g.font='bold '+px+'px system-ui,sans-serif';}while(g.measureText(t).width>204&&t.length>4)t=t.slice(0,-2)+'…';g.fillText(t,back?140:116,27);
  const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;tx.anisotropy=4;const m=new THREE.MeshBasicMaterial({map:tx,alphaTest:.5});m.userData.merge=true;m.userData.outlineParameters={visible:false};this.sgT.set(k,m);return m;}
 // Palo con le frecce: list = [nome, angolo verso la destinazione, colore].
 signpost(x,y,z,list){const g=new THREE.Group(),pole=new THREE.Mesh(new THREE.CylinderGeometry(.05,.06,3.5,8),this.sm('#8a8f98'));pole.position.y=1.75;g.add(pole);this.sgF??=new THREE.PlaneGeometry(2.1,.43).translate(1.12,0,0);this.sgB??=new THREE.PlaneGeometry(2.1,.43).translate(-1.12,0,0);
  list.forEach(([name,ang,col],i)=>{const a=new THREE.Mesh(this.sgF,this.signMat(name,col,0)),b=new THREE.Mesh(this.sgB,this.signMat(name,col,1));a.position.y=b.position.y=3.2-i*.5;a.rotation.y=ang;b.rotation.y=ang+Math.PI;g.add(a,b);});g.position.set(x,y,z);return g;}
 // Pannello grande: tre destinazioni con la freccia (avanti, sinistra, destra) per chi arriva guidando lungo la strada.
 board(x,y,z,rows){const c=document.createElement('canvas');c.width=512;c.height=224;const g=c.getContext('2d');g.fillStyle='#1d4e89';g.beginPath();g.roundRect(0,0,512,224,18);g.fill();g.strokeStyle='#ffffff';g.lineWidth=7;g.beginPath();g.roundRect(8,8,496,208,13);g.stroke();
  g.fillStyle='#ffffff';g.textBaseline='middle';rows.slice(0,3).forEach(([name,arrow],i)=>{g.font='bold 46px system-ui,sans-serif';g.textAlign='center';g.fillText(arrow,52,46+i*66);g.textAlign='left';let px=36;g.font='bold '+px+'px system-ui,sans-serif';while(g.measureText(name).width>390&&px>18){px--;g.font='bold '+px+'px system-ui,sans-serif';}g.fillText(name,96,48+i*66);});
  const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;tx.anisotropy=8;const fm=new THREE.MeshBasicMaterial({map:tx});fm.userData.outlineParameters={visible:false};
  const gr=new THREE.Group(),p=new THREE.Mesh(new THREE.PlaneGeometry(3.7,1.62),fm),bk=new THREE.Mesh(new THREE.BoxGeometry(3.7,1.62,.06),this.sm('#8a8f98'));p.position.set(0,3.4,.04);bk.position.set(0,3.4,0);gr.add(p,bk);
  for(const sx of [-1.5,1.5]){const pl=new THREE.Mesh(new THREE.CylinderGeometry(.07,.08,4.2,8),this.sm('#8a8f98'));pl.position.set(sx,2.1,-.08);gr.add(pl);}gr.position.set(x,y,z);gr.rotation.y=-Math.PI/2;return gr;}
 // Cartelli del Lungomare: a ogni incrocio un palo con tre frecce verso i posti importanti; ogni quattro incroci un pannello grande.
 roadSigns(){if(MODE.front||!this.onRoad)return;const S=this.static,TUR=/Lungomare|Belvedere|Villa|Parco|Piazza|Giardino|Vicol|Porto/,dest=[];
  for(const l of LANDMARKS)if(!dest.some(q=>q[0]===l.name))dest.push([l.name,l.x,l.y,TUR.test(l.name)?'#7a4a1e':'#1d4e89']);
  for(const b of MAPS.lungomare.buildings)if(b.enterable!==false&&b.name&&b.door&&!/^(villa|residence)/.test(b.id)&&!dest.some(q=>q[0]===b.name))dest.push([b.name,b.door.x,b.door.y,'#1d4e89']);
  const H=STREETS.filter(q=>q.w>=q.h),V=STREETS.filter(q=>q.w<q.h);let n=0;
  for(const h of H)for(const v of V){if(v.x+v.w<=h.x||v.x>=h.x+h.w||h.y+h.h<=v.y||h.y>=v.y+v.h)continue;const x=v.x+v.w+.6,y=h.y+h.h+.6;if(this.onRoad(x,y))continue;
   const near=dest.map(q=>[q,Math.hypot(q[1]-x,q[2]-y)]).filter(q=>q[1]>22).sort((a,b)=>a[1]-b[1]),pick=[near[n%2],near[2+n%3],near[near.length-1-n%2]].filter(Boolean).map(q=>q[0]);
   if(n%4===3)S.add(this.board(x,this.lev(x,y),y,pick.map(q=>{const dx=q[1]-x,dz=q[2]-y;return [q[0],dx>Math.abs(dz)?'↑':dx<-Math.abs(dz)?'↓':dz>0?'→':'←'];})));
   else S.add(this.signpost(x,this.lev(x,y),y,pick.map(q=>[q[0],Math.round(Math.atan2(-(q[2]-y),q[1]-x)/(Math.PI/2))*(Math.PI/2),q[3]])));this.col.c.push([x,y,.35]);n++;}
  // Arredo urbano napoletano agli incroci: paracarri di pietra, cassonetti, edicole dei giornali, motorini in fila, fioriere. Tutto fuso in poche mesh.
  try{const G=new THREE.Group(),K=(w,h,d,x,y,z,c)=>this.bx(G,w,h,d,x,y,z,c),free=(x,y)=>!this.onRoad(x,y)&&!this.blockedStatic(x,y,.55);let m=0;
   const cyl=(r1,r2,h,x,y,z,c,seg=10)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,seg),this.sm(c));o.position.set(x,y,z);G.add(o);return o;};
   for(const h of H)for(const v of V){if(v.x+v.w<=h.x||v.x>=h.x+h.w||h.y+h.h<=v.y||h.y>=v.y+v.h)continue;m++;
    for(const [x,y] of [[v.x-.55,h.y-.55],[v.x+v.w+.55,h.y-.55],[v.x-.55,h.y+h.h+.55]]){if(!free(x,y))continue;const gy=this.lev(x,y);cyl(.13,.17,.7,x,gy+.35,y,'#8d877c');const top=new THREE.Mesh(new THREE.SphereGeometry(.15,10,6),this.sm('#8d877c'));top.position.set(x,gy+.7,y);G.add(top);this.col.c.push([x,y,.2]);}
    if(m%3===1){const x=v.x-1.9,y=h.y-1.3;if(free(x,y)&&free(x-.6,y)){const gy=this.lev(x,y);K(1.25,.95,.8,x,gy+.6,y,'#2f6b3c');K(1.32,.1,.86,x,gy+1.12,y,'#1f2a22');K(.5,.12,.05,x,gy+.75,y+.41,'#e9e1d2');for(const sx of [-.5,.5])cyl(.08,.08,.08,x+sx,gy+.08,y+.3,'#15161a',8).rotation.x=Math.PI/2;this.col.c.push([x,y,.75]);}}
    if(m%5===2){const x=v.x+v.w+2.3,y=h.y-2.1;if(free(x,y)&&free(x+.9,y+.9)&&free(x-.9,y-.9)){const gy=this.lev(x,y);cyl(1.05,1.05,2.3,x,gy+1.15,y,'#1f5a3a',8);cyl(1.45,1.2,.18,x,gy+2.4,y,'#17402a',8);const cone=new THREE.Mesh(new THREE.ConeGeometry(1.25,.7,8),this.sm('#1f5a3a'));cone.position.set(x,gy+2.85,y);G.add(cone);
      K(1.7,.08,.4,x,gy+.9,y+1.1,'#17402a');for(let k=0;k<5;k++)K(.27,.38,.04,x-.6+k*.3,gy+1.25,y+1.07,['#e5484d','#f4f1ea','#ffc928','#3fa7d6','#f4f1ea'][k]);for(let k=0;k<5;k++)K(.27,.38,.04,x-.6+k*.3,gy+1.75,y+1.07,['#3fa7d6','#ffc928','#f4f1ea','#e5484d','#2f9e5b'][k]);
      this.col.c.push([x,y,1.25]);G.add(this.label('📰 Edicola',x,gy+3.5,y,'rgba(17,24,39,.85)','#ffe9a8',.4));}}
    if(m%2===0){const x=v.x-1.4,y=h.y+h.h+1.6;if(free(x,y)){const gy=this.lev(x,y);K(1.3,.5,.5,x,gy+.25,y,'#a9a295');K(1.2,.3,.4,x,gy+.6,y,'#2f7d3a');for(let k=0;k<4;k++)K(.14,.14,.14,x-.45+k*.3,gy+.78,y,['#e5484d','#ff7ab6','#ffc928','#e5484d'][k]);this.col.c.push([x,y,.65]);}}
    if(m%4===3){const x0=v.x+v.w+1.4,y=h.y+h.h+1.5;for(let k=0;k<3;k++){const x=x0+k*.95;if(!free(x,y))break;const sc=this.scooter(['#e5484d','#3fa7d6','#f4f1ea','#2f9e5b'][(m+k)%4]);sc.position.set(x,this.lev(x,y),y);sc.rotation.y=.25;sc.updateMatrix();for(const c of [...sc.children]){c.applyMatrix4(sc.matrix);G.add(c);}this.col.c.push([x,y,.45]);}}}
   this.mergeGroup(G);for(const c of G.children)if(c.isMesh){c.castShadow=!this.mobile;c.receiveShadow=true;c.userData.toon=c.userData.real=true;}S.add(G);}catch(err){console.warn('arredo urbano',err);}}
 // C'è un ostacolo in questo punto? (cerchi = pali, alberi, auto; rettangoli = palazzi; più le auto del traffico e l'autobus)
 // Solo gli ostacoli fermi (per calcolare i percorsi): palazzi e saloni, auto parcheggiate o esposte, pali, alberi.
 // Alla guida: se il muso del mezzo sta per entrare in un palazzo o in un ostacolo fermo e si continua a spingere in avanti, il mezzo si ferma.
 carGuard(me,input){if(!(input.x||input.y))return input;const b=VEHICLE[me.vehicle]?.base||me.vehicle,L=['auto','furgone','cabrio'].includes(b)?2.5:1.1,h=Number.isFinite(me.heading)?me.heading:me.direction||0;if(!this.blockedStatic(me.x+Math.cos(h)*L,me.y+Math.sin(h)*L,.35))return input;const d=Math.atan2(input.y,input.x),df=Math.abs(Math.atan2(Math.sin(d-h),Math.cos(d-h)));return df<1.05?{...input,x:0,y:0}:input;}
 blockedStatic(x,z,r=.3){const C=this.col;if(!C)return false;for(const q of C.r)if(x>q[0]-r&&x<q[2]+r&&z>q[1]-r&&z<q[3]+r)return true;for(const q of C.c){const dx=x-q[0],dz=z-q[1],l=q[2]+r;if(dx<l&&dx>-l&&dz<l&&dz>-l&&dx*dx+dz*dz<l*l)return true;}return false;}
 blocked(x,z,r=.3){const C=this.col;if(!C)return false;for(const q of C.r)if(x>q[0]-r&&x<q[2]+r&&z>q[1]-r&&z<q[3]+r)return true;for(const q of C.c){const dx=x-q[0],dz=z-q[1],l=q[2]+r;if(dx<l&&dx>-l&&dz<l&&dz>-l&&dx*dx+dz*dz<l*l)return true;}
  if(this.room==='lungomare'&&this.cityG?.visible){for(const o of this.traf||[])if(Math.hypot(x-o.position.x,z-o.position.z)<1.7+r)return true;const b=this.busO;if(b){const a=b.rotation.y,fx=Math.sin(a),fz=Math.cos(a);for(const k of [-3,0,3])if(Math.hypot(x-b.position.x-fx*k,z-b.position.z-fz*k)<1.9+r)return true;}}return false;}
 // Movimento a piedi: se il prossimo passo finisce dentro un ostacolo ci si ferma (o si scivola di lato). "step" è la stessa regola di movimento del server.
 guard(me,input,step){if(this.blocked(me.x,me.y,.05))return input;const ok=i=>{const q={...me};try{step(q,i,.28);}catch{return true;}return !this.blocked(q.x,q.y);};if(ok(input))return input;for(const alt of [{...input,y:0},{...input,x:0}])if((alt.x||alt.y)&&ok(alt))return alt;return {...input,x:0,y:0};}
 // Castel dell'Ovo: isolotto di roccia, bastione di tufo con merli, mastio, torri e ponte verso la riva. Misure vere (circa 150 m), poi scalato.
 vesuvio(R,H,seg,o={}){const SX=o.sx??78,SZ=o.sz??-30,SH=o.sh??1,HZ=o.haze??.42;const geo=new THREE.PlaneGeometry(R*2,R*2,seg,seg);geo.rotateX(-Math.PI/2);const p=geo.attributes.position,col=[],cc=new THREE.Color(),haze=new THREE.Color(this.toon?'#a9c4e6':'#9fb4cb'),k=R/260;
  for(let i=0;i<p.count;i++){const x=p.getX(i)/k,z=p.getZ(i)/k,r=Math.hypot(x,z),a=Math.atan2(z,x),base=Math.pow(Math.max(0,1-r/260),1.7)*.62,cono=Math.pow(Math.max(0,1-r/95),1.15)*.5,rs=Math.hypot(x+SX,z+SZ),somma=(Math.pow(Math.max(0,1-rs/200),1.6)*.5+Math.pow(Math.max(0,1-rs/70),1.2)*.2)*SH;
   let y=Math.max(base+cono,somma);if(r<16)y=Math.min(y,.98+(r-16)*.012);const gully=(Math.sin(a*31+r*.05)*.5+Math.sin(a*67)*.3+Math.sin(x*.21+z*.17)*.2)*.022*Math.min(1,y*3)*(r>14?1:0);y=Math.max(0,y+gully);p.setY(i,y*H-2);
   cc.set(y<.22?'#56703f':y<.42?'#6b7048':y<.7?'#6f5f50':'#57483f');if(gully<-.008)cc.multiplyScalar(.86);cc.lerp(haze,HZ-y*.14);col.push(cc.r,cc.g,cc.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));geo.computeVertexNormals();return geo;}
 rockTex(){if(this.rockT)return this.rockT;const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.fillStyle='#f2f2f2';g.fillRect(0,0,256,256);for(let k=0;k<2600;k++){g.fillStyle=k%3?'rgba(40,60,30,.16)':'rgba(255,250,235,.14)';const s=2+k%5;g.fillRect((k*97+k*k*3)%256,(k*61+k*k*7)%256,s,s);}g.strokeStyle='rgba(50,35,25,.09)';for(let k=0;k<14;k++){g.lineWidth=1+k%3;g.beginPath();const x=(k*53)%256;g.moveTo(x,0);g.bezierCurveTo(x+12,80,x-14,170,x+6,256);g.stroke();}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(7,7);return this.rockT=t;}
 castel(k=1){const g=new THREE.Group(),LD=new THREE.TextureLoader(),dir=this.url('sky/').replace('lighting/sky/','buildings/castello/');
  // Mura vere (foto CC0 del castello): parte alta con le finestrelle ad arco, parte bassa con i merli, molo di basalto, tufo liscio.
  const M=n=>{const t=LD.load(dir+n+'.jpg');t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;const m=new THREE.MeshLambertMaterial({map:t,side:THREE.DoubleSide});m.color.setScalar(1.5);m.userData.outlineParameters={visible:false};return m;},mA=M('alto'),mB=M('basso'),mC=M('molo'),mD=M('tufo');
  // Corpo a scarpa: pianta in alto, pianta allargata in basso (bat), muro rivestito con la foto ripetuta ogni tw metri, terrazza in cima con i merli.
  const prism=(P,y0,y1,bat,mat,tw,merli)=>{const cx=P.reduce((q,p)=>q+p[0],0)/P.length,cz=P.reduce((q,p)=>q+p[1],0)/P.length,pos=[],uv=[],mg=[];let acc=0;
   for(let i=0;i<P.length;i++){const p=P[i],q=P[(i+1)%P.length],len=Math.hypot(q[0]-p[0],q[1]-p[1]),p0=[cx+(p[0]-cx)*bat,cz+(p[1]-cz)*bat],q0=[cx+(q[0]-cx)*bat,cz+(q[1]-cz)*bat],u0=acc/tw,u1=(acc+len)/tw;
    pos.push(p0[0],y0,p0[1],q0[0],y0,q0[1],q[0],y1,q[1],p0[0],y0,p0[1],q[0],y1,q[1],p[0],y1,p[1]);uv.push(u0,0,u1,0,u1,1,u0,0,u1,1,u0,1);acc+=len;
    if(merli)for(let d=1.2;d<len-1;d+=3.1){const t=d/len,bx=new THREE.BoxGeometry(1.7,1.5,1.1);bx.rotateY(-Math.atan2(q[1]-p[1],q[0]-p[0]));bx.translate(p[0]+(q[0]-p[0])*t,y1+.75,p[1]+(q[1]-p[1])*t);mg.push(bx);}}
   const w=new THREE.BufferGeometry();w.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));w.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));w.computeVertexNormals();const wm=new THREE.Mesh(w,mat);wm.castShadow=true;g.add(wm);
   const cap=new THREE.ShapeGeometry(new THREE.Shape(P.map(p=>new THREE.Vector2(p[0],p[1]))));{const u=cap.attributes.uv;for(let i=0;i<u.count;i++)u.setXY(i,u.getX(i)/11,u.getY(i)/11);}cap.rotateX(Math.PI/2);const cm=new THREE.Mesh(cap,mD);cm.position.y=y1;g.add(cm);
   if(mg.length){const mm=new THREE.Mesh(mergeGeometries(mg),mD);g.add(mm);}};
  prism([[-96,-23],[-46,-34],[42,-33],[96,-18],[100,15],[46,32],[-52,32],[-98,14]],-1,3.4,1.04,mC,14);               // scoglio e banchina di basalto
  prism([[-88,-18],[-43,-28],[38,-27],[87,-14],[90,12],[42,27],[-48,26],[-90,10]],3.4,15,1.07,mB,13.5,true);         // cinta bassa con i merli
  prism([[-74,-13],[-20,-20],[42,-18],[69,-7],[65,13],[10,19],[-70,14]],15,23.5,1.06,mA,12,true);                    // corpo alto, lungo
  for(const [x0,x1,z0,z1,h] of [[-70,-50,-11,10,32],[-42,-15,-15,5,28.5],[-9,15,-11,11,31],[23,41,-13,7,27.5],[47,61,-6,9,26]])prism([[x0,z0],[x1,z0],[x1,z1],[x0,z1]],23.5,h,1.03,mA,12,true); // corpi squadrati in cima
  prism([[72,-10],[95,-6],[94,10],[71,12]],3.4,10.5,1.05,mD,8,true);                                                 // bastione basso a est
  prism([[-24,25],[12,26],[12,40],[-24,39]],3.4,13,1.05,mD,9,true);                                                  // avancorpo d'ingresso
  // Ponte verso la riva e Borgo Marinari: banchina, case basse color pastello con tetto di cotto.
  prism([[-200,6],[-78,6],[-78,15],[-200,15]],-1,4.2,1,mC,14);
  prism([[-10,36],[96,30],[104,62],[40,74],[-14,60]],-1,2.4,1.02,mC,14);
  {const wc=document.createElement('canvas');wc.width=64;wc.height=64;const q=wc.getContext('2d');q.fillStyle='#fff';q.fillRect(0,0,64,64);for(let j=0;j<2;j++)for(let i=0;i<2;i++){q.fillStyle='#e9e4da';q.fillRect(i*32+8,j*32+6,16,20);q.fillStyle=(i+j)%2?'#2f6b4f':'#3c4c5c';q.fillRect(i*32+10,j*32+8,12,16);}
   const wt=new THREE.CanvasTexture(wc);wt.colorSpace=THREE.SRGBColorSpace;wt.wrapS=wt.wrapT=THREE.RepeatWrapping;wt.repeat.set(2,1);const roof=new THREE.MeshLambertMaterial({color:'#b9603f'});
   [[6,46,16,10,7,'#f1e3c2'],[26,44,14,11,9,'#e9b78a'],[44,44,15,10,7,'#f4d58a'],[62,42,14,10,8,'#f6efe2'],[80,42,13,10,7,'#e8a07a'],[16,60,15,9,7,'#f6efe2'],[36,62,16,9,8,'#d9886a'],[58,58,15,9,7,'#f1e3c2'],[80,56,13,9,6,'#f4d58a']].forEach(([x,z,w,d,h,c])=>{
    const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color:c,map:wt}));b.position.set(x,2.4+h/2,z);b.castShadow=true;const r=new THREE.Mesh(new THREE.ConeGeometry(1,1,4,1).rotateY(Math.PI/4),roof);r.scale.set((w+1)/Math.SQRT2,2.2,(d+1)/Math.SQRT2);r.position.set(x,2.4+h+1.1,z);g.add(b,r);});}
  // Scogli alla base.
  {const rg=new THREE.IcosahedronGeometry(1,0),im=new THREE.InstancedMesh(rg,new THREE.MeshLambertMaterial({color:'#8a8478',flatShading:true}),70),m=new THREE.Matrix4(),q=new THREE.Quaternion(),ax=new THREE.Vector3(0,1,0);
   for(let i=0;i<70;i++){const a=i/70*6.283,r=1+((i*37)%10)/40,sc=1.6+((i*53)%20)/8;q.setFromAxisAngle(ax,i*1.7);m.compose(new THREE.Vector3(Math.cos(a)*(Math.cos(a)>0?118:102)*r,-.3,Math.sin(a)*40*r-(Math.sin(a)>0?6:0)),q,new THREE.Vector3(sc*1.3,sc*.8,sc));im.setMatrixAt(i,m);}im.material.userData.outlineParameters={visible:false};im.frustumCulled=false;g.add(im);}
  g.traverse(o=>{if(o.isMesh)o.userData.toon=o.userData.real=true;});
  g.scale.setScalar(k);return g;}
 // Ombra morbida a terra sotto personaggi e mezzi (le figure sono disegni piatti e non fanno ombra vera).
 blobMat(){if(this.blobM)return this.blobM;const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),gr=x.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(0,0,0,.55)');gr.addColorStop(.6,'rgba(0,0,0,.3)');gr.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=gr;x.fillRect(0,0,64,64);
  const m=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4});m.userData.outlineParameters={visible:false};return this.blobM=m;}
 railMat(){if(this.railM)return this.railM;const c=document.createElement('canvas');c.width=128;c.height=64;const g=c.getContext('2d');g.fillStyle='#22272d';g.fillRect(0,0,128,5);g.fillRect(0,58,128,6);for(let x=2;x<128;x+=9)g.fillRect(x,0,3,64);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;t.wrapS=THREE.RepeatWrapping;const m=new THREE.MeshToonMaterial({map:t,gradientMap:this.grad,alphaTest:.25,side:THREE.DoubleSide});m.userData.outlineParameters={visible:false};m.userData.merge=true;return this.railM=m;}
 awnMat(i){(this.awnM??=[]);if(this.awnM[i])return this.awnM[i];const c=document.createElement('canvas');c.width=128;c.height=8;const g=c.getContext('2d');for(let k=0;k<16;k++){g.fillStyle=k%2?'#f4efe2':['#b3261e','#1f6f50','#1d4e89','#8a3b12'][i];g.fillRect(k*8,0,8,8);}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;const m=this.awnM[i]=new THREE.MeshToonMaterial({map:t,gradientMap:this.grad});m.userData.merge=true;return m;}
 signature(){const m=MAPS.lungomare;if(this.indoor(this.room)){const q=MAPS[this.room].props;return 'in:'+this.room+':'+q.length+':'+q.reduce((a,p)=>a+p.x+p.y*3+hash(p.kind)%97,0).toFixed(1);}if(this.room==='mergellina')return 'napoli:'+!!NAPOLI.grid;return MODE.front+':'+m.buildings.length+':'+m.props.length+':'+m.buildings.reduce((a,b)=>a+b.fx+b.fy*3,0).toFixed(1)+':'+m.props.reduce((a,p)=>a+p.x+p.y*3,0).toFixed(1);}
 seaDir(){return MODE.front?new THREE.Vector2(0,-1):new THREE.Vector2(-1,-1).normalize();}
 // Texture del terreno disegnate dal codice e ripetute: colore di base con grana e, se serve, lastre o blocchi con le fughe.
 gtex(key,o){(this.gt??=new Map());if(this.gt.has(key))return this.gt.get(key);const Z=256,c=document.createElement('canvas');c.width=c.height=Z;const g=c.getContext('2d');g.fillStyle=o.c;g.fillRect(0,0,Z,Z);
  if(o.grid){const [nx,ny]=o.grid,w=Z/nx,h=Z/ny,v0=o.var||.06;for(let j=0;j<ny;j++)for(let i=-1;i<nx;i++){const x=i*w+(o.stagger&&j%2?w/2:0),v=((i+nx)*7+j*13)%5;g.fillStyle=v<2?'rgba(255,255,255,'+v0+')':v<4?'rgba(0,0,0,'+v0+')':'rgba(0,0,0,0)';g.fillRect(x,j*h,w,h);g.strokeStyle=o.joint||'rgba(0,0,0,.28)';g.lineWidth=o.jw||2;g.strokeRect(x+.5,j*h+.5,w,h);}}
  for(let k=0;k<(o.n??700);k++){g.fillStyle=k%3?'rgba(0,0,0,'+(o.g||.08)+')':'rgba(255,255,255,'+(o.g||.08)+')';g.fillRect((k*97+k*k*3)%Z,(k*61+k*k*7)%Z,o.blade?1:2,o.blade?5:2);}
  if(o.draw)o.draw(g,Z);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;this.gt.set(key,t);return t;}
 // Altezza del terreno in un punto: marciapiedi, piazze e prati sono 12 cm sopra la strada.
 lev(x,y){return this.onRoad&&!this.onRoad(x,y)?this.groundY:0;}
 // Terreno del Lungomare: strade in basso con asfalto, mezzeria tratteggiata e strisce pedonali agli incroci;
 // marciapiedi, piazze e prati rialzati con il cordolo di pietra; ogni materiale ha la sua pavimentazione.
 ground(){const E=cityEdge(),M=24,x0=Math.floor(E.x0-M),y0=Math.floor(E.y0-M),x1=Math.ceil(E.x1+M),y1=Math.ceil(E.y1+M),W=x1-x0,H=y1-y0,SW=.12,A='#4b4f59';
  const SURF={road:[5,{c:A,n:1300,g:.1}],parking:[5,{c:'#585c66',n:1300,g:.1}],sidewalk:[2,{c:'#d9cfbb',grid:[4,4],stagger:1,joint:'rgba(90,80,65,.45)'}],curb:[2,{c:'#e6e1d6',grid:[2,2]}],
   stone:[3,{c:'#cfc6b4',grid:[3,6],stagger:1,joint:'rgba(90,80,65,.4)'}],tiles:[2,{c:'#e2dbcf',grid:[4,4]}],marble:[3,{c:'#efebe4',grid:[3,3],joint:'rgba(120,120,130,.3)',var:.03}],
   cobble:[2,{c:'#6f6a66',grid:[8,8],stagger:1,var:.12,joint:'rgba(20,20,20,.5)'}],grass:[4,{c:'#6fae52',n:1900,g:.12,blade:1}],garden:[4,{c:'#6a9a4e',n:1900,g:.14,blade:1}],
   dirt:[4,{c:'#a7845c',n:1300,g:.12}],sand:[5,{c:'#ead39f',n:1500,g:.07}],track:[4,{c:'#c0573f',n:900,g:.06}],playground:[2,{c:'#e58a4e',grid:[2,2],var:.05}],wood:[2,{c:'#a8774f',grid:[1,8],var:.1}],
   rock:[4,{c:'#8b8a86',n:1500,g:.15}],snow:[4,{c:'#f4f7fa',n:300,g:.04}],pool:[2,{c:'#4fc3e0',grid:[4,4],joint:'rgba(255,255,255,.35)',n:0}],
   line:[4,{c:'rgba(0,0,0,0)',n:0,draw:(g,Z)=>{g.fillStyle='#f1eee4';g.fillRect(Z*.44,0,Z*.12,Z*.6);}}],zebra:[1,{c:'rgba(0,0,0,0)',n:0,draw:(g,Z)=>{g.fillStyle='#f1eee4';g.fillRect(Z*.1,0,Z*.5,Z);}}]};
  const LOW=new Set(['road','roadline','crosswalk','parking','sand','pool']);
  // Materiale di una cella: null = mare (niente terreno, si vede l'acqua).
  const mat=(x,y)=>{if(!MODE.front){const sh=x+y+1;if(sh<SHORE-BEACH)return null;if(sh<SHORE)return 'sand';}const m=surface(x,y);return m==='water'?null:m;};
  const grid=new Array(W*H),low=new Uint8Array(W*H);for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const m=mat(x,y),i=(y-y0)*W+(x-x0);grid[i]=m;low[i]=!m||LOW.has(m)?1:0;}
  const at=(x,y)=>x>=x0&&y>=y0&&x<x1&&y<y1?grid[(y-y0)*W+(x-x0)]:null,isLow=(x,y)=>x<x0||y<y0||x>=x1||y>=y1||low[(y-y0)*W+(x-x0)]===1,roadish=m=>m==='road'||m==='roadline'||m==='crosswalk';
  this.groundY=SW;this.onRoad=(x,y)=>isLow(Math.floor(x),Math.floor(y));
  const B={},Q=(k,ax0,az0,ax1,az1,y,ax)=>{const b=B[k]??={p:[],u:[],i:[]},o=b.p.length/3,S=SURF[k][0];b.p.push(ax0,y,az0,ax1,y,az0,ax1,y,az1,ax0,y,az1);
   if(ax==='x')b.u.push(0,ax0/S,0,ax1/S,az1-az0,ax1/S,az1-az0,ax0/S);else if(ax==='y')b.u.push(0,az0/S,ax1-ax0,az0/S,ax1-ax0,az1/S,0,az1/S);else b.u.push(ax0/S,-az0/S,ax1/S,-az0/S,ax1/S,-az1/S,ax0/S,-az1/S);b.i.push(o,o+2,o+1,o,o+3,o+2);};
  const cp=[];
  for(let y=y0;y<y1;y++){let x=x0;while(x<x1){const m=at(x,y);let e=x+1;if(!m){x=e;continue;}
    if(m==='roadline'||m==='crosswalk'){let k=x;while(at(k,y)===m)k++;const alongX=m==='roadline'?(at(x-1,y)===m||at(x+1,y)===m):roadish(at(k,y));Q('road',x,y,e,y+1,.012);Q(m==='roadline'?'line':'zebra',x,y,e,y+1,.03,alongX?'x':'y');x=e;continue;}
    while(e<x1&&at(e,y)===m)e++;Q(SURF[m]?m:'stone',x,y,e,y+1,LOW.has(m)?.012:SW);x=e;}}
  // Cordolo: faccia verticale tra una cella rialzata e una bassa (strada, sabbia, piscina, mare).
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){if(isLow(x,y))continue;if(isLow(x,y-1))cp.push(x,0,y,x+1,0,y,x+1,SW,y,x,0,y,x+1,SW,y,x,SW,y);if(isLow(x,y+1))cp.push(x,0,y+1,x+1,0,y+1,x+1,SW,y+1,x,0,y+1,x+1,SW,y+1,x,SW,y+1);
   if(isLow(x-1,y))cp.push(x,0,y,x,0,y+1,x,SW,y+1,x,0,y,x,SW,y+1,x,SW,y);if(isLow(x+1,y))cp.push(x+1,0,y,x+1,0,y+1,x+1,SW,y+1,x+1,0,y,x+1,SW,y+1,x+1,SW,y);}
  // Segnaletica delle strade: mezzeria tratteggiata e strisce pedonali prima di ogni incrocio.
  if(!MODE.front)for(const s of STREETS){const hz=s.w>=s.h,L=hz?s.w:s.h,Wd=hz?s.h:s.w,a0=hz?s.x:s.y,c0=hz?s.y:s.x;if(Wd<3||L<8)continue;
   const cell=(t,c)=>hz?at(a0+t,c):at(c,a0+t),inter=t=>t<0||t>=L?false:roadish(cell(t,c0-1))||roadish(cell(t,c0+Wd)),put=(k,t0,t1,c1,c2,ax)=>hz?Q(k,a0+t0,c1,a0+t1,c2,.03,ax):Q(k,c1,a0+t0,c2,a0+t1,.03,ax);
   for(let t=0;t<L;t++){const here=inter(t);if(t>0&&here!==inter(t-1)){if(here)put('zebra',t-3,t-.5,c0+.3,c0+Wd-.3,hz?'x':'y');else put('zebra',t+.5,t+3,c0+.3,c0+Wd-.3,hz?'x':'y');}
    if(Wd>=4&&!here&&![-4,-3,-2,-1,1,2,3,4].some(d=>inter(t+d)))put('line',t,t+1,c0+Wd/2-.5,c0+Wd/2+.5,hz?'x':'y');}}
  for(const [k,b] of Object.entries(B)){const gm=new THREE.BufferGeometry();gm.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));gm.setAttribute('uv',new THREE.Float32BufferAttribute(b.u,2));gm.setIndex(b.i);gm.computeVertexNormals();
   const over=k==='line'||k==='zebra',ph=!this.toon&&{road:['clean_asphalt','#50535b'],parking:['clean_asphalt','#5e626a'],cobble:['square_cobblestone','#7d766c'],tiles:['marble_tiles','#c9c2b4'],marble:['marble_tiles','#dcd7cd'],stone:['large_sandstone_blocks','#b5ac98'],sidewalk:['pavement_02','#c6bca8'],curb:['pavement_02','#d6d1c5'],sand:['coast_sand_01','#e2cc9a'],grass:['leafy_grass','#6c9a4c'],garden:['leafy_grass','#5d8a44']}[k],mesh=new THREE.Mesh(gm,!this.toon&&k==='sidewalk'?this.basoliMat(.95):!this.toon&&(k==='tiles'||k==='marble'||k==='stone')?this.basoliMat(.95,k==='marble'?[1.62,1.58,1.5]:k==='stone'?[1.42,1.36,1.24]:[1.5,1.44,1.33]):ph?this.photo(ph[0],ph[1]):new THREE.MeshToonMaterial({map:this.gtex(k,SURF[k][1]),gradientMap:this.grad,transparent:over,depthWrite:!over,polygonOffset:over,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));mesh.material.userData.outlineParameters={visible:false};mesh.receiveShadow=true;mesh.userData.toon=true;this.static.add(mesh);}
  {const gm=new THREE.BufferGeometry();gm.setAttribute('position',new THREE.Float32BufferAttribute(cp,3));gm.computeVertexNormals();const mesh=new THREE.Mesh(gm,new THREE.MeshToonMaterial({color:'#a8a297',gradientMap:this.grad,side:THREE.DoubleSide}));mesh.material.userData.outlineParameters={visible:false};mesh.userData.toon=true;this.static.add(mesh);}
  if(!MODE.front)try{this.roadDecals();}catch(err){console.warn('tombini',err);}
  // Mare infinito e terra oltre la città.
  this.static.add(this.sea(4000,-.06));
  if(!MODE.front){const S=SHORE-BEACH,ax=x0,az=S-x0,bx=S-y0,bz=y0,L=Math.hypot(bx-ax,bz-az),k=1/Math.SQRT2,wd=1.8,gm=new THREE.BufferGeometry();
   gm.setAttribute('position',new THREE.Float32BufferAttribute([ax+k*wd,.03,az+k*wd,bx+k*wd,.03,bz+k*wd,bx-k*wd,.03,bz-k*wd,ax-k*wd,.03,az-k*wd],3));gm.setAttribute('uv',new THREE.Float32BufferAttribute([0,1,L/8,1,L/8,0,0,0],2));gm.setIndex([0,1,2,0,2,3]);
   this.foam=new THREE.Mesh(gm,this.foamMat());this.foam.userData.toon=true;this.foam.renderOrder=1;this.static.add(this.foam);}
  const d=this.seaDir(),cx=(E.x0+E.x1)/2,cy=(E.y0+E.y1)/2,shore=MODE.front?new THREE.Vector2(cx,F.SEA):new THREE.Vector2(SHORE/2,SHORE/2);
  const land=new THREE.Mesh(new THREE.PlaneGeometry(4000,2000),new THREE.MeshLambertMaterial({color:'#79a957'}));land.rotation.x=-Math.PI/2;land.rotation.z=-Math.atan2(-d.y,-d.x)+Math.PI/2;
  land.position.set(shore.x-d.x*1000,-.03,shore.y-d.y*1000);this.static.add(land);this.center=new THREE.Vector2(cx,cy);}
 // Mergellina: pontili del porticciolo con barche ormeggiate e, in fondo, la collina di Posillipo con le ville.
 mergellina(){const d=this.seaDir(),T=new THREE.Vector2(-d.y,d.x),S=MODE.front?new THREE.Vector2(this.center.x,F.SEA):new THREE.Vector2(SHORE/2,SHORE/2);
  const stone=this.sm('#cfc3ad'),wood=this.sm('#8a6a4a');this.boats=[];
  const ang=Math.atan2(d.x,d.y);
  for(const t of MODE.front?[-120,-40,60]:[-28,-6,16]){const base=S.clone().addScaledVector(T,t),L=30;if(!this.pierM){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');for(let j=0;j<8;j++){const h=hash('tavola'+j);g.fillStyle=['#9b7a55','#8d6e4b','#a5845e','#94734f'][h%4];g.fillRect(0,j*16,128,16);g.fillStyle='rgba(40,25,10,.55)';g.fillRect(0,j*16,128,1.5);for(let k=0;k<14;k++){g.fillStyle='rgba(60,40,20,.12)';g.fillRect((h*(k+3)*17)%128,j*16+3+(k%4)*3,20+k*3,1);}g.fillStyle='rgba(30,20,10,.5)';for(const x of [10,118]){g.beginPath();g.arc(x,j*16+8,1.6,0,6.3);g.fill();}}const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;tx.wrapS=tx.wrapT=THREE.RepeatWrapping;tx.repeat.set(1,L/1.6);tx.anisotropy=8;const side=new THREE.MeshLambertMaterial({color:'#8d887d'}),top=new THREE.MeshLambertMaterial({map:tx});this.pierM=[side,side,top,side,side,side];}
   const pier=new THREE.Mesh(new THREE.BoxGeometry(3.4,.7,L),this.pierM);pier.userData.keep=true;
   for(const sd of [-1,1]){const fb=new THREE.Mesh(new THREE.BoxGeometry(.12,.16,L),this.sm('#22252b'));fb.position.set(base.x+d.x*L/2+T.x*sd*1.74,.44,base.y+d.y*L/2+T.y*sd*1.74);fb.rotation.y=ang;this.static.add(fb);}
   pier.position.set(base.x+d.x*L/2,.2,base.y+d.y*L/2);pier.rotation.y=ang;pier.receiveShadow=true;this.static.add(pier);
   for(let k=4;k<L;k+=5)for(const sd of [-1,1]){const bp=base.clone().addScaledVector(d,k).addScaledVector(T,sd*3.6),b=this.boat(hash(t+':'+k+':'+sd));b.position.set(bp.x,0,bp.y);b.rotation.y=ang+(sd>0?0:Math.PI);this.static.add(b);this.boats.push(b);
    const bol=new THREE.Mesh(new THREE.CylinderGeometry(.12,.15,.5,8),wood);const q=base.clone().addScaledVector(d,k).addScaledVector(T,sd*1.6);bol.position.set(q.x,.75,q.y);this.static.add(bol);}}
  this.static.add(this.label('Porticciolo di Mergellina',S.x+T.x*-6+d.x*2,4.6,S.y+T.y*-6+d.y*2,'#0f3b57','#fff',.8));
  // Posillipo: collina verde lungo la costa con ville colorate e pini.
  const hp=S.clone().addScaledVector(T,MODE.front?-330:-230).addScaledVector(d,90),hill=new THREE.Mesh(new THREE.SphereGeometry(1,32,16),new THREE.MeshLambertMaterial({color:'#5f8a46'}));
  hill.scale.set(70,38,150);hill.position.set(hp.x,-8,hp.y);hill.rotation.y=Math.atan2(T.x,T.y);this.static.add(hill);
  const cols=['#efe0b9','#d9a35b','#e8b26a','#f3f0e8','#c96f4a'],pine=this.sm('#2f5d34');
  for(let i=0;i<46;i++){const a=(i*137.5)%360*Math.PI/180,r=.25+((i*29)%60)/100,lx=Math.cos(a)*r*60,lz=Math.sin(a)*r*140,yy=38*Math.sqrt(Math.max(0,1-(lx/70)**2-(lz/150)**2))-8;
   const v=new THREE.Vector3(lx,0,lz).applyAxisAngle(new THREE.Vector3(0,1,0),hill.rotation.y);
   if(i%3){const h=new THREE.Mesh(new THREE.BoxGeometry(5,4,4),this.sm(cols[i%cols.length]));h.position.set(hp.x+v.x,yy+1.5,hp.y+v.z);h.rotation.y=a;this.static.add(h);}
   else{const p=new THREE.Mesh(new THREE.SphereGeometry(2.6,8,6),pine);p.scale.y=.55;p.position.set(hp.x+v.x,yy+4,hp.y+v.z);this.static.add(p);}}}
 // Minimappa di Mergellina: immagine della mappa fatta una volta sola, poi solo ritagliata attorno al giocatore.
 minimap(cv,players,me,size){if(!NAPOLI.grid)return;if(!this.miniImg){const {w,h,grid}=NAPOLI,c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d'),im=x.createImageData(w,h);for(let i=0;i<w*h;i++){const on=grid[i>>3]&(1<<(i&7)),k=i*4;im.data[k]=on?236:52;im.data[k+1]=on?224:132;im.data[k+2]=on?196:201;im.data[k+3]=255;}x.putImageData(im,0,0);
   x.strokeStyle='#8a8f9c';x.lineCap='round';for(const r of NAPOLI.data.roads){if(['footway','steps','path'].includes(r.k))continue;x.lineWidth=Math.max(2,r.w*.8);x.beginPath();r.p.forEach((q,i)=>{const X=q[0]-NAPOLI.x0,Y=q[1]-NAPOLI.y0;if(i)x.lineTo(X,Y);else x.moveTo(X,Y);});x.stroke();}this.miniImg=c;}
  const g=cv.getContext('2d'),W=cv.width,H=cv.height,view=size?600:260,k=W/view;g.fillStyle='#3484c9';g.fillRect(0,0,W,H);
  g.drawImage(this.miniImg,(me.x-NAPOLI.x0)-view/2,(me.y-NAPOLI.y0)-view*H/W/2,view,view*H/W,0,0,W,H);
  for(const p of players){if(p.room!=='mergellina')continue;g.fillStyle=p.id===me.id?'#1e90ff':'#ffd23f';g.beginPath();g.arc(W/2+(p.x-me.x)*k,H/2+(p.y-me.y)*k,p.id===me.id?5:4,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=2;g.stroke();}}
 // Copie identiche (palme, lampioni, tavolini) in un'unica InstancedMesh per pezzo: una sola chiamata di disegno per tipo.
 instanced(tpl,list){if(!tpl||!list.length)return;tpl.updateMatrixWorld(true);const inv=new THREE.Matrix4().copy(tpl.matrixWorld).invert(),M=new THREE.Matrix4(),R=new THREE.Matrix4(),local=new THREE.Matrix4();
  // Divise a zone di 100 m: così si disegnano solo le zone davanti alla telecamera e vicine.
  const zones=new Map();for(const e of list){const k=Math.floor(e[0]/100)+','+Math.floor(e[1]/100);(zones.get(k)||zones.set(k,[]).get(k)).push(e);}
  tpl.traverse(o=>{if(!o.isMesh)return;local.multiplyMatrices(inv,o.matrixWorld);for(const part of zones.values()){const im=new THREE.InstancedMesh(o.geometry,o.material,part.length);part.forEach(([x,z,r=0,y],i)=>{R.makeRotationY(r);M.makeTranslation(x,y??(this.groundY||0),z).multiply(R).multiply(local);im.setMatrixAt(i,M);});im.computeBoundingSphere();im.castShadow=!this.mobile&&!o.material.userData?.noShadow;im.receiveShadow=true;im.userData.zone=true;this.static.add(im);}});}
 // ---- Mergellina vera (OpenStreetMap) in stile cartone ----
 async buildNapoli(id){const D=NAPOLI.data;if(!D)return;await this.preload();const {x0,y0,w:W,h:H}=NAPOLI;this.boats=[];
  this.scene.fog.near=420;this.scene.fog.far=3400;this.camera.far=9000;this.camera.updateProjectionMatrix();
  this.static.add(this.sea(16000,-.3));
  // Panorama vero da Posillipo a Castel dell'Ovo (fuori dalla zona dove si cammina): terraferma ricavata dalla linea di costa vera,
  // colline di Posillipo e del Vomero, città sullo sfondo con i tetti di cotto, alberi della Villa Comunale, scogliera lungo la riva.
  {const CO=D.coast[0],cut=CO.findIndex(q=>q[0]>3000),cs=(cut>0?CO.slice(0,cut):CO).filter((_,i)=>i%2===0),poly=[...cs,[3000,-3600],[-4600,-3600],[-4600,cs[0][1]]];
   this.landFn=(x,y)=>land(x,y);const land=(x,y)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const p=poly[i],q=poly[j];if((p[1]>y)!==(q[1]>y)&&x<(q[0]-p[0])*(y-p[1])/(q[1]-p[1])+p[0])c=!c;}return c;};
   const dco=(x,y)=>{let d=1e12;for(const q of cs){const e=(q[0]-x)**2+(q[1]-y)**2;if(e<d)d=e;}return Math.sqrt(d);};
   const hillH=(x,y)=>{if(!land(x,y))return -1;const n=Math.max(0,(y0-40)-y),wst=Math.max(0,(x0-40)-x),k=1+.18*Math.sin(x*.004+y*.007)+.12*Math.sin(x*.011-y*.009);return Math.max(Math.min(175,n*.32),Math.min(150,wst*.3))*k*Math.min(1,dco(x,y)/350);};
   {const sg=new THREE.ShapeGeometry(new THREE.Shape(poly.map(q=>new THREE.Vector2(q[0],q[1]))));sg.rotateX(Math.PI/2);const m=new THREE.Mesh(sg,new THREE.MeshLambertMaterial({color:'#8e8a82',side:THREE.DoubleSide}));m.position.y=-.03;m.userData.toon=m.userData.real=true;m.material.userData.outlineParameters={visible:false};this.static.add(m);}
   const G=new THREE.PlaneGeometry(8000,8000,150,150);G.rotateX(-Math.PI/2);G.translate(x0+W/2,0,y0+H/2+400);const p=G.attributes.position,c=[],cc=new THREE.Color();
   for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getZ(i),h=hillH(x,y);p.setY(i,h>2?h:-3);const v=(Math.sin(x*.05)*Math.cos(y*.043)+1)/2;cc.set(h>120?'#6f8a57':'#5f8a4c').lerp(new THREE.Color('#8a9a63'),v*.5);c.push(cc.r,cc.g,cc.b);}
   G.setAttribute('color',new THREE.Float32BufferAttribute(c,3));G.computeVertexNormals();const hm=new THREE.Mesh(G,new THREE.MeshLambertMaterial({vertexColors:true}));hm.userData.toon=hm.userData.real=true;hm.material.userData.outlineParameters={visible:false};this.static.add(hm);
   // Città di sfondo: palazzi color pastello con finestre e tetto di cotto (un solo disegno per tutti).
   const wc=document.createElement('canvas');wc.width=128;wc.height=160;{const g=wc.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,128,160);for(let j=0;j<5;j++)for(let i=0;i<4;i++){g.fillStyle='#e9e4da';g.fillRect(i*32+8,j*32+6,16,22);g.fillStyle=(i*3+j*5)%4?'#3c4c5c':'#2f6b4f';g.fillRect(i*32+10,j*32+8,12,18);}g.fillStyle='rgba(0,0,0,.12)';for(let j=1;j<5;j++)g.fillRect(0,j*32-1,128,2);}
   const wt2=this.fac?new THREE.Texture(this.fac[3]):new THREE.CanvasTexture(wc);wt2.colorSpace=THREE.SRGBColorSpace;if(this.fac){wt2.wrapS=wt2.wrapT=THREE.RepeatWrapping;wt2.repeat.set(8,3);wt2.needsUpdate=true;}const bg=new THREE.BoxGeometry(1,1,1).translate(0,.5,0);{const nn=bg.attributes.normal,ca=[];for(let i=0;i<nn.count;i++){if(nn.getY(i)>.5)ca.push(.78,.42,.3);else ca.push(1,1,1);}bg.setAttribute('color',new THREE.Float32BufferAttribute(ca,3));}
   const sp=this.mobile?74:52,NB=this.mobile?1800:4200,NT=this.mobile?300:650,im=new THREE.InstancedMesh(bg,new THREE.MeshLambertMaterial({vertexColors:true,map:wt2}),NB),tg=new THREE.IcosahedronGeometry(1,1),tm=new THREE.InstancedMesh(tg,this.leafM('#3f7a3f'),NT),M=new THREE.Matrix4(),Q=new THREE.Quaternion(),Y=new THREE.Vector3(0,1,0),PAL=this.fac?['#ffffff','#ffe6cc','#fff0c0','#ffe2cc','#fff6e6','#ffd8c8','#ffeeda','#f8eed8']:['#f1e3c2','#e9b78a','#f4d58a','#e8a07a','#f6efe2','#d9886a','#f0c9a0','#e6d3b0'];let k=0,kt=0;
   {const nn=tg.attributes.normal,pp=tg.attributes.position;for(let i=0;i<pp.count;i++)nn.setXYZ(i,pp.getX(i),pp.getY(i),pp.getZ(i));}
   for(let gy=-1750;gy<2750;gy+=sp)for(let gx=-2350;gx<3050;gx+=sp){const hh=hash(gx+':'+gy),x=gx+(hh%23)-11,y=gy+((hh>>5)%23)-11;if(x>x0-20&&x<x0+W+20&&y>y0-20&&y<y0+H+20)continue;if(!land(x,y))continue;const d=dco(x,y);if(d<30)continue;if(Math.hypot(x-2546,y-220)<240||!(land(x+48,y)&&land(x-48,y)&&land(x,y+48)&&land(x,y-48)))continue;
     if(x>880&&x<2100&&d<175){if(kt<NT){Q.setFromAxisAngle(Y,hh%6);M.compose(new THREE.Vector3(x,7+hh%3,y),Q,new THREE.Vector3(9+hh%5,6+hh%3,9+(hh>>3)%5));tm.setMatrixAt(kt++,M);}continue;}
     if(k>=NB)continue;const h=Math.max(0,hillH(x,y)),sx=22+hh%14,sz=20+(hh>>4)%13,sy=13.2+((hh>>7)%5)*3.3-(h>60?4:0);Q.setFromAxisAngle(Y,((hh>>9)%5)*.35);M.compose(new THREE.Vector3(x,h-1.5,y),Q,new THREE.Vector3(sx,sy,sz));im.setMatrixAt(k,M);im.setColorAt(k,cc.set(PAL[hh%PAL.length]));k++;}
   if(this.fac)try{const roofM=new THREE.MeshLambertMaterial({color:'#b9a58c'}),mats=[0,1,2,3].map(n=>{const t=new THREE.Texture(this.fac[n]);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,2);t.needsUpdate=true;const m=new THREE.MeshLambertMaterial({map:t});m.color.setScalar(1.25);return [m,m,roofM,roofM,m,m];});
    let acc=0,n=0;for(let i=1;i<cs.length;i++){const a=cs[i-1],b=cs[i],L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<1)continue;const mx=(a[0]+b[0])/2;if(mx<2080||mx>2900||Math.hypot(mx-2546,(a[1]+b[1])/2-220)<150){acc=0;continue;}
     for(let d=64-acc;d<L;d+=64){const t=d/L,px=a[0]+(b[0]-a[0])*t,py=a[1]+(b[1]-a[1])*t;let nx=-(b[1]-a[1])/L,ny=(b[0]-a[0])/L;if(!land(px+nx*45,py+ny*45)){nx=-nx;ny=-ny;}if(!land(px+nx*45,py+ny*45)||!land(px+nx*75,py+ny*75))continue;
      const hh=hash('albergo'+n),w=54,dp=24,h=24+(hh%4)*3.3,box=new THREE.Mesh(new THREE.BoxGeometry(w,h,dp),mats[n%4]);box.position.set(px+nx*46,h/2-.5,py+ny*46);box.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);box.castShadow=false;box.userData.toon=box.userData.real=true;this.static.add(box);n++;}
     acc=(acc+L)%64;}}catch(err){console.warn('alberghi',err);}
   try{const spot=[[1180,-158],[1172,-160],[1186,-166],[1162,-166],[1150,-170]].find(([x,y])=>land(x,y)&&land(x+9,y)&&land(x-9,y)&&land(x,y+9)&&land(x,y-9));if(spot){const g=new THREE.Group(),K=(w,h,d,x,y,z,c)=>this.bx(g,w,h,d,x,y,z,c);K(16,.5,16,0,.25,0,'#cfc8b8');K(11,.6,11,0,.8,0,'#d8d1c1');K(7,1.4,7,0,1.8,0,'#e2dccd');K(3.6,13,3.2,0,9,-.6,'#e9e3d5');K(4.4,.5,4,0,15.7,-.6,'#d8d1c1');K(2.2,1.6,3.4,0,3.3,2.2,'#e2dccd');K(.8,1.5,2.2,0,4.9,2.3,'#4a5a4c');K(.7,1.3,.7,0,6.2,2.5,'#4a5a4c');const hd=new THREE.Mesh(new THREE.SphereGeometry(.36,10,8),this.sm('#4a5a4c'));hd.position.set(0,7.1,2.6);g.add(hd);this.mergeGroup(g);g.position.set(spot[0],0,spot[1]);g.traverse(o=>{if(o.isMesh)o.userData.toon=o.userData.real=true;});this.static.add(g);}}catch(err){console.warn('monumento',err);}
   im.count=k;tm.count=kt;for(const o of [im,tm]){o.instanceMatrix.needsUpdate=true;if(o.instanceColor)o.instanceColor.needsUpdate=true;o.userData.toon=o.userData.real=true;o.frustumCulled=false;this.static.add(o);}im.material.userData.outlineParameters={visible:false};
   // Scogliera: massi lungo la riva, da Mergellina fino al castello.
   const rgq=new THREE.IcosahedronGeometry(1,0),NR=this.mobile?1000:2600,rk=new THREE.InstancedMesh(rgq,new THREE.MeshLambertMaterial(),NR);{const pp=rgq.attributes.position,nn=rgq.attributes.normal,v=new THREE.Vector3();for(let i=0;i<pp.count;i++){v.fromBufferAttribute(pp,i);nn.setXYZ(i,v.x,v.y,v.z);v.multiplyScalar(1+.22*Math.sin(v.x*4.1+v.y*2.7)+.16*Math.sin(v.z*5.3+v.x*1.9));pp.setXYZ(i,v.x,v.y,v.z);}}
   const open=(x,y,nx,ny)=>{for(let d=6;d<=160;d+=6)if(napoliCell(x+nx*d,y+ny*d))return false;return !land(x+nx*30,y+ny*30)&&!land(x+nx*110,y+ny*110);};let kr=0,acc=0;
   for(let i=1;i<cs.length&&kr<NR;i++){const A=cs[i-1],B=cs[i];if(Math.max(A[0],B[0])<-1100||Math.min(A[0],B[0])>2950)continue;const L=Math.hypot(B[0]-A[0],B[1]-A[1]);if(L<.5)continue;let nx=-(B[1]-A[1])/L,ny=(B[0]-A[0])/L;const mx=(A[0]+B[0])/2,my=(A[1]+B[1])/2;if(land(mx+nx*8,my+ny*8)){nx=-nx;ny=-ny;}
    for(;acc<L&&kr<NR;acc+=this.mobile?4.5:2.6){const t=acc/L,hh=hash(i+':'+Math.round(acc*3)),o=.8+(hh%70)/10,x=A[0]+(B[0]-A[0])*t+nx*o,y=A[1]+(B[1]-A[1])*t+ny*o;if(napoliCell(x,y)||!open(x,y,nx,ny))continue;const sc=.55+(hh%12)/10;Q.setFromAxisAngle(Y,hh%6);M.compose(new THREE.Vector3(x,-.2+(hh%5)*.12,y),Q,new THREE.Vector3(sc*1.25,sc*.8,sc));rk.setMatrixAt(kr,M);rk.setColorAt(kr,cc.set(['#8d8a84','#7b7872','#9c988f','#6f6c67'][hh%4]));kr++;}acc-=L;}
   {const NP=this.mobile?1400:3000,pwG=(()=>{const tint=(q,v)=>{const n=q.attributes.position.count,a=new Float32Array(n*3).fill(v);q.setAttribute('color',new THREE.BufferAttribute(a,3));return q;},b=tint(new THREE.BoxGeometry(.4,.84,2.08).translate(0,.42,0),.9),c=tint(new THREE.BoxGeometry(.54,.13,2.08).translate(0,.9,0),1.25),u=b.attributes.uv;for(let i=0;i<u.count;i++)u.setXY(i,u.getX(i)*.9,u.getY(i)*.4);return mergeGeometries([b,c]);})(),pwT=this.tex('large_sandstone_blocks','diff'),pw=new THREE.InstancedMesh(pwG,(m=>{m.color.setRGB(2.1,1.95,1.7);return m;})(new THREE.MeshLambertMaterial({map:pwT,vertexColors:true})),NP);let kp=0,ac=0;
    for(let i=1;i<cs.length&&kp<NP;i++){const A=cs[i-1],B=cs[i];if(Math.max(A[0],B[0])<x0||Math.min(A[0],B[0])>x0+W)continue;const L=Math.hypot(B[0]-A[0],B[1]-A[1]);if(L<.5)continue;let nx=-(B[1]-A[1])/L,ny=(B[0]-A[0])/L;if(land((A[0]+B[0])/2+nx*8,(A[1]+B[1])/2+ny*8)){nx=-nx;ny=-ny;}
     for(;ac<L&&kp<NP;ac+=2){const t=ac/L,x=A[0]+(B[0]-A[0])*t-nx*.8,y=A[1]+(B[1]-A[1])*t-ny*.8;if(!napoliCell(x-nx*1.5,y-ny*1.5)||napoliCell(x+nx*4,y+ny*4))continue;Q.setFromAxisAngle(Y,Math.atan2(B[0]-A[0],B[1]-A[1]));M.compose(new THREE.Vector3(x,.12,y),Q,new THREE.Vector3(1,1,1));pw.setMatrixAt(kp++,M);}ac-=L;}
    for(let cy=1;cy<H-1;cy++)for(let cx=1;cx<W-1;cx++){const x=x0+cx+.5,y=y0+cy+.5;if(!napoliCell(x,y))continue;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){if(napoliCell(x+dx,y+dy)||!open(x+dx*2,y+dy*2,dx,dy))continue;
      if(kp<NP){Q.setFromAxisAngle(Y,dx?0:Math.PI/2);M.compose(new THREE.Vector3(x+dx*.25,.12,y+dy*.25),Q,new THREE.Vector3(1,1,.5));pw.setMatrixAt(kp++,M);}
      const hh=hash(cx+':'+cy);if(hh%5<3&&kr<NR){const o=1.6+(hh%40)/10,j=((hh>>4)%20)/10-1,sc=.6+(hh%13)/10;Q.setFromAxisAngle(Y,hh%6);M.compose(new THREE.Vector3(x+dx*o-dy*j,-.25+(hh%5)*.1,y+dy*o+dx*j),Q,new THREE.Vector3(sc*1.25,sc*.8,sc));rk.setMatrixAt(kr,M);rk.setColorAt(kr,cc.set(['#8d8a84','#7b7872','#9c988f','#6f6c67'][hh%4]));kr++;}
      break;}}
    pw.count=kp;pw.instanceMatrix.needsUpdate=true;pw.userData.toon=pw.userData.real=true;pw.frustumCulled=false;pw.castShadow=!this.mobile;this.static.add(pw);}
   rk.count=kr;rk.instanceMatrix.needsUpdate=true;if(rk.instanceColor)rk.instanceColor.needsUpdate=true;rk.userData.toon=rk.userData.real=true;rk.frustumCulled=false;rk.material.userData.outlineParameters={visible:false};this.static.add(rk);}
  // Terreno: celle calpestabili color marciapiede, mare trasparente; sopra parchi e strade disegnati dalla mappa.
  // Strade e marciapiedi veri: carreggiate in geometria (asfalto, strisce), marciapiedi rialzati di 12 cm a lastre, cordolo di pietra.
  const SW=this.groundY=.12,car=r=>!['footway','steps','path','cycleway','pedestrian'].includes(r.k),main=r=>['primary','secondary','tertiary','trunk'].includes(r.k),roads=D.roads.filter(car);
  // Maschera 1 m: dove passa una carreggiata (serve per i buchi nel marciapiede, i cordoli e l'altezza dei personaggi).
  {const rc=document.createElement('canvas');rc.width=W;rc.height=H;const g=rc.getContext('2d');g.strokeStyle='#fff';g.lineCap=g.lineJoin='round';for(const r of roads){g.lineWidth=r.w;g.beginPath();r.p.forEach((q,i)=>i?g.lineTo(q[0]-x0,q[1]-y0):g.moveTo(q[0]-x0,q[1]-y0));g.stroke();}
   const d=g.getImageData(0,0,W,H).data;this.roadGrid=new Uint8Array(W*H);for(let i=0;i<W*H;i++)this.roadGrid[i]=d[i*4+3]>100?1:0;}
  const roadAt=(x,y)=>{const cx=Math.floor(x)-x0,cy=Math.floor(y)-y0;return cx>=0&&cy>=0&&cx<W&&cy<H&&this.roadGrid[cy*W+cx]===1;};this.onRoad=roadAt;
  // Marciapiede: lastre ripetute (2 m) + maschera alfa (calpestabile, meno le carreggiate).
  let baseCv;const S=2,cv=document.createElement('canvas');cv.width=W*S;cv.height=H*S;{const c=cv.getContext('2d'),im=c.createImageData(W,H);for(let i=0;i<W*H;i++)if(NAPOLI.grid[i>>3]&(1<<(i&7))){im.data[i*4]=im.data[i*4+1]=im.data[i*4+2]=255;im.data[i*4+3]=255;}
   const tmp=document.createElement('canvas');tmp.width=W;tmp.height=H;tmp.getContext('2d').putImageData(im,0,0);baseCv=tmp;c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(tmp,0,0,W*S,H*S);
   c.globalCompositeOperation='destination-out';c.strokeStyle='#000';c.lineCap=c.lineJoin='round';for(const r of roads){c.lineWidth=(r.w+.5)*S;c.beginPath();r.p.forEach((q,i)=>{const X=(q[0]-x0)*S,Y=(q[1]-y0)*S;if(i)c.lineTo(X,Y);else c.moveTo(X,Y);});c.stroke();}}
  const alpha=new THREE.CanvasTexture(cv);alpha.minFilter=THREE.LinearFilter;
  const pav=document.createElement('canvas');pav.width=pav.height=256;{const g=pav.getContext('2d');for(let j=0;j<4;j++)for(let i=0;i<4;i++){const t=(i*7+j*13)%5;g.fillStyle=['#ddd2bd','#d6cab4','#e2d8c4','#d9cdb7','#e0d5c0'][t];g.fillRect(i*64+(j%2)*32,j*64,64,64);g.fillRect(i*64+(j%2)*32-256,j*64,64,64);}
   g.strokeStyle='#a99d88';g.lineWidth=3;for(let j=0;j<=4;j++){g.beginPath();g.moveTo(0,j*64);g.lineTo(256,j*64);g.stroke();for(let i=0;i<=4;i++){g.beginPath();g.moveTo(i*64+(j%2)*32,j*64);g.lineTo(i*64+(j%2)*32,j*64+64);g.stroke();}}
   for(let k=0;k<400;k++){g.fillStyle=k%2?'rgba(0,0,0,.05)':'rgba(255,255,255,.06)';g.fillRect((k*97)%256,(k*61)%256,2,2);}}
  const pt=new THREE.CanvasTexture(pav);pt.colorSpace=THREE.SRGBColorSpace;pt.wrapS=pt.wrapT=THREE.RepeatWrapping;pt.repeat.set(W/2,H/2);pt.anisotropy=8;
  const photo=()=>{const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');g.fillStyle='#63625f';g.fillRect(0,0,512,512);const G=['#8f8f8c','#9a9996','#878785','#a2a19d','#93928f','#8a8a88'];for(let j=0;j<8;j++)for(let i=-1;i<6;i++){const x=i*102.4+(j%2)*51.2,y=j*64,h=hash('basolo'+i+':'+j);g.fillStyle=G[h%6];g.fillRect(x+1.5,y+1.5,99.4,61);g.fillStyle='rgba(255,255,255,.07)';g.fillRect(x+1.5,y+1.5,99.4,3);g.fillStyle='rgba(0,0,0,.08)';g.fillRect(x+1.5,y+58,99.4,4.5);}for(let k=0;k<2600;k++){g.fillStyle=k%2?'rgba(0,0,0,.07)':'rgba(255,255,255,.06)';g.fillRect((k*197)%512,(k*131)%512,2,2);}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(W/3.2,H/3.2);t.anisotropy=8;return t;},ground=new THREE.Mesh(new THREE.PlaneGeometry(W,H),new THREE.MeshToonMaterial({map:this.toon?pt:photo(),color:this.toon?'#ffffff':'#f2f0ea',alphaMap:alpha,alphaTest:.5,gradientMap:this.grad}));ground.rotation.x=-Math.PI/2;ground.position.set(x0+W/2,SW,y0+H/2);ground.receiveShadow=true;ground.userData.toon=true;this.static.add(ground);
  {const bt=new THREE.CanvasTexture(baseCv);bt.minFilter=THREE.LinearFilter;const base=new THREE.Mesh(new THREE.PlaneGeometry(W,H),new THREE.MeshToonMaterial({color:'#4b4f59',alphaMap:bt,alphaTest:.5,gradientMap:this.grad}));base.material.userData.outlineParameters={visible:false};base.rotation.x=-Math.PI/2;base.position.set(x0+W/2,.004,y0+H/2);base.userData.toon=true;this.static.add(base);}
  // Parchi: prato rialzato come il marciapiede.
  {const gm=new THREE.MeshToonMaterial({color:'#7cc35a',gradientMap:this.grad});for(const pk of D.parks){if(pk.length<4)continue;const sg=new THREE.ShapeGeometry(new THREE.Shape(pk.map(q=>new THREE.Vector2(q[0],q[1]))));sg.rotateX(Math.PI/2);const m=new THREE.Mesh(sg,gm);m.position.y=SW+.01;m.material.side=THREE.DoubleSide;m.userData.toon=true;this.static.add(m);}}
  // Asfalto: grana e segni dei pneumatici; le strade principali hanno le linee di bordo e la mezzeria tratteggiata.
  const asph=lines=>{const c=document.createElement('canvas');c.width=128;c.height=256;const g=c.getContext('2d');g.fillStyle='#4b4f59';g.fillRect(0,0,128,256);for(let k=0;k<900;k++){g.fillStyle=k%3?'rgba(0,0,0,.12)':'rgba(255,255,255,.07)';g.fillRect((k*53)%128,(k*97)%256,2,2);}
   g.fillStyle='rgba(0,0,0,.10)';g.fillRect(26,0,16,256);g.fillRect(86,0,16,256);if(lines){g.fillStyle='#f4f1e8';g.fillRect(5,0,4,256);g.fillRect(119,0,4,256);g.fillRect(62,0,4,128);}
   const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;};
  const curbs=[],ribbon={main:[[],[]],minor:[[],[]]};
  for(const r of roads){const set=ribbon[main(r)?'main':'minor'],[P,U]=set,w2=r.w/2;let acc=0;const sn=[];for(let i=1;i<r.p.length;i++){const a=r.p[i-1],b=r.p[i],l=Math.hypot(b[0]-a[0],b[1]-a[1])||1;sn.push([-(b[1]-a[1])/l,(b[0]-a[0])/l]);}
   const mit=j=>{const A=sn[Math.max(0,j-1)],B=sn[Math.min(sn.length-1,j)];let mx=A[0]+B[0],my=A[1]+B[1];const l=Math.hypot(mx,my)||1;mx/=l;my/=l;const k=1/Math.max(.6,mx*B[0]+my*B[1]);return [mx*k,my*k];};
   for(let i=1;i<r.p.length;i++){const a=r.p[i-1],b=r.p[i],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(len<.05)continue;const nx=-dy/len,ny=dx/len,v0=acc/4,v1=(acc+len)/4;
    P.push(a[0]+nx*w2,.01,a[1]+ny*w2,b[0]+nx*w2,.01,b[1]+ny*w2,b[0]-nx*w2,.01,b[1]-ny*w2,a[0]+nx*w2,.01,a[1]+ny*w2,b[0]-nx*w2,.01,b[1]-ny*w2,a[0]-nx*w2,.01,a[1]-ny*w2);U.push(0,v0,0,v1,1,v1,0,v0,1,v1,1,v0);
    // Raccordo rotondo sul vertice (asfalto pieno, senza strisce).
    for(let k=0;k<8;k++){const t0=k/8*Math.PI*2,t1=(k+1)/8*Math.PI*2;P.push(b[0],.012,b[1],b[0]+Math.cos(t0)*w2,.012,b[1]+Math.sin(t0)*w2,b[0]+Math.cos(t1)*w2,.012,b[1]+Math.sin(t1)*w2);U.push(.3,v1,.3+Math.cos(t0)*.03,v1+Math.sin(t0)*.03,.3+Math.cos(t1)*.03,v1+Math.sin(t1)*.03);}
    // Cordolo sui due lati, solo dove oltre il bordo non c'è un'altra carreggiata (niente cordoli in mezzo agli incroci).
    const m0=mit(i-1),m1=mit(i);for(const sd of [1,-1]){let run=null;const steps=Math.max(1,Math.floor(len));for(let k=0;k<=steps;k++){const t=k/steps,ex=a[0]+dx*t+(m0[0]+(m1[0]-m0[0])*t)*w2*sd,ey=a[1]+dy*t+(m0[1]+(m1[1]-m0[1])*t)*w2*sd,ok=k<steps&&!roadAt(ex+nx*sd*1.3,ey+ny*sd*1.3)&&napoliCell(ex+nx*sd*1.3,ey+ny*sd*1.3);
      if(ok&&!run)run=[ex,ey];else if(!ok&&run){curbs.push([run[0],run[1],ex,ey,nx*sd,ny*sd]);run=null;}}}
    acc+=len;}}
  for(const [key,lines] of [['main',true],['minor',false]]){const [P,U]=ribbon[key];if(!P.length)continue;const gm=new THREE.BufferGeometry();gm.setAttribute('position',new THREE.Float32BufferAttribute(P,3));gm.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));gm.computeVertexNormals();
   const pbrRoad=!this.toon&&!this.mobile,nt=pbrRoad&&this.tex('clean_asphalt','nor').clone(),rt=pbrRoad&&this.tex('clean_asphalt','rough').clone();if(pbrRoad)for(const t of [nt,rt]){t.repeat.set(3.4,1.6);t.needsUpdate=true;}
   const m=new THREE.Mesh(gm,pbrRoad?new THREE.MeshStandardMaterial({map:asph(lines),normalMap:nt,roughnessMap:rt,roughness:1,metalness:0,envMapIntensity:.35,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:lines?-2:-1}):new THREE.MeshToonMaterial({map:asph(lines),gradientMap:this.grad,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:lines?-2:-1}));m.receiveShadow=true;m.userData.toon=true;if(pbrRoad)m.userData.real=true;this.static.add(m);}
  // Strisce pedonali: dove due carreggiate si incontrano, qualche metro prima dell'incrocio.
  {const cnt=new Map(),key=q=>Math.round(q[0]*2)+','+Math.round(q[1]*2);for(const r of roads){const seen=new Set();for(const q of r.p){const k=key(q);if(!seen.has(k)){seen.add(k);cnt.set(k,(cnt.get(k)||0)+1);}}}
   const P=[],U=[],done=new Set(),put=(cx,cy,tx,ty,hw)=>{const k=Math.round(cx/4)+','+Math.round(cy/4);if(done.has(k)||done.size>500||!roadAt(cx,cy))return;done.add(k);const c=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([e,t])=>[cx+tx*1.3*e-ty*hw*t,cy+ty*1.3*e+tx*hw*t]);for(const i of [0,2,1,0,3,2]){P.push(c[i][0],.02,c[i][1]);U.push(i>1?hw*2:0,i===1||i===2?1:0);}};
   const along=(r,j,dir,D)=>{let acc=0,i=j;for(;;){const k=i+dir;if(k<0||k>=r.p.length)return null;const a=r.p[i],b=r.p[k],l=Math.hypot(b[0]-a[0],b[1]-a[1]);if(l>0&&acc+l>=D){const t=(D-acc)/l;return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,(b[0]-a[0])/l,(b[1]-a[1])/l];}acc+=l;i=k;}};
   for(const r of roads){if(r.w<5)continue;r.p.forEach((q,j)=>{if(cnt.get(key(q))<2)return;for(const dir of [-1,1]){const z=along(r,j,dir,6.5);if(z)put(z[0],z[1],z[2],z[3],r.w/2-.3);}});}
   if(P.length){const gm=new THREE.BufferGeometry();gm.setAttribute('position',new THREE.Float32BufferAttribute(P,3));gm.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));gm.computeVertexNormals();
    const zm=new THREE.Mesh(gm,new THREE.MeshToonMaterial({map:this.gtex('zebraN',{c:'rgba(0,0,0,0)',n:0,draw:(g,Z)=>{g.fillStyle='#f1eee4';g.fillRect(Z*.1,0,Z*.5,Z);}}),gradientMap:this.grad,side:THREE.DoubleSide,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));zm.material.userData.outlineParameters={visible:false};zm.userData.toon=true;zm.receiveShadow=true;this.static.add(zm);}}
  {const P=[],C=[],side=new THREE.Color('#9a958c'),top=new THREE.Color('#e9e4da');const add=(ax,ay,az,bx,by,bz,cx,cy,cz,dx2,dy2,dz,col)=>{P.push(ax,ay,az,bx,by,bz,cx,cy,cz,ax,ay,az,cx,cy,cz,dx2,dy2,dz);for(let k=0;k<6;k++)C.push(col.r,col.g,col.b);};
   for(const [ax,ay,bx,by,nx,ny] of curbs){const h=SW+.02,tx=nx*.65,ty=ny*.65;add(ax,0,ay,bx,0,by,bx,h,by,ax,h,ay,side);add(ax,h,ay,bx,h,by,bx+tx,h,by+ty,ax+tx,h,ay+ty,top);}
   const gm=new THREE.BufferGeometry();gm.setAttribute('position',new THREE.Float32BufferAttribute(P,3));gm.setAttribute('color',new THREE.Float32BufferAttribute(C,3));gm.computeVertexNormals();const m=new THREE.Mesh(gm,new THREE.MeshToonMaterial({vertexColors:true,gradientMap:this.grad,side:THREE.DoubleSide}));m.userData.toon=true;m.receiveShadow=true;this.static.add(m);}
  // Palazzi: pareti estruse dalle piante vere (UV in metri: una finestra ogni 2,6 m, un piano ogni 3,3 m), tetti piani.
  const win=document.createElement('canvas');win.width=512;win.height=640;{const g=win.getContext('2d');
   for(let v=0;v<4;v++){const bal=v===0||v===3,closed=v===2,gh=bal?160:150;g.save();g.translate((v%2)*256,(v>>1)*320);
    g.fillStyle='#ffffff';g.fillRect(0,0,256,320);g.fillStyle='rgba(0,0,0,.035)';for(let k=0;k<40;k++)g.fillRect((k*53+v*31)%256,(k*97)%320,26,12);
    g.fillStyle='#e9e2d6';g.fillRect(0,306,256,14);g.fillStyle='rgba(0,0,0,.12)';g.fillRect(0,303,256,3);
    g.fillStyle='#f6f1e6';g.fillRect(66,58,124,gh+26);g.fillRect(56,48,144,12);
    const gr=g.createLinearGradient(84,76,172,236);gr.addColorStop(0,'#9cc3dd');gr.addColorStop(.5,'#3f5b70');gr.addColorStop(1,'#1d2a35');g.fillStyle=gr;g.fillRect(84,76,88,gh);
    g.fillStyle='rgba(255,255,255,.2)';g.fillRect(90,82,30,gh-12);g.fillStyle='#f4efe4';g.fillRect(126,76,4,gh);g.fillRect(84,126,88,4);g.fillStyle='rgba(0,0,0,.3)';g.fillRect(84,76,88,5);
    g.fillStyle=['#2f7a52','#3d5a80','#2f7a52','#7a4a2a'][v];if(closed)g.fillRect(84,76,88,gh);else{g.fillRect(42,76,40,gh);g.fillRect(174,76,40,gh);}
    g.fillStyle='rgba(0,0,0,.22)';for(let y=84;y<76+gh-4;y+=9){if(closed)g.fillRect(84,y,88,3);else{g.fillRect(42,y,40,3);g.fillRect(174,y,40,3);}}
    if(bal){g.fillStyle='#e8e2d6';g.fillRect(44,236,168,12);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(44,248,168,5);g.fillStyle='#22272d';g.fillRect(44,194,168,5);for(let x=46;x<=210;x+=14)g.fillRect(x,198,3,40);}
    else{g.fillStyle='#f1ebdf';g.fillRect(70,228,116,10);g.fillStyle='rgba(0,0,0,.22)';g.fillRect(70,238,116,5);}
    if(v===3){g.fillStyle='#b3261e';g.beginPath();g.moveTo(60,60);g.lineTo(196,60);g.lineTo(212,104);g.lineTo(44,104);g.fill();g.fillStyle='rgba(255,255,255,.65)';for(let x=62;x<200;x+=28)g.fillRect(x,60,12,44);}
    g.restore();}}
  const gf=document.createElement('canvas');gf.width=128;gf.height=128;{const g=gf.getContext('2d');g.fillStyle='#b8b1a6';g.fillRect(0,0,128,128);g.fillStyle='#8f877c';g.fillRect(0,104,128,24);g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=2;for(let y=8;y<104;y+=16){g.beginPath();g.moveTo(0,y);g.lineTo(128,y);g.stroke();}
   g.fillStyle='#3a3530';g.beginPath();g.moveTo(30,104);g.lineTo(30,44);g.arc(64,44,34,Math.PI,0);g.lineTo(98,104);g.fill();g.fillStyle='#6d8fa8';g.beginPath();g.moveTo(36,98);g.lineTo(36,46);g.arc(64,46,28,Math.PI,0);g.lineTo(92,98);g.fill();g.strokeStyle='#e9e2d6';g.lineWidth=4;g.beginPath();g.arc(64,44,36,Math.PI,0);g.stroke();g.fillStyle='rgba(255,255,255,.25)';g.fillRect(40,52,14,40);}
  const gt=new THREE.CanvasTexture(this.fac?(()=>{const c=document.createElement('canvas');c.width=270;c.height=415;const q=c.getContext('2d');q.drawImage(this.fac[4],0,740,270,415,0,0,270,415);q.globalCompositeOperation='screen';q.fillStyle='rgba(255,244,225,.16)';q.fillRect(0,0,270,415);return c;})():gf);gt.colorSpace=THREE.SRGBColorSpace;gt.wrapS=gt.wrapT=THREE.RepeatWrapping;
  const wt=new THREE.CanvasTexture(win);wt.colorSpace=THREE.SRGBColorSpace;wt.wrapS=wt.wrapT=THREE.RepeatWrapping;wt.anisotropy=8;wt.repeat.set(.5,.5);
  const COL=['#f2c46b','#e8875f','#f4d9a0','#f0a37c','#fbe7c2','#d86a4f','#f6b65e','#e9cfa8','#f3e3b5','#c95b45','#ffd98a','#f1b49c'].map(hx=>new THREE.Color(hx));
  // Tratto campione (qualità di riferimento): palazzi entro 70 m dal punto d'arrivo, con profondità vera. Gli altri restano con la facciata fotografica piatta (livello di dettaglio lontano).
  // Livello di dettaglio: BL = elenco dei palazzi con i pezzi di muro piatto che gli appartengono (per nasconderli quando compare la facciata vera).
  const BL=[],FM={},spos=[];
  const pos=[],uv=[],col=[],rpos=[],rcol=[],gpos=[],guv=[],ppos=[],pcol=[],FV=this.fac?this.fac.map(()=>({pos:[],uv:[]})):null;
  for(const b of D.buildings){const pts=b.p;if(pts.length<3)continue;const area=Math.abs(pts.reduce((a,q,i)=>{const n=pts[(i+1)%pts.length];return a+q[0]*n[1]-n[0]*q[1];},0)/2);if(area<12)continue;
   const sd=hash(pts[0][0]+','+pts[0][1]),lv=b.lv||((()=>{if(!this.landFn)return false;const cx=pts.reduce((q,p)=>q+p[0],0)/pts.length,cy=pts.reduce((q,p)=>q+p[1],0)/pts.length;let n=0;for(let a=0;a<8;a++)if(!this.landFn(cx+Math.cos(a*.785)*30,cy+Math.sin(a*.785)*30))n++;return n>=4;})()?1:area<60?2+sd%2:4+sd%3),h=lv*3.3+.8,cl=COL[sd%COL.length],fn0=(sd>>3)%8,fv0=FV&&FV[fn0];
   const rec={pts,lv,sd,wc:[cl.r*1.25,cl.g*1.25,cl.b*1.25],cx:pts.reduce((q,p)=>q+p[0],0)/pts.length,cy:pts.reduce((q,p)=>q+p[1],0)/pts.length},w0=(fv0?fv0.pos.length:pos.length)/3,g0=gpos.length/3;rec.rad=Math.max(...pts.map(p=>Math.hypot(p[0]-rec.cx,p[1]-rec.cy)));BL.push(rec);
   for(let i=0;i<pts.length;i++){const a=pts[i],n=pts[(i+1)%pts.length],L=Math.hypot(n[0]-a[0],n[1]-a[1]);if(L<.3)continue;const u1=Math.max(1,Math.round(L/2.6)),v1=h/3.3;
    const G0=3.6,ug=Math.max(1,Math.round(L/(FV?2.6:3.2))),v2=(h-G0)/3.3,fn=(sd>>3)%8,fv=FV&&FV[fn];gpos.push(a[0],0,a[1],n[0],0,n[1],n[0],G0,n[1],a[0],0,a[1],n[0],G0,n[1],a[0],G0,a[1]);guv.push(0,0,ug,0,ug,1,0,0,ug,1,0,1);
    if(fv){const ub=Math.max(1,Math.round(L/(fn>3?2.5:3.2))),vv=(h-G0)/6.6;fv.pos.push(a[0],G0,a[1],n[0],G0,n[1],n[0],h,n[1],a[0],G0,a[1],n[0],h,n[1],a[0],h,a[1]);fv.uv.push(0,0,ub,0,ub,vv,0,0,ub,vv,0,vv);}
    else{pos.push(a[0],G0,a[1],n[0],G0,n[1],n[0],h,n[1],a[0],G0,a[1],n[0],h,n[1],a[0],h,a[1]);uv.push(0,0,u1,0,u1,v2,0,0,u1,v2,0,v2);for(let k=0;k<6;k++)col.push(cl.r,cl.g,cl.b);}
    spos.push(a[0],0,a[1],n[0],0,n[1],n[0],h,n[1],a[0],0,a[1],n[0],h,n[1],a[0],h,a[1]);}
   rec.r=[[fv0?'f'+fn0:'w',w0,(fv0?fv0.pos.length:pos.length)/3-w0],['g',g0,gpos.length/3-g0]];
   // Cornicione sporgente e parapetto del terrazzo (fascia chiara in cima al palazzo).
   {let sa=0;for(let i=0;i<pts.length;i++){const q=pts[i],n=pts[(i+1)%pts.length];sa+=q[0]*n[1]-n[0]*q[1];}const sg=sa>0?1:-1;rec.sg=sg;const pc=cl.clone().lerp(new THREE.Color('#ffffff'),.5),o=.18,p0=h-.4,p1=h+.75;
    for(let i=0;i<pts.length;i++){const a=pts[i],n=pts[(i+1)%pts.length],L=Math.hypot(n[0]-a[0],n[1]-a[1]);if(L<.3)continue;const ox=(n[1]-a[1])/L*sg*o,oy=-(n[0]-a[0])/L*sg*o,ax=a[0]+ox,ay=a[1]+oy,bx=n[0]+ox,by=n[1]+oy;
     ppos.push(ax,p0,ay,bx,p0,by,bx,p1,by,ax,p0,ay,bx,p1,by,ax,p1,ay,ax,p1,ay,bx,p1,by,n[0],p1,n[1],ax,p1,ay,n[0],p1,n[1],a[0],p1,a[1],a[0],p0,a[1],n[0],p0,n[1],bx,p0,by,a[0],p0,a[1],bx,p0,by,ax,p0,ay);for(let k=0;k<18;k++)pcol.push(pc.r,pc.g,pc.b);}}
   const rg=new THREE.ShapeGeometry(new THREE.Shape(pts.map(q=>new THREE.Vector2(q[0],q[1])))).toNonIndexed();rg.rotateX(Math.PI/2);rg.translate(0,h,0);const ra=rg.attributes.position,rc=cl.clone().multiplyScalar(.82);
   for(let k=0;k<ra.count;k++){rpos.push(ra.getX(k),ra.getY(k),ra.getZ(k));rcol.push(rc.r,rc.g,rc.b);}}
  const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));wg.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));wg.setAttribute('color',new THREE.Float32BufferAttribute(col,3));wg.computeVertexNormals();
  // Finestre accese di sera: maschera di 4×4 finestre (alcune accese) usata come luce propria della facciata.
  const ew=document.createElement('canvas');ew.width=128;ew.height=160;{const g=ew.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,128,160);g.fillStyle='#fff';for(let j=0;j<4;j++)for(let i=0;i<4;i++)if((i*7+j*5+i*j)%5<2&&!(i%2===0&&j%2===1))g.fillRect(i*32+10.5,j*40+9.5,11,20);}
  const et=new THREE.CanvasTexture(ew);et.wrapS=et.wrapT=THREE.RepeatWrapping;et.repeat.set(.25,.25);
  const walls=new THREE.Mesh(wg,new THREE.MeshToonMaterial({map:wt,vertexColors:true,gradientMap:this.grad,side:THREE.DoubleSide,emissive:'#ffcf7a',emissiveMap:et,emissiveIntensity:0}));walls.material.userData.glow=1;this.glow.add(walls.material);walls.castShadow=walls.receiveShadow=!this.mobile;walls.userData.toon=true;this.static.add(walls);FM.w=walls;
  if(FV)FV.forEach((b,n)=>{if(!b.pos.length)return;const B=n>3,sw=B?270:290,sh=B?740:600,c=document.createElement('canvas');c.width=sw;c.height=sh;const q=c.getContext('2d');q.drawImage(this.fac[n],0,0,sw,sh,0,0,sw,sh);q.globalCompositeOperation='screen';q.fillStyle='rgba(255,244,225,.18)';q.fillRect(0,0,sw,sh);
   const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;
   const e=document.createElement('canvas');e.width=64;e.height=128;{const g=e.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,64,128);g.fillStyle='#fff';for(let cx=0;cx<2;cx++)for(let fl=0;fl<4;fl++)if((cx*3+fl*5+n)%5<2)g.fillRect(cx*32+11.5,fl*32+32*(B?.14:.24),9.5,32*(B?.5:.38));}
   const em=new THREE.CanvasTexture(e);em.wrapS=em.wrapT=THREE.RepeatWrapping;em.repeat.set(.5,.5);
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));g.computeVertexNormals();
   const m=new THREE.Mesh(g,new THREE.MeshToonMaterial({map:t,gradientMap:this.grad,side:THREE.DoubleSide,emissive:'#ffcf7a',emissiveMap:em,emissiveIntensity:0}));m.material.userData.glow=1;this.glow.add(m.material);m.castShadow=m.receiveShadow=!this.mobile;m.userData.toon=true;this.static.add(m);FM['f'+n]=m;});
  {const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.Float32BufferAttribute(gpos,3));gg.setAttribute('uv',new THREE.Float32BufferAttribute(guv,2));gg.computeVertexNormals();const gm=new THREE.Mesh(gg,new THREE.MeshToonMaterial({map:gt,gradientMap:this.grad,side:THREE.DoubleSide}));gm.userData.toon=true;gm.receiveShadow=true;this.static.add(gm);FM.g=gm;}
  {const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(spos,3));const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}));m.userData.toon=m.userData.real=true;this.static.add(m);this.solid.push(m);}
  // Gestore del dettaglio: i palazzi più vicini al giocatore (12 su PC, 6 su telefono) mostrano la facciata con profondità vera; gli altri il muro piatto.
  // Ogni facciata si calcola una volta sola e resta in memoria (le ultime 70); cambiare l'insieme costa solo una copia di numeri.
  {const KEYS=['pl','bg','gl','sh','ir','dr','fl','ao'],M=this.facadeMats(),DM={},FO={},cache=new Map();let cur=new Set(),last=null;
   for(const k of KEYS){const m=new THREE.Mesh(new THREE.BufferGeometry(),M[k]);m.visible=false;m.userData.toon=m.userData.real=true;m.castShadow=!this.mobile&&k!=='ao'&&k!=='gl';m.receiveShadow=k!=='ao';if(k==='ao')m.renderOrder=2;m.frustumCulled=false;this.static.add(m);DM[k]=m;}
   const pip=(Q,x,y)=>{let c=false;for(let i=0,j=Q.length-1;i<Q.length;j=i++){const p=Q[i],q=Q[j];if((p[1]>y)!==(q[1]>y)&&x<(q[0]-p[0])*(y-p[1])/(q[1]-p[1])+p[0])c=!c;}return c;},touch=(b,x,y)=>BL.some(o=>o!==b&&Math.hypot(o.cx-x,o.cy-y)<o.rad+1&&pip(o.pts,x,y));
   const gen=b=>{let c=cache.get(b);if(c)return c;const FB={};for(const k of KEYS)FB[k]={p:[],u:[],c:[]};const P=b.pts;for(let i=0;i<P.length;i++){const a=P[i],n=P[(i+1)%P.length],L=Math.hypot(n[0]-a[0],n[1]-a[1]);if(L<.3)continue;const nx=(n[1]-a[1])/L*b.sg,ny=-(n[0]-a[0])/L*b.sg,tx=(n[0]-a[0])/L,ty=(n[1]-a[1])/L;this.facadeDetail(FB,a,n,nx,ny,b.lv,b.sd+i*7,b.wc,{blind:u=>touch(b,a[0]+tx*u+nx*.8,a[1]+ty*u+ny*.8)});}
    c={};for(const k of KEYS){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(FB[k].p,3));g.computeVertexNormals();c[k]={p:g.attributes.position.array,n:g.attributes.normal?g.attributes.normal.array:new Float32Array(0),u:new Float32Array(FB[k].u),c:new Float32Array(FB[k].c)};}
    cache.set(b,c);if(cache.size>70)cache.delete(cache.keys().next().value);return c;};
   const patch=(b,hide)=>{for(const [k,s0,n] of b.r){const m=FM[k];if(!m||!n)continue;const at=m.geometry.attributes.position;FO[k]??=at.array.slice();if(hide)at.array.fill(0,s0*3,(s0+n)*3);else at.array.set(FO[k].subarray(s0*3,(s0+n)*3),s0*3);at.needsUpdate=true;}};
   this.lod=(x,y)=>{if(last&&Math.hypot(x-last[0],y-last[1])<16)return;last=[x,y];const R=this.mobile?45:70,N=this.mobile?6:12,want=new Set(BL.map(b=>[b,Math.hypot(b.cx-x,b.cy-y)-b.rad]).filter(q=>q[1]<R).sort((p,q)=>p[1]-q[1]).slice(0,N).map(q=>q[0]));
    let ch=false;for(const b of cur)if(!want.has(b)){ch=true;patch(b,false);}for(const b of want)if(!cur.has(b)){ch=true;patch(b,true);}if(!ch)return;cur=want;
    for(const k of KEYS){const parts=[...want].map(b=>gen(b)[k]),np=parts.reduce((q,p)=>q+p.p.length,0),P=new Float32Array(np),Nn=new Float32Array(np),U=new Float32Array(np/3*2),C=new Float32Array(np);let o=0;for(const q of parts){P.set(q.p,o);Nn.set(q.n,o);U.set(q.u,o/3*2);C.set(q.c,o);o+=q.p.length;}
     const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setAttribute('normal',new THREE.BufferAttribute(Nn,3));g.setAttribute('uv',new THREE.BufferAttribute(U,2));if(M[k].vertexColors)g.setAttribute('color',new THREE.BufferAttribute(C,3));DM[k].geometry.dispose();DM[k].geometry=g;DM[k].visible=np>0;}
    this.gl.shadowMap.needsUpdate=true;};}
  const rgm=new THREE.BufferGeometry();rgm.setAttribute('position',new THREE.Float32BufferAttribute(rpos,3));rgm.setAttribute('color',new THREE.Float32BufferAttribute(rcol,3));rgm.computeVertexNormals();
  const roofs=new THREE.Mesh(rgm,new THREE.MeshToonMaterial({vertexColors:true,gradientMap:this.grad,side:THREE.DoubleSide}));roofs.userData.toon=true;this.static.add(roofs);
  {const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.Float32BufferAttribute(ppos,3));pg.setAttribute('color',new THREE.Float32BufferAttribute(pcol,3));pg.computeVertexNormals();const pm=new THREE.Mesh(pg,new THREE.MeshToonMaterial({vertexColors:true,gradientMap:this.grad,side:THREE.DoubleSide}));pm.material.userData.outlineParameters={visible:false};pm.userData.toon=true;pm.castShadow=!this.mobile;this.static.add(pm);}
  // Locali: insegna con un nome inventato (niente marchi reali) e tavolini fuori da bar e ristoranti.
  const NAMES={bar:['Bar Sirena','Caffè del Molo','Bar Partenope','Bar Posillipo','Caffè Sannazaro'],cafe:['Caffè del Porto','Bar Marechiaro','Caffè Mergellina'],restaurant:['Trattoria Mergellina','Osteria del Porto','Ristorante Lucia','Da Gennaro','Trattoria Sannazaro'],fast_food:['Pizzeria Sannazaro','Pizza a Portafoglio','Friggitoria del Molo'],pub:['Pub Vesuvio','Birreria del Porto'],nightclub:['Discoteca Luna','Club Partenope'],ice_cream:['Gelateria del Porto','Gelateria Sirena']};
  const tables=[],palms=[],lamps=[];
  // Lato del palazzo più vicino a un punto: piede sul muro e normale verso la strada.
  const edgeNear=(x,y)=>{let best=null,bd=64;for(const b of D.buildings){const P=b.p;for(let i=0;i<P.length;i++){const a=P[i],c=P[(i+1)%P.length],dx=c[0]-a[0],dy=c[1]-a[1],l=dx*dx+dy*dy;if(l<1)continue;const t=Math.max(.15,Math.min(.85,((x-a[0])*dx+(y-a[1])*dy)/l)),fx=a[0]+dx*t,fy=a[1]+dy*t,d=(fx-x)**2+(fy-y)**2;if(d<bd){bd=d;let nx=-dy,ny=dx;const L=Math.sqrt(l);nx/=L;ny/=L;if(nx*(x-fx)+ny*(y-fy)<0){nx=-nx;ny=-ny;}best={x:fx,y:fy,nx,ny};}}}return best;};
  for(const d of napoliPlaces().doors){const e=edgeNear(d.x,d.y);if(!e)continue;const f=this.shopfront(d.name,hash(d.id),d.to==='club');f.position.set(e.x+e.nx*.05,this.groundY||0,e.y+e.ny*.05);f.rotation.y=Math.atan2(e.nx,e.ny);this.static.add(f);
   if(['bar','trattoria','osteria','vesuvio','panorama','pizzeria'].includes(d.to))for(const k of [-1,1]){const tx=e.x+e.nx*3.2-e.ny*k*2.8,ty=e.y+e.ny*3.2+e.nx*k*2.8;if(napoliStand(tx,ty,1))tables.push([tx,ty]);}}
  for(const pr of MAPS.mergellina?.props||[]){if(pr.kind!=='atm')continue;const e=edgeNear(pr.x,pr.y),o=this.atm();o.position.set(pr.x,this.groundY||0,pr.y);if(e)o.rotation.y=Math.atan2(e.nx,e.ny);this.static.add(o);}
  for(const p of []){const list=NAMES[p.amenity];if(!list)continue;const nm=list[hash(p.x+','+p.y)%list.length];
   if(['bar','cafe','restaurant','ice_cream'].includes(p.amenity))for(const k of [0,1]){const tx=p.x+(k?2.6:-2.6),ty=p.y+2.4;if(napoliStand(tx,ty,1))tables.push([tx,ty]);}}
  // Lungomare: palme e lampioni lungo Via Caracciolo, Via Mergellina, Via Sannazaro e Posillipo.
  let n=0;for(const r of D.roads){if(!/Caracciolo|Mergellina|Sannazaro|Posillipo/.test(r.name||''))continue;for(let i=1;i<r.p.length;i++){const a=r.p[i-1],b=r.p[i],L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<1)continue;for(let s=0;s<L;s+=22){const t=s/L,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t,nx=-(b[1]-a[1])/L,ny=(b[0]-a[0])/L,off=r.w/2+2.5;
    for(const sg of [-1,1]){const qx=x+nx*off*sg,qy=y+ny*off*sg;if(!napoliCell(qx,qy)||[[0,0],[1.6,0],[-1.6,0],[0,1.6],[0,-1.6]].some(([ox,oy])=>roadAt(qx+ox,qy+oy)))continue;n++;(n%2?palms:lamps).push([qx,qy,n]);}}}}
  // Cartelli con i nomi delle vie agli incroci: ogni freccia punta lungo la sua strada.
  {const node=new Map(),key=q=>Math.round(q[0]*2)+','+Math.round(q[1]*2);for(const r of roads){if(!r.name)continue;r.p.forEach((q,j)=>{const k=key(q);(node.get(k)||node.set(k,[]).get(k)).push([r,j]);});}
   const used=new Set();let n=0;for(const list of node.values()){const names=new Map();for(const e of list)if(!names.has(e[0].name))names.set(e[0].name,e);if(names.size<2||n>=80)continue;const q=list[0][0].p[list[0][1]],cell=Math.round(q[0]/45)+','+Math.round(q[1]/45);if(used.has(cell))continue;
    let spot=null;const R=Math.max(...list.map(e=>e[0].w))/2+1.6;for(let a=0;a<8&&!spot;a++){const sx=q[0]+Math.cos(a*Math.PI/4+.4)*R,sy=q[1]+Math.sin(a*Math.PI/4+.4)*R;if(napoliStand(sx,sy,.4)&&!roadAt(sx,sy))spot=[sx,sy];}if(!spot)continue;used.add(cell);n++;
    this.col.c.push([spot[0],spot[1],.35]);this.static.add(this.signpost(spot[0],this.groundY,spot[1],[...names.values()].slice(0,3).map(([r,j])=>{const m=j+1<r.p.length&&(j===0||r.p.length-1-j>=j)?j+1:j-1,b=r.p[m];return [r.name,Math.atan2(-(b[1]-q[1]),b[0]-q[0]),'#1d4e89'];})));}}
  // Alberi nei parchi veri (pini a ombrello e alberi a chioma tonda), sparsi dentro i giardini.
  {const T=[[],[]],inP=(pk,x,y)=>{let c=false;for(let i=0,j=pk.length-1;i<pk.length;j=i++){const a=pk[i],b=pk[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};
   for(const pk of D.parks){if(pk.length<4)continue;let ax=1e9,ay=1e9,bx=-1e9,by=-1e9;for(const q of pk){ax=Math.min(ax,q[0]);ay=Math.min(ay,q[1]);bx=Math.max(bx,q[0]);by=Math.max(by,q[1]);}
    for(let y=ay+4;y<by;y+=11)for(let x=ax+4;x<bx;x+=11){const h=hash(Math.round(x)+':'+Math.round(y)),px=x+(h%7)-3,py=y+((h>>3)%7)-3;if(T[0].length+T[1].length<420&&inP(pk,px,py)&&napoliStand(px,py,1)&&!roadAt(px,py))T[h%3?0:1].push([px,py,h%6]);}}
   {const cand=[],MAXP=this.mobile?110:240;for(let y=y0+20;y<y0+H-20;y+=13)for(let x=x0+20;x<x0+W-20;x+=13){const h=hash('sl'+Math.round(x)+':'+Math.round(y)),px=x+(h%9)-4,py=y+((h>>3)%9)-4;if(!napoliStand(px,py,4.5))continue;if(this.landFn){let n=0;for(let a=0;a<8;a++)if(!this.landFn(px+Math.cos(a*.785)*40,py+Math.sin(a*.785)*40))n++;if(n>=4)continue;}if([[6,0],[-6,0],[0,6],[0,-6],[4,4],[-4,-4],[4,-4],[-4,4]].some(([ox,oy])=>roadAt(px+ox,py+oy)||!napoliCell(px+ox*1.6,py+oy*1.6)))continue;cand.push([px,py,h]);}const st=Math.max(1,cand.length/MAXP);for(let i=0;i<cand.length;i+=st){const q=cand[Math.floor(i)];T[q[2]%4?1:0].push([q[0],q[1],q[2]%6]);}{const NM=['Chalet Sirena','Chalet del Molo','Chalet Partenope','Chalet Azzurro','Chalet Marechiaro','Chalet Posillipo'],put=[];
     for(const c of cand){if(put.length>=NM.length)break;if(put.some(p=>Math.hypot(p[0]-c[0],p[1]-c[1])<70))continue;let sea=null;for(let a=0;a<8&&!sea;a++){const dx=Math.cos(a*Math.PI/4),dy=Math.sin(a*Math.PI/4);for(const dd of [18,26,34]){const qx=c[0]+dx*dd,qy=c[1]+dy*dd;if(!napoliCell(qx,qy)&&this.landFn&&!this.landFn(qx,qy)&&!napoliCell(qx+dx*20,qy+dy*20)){sea=[dx,dy];break;}}}if(!sea)continue;put.push(c);(this.chalets??=[]).push([c[0],c[1],sea[0],sea[1]]);
      const g=new THREE.Group(),B=(...a)=>this.bx(g,...a),i=put.length-1,ac=['#b3261e','#1d4e89','#1f6f50','#c9861a'][i%4];B(7.4,.18,5.4,0,.09,0,'#cfc6b4');B(6,2.5,3,0,1.43,-.9,'#f4f1ea');B(5.6,1.1,.08,0,1.75,.62,'#1f2c38');B(6,.9,.5,0,.63,.75,'#e9e1d2');B(7.6,.16,5.6,0,2.86,0,'#f4f1ea');B(7.7,.3,.12,0,2.62,2.8,ac);
      for(let k=0;k<9;k++)B(.42,.05,2.1,-3.36+k*.84,2.72,1.75,k%2?'#f4f1ea':ac);for(const sx of [-1,1])B(.12,2.7,.12,sx*3.5,1.4,2.55,'#2b2f36');
      g.add(this.label(NM[i],0,3.5,2.8,'rgba(17,24,39,.85)','#ffe9a8',.9));g.position.set(c[0],SW,c[1]);g.rotation.y=Math.atan2(sea[0],sea[1]);this.mergeGroup(g);this.static.add(g);this.col.c.push([c[0],c[1],3.4]);
      for(const k of [-1,1])tables.push([c[0]+sea[0]*5.2-sea[1]*k*2.2,c[1]+sea[1]*5.2+sea[0]*k*2.2]);}}
    if(cand.length){const lc=document.createElement('canvas');lc.width=W;lc.height=H;const q=lc.getContext('2d');q.filter='blur(3px)';q.fillStyle='#fff';for(const c of cand){q.beginPath();q.arc(c[0]-x0,c[1]-y0,8,0,6.283);q.fill();}q.filter='none';q.globalCompositeOperation='destination-out';q.strokeStyle='#000';q.lineCap=q.lineJoin='round';for(const r of roads){q.lineWidth=r.w+6;q.beginPath();r.p.forEach((p,i)=>i?q.lineTo(p[0]-x0,p[1]-y0):q.moveTo(p[0]-x0,p[1]-y0));q.stroke();}q.globalCompositeOperation='source-over';
     const am=new THREE.CanvasTexture(lc);am.minFilter=THREE.LinearFilter;const gt2=this.toon?null:this.tex('leafy_grass','diff').clone();if(gt2){gt2.repeat.set(W/4,H/4);gt2.needsUpdate=true;}
     const lawn=new THREE.Mesh(new THREE.PlaneGeometry(W,H),new THREE.MeshLambertMaterial({map:gt2,color:gt2?this.photoTint('leafy_grass','#6c9a4c'):new THREE.Color('#7cc35a'),alphaMap:am,alphaTest:.5}));lawn.material.userData.outlineParameters={visible:false};lawn.rotation.x=-Math.PI/2;lawn.position.set(x0+W/2,SW+.02,y0+H/2);lawn.receiveShadow=true;lawn.userData.toon=lawn.userData.real=true;this.static.add(lawn);}}
   this.instanced(this.tree(0,1),T[0]);for(let v=0;v<3;v++)this.instanced(this.tree(1,v),T[1].filter((q,i)=>i%3===v));for(const q of [...T[0],...T[1]])this.col.c.push([q[0],q[1],.4]);}
  // Auto parcheggiate lungo le strade secondarie: berline nere, fuoristrada argento e sportive rosse.
  {const lots=[[],[],[]];let k=0;for(const r of roads){if(main(r)||r.w<5.5)continue;let acc=12;for(let i=1;i<r.p.length;i++){const a=r.p[i-1],b=r.p[i],L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<1)continue;const tx=(b[0]-a[0])/L,ty=(b[1]-a[1])/L;
     for(;acc<L;acc+=28){const sd=k%2?1:-1,x=a[0]+tx*acc-ty*(r.w/2-1.15)*sd,y=a[1]+ty*acc+tx*(r.w/2-1.15)*sd;if(k<160&&roadAt(x,y))lots[k%3].push([x,y,Math.atan2(tx,ty)+(sd>0?0:Math.PI),0]);k++;}acc-=L;}}
   this.instanced(this.car('sedan','#0b0b0f'),lots[0]);this.instanced(this.car('suv','#c7ccd4'),lots[1]);this.instanced(this.car('super','#7a0c14'),lots[2]);for(const q of lots.flat())for(const k of [-1.1,0,1.1])this.col.c.push([q[0]+Math.sin(q[2])*k,q[1]+Math.cos(q[2])*k,.95]);}
  for(let v=0;v<4;v++)this.instanced(this.palm(v),palms.filter((q,i)=>(i*7+3)%4===v));this.instanced(this.lamp(),lamps.map(([x,z])=>[x,z]));this.lightPools(lamps.map(([x,z])=>[x,z,this.groundY]));for(const q of palms)this.col.c.push([q[0],q[1],.35]);for(const q of lamps)this.col.c.push([q[0],q[1],.3]);for(const q of tables)this.col.c.push([q[0],q[1],.9]);this.instanced(this.table(),tables);
  // Arredo urbano anche qui: accanto a un lampione ogni tanto un cassonetto, una fioriera, un motorino o un'edicola (copie dello stesso modello: pochissimi pezzi da disegnare).
  try{const F={bin:[],pot:[],sco:[],kio:[]},spot=(x,y,r)=>{for(const [ox,oy] of [[1.8,0],[-1.8,0],[0,1.8],[0,-1.8]]){const qx=x+ox,qy=y+oy;if(napoliCell(qx,qy)&&!roadAt(qx,qy)&&!roadAt(qx+ox*.6,qy+oy*.6)&&napoliStand(qx,qy,r))return [qx,qy];}return null;};
   lamps.forEach(([x,y],i)=>{const k=i%23===5?'kio':i%17===2?'bin':i%5===1?'pot':i%9===4?'sco':null;if(!k)return;const q=spot(x,y,k==='kio'?1.4:.7);if(!q)return;F[k].push([q[0],q[1],(i%4)*Math.PI/2]);this.col.c.push([q[0],q[1],k==='kio'?1.25:k==='sco'?.45:.7]);});
   const mk=fn=>{const g=new THREE.Group();fn((w,h,d,x,y,z,c)=>this.bx(g,w,h,d,x,y,z,c),(r1,r2,h,x,y,z,c)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,8),this.sm(c));o.position.set(x,y,z);g.add(o);return o;},g);return this.mergeGroup(g);};
   if(F.bin.length)this.instanced(mk(K=>{K(1.25,.95,.8,0,.6,0,'#2f6b3c');K(1.32,.1,.86,0,1.12,0,'#1f2a22');K(.5,.12,.05,0,.75,.41,'#e9e1d2');}),F.bin);
   if(F.pot.length)this.instanced(mk(K=>{K(1.3,.5,.5,0,.25,0,'#a9a295');K(1.2,.3,.4,0,.6,0,'#2f7d3a');for(let k=0;k<4;k++)K(.14,.14,.14,-.45+k*.3,.78,0,['#e5484d','#ff7ab6','#ffc928','#e5484d'][k]);}),F.pot);
   if(F.sco.length)this.instanced(this.scooter('#3fa7d6'),F.sco);
   if(F.kio.length)this.instanced(mk((K,C,g)=>{C(1.05,1.05,2.3,0,1.15,0,'#1f5a3a');C(1.45,1.2,.18,0,2.4,0,'#17402a');const cone=new THREE.Mesh(new THREE.ConeGeometry(1.25,.7,8),this.sm('#1f5a3a'));cone.position.y=2.85;g.add(cone);K(1.7,.08,.4,0,.9,1.1,'#17402a');for(let k=0;k<5;k++){K(.27,.38,.04,-.6+k*.3,1.25,1.07,['#e5484d','#f4f1ea','#ffc928','#3fa7d6','#f4f1ea'][k]);K(.27,.38,.04,-.6+k*.3,1.75,1.07,['#3fa7d6','#ffc928','#f4f1ea','#e5484d','#2f9e5b'][k]);}}),F.kio);}catch(err){console.warn('arredo Mergellina',err);}
  // Barche ormeggiate accanto ai pontili.
  for(const pr of D.piers)for(let i=1;i<pr.p.length;i++){const a=pr.p[i-1],b=pr.p[i],L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<1)continue;for(let s=4;s<L;s+=13){const t=s/L,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t,nx=-(b[1]-a[1])/L,ny=(b[0]-a[0])/L;
   for(const sg of [-1,1]){const bx=x+nx*4*sg,by=y+ny*4*sg;if(napoliCell(bx,by))continue;const bt=this.boat(hash(bx+','+by));bt.position.set(bx,0,by);bt.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);this.static.add(bt);this.boats.push(bt);}}}
  if(BOATS.mergellina){const B=BOATS.mergellina,k=this.boatKiosk(B);k.position.set(B.dock.x-1.5,this.groundY||.12,B.dock.y-2);this.static.add(k);}
  // Castel dell'Ovo e Vesuvio nelle loro posizioni vere (il Vesuvio è a 17 km: rimpicciolito e avvicinato).
  try{const g=new THREE.Group(),C=(r1,r2,h,y,c,seg=16)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,seg),this.sm(c));o.position.y=y;g.add(o);return o;};
   C(2.6,2.9,1.2,.6,'#b9b2a4',12);C(1.05,1.45,3.4,2.9,'#f4f1ea');C(.95,1.05,2.6,5.9,'#c1272d');C(.85,.95,3,8.7,'#f4f1ea');C(1.5,1.5,.18,10.3,'#2b2f36');
   for(let a=0;a<10;a++){const p=new THREE.Mesh(new THREE.BoxGeometry(.05,.8,.05),this.sm('#2b2f36'));p.position.set(Math.cos(a*.628)*1.42,10.8,Math.sin(a*.628)*1.42);g.add(p);}
   const ring=new THREE.Mesh(new THREE.TorusGeometry(1.42,.03,6,20).rotateX(Math.PI/2),this.sm('#2b2f36'));ring.position.y=11.2;g.add(ring);
   const lan=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,1.3,10),this.neonMat('#fff4c2'));lan.position.y=11.05;g.add(lan);C(.75,.75,.1,11.75,'#2b2f36');const cap=new THREE.Mesh(new THREE.ConeGeometry(.8,.7,10),this.sm('#1f6f50'));cap.position.y=12.15;g.add(cap);
   this.mergeGroup(g);g.position.set(722,this.groundY||.12,357);g.traverse(o=>{if(o.isMesh){o.castShadow=!this.mobile;o.userData.toon=o.userData.real=true;}});this.static.add(g);this.col.c.push([722,357,2.9]);}catch(err){console.warn('faro',err);}
  const castle=this.castel(1);
  castle.position.set(2546,0,220);castle.rotation.y=-Math.PI/2+.22;this.static.add(castle);
  {const dir=new THREE.Vector2(17580,1028).normalize(),geo=this.vesuvio(2100,540,110,{sx:14,sz:86,sh:1.27,haze:.74});const v=new THREE.Mesh(geo,new THREE.MeshToonMaterial({vertexColors:true,gradientMap:this.grad,fog:false}));v.position.set(dir.x*5600,0,dir.y*5600);v.userData.toon=true;v.userData.keep=true;v.material.transparent=true;v.renderOrder=12;this.static.add(v);}
  this.bake(this.static);this.toonify(this.static);}
 // Materiali delle facciate vere: intonaco e bugnato PBR (foto + rilievo + ruvidità, piastrella da 2,4 m), vetri con riflesso moderato,
 // persiane a stecche, ringhiera di ferro traforata, portone di legno. Sui telefoni: stesse foto ma luce semplice (niente rilievo).
 facadeMats(merge){if(merge){if(!this.fcMM){const M=this.facadeMats();this.fcMM={};for(const k of Object.keys(M)){const m=M[k].clone();m.userData={...M[k].userData,merge:true};if(M[k].userData.glow)this.glow.add(m);this.fcMM[k]=m;}}return this.fcMM;}if(this.fcM)return this.fcM;const PB=!this.mobile&&!this.toon,cv=(w,h,fn)=>{const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'));const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;};
  const rp=t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;},pbr=(id,o={})=>PB?new THREE.MeshStandardMaterial({map:this.tex(id,'diff'),normalMap:this.tex(id,'nor'),roughnessMap:this.tex(id,'rough'),roughness:1,metalness:0,envMapIntensity:.45,vertexColors:true,side:THREE.DoubleSide,...o}):new THREE.MeshLambertMaterial({map:this.tex(id,'diff'),vertexColors:true,side:THREE.DoubleSide});
  // finestre: 4 riquadri (ante con vetri scuri, tende, luce accesa di sera, vetrina di negozio)
  const win=cv(512,256,g=>{for(let k=0;k<4;k++){const x=k*128;g.fillStyle='#f3efe6';g.fillRect(x,0,128,256);if(k<3){const gr=g.createLinearGradient(x,0,x+128,256);gr.addColorStop(0,'#5d7f99');gr.addColorStop(.45,'#263847');gr.addColorStop(1,'#101a23');g.fillStyle=gr;g.fillRect(x+10,10,50,236);g.fillRect(x+68,10,50,236);
     if(k===1){g.fillStyle='rgba(240,232,214,.82)';g.fillRect(x+10,10,22,236);g.fillRect(x+96,10,22,236);}if(k===2){g.fillStyle='rgba(255,214,140,.25)';g.fillRect(x+10,10,108,236);}
     g.fillStyle='rgba(255,255,255,.16)';g.beginPath();g.moveTo(x+12,150);g.lineTo(x+58,20);g.lineTo(x+58,60);g.lineTo(x+12,200);g.fill();g.fillStyle='#f3efe6';g.fillRect(x+10,84,108,7);g.fillRect(x+10,168,108,7);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(x+10,10,108,4);}
    else{const gr=g.createLinearGradient(x,0,x+128,256);gr.addColorStop(0,'#7fa3bd');gr.addColorStop(.5,'#31485a');gr.addColorStop(1,'#15212b');g.fillStyle='#1b1f24';g.fillRect(x,0,128,256);g.fillStyle=gr;g.fillRect(x+5,6,118,214);g.fillStyle='rgba(255,255,255,.14)';g.beginPath();g.moveTo(x+8,190);g.lineTo(x+90,10);g.lineTo(x+118,10);g.lineTo(x+30,216);g.fill();
     for(let i=0;i<4;i++){g.fillStyle=['#e5484d','#ffc928','#f4f1ea','#3fa7d6'][i];g.fillRect(x+14+i*26,150,18,46);}g.fillStyle='#8f877c';g.fillRect(x,222,128,34);}}});
  const lit=cv(128,64,g=>{g.fillStyle='#000';g.fillRect(0,0,128,64);g.fillStyle='#fff';g.fillRect(34,3,28,58);g.fillRect(66,3,29,58);g.fillStyle='#343434';g.fillRect(98,2,28,52);});
  const glass=PB?new THREE.MeshStandardMaterial({map:win,roughness:.16,metalness:.15,envMapIntensity:.85,emissive:'#ffcf7a',emissiveMap:lit,emissiveIntensity:0,side:THREE.DoubleSide}):new THREE.MeshLambertMaterial({map:win,emissive:'#ffcf7a',emissiveMap:lit,emissiveIntensity:0,side:THREE.DoubleSide});glass.userData.glow=1;this.glow.add(glass);
  const sh=rp(cv(64,128,g=>{g.fillStyle='#e9e9e9';g.fillRect(0,0,64,128);for(let y=4;y<124;y+=6){g.fillStyle='rgba(0,0,0,.34)';g.fillRect(6,y,52,2);g.fillStyle='rgba(255,255,255,.5)';g.fillRect(6,y+2,52,1);}g.strokeStyle='rgba(0,0,0,.45)';g.lineWidth=4;g.strokeRect(2,2,60,124);g.fillStyle='rgba(0,0,0,.3)';g.fillRect(4,62,56,4);}));
  const ir=rp(cv(128,128,g=>{g.clearRect(0,0,128,128);g.fillStyle='#1c2024';g.fillRect(0,2,128,7);g.fillRect(0,112,128,6);g.fillRect(0,24,128,3);for(let x=6;x<128;x+=16){g.fillRect(x,6,4,110);}g.strokeStyle='#1c2024';g.lineWidth=3;for(let x=14;x<128;x+=32){g.beginPath();g.arc(x+8,60,9,0,6.283);g.stroke();}}));ir.wrapT=THREE.ClampToEdgeWrapping;
  const dr=cv(256,512,g=>{g.fillStyle='#4a2f1c';g.fillRect(0,0,256,512);for(let i=0;i<40;i++){g.fillStyle=i%2?'rgba(0,0,0,.07)':'rgba(255,220,170,.05)';g.fillRect((i*37)%256,0,3+i%5,512);}g.fillStyle='#17222c';g.beginPath();g.moveTo(14,150);g.lineTo(14,110);g.arc(128,110,114,Math.PI,0);g.lineTo(242,150);g.fill();g.strokeStyle='#2b1a10';g.lineWidth=5;for(let a=0;a<6;a++){g.beginPath();g.moveTo(128,112);g.lineTo(128+Math.cos(Math.PI+a*Math.PI/5)*112,112+Math.sin(Math.PI+a*Math.PI/5)*112);g.stroke();}
    g.fillStyle='#3a2415';g.fillRect(0,150,256,10);g.fillStyle='#2b1a10';g.fillRect(125,160,6,352);for(const x of [20,144])for(const [y,h] of [[178,120],[312,90],[416,80]]){g.strokeStyle='#2b1a10';g.lineWidth=5;g.strokeRect(x,y,92,h);g.strokeStyle='rgba(255,220,170,.18)';g.lineWidth=2;g.strokeRect(x+5,y+5,82,h-10);}g.fillStyle='#d9b24a';g.beginPath();g.arc(112,350,6,0,6.283);g.arc(144,350,6,0,6.283);g.fill();});
  const aoT=cv(8,64,g=>{const gr=g.createLinearGradient(0,0,0,64);gr.addColorStop(0,'rgba(0,0,0,.5)');gr.addColorStop(.5,'rgba(0,0,0,.16)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,8,64);});
  const L=o=>new THREE.MeshLambertMaterial({side:THREE.DoubleSide,...o}),noLn=m=>{m.userData.outlineParameters={visible:false};return m;};
  return this.fcM={pl:(m=>{m.color.setRGB(1.34,1.34,1.34);return m;})(pbr('painted_plaster_wall')),bg:pbr('large_sandstone_blocks'),gl:glass,sh:L({map:sh,vertexColors:true}),ir:noLn(L({map:ir,alphaTest:.5,color:'#ffffff'})),dr:L({map:dr}),fl:L({vertexColors:true}),ao:noLn(new THREE.MeshBasicMaterial({map:aoT,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}))};}
 // Un lato di palazzo con profondità vera: piano terra a bugnato con zoccolo, portone incassato, vetrine con tenda e insegna o finestre con inferriata;
 // ai piani finestre incassate con spalle, cornici di pietra, persiane aperte, balconi con soletta, mensole e ringhiera; marcapiani e cornicione in aggetto.
 // B = contenitori di triangoli per materiale; a,n = estremi del lato; (nx,ny) = verso la strada; lv = piani; sd = seme; wall = colore dell'intonaco.
 // o = opzioni: G altezza del piano terra; y0 quota del terreno; open = piano terra lasciato aperto (c'è il negozio vero dietro); door = portone al centro; blind(u) = vero dove il muro tocca un altro palazzo (niente finestre).
 facadeDetail(B,a,n,nx,ny,lv,sd,wall,o={}){const L=Math.hypot(n[0]-a[0],n[1]-a[1]);if(L<.4)return;const tx=(n[0]-a[0])/L,ty=(n[1]-a[1])/L,G=o.G||4,FH=3.3,H=G+(lv-1)*FH,gy=o.y0??this.groundY;
  const P=(u,v,w)=>[a[0]+tx*u+nx*w,v,a[1]+ty*u+ny*w],put=(k,c,uv,col,ao)=>{const b=B[k];for(const i of [0,1,2,0,2,3]){b.p.push(...c[i]);b.u.push(uv[i][0],uv[i][1]);b.c.push(col[0]*ao[i],col[1]*ao[i],col[2]*ao[i]);}};
  const S=2.4,one=[1,1,1,1],W=[1,1,1];
  // rettangolo sul piano della facciata, a profondità w
  const R=(k,u0,u1,v0,v1,w,col=W,ao=one,uv)=>{if(u1-u0<.02||v1-v0<.02)return;put(k,[P(u0,v0,w),P(u1,v0,w),P(u1,v1,w),P(u0,v1,w)],uv||[[u0/S,v0/S],[u1/S,v0/S],[u1/S,v1/S],[u0/S,v1/S]],col,ao);};
  const SV=(k,u,v0,v1,w0,w1,col,ao=one)=>put(k,[P(u,v0,w0),P(u,v0,w1),P(u,v1,w1),P(u,v1,w0)],[[w0/S,v0/S],[w1/S,v0/S],[w1/S,v1/S],[w0/S,v1/S]],col,ao);
  const SH=(k,u0,u1,v,w0,w1,col,ao=one)=>put(k,[P(u0,v,w0),P(u1,v,w0),P(u1,v,w1),P(u0,v,w1)],[[u0/S,w0/S],[u1/S,w0/S],[u1/S,w1/S],[u0/S,w1/S]],col,ao);
  const box=(k,u0,u1,v0,v1,w0,w1,col)=>{R(k,u0,u1,v0,v1,w1,col);SV(k,u0,v0,v1,w0,w1,col,[.8,.8,.8,.8]);SV(k,u1,v0,v1,w0,w1,col,[.8,.8,.8,.8]);SH(k,u0,u1,v1,w0,w1,col);SH(k,u0,u1,v0,w0,w1,col,[.6,.6,.6,.6]);};
  const cell=(i,f0=0,f1=1)=>[[i/4+.004,f0],[(i+1)/4-.004,f0],[(i+1)/4-.004,f1],[i/4+.004,f1]],U=[[0,0],[1,0],[1,1],[0,1]],dk=[.62,.62,.62,.62];
  const ST=[.93,.9,.84],BG=[1.5,1.44,1.32],SHC=[[.2,.42,.3],[.24,.34,.5],[.42,.27,.16],[.5,.52,.5]][sd%4],AW=[[.7,.15,.12],[.12,.3,.54],[.12,.44,.31],[.79,.53,.1]];
  if(L<2){R('pl',0,L,0,H,0,wall,[.8,.8,1,1]);box('pl',0,L,H-.1,H+.3,0,.38,ST);return;}
  // ombra di contatto a terra lungo il muro
  put('ao',[P(0,gy+.012,0),P(L,gy+.012,0),P(L,gy+.012,1.5),P(0,gy+.012,1.5)],[[0,1],[1,1],[1,0],[0,0]],W,one);
  const nb=Math.max(1,Math.round(L/3.1)),bw=L/nb,shops=(sd>>2)%3!==0&&!o.noShops;
  for(let k=0;k<nb;k++){const u0=k*bw,uc=u0+bw/2,hh=hash(sd+':'+k);
   // tratto cieco (muro contro un altro palazzo): solo intonaco, niente aperture
   if(o.blind&&o.blind(uc)){R('bg',u0,u0+bw,0,G,0,BG,[.74,.74,1,1]);for(let f=1;f<lv;f++)R('pl',u0,u0+bw,G+(f-1)*FH,G+f*FH,0,wall);continue;}
   // --- piano terra ---
   if(!o.open){const kind=o.door&&k===(nb>>1)?'door':bw<2.5?'win':L>8&&k===(nb>>1)?'door':shops&&(hh%4)?'shop':'win',ow=kind==='door'?Math.min(2.2,bw-.8):kind==='shop'?Math.min(2.6,bw-.6):1.15,oh=kind==='door'?Math.min(3.2,G-.6):kind==='shop'?Math.min(2.8,G-.6):1.6,ov=kind==='win'?1.25:.02,dp=kind==='door'?.45:kind==='shop'?.3:.22,a0=uc-ow/2,a1=uc+ow/2,base=[.74,.74,1,1];
   R('bg',u0,a0,0,G,0,BG,base);R('bg',a1,u0+bw,0,G,0,BG,base);R('bg',a0,a1,ov+oh,G,0,BG);if(ov>.1)R('bg',a0,a1,0,ov,0,BG,base);
   SV('bg',a0,ov,ov+oh,-dp,0,BG,dk);SV('bg',a1,ov,ov+oh,-dp,0,BG,dk);SH('bg',a0,a1,ov+oh,-dp,0,BG,dk);SH('bg',a0,a1,ov,-dp,0,BG,[.8,.8,.8,.8]);
   if(kind==='door'){R('dr',a0,a1,ov,ov+oh,-dp,W,one,U);box('pl',a0-.22,a0,0,ov+oh+.2,0,.1,ST);box('pl',a1,a1+.22,0,ov+oh+.2,0,.1,ST);box('pl',a0-.3,a1+.3,ov+oh+.2,ov+oh+.48,0,.16,ST);}
   else if(kind==='shop'){R('gl',a0,a1,ov,ov+oh,-dp,W,one,cell(3));const ac=AW[hh%4],y1=ov+oh+.06;put('fl',[P(a0-.15,y1,.04),P(a1+.15,y1,.04),P(a1+.15,y1-.5,1.15),P(a0-.15,y1-.5,1.15)],U,ac,[1,1,.82,.82]);put('fl',[P(a0-.15,y1-.5,1.15),P(a1+.15,y1-.5,1.15),P(a1+.15,y1-.72,1.15),P(a0-.15,y1-.72,1.15)],U,[.95,.93,.88],one);box('fl',a0-.1,a1+.1,y1+.12,y1+.62,0,.07,[ac[0]*.5,ac[1]*.5,ac[2]*.5]);box('fl',a0+.1,a1-.1,y1+.22,y1+.52,.07,.09,[.96,.93,.84]);}
   else{R('gl',a0,a1,ov,ov+oh,-dp,W,one,cell(hh%2,.34,1));R('ir',a0,a1,ov,ov+oh,-.03,W,one,[[0,0],[ow*1.6,0],[ow*1.6,1],[0,1]]);box('pl',a0-.12,a1+.12,ov-.1,ov,0,.12,ST);}}
   // --- piani alti ---
   for(let f=1;f<lv;f++){const v0=G+(f-1)*FH,h2=hash(sd+':'+k+':'+f),balc=!(o.open&&f===1)&&(f===1||(k+f+sd)%2===0),wo=1.2,woh=balc?2.35:1.55,wv=v0+(balc?.14:1),b0=uc-wo/2,b1=uc+wo/2,closed=h2%9===0;
    R('pl',u0,b0,v0,v0+FH,0,wall);R('pl',b1,u0+bw,v0,v0+FH,0,wall);R('pl',b0,b1,wv+woh,v0+FH,0,wall);if(wv-v0>.05)R('pl',b0,b1,v0,wv,0,wall);
    SV('pl',b0,wv,wv+woh,-.22,0,wall,dk);SV('pl',b1,wv,wv+woh,-.22,0,wall,dk);SH('pl',b0,b1,wv+woh,-.22,0,wall,dk);SH('pl',b0,b1,wv,-.22,0,ST,[.85,.85,.85,.85]);
    if(closed)R('sh',b0,b1,wv,wv+woh,-.06,SHC,one,[[0,0],[2,0],[2,1],[0,1]]);else{R('gl',b0,b1,wv,wv+woh,-.22,W,one,cell(h2%3,balc?0:.3,1));R('sh',b0-.6,b0-.03,wv,wv+woh,.05,SHC,one,U);R('sh',b1+.03,b1+.6,wv,wv+woh,.05,SHC,one,U);}
    box('pl',b0-.14,b0,wv,wv+woh,0,.05,ST);box('pl',b1,b1+.14,wv,wv+woh,0,.05,ST);box('pl',b0-.2,b1+.2,wv+woh,wv+woh+.2,0,f===1?.13:.07,ST);
    if(balc){box('pl',uc-.98,uc+.98,v0-.03,v0+.1,0,.86,ST);for(const sx of [-.68,.68])box('pl',uc+sx-.07,uc+sx+.07,v0-.34,v0-.03,0,.46,ST);R('ir',uc-.98,uc+.98,v0+.1,v0+1.1,.84,W,one,[[0,0],[3.4,0],[3.4,1],[0,1]]);
     for(const sx of [-.98,.98])put('ir',[P(uc+sx,v0+.1,0),P(uc+sx,v0+.1,.84),P(uc+sx,v0+1.1,.84),P(uc+sx,v0+1.1,0)],[[0,0],[1.5,0],[1.5,1],[0,1]],W,one);}
    else box('pl',b0-.16,b1+.16,wv-.1,wv,0,.13,ST);
    {const PAL=[[.95,.95,.93],[.75,.2,.2],[.2,.35,.65],[.95,.8,.3],[.3,.55,.4],[.9,.9,.95],[.85,.5,.6]];
     if(!balc&&!closed&&h2%4===1&&!(o.open&&f===1)){const yl=wv-.2,n=3+h2%3;R('fl',b0-.5,b1+.5,yl-.012,yl+.012,.24,[.25,.25,.25]);for(let i=0;i<n;i++){const cu=b0-.42+i*((wo+.84)/n),cw=.26+((h2>>i)%3)*.09,ch=.34+((h2>>(i+2))%4)*.13;R('fl',cu,cu+cw,yl-ch,yl,.24,PAL[(h2+i*3)%7],[.82,.82,1,1]);}}
     if(balc&&h2%4===2)R('fl',uc-.7+(h2%5)*.12,uc-.1+(h2%5)*.12,v0+.42,v0+1.13,.87,PAL[h2%7],[.82,.82,1,1]);
     if(balc&&h2%3===0)for(const sx of [-.72,.58]){box('fl',uc+sx-.15,uc+sx+.15,v0+.1,v0+.34,.5,.78,[.7,.36,.22]);box('fl',uc+sx-.2,uc+sx+.2,v0+.34,v0+.6,.46,.82,[.2,.48,.2]);box('fl',uc+sx-.1,uc+sx+.08,v0+.56,v0+.68,.56,.74,(h2>>3)%2?[.85,.14,.2]:[.95,.5,.7]);}}}}
  // zoccolo, fascia sopra il piano terra, marcapiani, cornicione e parapetto del tetto
  if(!o.open)box('bg',0,L,0,.55,0,.07,[1.1,1.06,.98]);box('pl',0,L,G-.3,G,0,.2,ST);for(let f=2;f<lv;f++)box('pl',0,L,G+(f-1)*FH-.16,G+(f-1)*FH,0,.09,ST);
  box('pl',0,L,H-.12,H+.3,0,.4,ST);box('pl',0,L,H+.3,H+.95,-.1,.1,ST);}
 // Chiosco del noleggio barche: casetta di legno con tettoia, salvagente e insegna.
 boatKiosk(B){const g=new THREE.Group(),K=(...a)=>this.bx(g,...a);K(2.6,.14,2.2,0,.07,0,'#b98a55');K(2.2,2.1,1.6,0,1.15,-.2,'#e9e1d2');K(2.8,.12,2.6,0,2.3,0,'#1d4e89');K(2.2,.9,.06,0,1.5,.61,'#1f2c38');K(2.3,.1,.5,0,1,.75,'#b98a55');
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.28,.09,8,16),this.sm('#e5484d'));ring.position.set(.8,1.5,.66);g.add(ring);g.add(this.label('⛵ '+B.name,0,2.75,0,'rgba(17,24,39,.85)','#ffe9a8',.42));return g;}
 // Lampione napoletano in stile cartone: palo in ghisa, braccio ricurvo e lanterna (poche centinaia di triangoli).
 lamp(){const g=new THREE.Group(),iron=this.sm('#2b2f36'),glass=this.lampGlass??=Object.assign(new THREE.MeshBasicMaterial({color:'#efe7d2'}),{userData:{merge:true}});
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.18,.24,.6,8),iron);base.position.y=.3;const pole=new THREE.Mesh(new THREE.CylinderGeometry(.07,.1,4.2,8),iron);pole.position.y=2.6;
  const arm=new THREE.Mesh(new THREE.TorusGeometry(.45,.04,6,10,Math.PI),iron);arm.position.set(.45,4.6,0);const lan=new THREE.Mesh(new THREE.CylinderGeometry(.22,.14,.5,6),glass);lan.position.set(.9,4.3,0);
  const cap=new THREE.Mesh(new THREE.ConeGeometry(.28,.25,6),iron);cap.position.set(.9,4.65,0);const top=new THREE.Mesh(new THREE.SphereGeometry(.1,6,5),iron);top.position.y=4.75;g.add(base,pole,arm,lan,cap,top);return this.mergeGroup(g);}
 // Tavolino da bar con due sedie, in stile cartone (circa 300 triangoli invece di 10.000).
 table(){const g=new THREE.Group(),wood=this.sm('#9a6a3e'),iron=this.sm('#2b2f36'),cloth=this.sm('#f4f1ea');
  const top=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.05,12),cloth);top.position.y=.74;const leg=new THREE.Mesh(new THREE.CylinderGeometry(.04,.05,.72,6),iron);leg.position.y=.37;const foot=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.03,10),iron);foot.position.y=.02;g.add(top,leg,foot);
  for(const sd of [-1,1]){const seat=new THREE.Mesh(new THREE.BoxGeometry(.42,.05,.42),wood);seat.position.set(sd*.75,.45,0);const back=new THREE.Mesh(new THREE.BoxGeometry(.05,.45,.42),wood);back.position.set(sd*.95,.68,0);g.add(seat,back);
   for(const [lx,lz] of [[-.17,-.17],[.17,-.17],[-.17,.17],[.17,.17]]){const l=new THREE.Mesh(new THREE.BoxGeometry(.04,.45,.04),iron);l.position.set(sd*.75+lx,.22,lz);g.add(l);}}
  return this.mergeGroup(g);}
 // Bancomat: colonnina grigia con schermo acceso, tastierino e logo (si usa avvicinandosi: "✋ Bancomat").
 // Distributore di bevande: cassone rosso, vetrina illuminata con le file di lattine e bottiglie, gettoniera e vano di ritiro.
 vending(){const g=new THREE.Group();if(!this.vendT){const c=document.createElement('canvas');c.width=128;c.height=256;const q=c.getContext('2d');q.fillStyle='#e9f2f7';q.fillRect(0,0,128,256);const C=['#e5484d','#ff8a3d','#ffc928','#2f9e5b','#3fa7d6','#7a4a2a','#f4f1ea'];
   for(let r=0;r<6;r++){q.fillStyle='#9aa7b3';q.fillRect(0,r*42+36,128,5);for(let i=0;i<6;i++){const col=C[(r*2+i)%7];q.fillStyle=col;q.fillRect(6+i*20,r*42+6,13,30);q.fillStyle='rgba(255,255,255,.55)';q.fillRect(8+i*20,r*42+9,3,22);q.fillStyle='#c9ccd3';q.fillRect(8+i*20,r*42+3,9,4);}}
   const t=this.vendT=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;}
  const B=(w,h,d,x,y,z,col)=>this.bx(g,w,h,d,x,y,z,col);B(1.05,1.95,.8,0,.975,0,'#b3261e');B(1.09,.1,.84,0,1.97,0,'#7a1c16');B(1.09,.12,.84,0,.06,0,'#2b2f36');B(.24,1.3,.04,.36,1.15,.41,'#2b2f36');B(.12,.05,.03,.36,1.45,.44,'#c9ccd3');B(.14,.2,.03,.36,1.15,.44,'#1f2933');B(.6,.22,.05,-.13,.33,.41,'#15181c');
  const gl=new THREE.Mesh(new THREE.PlaneGeometry(.62,1.25),new THREE.MeshBasicMaterial({map:this.vendT}));gl.position.set(-.13,1.2,.405);gl.material.userData.outlineParameters={visible:false};g.add(gl);return g;}
 atm(){const g=new THREE.Group(),body=new THREE.MeshStandardMaterial({color:'#5d6673'}),dark=new THREE.MeshStandardMaterial({color:'#1f2933'}),scr=new THREE.MeshBasicMaterial({color:'#4fb3ff'});
  const b=new THREE.Mesh(new THREE.BoxGeometry(.85,1.7,.55),body);b.position.y=.85;const hood=new THREE.Mesh(new THREE.BoxGeometry(.95,.12,.7),dark);hood.position.y=1.75;
  const s1=new THREE.Mesh(new THREE.PlaneGeometry(.5,.36),scr);s1.position.set(0,1.32,.28);const kp=new THREE.Mesh(new THREE.BoxGeometry(.36,.06,.22),dark);kp.position.set(0,1.02,.33);kp.rotation.x=.5;
  const top=new THREE.Mesh(new THREE.BoxGeometry(.85,.25,.04),new THREE.MeshBasicMaterial({color:'#e8b026'}));top.position.set(0,1.6,.29);g.add(b,hood,s1,kp,top);return g;}
 // Facciata di un locale sul muro vero: porta illuminata, tenda, insegna; "edge" = lato del palazzo più vicino.
 // Ingresso di un locale: telaio scuro pieno (copre quello che c'è dietro), due vetrine, porta a vetri con maniglia, fascia con l'insegna e tenda.
 shopfront(name,seed,club){const g=new THREE.Group(),M=this.facadeMats(),B=(...a)=>this.bx(g,...a),ac=club?'#7b2cbf':['#b3261e','#1f6f50','#1d4e89','#8a3b12'][seed%4];
  B(3.7,3.8,.12,0,1.9,.03,'#23262b');B(3.7,.3,.2,0,.15,.07,'#3a3f47');
  const pane=(x,w,h,y)=>{const pg=new THREE.PlaneGeometry(w,h),uv=pg.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,.755+uv.getX(i)*.24);const m=new THREE.Mesh(pg,M.gl);m.position.set(x,y,.1);g.add(m);};
  pane(-1.22,1.05,2.25,1.45);pane(1.22,1.05,2.25,1.45);pane(0,1.05,2.5,1.32);for(const x of [-.6,.6])B(.07,2.6,.07,x,1.3,.11,'#c9ccd3');B(1.3,.07,.07,0,2.6,.11,'#c9ccd3');B(.05,.5,.06,.38,1.25,.15,'#d9b24a');
  const aw=new THREE.Mesh(new THREE.BoxGeometry(3.7,.08,1.3),this.sm(ac));aw.position.set(0,2.92,.68);aw.rotation.x=.25;B(3.7,.55,.1,0,3.38,.09,'#17181c');
  const sg=this.sign(name,seed);sg.position.set(0,3.4,.16);if(club){sg.material.color=new THREE.Color('#ff7ad9');}g.add(aw,sg);return g;}
 // Palma mediterranea: tronco ad anelli leggermente curvo e chioma di foglie ricurve (geometria condivisa, leggera).
 // Palme vere: fotografie (davanti, lato, alto) di due modelli 3D con licenza CC-BY (vedi LICENZE.md), sui tre piani incrociati come gli alberi.
 // Tre su quattro sono palme da dattero alte (quelle del lungomare di Napoli), una su quattro è una palma nana a ventaglio.
 palm(seed=0){if(this.toon)return this.palmCodice(seed);return seed%4===3?this.sagoma('nana',+(4.8+(seed%3)*.35).toFixed(1),3.976/5.304,.72):this.sagoma('palma',+(8.6+(seed%5)*.45).toFixed(1),7.368/9.691,.7);}
 palmCodice(seed){if(!this.palmParts){const bark=new THREE.MeshStandardMaterial({color:'#8a7358',roughness:1}),ring=new THREE.MeshStandardMaterial({color:'#6e5a44',roughness:1}),leaf=new THREE.MeshStandardMaterial({color:'#3f7a34',roughness:.8,side:THREE.DoubleSide});
   const fg=new THREE.BufferGeometry(),P=[],I=[];const N=10;for(let i=0;i<=N;i++){const t=i/N,len=3.2*t,y=Math.sin(t*Math.PI*.9)*.9-t*t*1.6,wd=.55*Math.sin(Math.PI*Math.min(1,t*1.15))+.02;P.push(len,y,-wd,len,y+.08,0,len,y,wd);if(i){const o=(i-1)*3;I.push(o,o+3,o+1,o+1,o+3,o+4,o+1,o+4,o+2,o+2,o+4,o+5);}}
   fg.setAttribute('position',new THREE.Float32BufferAttribute(P,3));fg.setIndex(I);fg.computeVertexNormals();for(const q of [bark,ring,leaf])q.userData.merge=true;this.palmParts={bark,ring,leaf,fg,seg:new THREE.CylinderGeometry(.17,.21,.55,6,1,true),ringG:new THREE.CylinderGeometry(.215,.215,.08,6,1,true)};}
  const {bark,ring,leaf,fg,seg,ringG}=this.palmParts,g=new THREE.Group(),H=6+seed%3,bend=((seed%7)-3)*.012;let x=0,y=0;
  for(let i=0;y<H;i++){const m=new THREE.Mesh(seg,bark);m.position.set(x,y+.27,0);m.rotation.z=-bend*i;g.add(m);if(i%2){const r=new THREE.Mesh(ringG,ring);r.position.set(x,y+.5,0);g.add(r);}y+=.5;x+=bend*i*.5;}
  const n=9;for(let i=0;i<n;i++){const f=new THREE.Mesh(fg,leaf);f.position.set(x,y,0);f.rotation.y=i/n*Math.PI*2+seed;f.rotation.z=.25+(i%3)*.12;g.add(f);}
  const top=new THREE.Mesh(new THREE.SphereGeometry(.32,6,4),ring);top.position.set(x,y,0);g.add(top);
  g.traverse(o=>{if(o.isMesh)o.castShadow=!this.mobile;});return this.mergeGroup(g);}
 // Barca vera: scafo a punta che si stringe verso la chiglia, fascia colorata, coperta di legno, cabina con vetri (motoscafo) o albero con boma e vela raccolta (barca a vela).
 boat(seed){const g=new THREE.Group(),white=this.sm('#f4f4ef'),col=this.sm(['#1d4e89','#b3261e','#1f6f50','#e8b026'][seed%4]),teak=this.sm('#b98a55'),glass=this.sm('#1f2c38'),L=6+seed%5,W=2.1+(seed%3)*.25;
  const out=(w,l,in0=0)=>{const s=new THREE.Shape();s.moveTo(-w/2+in0,-l/2+in0);s.lineTo(w/2-in0,-l/2+in0);s.quadraticCurveTo(w/2-in0,l*.22,0,l/2-in0*2);s.quadraticCurveTo(-w/2+in0,l*.22,-w/2+in0,-l/2+in0);return s;};
  const RB=(w,h,d,r=.2)=>{const q=new THREE.Shape(),x=w/2,z=d/2;r=Math.min(r,x*.9,z*.9);q.moveTo(-x+r,-z);q.lineTo(x-r,-z);q.quadraticCurveTo(x,-z,x,-z+r);q.lineTo(x,z-r);q.quadraticCurveTo(x,z,x-r,z);q.lineTo(-x+r,z);q.quadraticCurveTo(-x,z,-x,z-r);q.lineTo(-x,-z+r);q.quadraticCurveTo(-x,-z,-x+r,-z);return new THREE.ExtrudeGeometry(q,{depth:Math.max(.02,h-.08),bevelEnabled:true,bevelThickness:.04,bevelSize:.04,bevelSegments:2,curveSegments:5}).rotateX(-Math.PI/2).translate(0,-h/2+.04,0);};
  const hullG=new THREE.ExtrudeGeometry(out(W,L),{depth:1,bevelEnabled:false,curveSegments:8});hullG.rotateX(-Math.PI/2);hullG.rotateY(Math.PI);{const p=hullG.attributes.position;for(let i=0;i<p.count;i++)if(p.getY(i)<.5){p.setX(i,p.getX(i)*.5);p.setZ(i,p.getZ(i)*.9-.2);}hullG.computeVertexNormals();}
  const hull=new THREE.Mesh(hullG,white);hull.position.y=-.35;const st=new THREE.Mesh(new THREE.ExtrudeGeometry(out(W+.06,L+.06),{depth:.16,bevelEnabled:false,curveSegments:8}).rotateX(-Math.PI/2).rotateY(Math.PI),col);st.position.y=.36;
  const deck=new THREE.Mesh(new THREE.ShapeGeometry(out(W,L,.14),8).rotateX(-Math.PI/2).rotateY(Math.PI),teak);deck.position.y=.67;g.add(hull,st,deck);
  if(seed%3===0){const mast=new THREE.Mesh(new THREE.CylinderGeometry(.045,.06,L*1.25,6),this.sm('#d9dce0'));mast.position.set(0,.65+L*.62,L*.08);const boom=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,L*.5,6).rotateX(Math.PI/2),this.sm('#d9dce0'));boom.position.set(0,1.75,L*.08-L*.25);
   const sail=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,L*.46,7).rotateX(Math.PI/2),this.sm('#2a4f86'));sail.position.set(0,1.9,L*.08-L*.25);const cab=new THREE.Mesh(RB(W*.55,.42,L*.34,.35),white);cab.position.set(0,.88,-L*.02);const win=new THREE.Mesh(new THREE.BoxGeometry(W*.56,.14,L*.26),glass);win.position.set(0,.93,-L*.02);g.add(mast,boom,sail,cab,win);
   {const wire=this.sm('#9aa0a6'),up=new THREE.Vector3(0,1,0),V=(x,y,z)=>new THREE.Vector3(x,y,z),Ln=(a,b,r=.012,m=wire)=>{const d=b.clone().sub(a),o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),5),m);o.position.copy(a).addScaledVector(d,.5);o.quaternion.setFromUnitVectors(up,d.normalize());g.add(o);},mz=L*.08,top=V(0,.65+L*1.22,mz),mid=V(0,.65+L*.7,mz);
    Ln(top,V(0,.72,L/2-.25));Ln(top,V(0,.72,-L/2+.2));for(const sx of [-1,1]){Ln(top,V(sx*.55,mid.y,mz));Ln(V(sx*.55,mid.y,mz),V(sx*(W/2-.12),.72,mz-.15));Ln(V(-sx*.55,mid.y,mz),mid,.02);}
    Ln(V(0,.9,L/2-.3),V(0,.65+L*1.1,mz+.12),.05,this.sm('#f4f4ef'));const fl=new THREE.Mesh(new THREE.BoxGeometry(.02,.22,.34),this.sm(['#c1272d','#1f6f50','#1d4e89'][seed%3]));fl.position.set(0,.65+L*1.25+.05,mz-.2);g.add(fl);}}
  else{const cab=new THREE.Mesh(RB(W*.62,.75,L*.3,.3),white);cab.position.set(0,1.04,-L*.06);const win=new THREE.Mesh(new THREE.BoxGeometry(W*.64,.3,L*.26),glass);win.position.set(0,1.14,-L*.05);const roof=new THREE.Mesh(RB(W*.7,.1,L*.36,.3),white);roof.position.set(0,1.45,-L*.07);
   const ws=new THREE.Mesh(new THREE.BoxGeometry(W*.6,.5,.05).rotateX(-.5),glass);ws.position.set(0,1.1,L*.11);const seat=new THREE.Mesh(new THREE.BoxGeometry(W*.6,.3,.6),this.sm('#e9e4da'));seat.position.set(0,.82,-L*.36);g.add(cab,win,roof,ws,seat);}
  {const steel=this.sm('#d9dce0'),fend=this.sm(seed%2?'#f4f4ef':'#1d4e89'),z0=-L*.42,z1=L*.12;
   for(const sx of [-1,1]){const x=sx*(W/2-.1);for(let z=z0;z<=z1+.01;z+=(z1-z0)/4){const p=new THREE.Mesh(new THREE.BoxGeometry(.035,.5,.035),steel);p.position.set(x,.92,z);g.add(p);}
    for(const yy of [1.16,.94]){const r=new THREE.Mesh(new THREE.BoxGeometry(.03,.03,z1-z0),steel);r.position.set(x,yy,(z0+z1)/2);g.add(r);}
    for(const t of [.15,.5,.85]){const fd=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.42,8),fend);fd.position.set(sx*(W/2+.07),.42,z0+(z1-z0)*t);g.add(fd);}}
   const back=new THREE.Mesh(new THREE.BoxGeometry(W-.2,.03,.03),steel);back.position.set(0,1.16,z0);g.add(back);
   if(seed%3!==0){const en=new THREE.Mesh(RB(.34,.55,.4,.12),this.sm('#22252b'));en.position.set(0,.8,-L/2-.12);const leg=new THREE.Mesh(new THREE.BoxGeometry(.1,.7,.12),this.sm('#22252b'));leg.position.set(0,.2,-L/2-.14);g.add(en,leg);}}
  this.mergeGroup(g);g.userData.phase=seed%10;return g;}
 landmarks(){this.mergellina();const d=this.seaDir(),c=this.center;
  // Vesuvio sull'altra sponda del golfo.
  // Vesuvio: due cime (Somma e Gran Cono) con creste e canaloni, verde alla base e lava scura in alto.
  {const geo=this.vesuvio(430,135,this.mobile?80:130);
   const v=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({vertexColors:true,fog:false}));v.position.set(c.x+d.x*1350+(MODE.front?140:0),0,c.y+d.y*1350);this.static.add(v);}
  // Castel dell'Ovo su un isolotto vicino alla riva.
  for(const d of DEALERS){const G=new THREE.Group(),B=(...a)=>this.bx(G,...a),w=d.w,h=d.h;this.glassD??=Object.assign(new THREE.MeshStandardMaterial({color:'#cfe9f7',transparent:true,opacity:.22,roughness:.06,metalness:.5,depthWrite:false}),{userData:{outlineParameters:{visible:false}}});
   B(w+1.2,.16,h+3.6,0,.08,1.2,'#d8d2c4');B(w,.06,h,0,.19,0,'#efece6');B(w,4,.25,0,2.1,-h/2+.12,'#f4f1ea');for(const sx of [-1,1]){B(.25,4,h,sx*(w/2-.12),2.1,0,'#f4f1ea');B(.3,4,.3,sx*(w/2-.15),2.1,h/2-.15,'#2b2f36');}
   B(w+.8,.5,h+.8,0,4.25,0,'#f4f1ea');B(w+.9,.7,.2,0,3.7,h/2+.36,d.color);for(let x=-w/2+2.7;x<w/2-1;x+=2.7)B(.1,3.4,.1,x,1.9,h/2-.06,'#2b2f36');
   for(const sx of [-1,1]){const gl=new THREE.Mesh(new THREE.PlaneGeometry(w/2-1.1,3.3),this.glassD);gl.position.set(sx*(w/4+.45),1.85,h/2-.05);G.add(gl);}B(1.9,.08,.12,0,2.6,h/2-.05,'#2b2f36');
   const lab=this.label(d.icon+' '+d.name,0,5.1,h/2+.4,'rgba(17,24,39,.9)','#ffe9a8',.85);G.add(lab);
   B(w+.9,.7,.2,0,3.7,-h/2-.1,d.color);B(w-1.4,.9,.06,0,2.55,-h/2-.02,'#1f2c38');for(let x=-w/2+1.6;x<w/2-1;x+=1.5)B(.08,.9,.08,x,2.55,-h/2-.04,'#c9ccd3');B(w+.1,.5,.1,0,.44,-h/2-.04,'#8f877c');G.add(this.label(d.icon+' '+d.name,0,5.1,-h/2-.4,'rgba(17,24,39,.9)','#ffe9a8',.7));
   const mods=VEHICLES_3D.filter(v=>v.shop===d.id),big=d.id==='auto',n=big?3:5;for(let i=0;i<Math.min(n,mods.length);i++){const v=mods[mods.length-1-i],o=this.ride(v.id);if(!o)continue;o.position.set(-w/2+1.6+(w-3.2)*(n>1?i/(n-1):.5),.22,big?-.6:-.9);o.rotation.y=big?.5:Math.PI/2+.3;G.add(o);}
   for(let i=0;i<Math.min(big?3:4,mods.length);i++){const v=mods[i],o=this.ride(v.id);if(!o)continue;o.position.set(-w/2+1.4+i*(big?3.6:2.4),.16,h/2+(big?5.4:2.4));o.rotation.y=big?Math.PI:Math.PI/2;G.add(o);this.col.c.push([d.x+w/2+o.position.x,d.y+h/2+o.position.z,big?1.6:.6]);}
   G.position.set(d.x+w/2,this.groundY,d.y+h/2);G.traverse(o=>{if(o.isMesh)o.castShadow=!this.mobile;});this.static.add(G);this.col.r.push([d.x,d.y,d.x+w,d.y+h-.4]);}
  if(BOATS.lungomare){const B=BOATS.lungomare,k=this.boatKiosk(B);k.position.set(B.dock.x+1.6,this.groundY,B.dock.y+1.6);k.rotation.y=-Math.PI*3/4;this.static.add(k);this.col.c.push([B.dock.x+1.6,B.dock.y+1.6,1.3]);}
  const g=this.castel(.3);
  g.position.set(c.x+d.x*70-(MODE.front?110:-d.y*80),0,c.y+d.y*70+(MODE.front?0:d.x*80));if(MODE.front)g.position.z=F.SEA-60;g.position.x+=d.x*40;g.position.z+=d.y*40;g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});this.static.add(g);
  // Ringhiera del lungomare (vista frontale).
  if(MODE.front){const rail=new THREE.Mesh(new THREE.BoxGeometry(2000,.08,.08),new THREE.MeshLambertMaterial({color:'#f4f1ea'}));rail.position.set(0,1,F.BEACH);this.static.add(rail);}}
 // ---- Palazzi napoletani (generati, niente immagini piatte): facciata dipinta con finestre e persiane,
 // balconi in rilievo, cornicione, attico con parapetto; al piano terra vetrina, porta, tenda e insegna del locale.
 // Aspetto proprio degli edifici speciali: piani, colore, tipo di facciata (classica, moderna, a vetri) e dettagli (tetto a falde, timpano, neon).
 look(b){return ({bank:{floors:2,color:'#ebe5d6',kind:'classic',ped:1,noshop:1,nobalc:1},burger:{floors:1,color:'#d83a2e',kind:'modern',accent:'#ffc928'},mall:{floors:3,color:'#dfe8ef',kind:'glass',accent:'#2a6fd6'},
   villa:{floors:2,color:b.color||'#f7f6f2',kind:'classic',hip:1},fashion:{floors:3,color:'#17181c',kind:'modern',accent:'#ff7ab6'},barber:{floors:2,color:'#e8f0ee',kind:'modern',accent:'#a0303f'},
   casino:{floors:2,color:'#2b1438',kind:'modern',accent:'#ffd35a',neon:'#ffd35a'},club:{floors:2,color:'#1a1330',kind:'modern',accent:'#ff4fd8',neon:'#ff4fd8'},restaurant:{floors:2,color:b.color,kind:'classic'}})[b.style||(b.id==='club'?'club':'')]||null;}
 glassMat(c,em='#ffdcae'){(this.glsM??={});const k=c+em;if(!this.glsM[k]){const m=this.glsM[k]=this.mobile?new THREE.MeshLambertMaterial({color:c,emissive:em,emissiveIntensity:0}):new THREE.MeshStandardMaterial({color:c,roughness:.08,metalness:.55,emissive:em,emissiveIntensity:0});m.userData.merge=true;m.userData.glow=.16;this.glow.add(m);}return this.glsM[k];}
 // Palazzi moderni (centro commerciale, Moda Market, discoteca, sala slot, barbiere, burger): niente facciata dipinta. Corpo di vetro arretrato, fasce piene a ogni piano, pilastri e montanti veri che sporgono, pensilina sopra la vetrina.
 modernDetail(g,w,d,H,G0,floors,L,color,shop){const gls=L.kind==='glass',inn=gls?.14:.3,y0=G0||0,dkw=new THREE.Color(color).getHSL({}).l<.3,GM=this.glassMat(L.neon?'#6a55ad':gls?'#5b93bb':dkw?'#8fb0c4':'#44606f',L.neon||'#ffdcae'),wc=gls?'#cfd8de':color,mc=gls?'#aeb9c1':'#22252b',acc=L.accent||'#888';
  const K=(bw,bh,bd,x,y,z,c)=>{const o=this.bx(g,bw,bh,bd,x,y,z,c);o.castShadow=!this.mobile;o.receiveShadow=true;return o;};
  const core=new THREE.Mesh(new THREE.BoxGeometry(w-inn*2,H-y0,d-inn*2),GM);core.position.y=y0+(H-y0)/2;g.add(core);
  const sill=gls?.3:1,top=gls?3:2.65,f0=shop?1:0,ys=[];if(f0>floors-1)ys.push([y0,H]);else{ys.push([f0*3.3,f0*3.3+sill]);for(let f=f0;f<floors;f++)ys.push([f*3.3+top,f<floors-1?(f+1)*3.3+sill:H]);}
  ys.forEach(([a,b],i)=>K(w,b-a,d,0,(a+b)/2,0,gls&&i===ys.length-1?acc:wc));
  if(f0<=floors-1){const pw=gls?.12:.55,pd=inn+.06,ph=H-y0,py=y0+ph/2,step=gls?1.6:4.2;
   const run=(len,fn)=>{const n=Math.max(1,Math.round(len/step));for(let i=0;i<=n;i++)fn(-len/2+pw/2+(len-pw)*i/n);if(!gls){const m=Math.max(2,Math.round(len/1.35));for(let i=1;i<m;i++)fn(-len/2+len*i/m,1);}};
   run(w,(x,thin)=>{for(const sz of [-1,1])thin?K(.07,ph,.1,x,py,sz*(d/2-inn),mc):K(pw,ph,pd,x,py,sz*(d/2-pd/2+.04),wc);});
   run(d,(z,thin)=>{for(const sx of [-1,1])thin?K(.1,ph,.07,sx*(w/2-inn),py,z,mc):K(pd,ph,pw,sx*(w/2-pd/2+.04),py,z,wc);});}
  if(floors>1)K(w+.36,.3,d+.36,0,H-.45,0,acc);
  if(shop&&floors>1){K(w+.3,.18,.5,0,G0-.02,d/2+.2,acc);K(w+.3,.05,.5,0,G0+.09,d/2+.2,'#f4f1ea');}}
 neonMat(c){(this.neonM??={});if(!this.neonM[c]){const m=this.neonM[c]=new THREE.MeshBasicMaterial({color:c});m.userData.merge=true;m.userData.outlineParameters={visible:false};}return this.neonM[c];}
 facade(wm,floors,{color,shop,seed,balc,kind,accent,neon}){const PX=88,W=Math.max(2,Math.round(wm)),H=floors,c=document.createElement('canvas');c.width=W*PX/2;c.height=Math.round((H*3.3+1.2)*PX/2);const g=c.getContext('2d'),u=PX/2,fh=3.3*u,top=1.2*u,CW=c.width,CH=c.height,y0g=top+(H-1)*fh;
  // Maschera delle luci (un quarto della grandezza): finestre e vetrine che si accendono di sera.
  const ec=document.createElement('canvas');ec.width=Math.ceil(CW/4);ec.height=Math.ceil(CH/4);const eg=ec.getContext('2d');eg.fillStyle='#000';eg.fillRect(0,0,ec.width,ec.height);eg.fillStyle='#fff';const glow=(x,y,w,h)=>eg.fillRect(x/4,y/4,w/4,h/4);
  const cols=Math.max(1,Math.floor(W/2.6)),cw=CW/cols;
  if(kind==='modern'){ // Facciata moderna: tinta piena, fasce colorate (accese di sera se c'è il neon), finestre a nastro.
   g.fillStyle=color;g.fillRect(0,0,CW,CH);{const gr=g.createLinearGradient(0,0,0,CH);gr.addColorStop(0,'rgba(255,255,255,.08)');gr.addColorStop(1,'rgba(0,0,0,.16)');g.fillStyle=gr;g.fillRect(0,0,CW,CH);}
   g.fillStyle=accent;g.fillRect(0,0,CW,top*.55);g.fillRect(0,y0g-.14*u,CW,.14*u);if(neon){glow(0,0,CW,top*.55);glow(0,y0g-.14*u,CW,.14*u);}
   for(let f=0;f<H-1;f++){const wy=top+f*fh+.75*u,wh=1.7*u;g.fillStyle='rgba(255,255,255,.88)';g.fillRect(.5*u,wy-.08*u,CW-u,wh+.16*u);const gr=g.createLinearGradient(0,wy,CW,wy+wh);gr.addColorStop(0,'#b9dbee');gr.addColorStop(.5,'#4f6f86');gr.addColorStop(1,'#263645');g.fillStyle=gr;g.fillRect(.58*u,wy,CW-1.16*u,wh);
    g.fillStyle='rgba(255,255,255,.88)';for(let x=2.08*u;x<CW-.8*u;x+=1.5*u)g.fillRect(x,wy,.07*u,wh);if((seed+f)%2===0||neon)glow(.58*u,wy,CW-1.16*u,wh);}}
  else if(kind==='glass'){ // Facciata continua a vetri (centro commerciale): pannelli azzurri con montanti bianchi.
   const gr=g.createLinearGradient(0,0,CW,CH);gr.addColorStop(0,'#a9d4ee');gr.addColorStop(.5,'#5f93b8');gr.addColorStop(1,'#3d6a8c');g.fillStyle=gr;g.fillRect(0,0,CW,CH);
   for(let y=top,j=0;y<y0g;y+=fh/2,j++)for(let x=0,i=0;x<CW;x+=1.3*u,i++){const h=(i*7+j*13+seed)%9;if(h<2){g.fillStyle='rgba(255,255,255,.15)';g.fillRect(x,y,1.3*u,fh/2);}else if(h<4){g.fillStyle='rgba(0,20,40,.15)';g.fillRect(x,y,1.3*u,fh/2);}if(h===5||h===7)glow(x,y,1.3*u,fh/2);}
   g.fillStyle='#f4f7fa';for(let x=0;x<CW;x+=1.3*u)g.fillRect(x,top,.07*u,y0g-top);for(let y=top;y<=y0g+1;y+=fh/2)g.fillRect(0,y,CW,.07*u);g.fillStyle=accent;g.fillRect(0,0,CW,top);g.fillStyle='#f4f7fa';g.fillRect(0,y0g,CW,fh);}
  else{
  // Intonaco: macchie leggere, più chiaro in alto e più scuro verso terra.
  g.fillStyle=color;g.fillRect(0,0,CW,CH);{const im=!this.toon&&this.imgs&&this.imgs[['yellow_plaster','red_plaster_weathered','painted_plaster_wall','worn_plaster_wall','white_plaster_rough_01'][seed%5]];if(im){g.globalCompositeOperation='multiply';g.globalAlpha=.8;for(let x=0;x<CW;x+=3*u)for(let y=0;y<CH;y+=3*u)g.drawImage(im,x,y,3*u,3*u);g.globalAlpha=1;g.globalCompositeOperation='source-over';g.fillStyle='rgba(255,255,255,.2)';g.fillRect(0,0,CW,CH);}}for(let i=0;i<90;i++){g.fillStyle=i%2?'rgba(70,45,20,.035)':'rgba(255,245,225,.045)';g.fillRect((i*97+seed*13)%CW,(i*53+seed*7)%CH,24+i%46,14+i%30);}
  {const gr=g.createLinearGradient(0,0,0,CH);gr.addColorStop(0,'rgba(255,255,255,.10)');gr.addColorStop(.6,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(40,25,10,.2)');g.fillStyle=gr;g.fillRect(0,0,CW,CH);}
  // Piano terra a bugnato (fasce di pietra) con zoccolo scuro.
  g.fillStyle=shop?'#e9e1d2':'#d8cfbf';g.fillRect(0,y0g,CW,fh);g.strokeStyle='rgba(60,45,30,.26)';g.lineWidth=2;for(let y=y0g+.45*u;y<CH-.5*u;y+=.5*u){g.beginPath();g.moveTo(0,y);g.lineTo(CW,y);g.stroke();}
  g.fillStyle='#8f877c';g.fillRect(0,CH-.55*u,CW,.55*u);g.fillStyle='rgba(0,0,0,.3)';g.fillRect(0,CH-.55*u,CW,3);
  // Cornicione con dentelli, fasce marcapiano con la loro ombra, lesene sugli angoli.
  g.fillStyle='rgba(255,255,255,.72)';g.fillRect(0,0,CW,top*.55);g.fillStyle='rgba(0,0,0,.2)';g.fillRect(0,top*.55,CW,4);for(let k=0;k<CW;k+=.5*u){g.fillStyle='rgba(0,0,0,.13)';g.fillRect(k,top*.28,.25*u,top*.27);}
  for(let f=1;f<=H-1;f++){const y=top+f*fh;g.fillStyle='rgba(255,255,255,.62)';g.fillRect(0,y-.16*u,CW,.16*u);g.fillStyle='rgba(0,0,0,.2)';g.fillRect(0,y,CW,3);}
  for(const x of [0,CW-.4*u]){g.fillStyle='rgba(255,255,255,.26)';g.fillRect(x,top,.4*u,y0g-top);g.strokeStyle='rgba(0,0,0,.12)';g.lineWidth=1.5;for(let y=top+.6*u;y<y0g;y+=.6*u){g.beginPath();g.moveTo(x,y);g.lineTo(x+.4*u,y);g.stroke();}}
  const SH=['#2f6b4f','#3d5a80','#7a4a2a','#4a6b3a'][seed%4];
  for(let f=0;f<H-1;f++){const y0=top+f*fh;for(let k=0;k<cols;k++){const cx=k*cw+cw/2,door=balc&&(k+f+seed)%2===0&&!(shop&&f===H-2),ww=.9*u,wh=(door?2.5:1.85)*u,wx=cx-ww/2,wy=y0+.7*u,closed=((seed+k*7+f*13)%5)===0,lit=!closed&&((seed*3+k*5+f*11)%5)<2;
    // Cornice di pietra: timpano a triangolo al piano nobile, architrave dritto negli altri.
    g.fillStyle='rgba(255,252,244,.93)';g.fillRect(wx-.16*u,wy-.2*u,ww+.32*u,wh+(door?.2:.36)*u);
    if(f===H-2){g.beginPath();g.moveTo(wx-.32*u,wy-.2*u);g.lineTo(cx,wy-.56*u);g.lineTo(wx+ww+.32*u,wy-.2*u);g.closePath();g.fill();g.fillStyle='rgba(0,0,0,.16)';g.fillRect(wx-.32*u,wy-.2*u,ww+.64*u,3);}else g.fillRect(wx-.27*u,wy-.31*u,ww+.54*u,.12*u);
    const gr=g.createLinearGradient(wx,wy,wx+ww,wy+wh);gr.addColorStop(0,'#a9cfe6');gr.addColorStop(.5,'#4a6a82');gr.addColorStop(1,'#1f2e3b');g.fillStyle=gr;g.fillRect(wx,wy,ww,wh);
    g.fillStyle='rgba(255,255,255,.22)';g.beginPath();g.moveTo(wx+2,wy+wh*.5);g.lineTo(wx+ww*.7,wy+2);g.lineTo(wx+ww-2,wy+2);g.lineTo(wx+2,wy+wh*.8);g.fill();
    g.fillStyle='#f4efe4';g.fillRect(cx-1.5,wy,3,wh);g.fillRect(wx,wy+wh*.3,ww,3);g.fillStyle='rgba(0,0,0,.3)';g.fillRect(wx,wy,ww,3);g.fillRect(wx,wy,3,wh);
    // Persiane a stecche (alcune chiuse).
    g.fillStyle=SH;if(closed)g.fillRect(wx,wy,ww,wh);else{g.fillRect(wx-.45*u,wy,.43*u,wh);g.fillRect(wx+ww+.02*u,wy,.43*u,wh);}
    g.fillStyle='rgba(0,0,0,.22)';for(let q=4;q<wh;q+=5){if(closed)g.fillRect(wx,wy+q,ww,1.5);else{g.fillRect(wx-.45*u,wy+q,.43*u,1.5);g.fillRect(wx+ww+.02*u,wy+q,.43*u,1.5);}}
    if(!door){g.fillStyle='#f1ebdf';g.fillRect(wx-.22*u,wy+wh+.02*u,ww+.44*u,.12*u);g.fillStyle='rgba(0,0,0,.22)';g.fillRect(wx-.22*u,wy+wh+.14*u,ww+.44*u,.07*u);}
    if(lit)glow(wx,wy,ww,wh);}}
  {const sel=(seed>>3)%8,PH=this.fac&&this.fac[sel],B=sel>3;if(PH){const sw=B?270:290,sh=B?370:300,bays=Math.max(1,Math.round(W/(B?2.5:3.2))),bw=CW/bays;eg.fillStyle='#000';eg.fillRect(0,top/4,ec.width,(CH-top)/4);eg.fillStyle='#fff';
   const put=(k,sy,h,dy,dh)=>{g.save();if(k%2){g.translate((k+1)*bw,dy);g.scale(-1,1);}else g.translate(k*bw,dy);g.drawImage(PH,0,sy,sw,h,0,0,bw+.6,dh+.6);g.restore();};
   for(let f=0;f<H-1;f++){const y0=top+f*fh,low=(H-2-f)%2===0;for(let k=0;k<bays;k++){put(k,low?sh:0,sh,y0,fh);if(((seed*3+k*5+f*11)%5)<2)glow(k*bw+bw*.34,y0+fh*(B?.14:.22),bw*.32,fh*(B?.5:.4));}}
   g.globalCompositeOperation='screen';g.fillStyle='rgba(255,244,225,.2)';g.fillRect(0,0,CW,CH);g.globalCompositeOperation='source-over';
   if(B){if(!shop)for(let k=0;k<bays;k++)put(k,740,415,y0g,fh);{const gr=g.createLinearGradient(0,0,0,top);gr.addColorStop(0,'#e4dfd3');gr.addColorStop(.55,'#cfc9bb');gr.addColorStop(1,'#a9a394');g.fillStyle=gr;g.fillRect(0,0,CW,top);g.fillStyle='rgba(0,0,0,.2)';for(let x=.2*u;x<CW;x+=.55*u)g.fillRect(x,top*.5,.22*u,top*.32);g.fillStyle='rgba(255,255,255,.35)';g.fillRect(0,top*.42,CW,3);g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,top-4,CW,4);}}
   else for(let k=0;k<bays;k++)put(k,497,100,0,top);}}
  }
  if(!shop&&!kind)for(let k=0;k<cols;k++){const cx=k*cw+cw/2;
   if(k===Math.floor(cols/2)){const dw=1.5*u,dy=CH-2.5*u,dx=cx-dw/2,ay=dy+dw/2;
    // Portone ad arco: cornice di pietra, battenti di legno con specchiature, lunetta di vetro, pomelli di ottone.
    g.fillStyle='#f1ebdf';g.beginPath();g.moveTo(dx-.18*u,CH);g.lineTo(dx-.18*u,ay);g.arc(cx,ay,dw/2+.18*u,Math.PI,0);g.lineTo(dx+dw+.18*u,CH);g.fill();
    g.fillStyle='#5a3a24';g.beginPath();g.moveTo(dx,CH);g.lineTo(dx,ay);g.arc(cx,ay,dw/2,Math.PI,0);g.lineTo(dx+dw,CH);g.fill();
    g.fillStyle='#22303c';g.beginPath();g.arc(cx,ay,dw/2-.09*u,Math.PI,0);g.fill();g.fillStyle='#5a3a24';g.fillRect(dx,ay-.05*u,dw,.1*u);
    g.strokeStyle='#3b2516';g.lineWidth=2;g.beginPath();g.moveTo(cx,ay);g.lineTo(cx,CH);g.stroke();for(const sx of [-1,1])for(const py of [.2,1.02]){g.strokeRect(cx+sx*dw*.26-dw*.16,ay+py*u,dw*.32,.66*u);}
    g.fillStyle='#d9b24a';g.fillRect(cx-.13*u,ay+.92*u,.07*u,.07*u);g.fillRect(cx+.06*u,ay+.92*u,.07*u,.07*u);}
   else if(!(this.fac&&(seed>>3)%8>3)){const ww=.9*u,wh=1.3*u,wx=cx-ww/2,wy=y0g+.85*u;g.fillStyle='rgba(255,252,244,.9)';g.fillRect(wx-.14*u,wy-.14*u,ww+.28*u,wh+.28*u);g.fillStyle='#2b3440';g.fillRect(wx,wy,ww,wh);
    // Inferriata.
    g.strokeStyle='#15181c';g.lineWidth=1.5;for(let q=wx+ww/5;q<wx+ww-1;q+=ww/5){g.beginPath();g.moveTo(q,wy);g.lineTo(q,wy+wh);g.stroke();}g.beginPath();g.moveTo(wx,wy+wh/2);g.lineTo(wx+ww,wy+wh/2);g.stroke();}}
  if(shop){const vy=y0g+.95*u,vh=2*u;g.fillStyle='#3a2c22';g.fillRect(.35*u,vy-.12*u,CW-.7*u,CH-vy+.12*u);
   const n=Math.max(3,Math.round((CW-.9*u)/(1.7*u))),pw=(CW-.9*u)/n,dk=Math.floor(n/2);
   for(let i=0;i<n;i++){const x=.45*u+i*pw;
    // Porta a vetri al centro, vetrine con riflesso e merce esposta ai lati.
    if(i===dk){g.fillStyle='#4a3626';g.fillRect(x+3,vy,pw-6,CH-vy);g.fillStyle='#9fc3d6';g.fillRect(x+.14*u,vy+.12*u,pw-.28*u,1.6*u);g.fillStyle='#d9b24a';g.fillRect(x+pw-.32*u,vy+1.25*u,.08*u,.3*u);glow(x+.14*u,vy+.12*u,pw-.28*u,1.6*u);continue;}
    const gr=g.createLinearGradient(x,vy,x+pw,vy+vh);gr.addColorStop(0,'#b9dbee');gr.addColorStop(.55,'#55748a');gr.addColorStop(1,'#2a3b49');g.fillStyle=gr;g.fillRect(x+3,vy,pw-6,vh);
    g.fillStyle='rgba(255,255,255,.2)';g.beginPath();g.moveTo(x+6,vy+vh*.7);g.lineTo(x+pw*.6,vy+3);g.lineTo(x+pw*.85,vy+3);g.lineTo(x+6,vy+vh);g.fill();
    for(let q=0;q<3;q++){g.fillStyle=['#e5484d','#ffc928','#2f9e5b','#f4f1ea','#8a5cff'][(seed+i*3+q)%5];g.fillRect(x+pw*.18+q*pw*.24,vy+vh-.55*u,pw*.16,.4*u);}
    g.fillStyle='#8f877c';g.fillRect(x+3,vy+vh,pw-6,CH-vy-vh);glow(x+3,vy,pw-6,vh);}}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return {map:t,glow:new THREE.CanvasTexture(ec)};}
 palazzo(b,w,d,ang){const residential=/^(villa|residence)/.test(b.id),seed=hash(b.id),L=this.look(b),shop=!residential&&b.enterable!==false&&!L?.noshop;
  const COLORS=['#d9a35b','#c96f4a','#e3c27a','#d98f7a','#efe0b9','#b5654a','#e8b26a','#d7c4a0','#c98b5e','#f0d39a'];
  const floors=L?.floors||Math.max(residential?2:4,Math.min(residential?5:6,Math.round(Math.min(w,d)/2.2)+seed%3));
  const DET=!L||L.kind==='classic',H=DET?floors*3.3+.3:floors*3.3+1.2,color=L?.color||COLORS[seed%COLORS.length],balc=!L?.nobalc&&(!L||L.kind==='classic'),kind=L&&L.kind!=='classic'?L.kind:null;
  const front=null,side=null;
  const fm=q=>{const m=this.toon?new THREE.MeshStandardMaterial({map:q.map,emissive:'#ffd58a',emissiveMap:q.glow,emissiveIntensity:0}):new THREE.MeshLambertMaterial({map:q.map,bumpMap:q.map,bumpScale:this.fac?.5:1.8,emissive:'#ffd58a',emissiveMap:q.glow,emissiveIntensity:0});m.userData.glow=1.15;return m;};
  // Tetto a terrazza pavimentato in cotto (texture ripetuta ogni 2 m).
  if(!this.roofM){this.roofM=new THREE.MeshToonMaterial({map:this.gtex('roof',{c:'#b98268',grid:[4,4],var:.08,joint:'rgba(60,30,20,.4)'}),gradientMap:this.grad});this.roofM.userData.merge=true;}
  const roof=this.roofM,mf=null,ms=null,G0=shop?3.3:0,geo=new THREE.BoxGeometry(w,H-G0,d),rg=new THREE.PlaneGeometry(w,d).rotateX(-Math.PI/2);{const uv=rg.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/2,uv.getY(i)*d/2);}
  geo.clearGroups();geo.addGroup(0,12,0);geo.addGroup(24,12,1);if(G0){const uv=geo.attributes.uv,v0=G0/H;for(let i=0;i<uv.count;i++)uv.setY(i,v0+uv.getY(i)*(1-v0));}
  const g=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(w,H,d),new THREE.MeshBasicMaterial({visible:false})),top=new THREE.Mesh(rg,roof);body.position.y=H/2;top.position.y=H;if(G0)this.shopInside(g,b,w,d,seed,L,DET?.4:0);body.castShadow=body.receiveShadow=false;body.userData.keep=true;g.userData.solidBox=body;g.add(body,top);if(!DET)this.modernDetail(g,w,d,H,G0,floors,L,color,shop);
  if(DET){ // facciate vere sui quattro lati: il davanti di un negozio resta aperto al piano terra (dietro c'è la sala vera), gli altri palazzi hanno il portone
   body.userData.keep=true;g.userData.solidBox=body;const M=this.facadeMats(true),FB={};for(const k of Object.keys(M))FB[k]={p:[],u:[],c:[]};const c3=new THREE.Color(color),wk=L?.hip?1.35:1.2,wc=[c3.r*wk,c3.g*wk,c3.b*wk];
   [[[-w/2,d/2],[w/2,d/2],0,1],[[w/2,d/2],[w/2,-d/2],1,0],[[w/2,-d/2],[-w/2,-d/2],0,-1],[[-w/2,-d/2],[-w/2,d/2],-1,0]].forEach(([a,n,nx,ny],i)=>this.facadeDetail(FB,a,n,nx,ny,floors,seed+i*7,wc,{G:3.3,y0:.12,open:shop&&i===0,door:!shop&&i===0,noShops:residential}));
   for(const k of Object.keys(FB)){const q=FB[k];if(!q.p.length)continue;const ge=new THREE.BufferGeometry();ge.setAttribute('position',new THREE.Float32BufferAttribute(q.p,3));ge.setAttribute('uv',new THREE.Float32BufferAttribute(q.u,2));ge.setAttribute('color',new THREE.Float32BufferAttribute(q.c,3));ge.computeVertexNormals();const m=new THREE.Mesh(ge,M[k]);m.castShadow=!this.mobile&&k!=='ao'&&k!=='gl';m.receiveShadow=k!=='ao';m.userData.toon=m.userData.real=true;g.add(m);}}
  const stone=this.sm('#efe7d8');
  // Cornicione e parapetto del tetto a terrazza.
  if(!DET){const cor=new THREE.Mesh(new THREE.BoxGeometry(w+.7,.16,d+.7),stone);cor.position.y=H+.08;g.add(cor);}if(!DET){const c2=new THREE.Mesh(new THREE.BoxGeometry(w+.36,.2,d+.36),stone);c2.position.y=H-.1;g.add(c2);}
  if(!DET&&!L?.hip&&!(this.fac&&!kind&&(seed>>3)%8<4))for(const [x,z,lx,lz] of [[0,d/2,w,.2],[0,-d/2,w,.2],[w/2,0,.2,d],[-w/2,0,.2,d]]){const p=new THREE.Mesh(new THREE.BoxGeometry(lx,.5,lz),stone);p.position.set(x,H+.41,z);g.add(p);}
  // Balconi: soletta di pietra e ringhiera di ferro a bacchette (davanti e sui due fianchi).
  const cols0=Math.max(1,Math.floor(Math.max(2,Math.round(w))/2.6)),rail=this.sm('#2a2f33'),bars=this.railMat();
  const FB=this.fac&&!kind&&(seed>>3)%8>3,cols=FB?Math.max(1,Math.round(Math.max(2,Math.round(w))/2.5)):cols0,cw=w/cols;
  if(!DET&&balc&&(FB||!this.fac))for(let f=0;f<floors-1;f++)for(let k=0;k<cols;k++){if(!FB&&((k+f+seed)%2||(shop&&f===floors-2)))continue;const x=-w/2+cw*(k+.5),yy=H-1.2-(f+1)*3.3+(FB?.22:.05);
   if(FB){const bw=cw*.84,sl=new THREE.Mesh(new THREE.BoxGeometry(bw,.13,.7),stone);sl.position.set(x,yy,d/2+.35);const h1=new THREE.Mesh(new THREE.BoxGeometry(bw,.05,.05),rail);h1.position.set(x,yy+1,d/2+.68);g.add(sl,h1);for(const sx of [-1,1]){const h2=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,.68),rail);h2.position.set(x+sx*bw/2,yy+1,d/2+.34);const pst=new THREE.Mesh(new THREE.BoxGeometry(.05,1,.05),rail);pst.position.set(x+sx*bw/2,yy+.5,d/2+.68);g.add(h2,pst);}continue;}
   const slab=new THREE.Mesh(new THREE.BoxGeometry(1.7,.14,.8),stone);slab.position.set(x,yy,d/2+.4);const r=new THREE.Mesh(new THREE.PlaneGeometry(1.7,.95),bars);r.position.set(x,yy+.54,d/2+.78);g.add(slab,r);
   for(const sx of [-1,1]){const q=new THREE.Mesh(new THREE.PlaneGeometry(.78,.95),bars);q.position.set(x+sx*.84,yy+.54,d/2+.4);q.rotation.y=Math.PI/2;g.add(q);}}
  // Sul tetto: torrino delle scale, comignoli e antenna (danno vita al profilo dei tetti).
  if(!L?.hip){const r=k=>(hash(b.id+':tetto'+k)%100)/100;
   if(w>5&&d>5){const tx=(r(1)-.5)*(w-3.4),tz=(r(2)-.5)*(d-3.4),t=new THREE.Mesh(new THREE.BoxGeometry(2.4,2.3,2.4),stone),cap=new THREE.Mesh(new THREE.BoxGeometry(2.8,.14,2.8),stone);t.position.set(tx,H+1.15,tz);cap.position.set(tx,H+2.37,tz);g.add(t,cap);}
   for(let i=0;i<2;i++){const ch=new THREE.Mesh(new THREE.BoxGeometry(.5,1.2,.5),stone);ch.position.set((r(3+i)-.5)*(w-1.6),H+.6,(r(5+i)-.5)*(d-1.6));g.add(ch);}
   const ax=(r(7)-.5)*(w-1.6),az=(r(8)-.5)*(d-1.6),an=new THREE.Mesh(new THREE.BoxGeometry(.05,2.4,.05),rail),b1=new THREE.Mesh(new THREE.BoxGeometry(1,.04,.04),rail),b2=new THREE.Mesh(new THREE.BoxGeometry(.7,.04,.04),rail);an.position.set(ax,H+1.2,az);b1.position.set(ax,H+2.2,az);b2.position.set(ax,H+1.9,az);g.add(an,b1,b2);}
  // Ville: tetto a quattro falde in tegole con comignolo.
  if(L?.hip){if(!this.tileM){if(this.toon)this.tileM=this.sm('#b5553a');else{const t=this.tex('clay_roof_tiles_02','diff');t.repeat.set(5,2.5);this.tileM=new THREE.MeshLambertMaterial({map:t,color:this.photoTint('clay_roof_tiles_02','#b9603f')});this.tileM.userData.merge=true;}}const hr=new THREE.Mesh(new THREE.ConeGeometry(1,1,4,1).rotateY(Math.PI/4),this.tileM);hr.scale.set((w+1)/Math.SQRT2,1.9,(d+1)/Math.SQRT2);hr.position.y=H+1.4;const ch=new THREE.Mesh(new THREE.BoxGeometry(.5,1.5,.5),stone);ch.position.set(w*.25,H+1.2,-d*.2);g.add(hr,ch);}
  // Banca: timpano a triangolo, colonne davanti alla facciata e gradino d'ingresso.
  if(L?.ped){const sh=new THREE.Shape();sh.moveTo(-w/2-.2,0);sh.lineTo(w/2+.2,0);sh.lineTo(0,1.7);const pm=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:.5,bevelEnabled:false}),stone);pm.position.set(0,H+.42,d/2-.2);g.add(pm);
   const n=Math.max(4,2*Math.round(w/3.6));for(let i=0;i<n;i++){const c=new THREE.Mesh(new THREE.CylinderGeometry(.2,.24,H-.5,10),stone);c.position.set(-w/2+.5+(w-1)*i/(n-1),(H-.5)/2+.25,d/2+.32);g.add(c);}const st=new THREE.Mesh(new THREE.BoxGeometry(w+.4,.25,.9),stone);st.position.set(0,.12,d/2+.35);g.add(st);}
  // Discoteca e sala slot: tubi al neon lungo i bordi della facciata (restano accesi anche di notte).
  if(L?.neon){const nm=this.neonMat(L.neon);for(const [bw,bh,x,y] of [[w+.1,.1,0,H+.5],[w+.1,.1,0,3.5],[.1,H-3,w/2,(H+4)/2],[.1,H-3,-w/2,(H+4)/2]]){const q=new THREE.Mesh(new THREE.BoxGeometry(bw,bh,.1),nm);q.position.set(x,y,d/2+.08);g.add(q);}}
  // Piano terra del locale: tenda a strisce (o pensilina piatta negli edifici moderni) e insegna con il nome.
  if(shop){const aw=kind?new THREE.Mesh(new THREE.BoxGeometry(w*.92,.12,1.3),this.sm(L.accent)):new THREE.Mesh(new THREE.BoxGeometry(w*.9,.08,1.4),this.awnMat(seed%4));aw.position.set(0,kind?3.3:3.25,d/2+.66);if(!kind)aw.rotation.x=.22;g.add(aw);}
  if(b.name&&!residential&&b.enterable!==false){const sg=this.sign(b.name,seed);sg.position.set(0,shop?3.95:3.75,d/2+(L?.ped?.62:.06));g.add(sg);}
  {if(!this.aoM){const c=document.createElement('canvas');c.width=c.height=128;const q=c.getContext('2d');q.shadowColor='rgba(0,0,0,.55)';q.shadowBlur=16;q.fillStyle='rgba(0,0,0,.3)';q.fillRect(26,26,76,76);q.shadowBlur=0;this.aoM=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});this.aoM.userData.merge=true;this.aoM.userData.outlineParameters={visible:false};}
   const k=128/76,ao=new THREE.Mesh(new THREE.PlaneGeometry(w*k,d*k).rotateX(-Math.PI/2),this.aoM);ao.position.y=.15;ao.userData.toon=ao.userData.real=true;g.add(ao);}
  if(!g.userData.solidBox){const sb=new THREE.Mesh(new THREE.BoxGeometry(w,H,d),new THREE.MeshBasicMaterial({visible:false}));sb.position.y=H/2;sb.userData.keep=true;g.add(sb);g.userData.solidBox=sb;}
  this.mergeGroup(g);g.rotation.y=Math.round(ang/(Math.PI/2))*(Math.PI/2);return g;}
 // Converte i materiali in stile cartone (una volta per materiale): colori pieni, ombra a gradini; le foto restano solo sulle insegne.
 // Grafica realistica: i materiali "da cartone" diventano materiali a luce morbida (leggeri per il PC), una volta per materiale.
 // I materiali lucidi che riflettono il cielo (mare, vernice delle auto) vengono creati a parte, perché costano di più.
 realify(root){(this.realMats??=new Map());const conv=m=>{if(!m)return m;
   if(!m.isMeshToonMaterial){if(m.userData.glow&&!this.glow.has(m)){m.emissiveIntensity=m.userData.glow*(this.night||0);this.glow.add(m);}return m;}
   let t=this.realMats.get(m);if(!t){t=new THREE.MeshLambertMaterial({color:m.color.clone(),map:m.map,alphaMap:m.alphaMap,alphaTest:m.alphaTest,side:m.side,vertexColors:m.vertexColors,transparent:m.transparent,opacity:m.opacity,depthWrite:m.depthWrite,polygonOffset:m.polygonOffset,polygonOffsetFactor:m.polygonOffsetFactor,polygonOffsetUnits:m.polygonOffsetUnits,fog:m.fog});
    if(m.emissiveMap||m.emissive.getHex()){t.emissive.copy(m.emissive);t.emissiveMap=m.emissiveMap;t.emissiveIntensity=m.emissiveIntensity;}
    t.userData=m.userData;if(this.glow.delete(m)||m.userData.glow){t.emissiveIntensity=(m.userData.glow||1)*(this.night||0);this.glow.add(t);}this.realMats.set(m,t);}return t;};
  root.traverse(o=>{if(!o.isMesh||o.userData.real)return;o.userData.real=true;o.material=Array.isArray(o.material)?o.material.map(conv):conv(o.material);});}
 // Foto di un materiale vero (asfalto, lastre, sampietrini…) come semplice colore: stesso aspetto, costo minimo.
 photoTint(id,hex){const a={clean_asphalt:[69,70,70],coast_sand_01:[130,114,91],granite_tile:[78,78,79],large_sandstone_blocks:[86,83,75],marble_tiles:[140,129,114],pavement_02:[150,128,106],leafy_grass:[151,131,89],bark_brown_02:[94,85,63],palm_tree_bark:[156,144,129],clay_roof_tiles_02:[145,79,43],square_cobblestone:[108,96,74]}[id],t=new THREE.Color(hex),L=v=>Math.pow(v/255,2.2);return a?new THREE.Color().setRGB(t.r/L(a[0]),t.g/L(a[1]),t.b/L(a[2])):t;}
 // Marciapiede di basoli: lastre grigie rettangolari in file sfalsate (stesso disegno di Mergellina), usato anche sul Lungomare.
 basoliMat(rp,tint){const key=tint?tint.join():'g';(this.basMs??={});if(this.basMs[key])return this.basMs[key];if(this.basT){const m=new THREE.MeshLambertMaterial({map:this.basT});if(tint)m.color.setRGB(tint[0],tint[1],tint[2]);else m.color.set('#f2f0ea');return this.basMs[key]=m;}const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');g.fillStyle='#63625f';g.fillRect(0,0,512,512);const G=['#8f8f8c','#9a9996','#878785','#a2a19d','#93928f','#8a8a88'];for(let j=0;j<8;j++)for(let i=-1;i<6;i++){const x=i*102.4+(j%2)*51.2,y=j*64,h=hash('basolo'+i+':'+j);g.fillStyle=G[h%6];g.fillRect(x+1.5,y+1.5,99.4,61);g.fillStyle='rgba(255,255,255,.07)';g.fillRect(x+1.5,y+1.5,99.4,3);g.fillStyle='rgba(0,0,0,.08)';g.fillRect(x+1.5,y+58,99.4,4.5);}for(let k=0;k<2600;k++){g.fillStyle=k%2?'rgba(0,0,0,.07)':'rgba(255,255,255,.06)';g.fillRect((k*197)%512,(k*131)%512,2,2);}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rp,rp);t.anisotropy=8;this.basT=t;return this.basoliMat(rp,tint);}
 photo(id,hex){(this.photos??=new Map());const k=id+hex;if(!this.photos.has(k))this.photos.set(k,new THREE.MeshLambertMaterial({map:this.tex(id,'diff'),color:this.photoTint(id,hex)}));return this.photos.get(k);}
 toonify(root){if(!this.toon)return this.realify(root);const avg=im=>{try{const c=document.createElement('canvas');c.width=c.height=8;const x=c.getContext('2d');x.drawImage(im,0,0,8,8);const d=x.getImageData(0,0,8,8).data;let r=0,g=0,b=0;for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2];}return new THREE.Color().setRGB(r/64/255,g/64/255,b/64/255,THREE.SRGBColorSpace);}catch{return null;}};
  root.traverse(o=>{if(!o.isMesh||o.userData.toon)return;const mats=[].concat(o.material);if(mats.some(m=>m?.map&&!m.map.isCanvasTexture&&m.normalMap&&!m.map.image))return;o.userData.toon=true;const conv=m=>{if(!m||m.isMeshToonMaterial||m.isMeshBasicMaterial)return m;let t=this.toonMats.get(m);if(!t){const keep=m.map&&(m.map.isCanvasTexture||m.userData?.keepMap||!m.normalMap);t=new THREE.MeshToonMaterial({color:m.color?m.color.clone():0xffffff,map:keep?m.map:null,gradientMap:this.grad,transparent:m.transparent,opacity:m.opacity,side:m.side,vertexColors:m.vertexColors,alphaTest:m.alphaTest});if(!keep&&m.map){const a=avg(m.map.image);if(a)t.color.multiply(a).multiplyScalar(1.15);}if(m.emissive&&(m.emissiveMap||m.emissive.getHex())){t.emissive.copy(m.emissive);t.emissiveMap=m.emissiveMap||null;t.emissiveIntensity=m.emissiveIntensity;if(m.userData.glow){t.userData.glow=m.userData.glow;t.emissiveIntensity=m.userData.glow*(this.night||0);this.glow.add(t);}}this.toonMats.set(m,t);}return t;};o.material=Array.isArray(o.material)?o.material.map(conv):conv(o.material);});}
 // Unisce i pezzi dello stesso materiale (balconi, ringhiere, parapetti) in un'unica mesh: molte meno chiamate di disegno.
 mergeGroup(g){const by=new Map();for(const c of [...g.children]){if(!c.isMesh||Array.isArray(c.material)||c.userData.keep)continue;c.updateMatrix();(by.get(c.material)||by.set(c.material,[]).get(c.material)).push(c);}
  for(const [mat,list] of by){if(list.length<2)continue;const geo=mergeGeometries(list.map(c=>{const q=c.geometry.index?c.geometry.toNonIndexed():c.geometry.clone();return q.applyMatrix4(c.matrix);}));if(!geo)continue;for(const c of list)g.remove(c);const m=new THREE.Mesh(geo,mat);m.castShadow=m.receiveShadow=!this.mobile;g.add(m);}return g;}
 sign(text,seed){const c=document.createElement('canvas'),x=c.getContext('2d');x.font='bold 64px Georgia,serif';const w=Math.ceil(x.measureText(text).width)+60;c.width=w;c.height=96;x.fillStyle=['#1d2b36','#3a1f14','#16302a','#2b2140'][seed%4];x.fillRect(0,0,w,96);x.strokeStyle='#e8c66a';x.lineWidth=5;x.strokeRect(5,5,w-10,86);x.fillStyle='#f6e7b0';x.font='bold 64px Georgia,serif';x.textBaseline='middle';x.textAlign='center';x.fillText(text,w/2,50);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const h=.7,m=new THREE.Mesh(new THREE.PlaneGeometry(h*w/96,h),new THREE.MeshBasicMaterial({map:t}));return m;}
 async building(b,id){const door=b.door||{x:b.fx+b.fw/2,y:b.fy+b.fh};
  const cx=b.fx+b.fw/2,cz=b.fy+b.fh/2,ang=Math.atan2(door.x-cx,door.y-cz),side=Math.abs(Math.sin(ang))>.7;
  const w=side?b.fh:b.fw,d=side?b.fw:b.fh,o=this.palazzo(b,w,d,ang),gy=this.groundY;if(id.dead)return;o.position.set(cx,0,cz);o.userData.building=b.id;id.g.add(o);id.solid.push(o.userData.solidBox||o);this.col.r.push([b.fx,b.fy,b.fx+b.fw,b.fy+b.fh]);
  if(['bar','pizzeria','osteria','trattoria','vesuvio','panorama','burger'].includes(b.id)){const r=Math.round(ang/(Math.PI/2))*(Math.PI/2),fx=Math.sin(r),fz=Math.cos(r),sx=Math.cos(r),sz=-Math.sin(r);
   for(const k of [-1,1]){const t=this.table();t.position.set(door.x+fx*3.2+sx*k*3.4,gy,door.y+fz*3.2+sz*k*3.4);t.rotation.y=r;id.g.add(t);}
   if(b.id==='bar'){const cc=await this.model('ph/CoffeeCart_01/CoffeeCart_01.gltf',{length:2});if(cc&&!id.dead){cc.position.set(door.x+fx*2.2+sx*6.5,gy,door.y+fz*2.2+sz*6.5);cc.rotation.y=r;id.g.add(cc);}}}}
 async prop(p,id){const y0=this.lev(p.x,p.y),at=(o,rot=true)=>{if(!o||id.dead)return;o.position.set(p.x,y0,p.y);if(rot)o.rotation.y=(p.rot||0)+(hash(p.id||p.x+','+p.y)%8)*.0;if(p.flip)o.scale.x*=-1;if(p.scale&&p.scale!==1)o.scale.multiplyScalar(p.scale);this.share(o);id.g.add(o);};
  const k=p.kind,sc=p.scale||1,B=(g,w,h,d,x,y,z,c)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),this.sm(c));o.position.set(x,y,z);g.add(o);return o;};
  // Auto parcheggiata (stessa posizione e stesso colore del 2D): berline, fuoristrada e qualche sportiva.
  if(k==='car'){const h=hash(p.id||p.x+','+p.y),o=this.car(['sedan','suv','sedan','super','sedan','suv'][h%6],p.color||'#c8432f');o.rotation.y=heading((Math.round(p.x*7+p.y)%2)?0:Math.PI/2);{const ax=(Math.round(p.x*7+p.y)%2)?1:0;for(const k of [-1.1,0,1.1])this.col.c.push([p.x+ax*k,p.y+(1-ax)*k,.95]);}return at(o,false);}
  if(k==='lounger'){const g=new THREE.Group();B(g,1.9,.08,.62,0,.3,0,'#fbfaf6');B(g,1.15,.06,.56,.32,.37,0,'#5bb5e0');B(g,.72,.06,.56,-.7,.52,0,'#5bb5e0').rotation.z=-.6;for(const x of [-.8,.8])B(g,.06,.3,.6,x,.15,0,'#e9e4da');return at(g,false);}
  if(k==='busstop'){const g=new THREE.Group();for(const x of [-1.1,1.1])B(g,.08,2.4,.08,x,1.2,0,'#4a5862');B(g,2.6,.1,1.2,0,2.45,.3,'#2a6fd6');B(g,2.2,1.5,.04,0,1.35,-.02,'#bfe3f5');B(g,2,.08,.4,0,.5,.3,'#7a8a95');at(g,false);if(!id.dead)id.g.add(this.label('🚌 '+(p.name||'Fermata'),p.x,y0+3.1,p.y,'#ffffff','#17324a',.8));return;}
  if(k==='forsale'){const st=this.r2d.villaStatus?.[p.villa];if(st&&st.status!=='free')return;const g=new THREE.Group();B(g,.08,1.5,.08,0,.75,0,'#6b4a32');for(const sd of [1,-1]){const q=new THREE.Mesh(new THREE.PlaneGeometry(1.2,.6),this.saleMat());q.position.set(0,1.55,.05*sd);if(sd<0)q.rotation.y=Math.PI;g.add(q);}return at(g,false);}
  if(k==='slide'){const g=new THREE.Group();B(g,.9,1.6,.9,-.6,.8,0,'#4fa3d1');B(g,1,.1,1,-.6,1.65,0,'#e5484d');B(g,2.1,.08,.6,.6,.85,0,'#ffc928').rotation.z=-.72;return at(g,false);}
  if(k==='swing'){const g=new THREE.Group();for(const x of [-.9,.9]){B(g,.08,2.3,.08,x,1.1,.33,'#d24b3b').rotation.x=.29;B(g,.08,2.3,.08,x,1.1,-.33,'#d24b3b').rotation.x=-.29;}B(g,1.9,.08,.08,0,2.2,0,'#d24b3b');for(const x of [-.38,.38]){B(g,.02,1.5,.02,x-.14,1.45,0,'#555555');B(g,.02,1.5,.02,x+.14,1.45,0,'#555555');B(g,.36,.05,.2,x,.7,0,'#ffc928');}return at(g,false);}
  if(k==='sandbox'){const g=new THREE.Group();B(g,2.2,.25,2.2,0,.12,0,'#c79a5c');B(g,1.9,.06,1.9,0,.26,0,'#f1d99a');return at(g,false);}
  if(k==='scooter'){const h=hash(p.id||p.x+','+p.y),o=this.scooter(['#e5484d','#3fa7d6','#f4f1ea','#2f9e5b','#ffc928'][h%5]);o.rotation.y=h%4*Math.PI/2;return at(o,false);}
  if(k==='palm')return at(this.palm(hash(p.id||p.x+','+p.y)));
  if(k==='tree')return at(this.tree(hash(p.id)%3,hash(p.id)%7));
  if(k==='flowerbed'){const g=new THREE.Group(),box=new THREE.Mesh(new THREE.BoxGeometry(2,.5,.8),new THREE.MeshStandardMaterial({color:'#9a6a3e'}));box.position.y=.25;g.add(box);for(let i=0;i<6;i++){const f=new THREE.Mesh(new THREE.SphereGeometry(.22,6,4),new THREE.MeshStandardMaterial({color:['#e5484d','#ffc928','#3f7d3a','#f5f0ff'][(hash(p.id)+i)%4]}));f.position.set(-.8+i*.32,.6,0);g.add(f);}return at(this.mergeGroup(g));}
  if(k==='plant'||k==='flowerbed'){const g=new THREE.Group(),pot=new THREE.Mesh(new THREE.CylinderGeometry(.45,.35,.5,12),new THREE.MeshLambertMaterial({color:'#b5654a'}));pot.position.y=.25;const leaf=new THREE.Mesh(new THREE.SphereGeometry(.55,10,8),new THREE.MeshLambertMaterial({color:'#3f7d3a'}));leaf.position.y=.85;g.add(pot,leaf);for(let i=0;i<5;i++){const f=new THREE.Mesh(new THREE.SphereGeometry(.12,6,5),new THREE.MeshLambertMaterial({color:['#e5484d','#ffc928','#f5f0ff'][(hash(p.id)+i)%3]}));f.position.set(Math.cos(i*1.3)*.4,1+.1*(i%2),Math.sin(i*1.3)*.4);g.add(f);}return at(g);}
  if(k==='lamp')return at(this.lamp());
  if(k==='table')return at(this.table());
  if(k==='atm'){const o=this.atm();o.rotation.y=MODE.front?Math.PI:-Math.PI*3/4;return at(o,false);}
  if(k==='vending'){const o=this.vending();o.rotation.y=MODE.front?Math.PI:-Math.PI*3/4;this.col?.c.push([p.x,p.y,.6]);return at(o,false);}
  if(k==='bench'){const g=new THREE.Group(),wood=new THREE.MeshStandardMaterial({color:'#8a5a32'}),iron=new THREE.MeshStandardMaterial({color:'#2b2f36'});for(const y of [.45,.6,.75]){const sl=new THREE.Mesh(new THREE.BoxGeometry(1.8,.06,.14),wood);sl.position.set(0,y<.5?.45:y+.05,y<.5?0:-.22);if(y>.5)sl.rotation.x=-.2;g.add(sl);}const s2=new THREE.Mesh(new THREE.BoxGeometry(1.8,.06,.14),wood);s2.position.set(0,.45,.16);g.add(s2);for(const x of [-.75,.75]){const l=new THREE.Mesh(new THREE.BoxGeometry(.06,.45,.45),iron);l.position.set(x,.22,0);g.add(l);}if(MODE.front)g.rotation.y=Math.PI;return at(this.mergeGroup(g),!MODE.front);}
  if(k==='parked'){const o=this.ride(p.v,['#0b0b0f','#c7ccd4','#7a0c14','#0d2a5c','#f5f5f4'][hash(p.id||p.x+','+p.y)%5]);if(o){o.rotation.y=heading(p.rot||0);return at(o,false);}}
  if(k==='fountain'){const g=new THREE.Group(),m=new THREE.MeshLambertMaterial({color:'#e9e4da'});const basin=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.4,.8,24),m);basin.position.y=.4;const water=new THREE.Mesh(new THREE.CylinderGeometry(2,2,.1,24),new THREE.MeshLambertMaterial({color:'#5bc0eb'}));water.position.y=.78;const col=new THREE.Mesh(new THREE.CylinderGeometry(.3,.4,2.2,12),m);col.position.y=1.5;g.add(basin,water,col);return at(g);}
  if(k==='statue'){const g=new THREE.Group(),m=new THREE.MeshLambertMaterial({color:'#d9d4c8'});const base=new THREE.Mesh(new THREE.BoxGeometry(1.8,1.6,1.8),m);base.position.y=.8;const body=new THREE.Mesh(new THREE.CapsuleGeometry(.35,1.2,4,10),new THREE.MeshLambertMaterial({color:'#9aa7a3'}));body.position.y=2.6;g.add(base,body);return at(g);}
  if(k==='umbrella'){const g=new THREE.Group();const pole=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,2.3),new THREE.MeshLambertMaterial({color:'#eee'}));pole.position.y=1.15;const top=new THREE.Mesh(new THREE.ConeGeometry(1.3,.6,10),new THREE.MeshLambertMaterial({color:p.color||'#e5484d'}));top.position.y=2.3;g.add(pole,top);return at(g);}
  // Oggetti con immagine (giostre, statue, piscine…): sagoma che guarda sempre la telecamera.
  if(k==='deco'&&p.art){const rd=this.funfair(p.art,Math.max(8,(p.w||3)));if(rd)return at(rd,false);}
  if(k==='deco'&&p.art){const tex=await new Promise(ok=>new THREE.TextureLoader().load((this.r2d.assetBase||'')+'/assets/oggetti/'+p.art+'.png',ok,undefined,()=>ok(null)));if(!tex||id.dead)return;tex.colorSpace=THREE.SRGBColorSpace;
   const w=(p.w||3),h=w*tex.image.height/tex.image.width,s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,alphaTest:.3}));s.center.set(.5,.04);s.scale.set(w,h,1);s.position.set(p.x,y0,p.y);id.g.add(s);}}
 fence(){const E=cityEdge(),mat=this.sm('#f1ece2'),post=new THREE.CylinderGeometry(.07,.07,1.1,6),geo=[];
  const run=(ax,ay,bx,by)=>{const n=Math.max(1,Math.round(Math.hypot(bx-ax,by-ay)/2));for(let i=0;i<=n;i++){const x=ax+(bx-ax)*i/n,y=ay+(by-ay)*i/n;if(!MODE.front&&x+y<SHORE+1)continue;geo.push([x,y]);}
   const bar=new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(bx-ax,by-ay),.08,.06),mat);bar.position.set((ax+bx)/2,.85,(ay+by)/2);bar.rotation.y=-Math.atan2(by-ay,bx-ax);const bar2=bar.clone();bar2.position.y=.45;this.static.add(bar,bar2);};
  const top=MODE.front?F.BEACH:E.y0;run(E.x1,top,E.x1,E.y1);run(E.x0,E.y1,E.x1,E.y1);run(E.x0,top,E.x0,E.y1);if(!MODE.front)run(E.x0,E.y0,E.x1,E.y0);
  const inst=new THREE.InstancedMesh(post,mat,geo.length),m=new THREE.Matrix4();geo.forEach(([x,y],i)=>{m.makeTranslation(x,.55,y);inst.setMatrixAt(i,m);});this.static.add(inst);}
 label(text,x,y,z,bg,fg,scale=1){const c=document.createElement('canvas'),g=c.getContext('2d');g.font='bold 44px system-ui';const w=Math.ceil(g.measureText(text).width)+40;c.width=w;c.height=72;g.font='bold 44px system-ui';g.fillStyle=bg;g.beginPath();g.roundRect(0,0,w,72,20);g.fill();g.fillStyle=fg;g.textBaseline='middle';g.fillText(text,20,38);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:true}));const sx=w/72*.55*scale,sy=.55*scale,tp=new THREE.Vector3();s.scale.set(sx,sy,1);s.position.set(x,y,z);s.onBeforeRender=(r,sc,cam)=>{const k=Math.max(.22,Math.min(1,cam.position.distanceTo(s.getWorldPosition(tp))/(9+scale*5)));s.scale.set(sx*k,sy*k,1);};return s;}
 // ---- Interni dei locali: la stessa stanza 16×14 m del 2D (stessi arredi e stesse collisioni), costruita in 3D ----
 indoor(room){return !!room&&room!=='lungomare'&&room!=='mergellina'&&!!MAPS[room];}
 theme(room){const b=MAPS.lungomare.buildings.find(q=>q.id===(room==='mall2'?'mall':room)),k=room.startsWith('home:')?'villa':b?.interior||(['club','shop','pizzeria','bar'].includes(room)?room:b?.proc?'rest':'villa');
  const wood=['#b78760','#c79a72'],T={
   club:{floor:['#3f405b','#494258'],wall:'#241a3d',dado:'#170f29',trim:'#ff4fd8',art:'club',dark:1},
   casino:{floor:['#6a2233','#57192a'],wall:'#2b1438',dado:'#1c0c26',trim:'#ffd35a',art:'casino',dark:1},
   bank:{floor:['#e6e0d4','#d8d0c0'],wall:'#efe9dc',dado:'#d9cfba',trim:'#1f5d4c',art:'bank'},
   mall:{floor:['#e9eef2','#dfe6ec'],wall:'#f4f6f8',dado:'#dfe6ec',trim:'#2a6fd6',art:'shop'},
   shop:{floor:wood,wall:'#f3ead8',dado:'#d9c4a0',trim:'#1d4e89',art:'shop'},
   fashion:{floor:['#efe6dc','#e4d8cb'],wall:'#f8f1ee',dado:'#ecd9d6',trim:'#c0708a',art:'shop'},
   burger:{floor:['#f4f1ea','#c8432f'],wall:'#fff3d6',dado:'#f1d48a',trim:'#c8432f',art:'menu'},
   barber:{floor:['#f2f2f2','#34373c'],wall:'#e6f0ee',dado:'#c9dcd8',trim:'#a0303f',art:'barber'},
   villa:{floor:wood,wall:'#f5ecdb',dado:'#e6d6b8',trim:'#b08968',art:'home'},
   bar:{floor:wood,wall:'#f0dcb8',dado:'#8a5a3a',trim:'#5a3a26',art:'bar'},
   pizzeria:{floor:wood,wall:'#f6e2c0',dado:'#b3543a',trim:'#7a2f1e',art:'oven'},
   rest:{floor:wood,wall:'#f4e3c3',dado:'#9c6b47',trim:'#5a3a26',art:'bar'}},OWN={trattoria:{floor:['#f1ead9','#b5533a'],wall:'#f6ecd2',dado:'#6f8a4a',trim:'#4c6a2f'},panorama:{floor:['#e9eef2','#a9c1d3'],wall:'#f4f8fb',dado:'#2f5f8a',trim:'#1d4e89'},osteria:{floor:['#d9c9a8','#8a5a3a'],wall:'#efe0c0',dado:'#6a2f2a',trim:'#3a2415'},vesuvio:{floor:['#3a3330','#57483f'],wall:'#f1e4cf',dado:'#7a1f1a',trim:'#c9a24a'}}[room];return {...(T[k]||T.rest),...(OWN||{}),kind:k};}
 // Parete dipinta (48 pixel per metro): zoccolo, cornice e decorazioni; "side" = n (fondo), s (porta d'uscita), e / w (finestre).
 wallTex(th,len,side){const U=48,c=document.createElement('canvas');c.width=len*U;c.height=Math.round(3.4*U);const g=c.getContext('2d'),H=c.height;
  const R=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x*U,H-(y+h)*U,w*U,h*U);},X=(t,x,y,s,col)=>{g.fillStyle=col;g.font='bold '+Math.round(s*U)+'px Georgia,serif';g.textAlign='center';g.fillText(t,x*U,H-y*U);};
  const B=['#b3261e','#1f6f50','#e8b026','#1d4e89','#f4f1ea','#7b2cbf'],N=['#ff4fd8','#3fffe2','#566dff','#ffd352'],a=th.art;
  R(0,0,len,3.4,th.wall);R(0,0,len,1,th.dado);R(0,1,len,.07,th.trim);R(0,0,len,.14,'#3a2f2a');R(0,3.22,len,.18,th.trim);
  if(side==='s'){const m=len/2;R(m-.95,0,1.9,2.45,'#3a2a1e');R(m-.8,0,1.6,2.3,'#7a5236');R(m-.7,.15,.62,2,'#8d6344');R(m+.08,.15,.62,2,'#8d6344');R(m+.52,1.05,.1,.1,'#e8c66a');R(m-.8,2.6,1.6,.42,'#1f8a4c');X('USCITA',m,2.7,.3,'#fff');}
  else if(side!=='n'){for(const x of [3.5,7,10.5]){if(th.dark){R(x-.06,.3,.12,2.7,N[Math.round(x)%4]);continue;}R(x-.8,1.2,1.6,1.6,'#fff');R(x-.68,1.32,1.36,1.36,'#9fd3f2');R(x-.68,1.32,1.36,.45,'#3d8fc9');R(x-.04,1.32,.08,1.36,'#fff');R(x-.68,1.96,1.36,.08,'#fff');}}
  else{
   if(a==='bar'||a==='oven'){for(let s=0;s<3;s++){R(5,1.5+s*.55,6,.06,'#5a3a26');for(let i=0;i<14;i++)R(5.2+i*.41,1.56+s*.55,.16,.3+((i*7+s*3)%3)*.06,B[(i+s*2)%6]);}R(1.6,1.6,1.7,1.15,'#5a3a26');R(1.7,1.7,1.5,.95,'#8fc8ee');R(1.7,1.7,1.5,.38,'#2f7fb8');}
   if(a==='bar'){R(12.7,1.6,1.7,1.15,'#5a3a26');R(12.8,1.7,1.5,.95,'#f6d28a');g.fillStyle='#c96f4a';g.beginPath();g.arc(13.55*U,H-2.1*U,.3*U,0,7);g.fill();}
   if(a==='oven'){g.fillStyle='#a5482f';g.beginPath();g.arc(13.6*U,H-1.3*U,1.15*U,Math.PI,0);g.fill();R(12.45,0,2.3,1.3,'#a5482f');g.fillStyle='#1b1210';g.beginPath();g.arc(13.6*U,H-1.2*U,.6*U,Math.PI,0);g.fill();R(13,.9,1.2,.3,'#1b1210');g.fillStyle='#ff9a2e';g.beginPath();g.arc(13.6*U,H-.95*U,.34*U,Math.PI,0);g.fill();R(13.5,2.45,.3,.77,'#8a3a26');}
   if(a==='club'){for(let i=0;i<31;i++)R(1+i*.455,1.15,.3,.35+((i*37)%17)/17*1.7,N[i%4]);}
   if(a==='casino'){X('★ 7 7 7 ★',8,1.75,.9,'#ffd35a');for(let i=0;i<30;i++){g.fillStyle=N[i%4];g.beginPath();g.arc((1+i*.48)*U,H-2.95*U,.09*U,0,7);g.fill();}}
   if(a==='bank'){R(4.5,1.45,7,1.3,th.trim);X('BANCA',8,1.8,.75,'#f5d27a');g.fillStyle='#fff';g.beginPath();g.arc(13.5*U,H-2.2*U,.42*U,0,7);g.fill();g.strokeStyle='#22272d';g.lineWidth=4;g.stroke();g.beginPath();g.moveTo(13.5*U,H-2.2*U);g.lineTo(13.5*U,H-2.5*U);g.moveTo(13.5*U,H-2.2*U);g.lineTo(13.72*U,H-2.2*U);g.stroke();}
   if(a==='shop'){for(let s=0;s<3;s++){R(1,1.3+s*.6,14,.06,'#9aa3a9');for(let i=0;i<27;i++)R(1.2+i*.51,1.36+s*.6,.36,.26+((i*5+s)%3)*.08,B[(i*3+s)%6]);}}
   if(a==='menu'){for(let i=0;i<3;i++){R(2.6+i*3.8,1.55,3.2,1.3,'#22272d');for(let k=0;k<4;k++)R(2.85+i*3.8,1.75+k*.26,1.4+((i+k)%3)*.5,.1,k%2?'#ffd352':'#f4f1ea');}}
   if(a==='barber'){for(const x of [1.2,14.5])for(let k=0;k<6;k++)R(x,1.1+k*.3,.3,.3,['#b3261e','#f4f1ea','#1d4e89'][k%3]);R(5.5,2.5,5,.06,'#9aa3a9');for(let i=0;i<10;i++)R(5.7+i*.47,2.56,.16,.3,B[i%6]);}
   if(a==='home'){R(5.3,1.15,5.4,1.8,'#fff');R(5.45,1.3,5.1,1.5,'#9fd3f2');R(5.45,1.3,5.1,.55,'#3d8fc9');R(7.96,1.3,.08,1.5,'#fff');R(12.4,1.7,1.3,1,'#5a3a26');R(12.5,1.8,1.1,.8,'#f6d28a');}}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
 buildInterior(room){const m=MAPS[room],th=this.theme(room),W=m.bounds.w,D=m.bounds.h,S=this.static;this.boats=[];this.scene.fog.near=80;this.scene.fog.far=300;
  const noLine=mt=>{mt.userData.outlineParameters={visible:false};return mt;},mats=new Map(),M=col=>mats.get(col)||mats.set(col,new THREE.MeshStandardMaterial({color:col})).get(col);
  const box=(g,w,h,d,x,y,z,col)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(col));o.position.set(x,y,z);g.add(o);return o;},cyl=(g,r1,r2,h,x,y,z,col,n=10)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,n),M(col));o.position.set(x,y,z);g.add(o);return o;};
  // Pavimento a quadri da 1 m (stessi colori del 2D); in discoteca una pista da ballo colorata al centro.
  {const P=32,cv=document.createElement('canvas');cv.width=W*P;cv.height=D*P;const g=cv.getContext('2d'),N=['#de42ce','#3fd9e2','#566dff','#ffd352'];
   for(let y=0;y<D;y++)for(let x=0;x<W;x++){g.fillStyle=th.kind==='club'&&x>=6&&x<10&&y>=5&&y<11?N[(x+y*3)%4]:th.floor[(x+y)%2];g.fillRect(x*P,y*P,P,P);g.fillStyle='rgba(0,0,0,.08)';g.fillRect(x*P,y*P+P-1,P,1);g.fillRect(x*P+P-1,y*P,1,P);}
   const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;const f=new THREE.Mesh(new THREE.PlaneGeometry(W,D),new THREE.MeshToonMaterial({map:t,gradientMap:this.grad}));f.rotation.x=-Math.PI/2;f.position.set(W/2,0,D/2);f.receiveShadow=true;f.userData.toon=true;S.add(f);
   const mc=document.createElement('canvas');mc.width=220;mc.height=110;const q=mc.getContext('2d');q.fillStyle='#1f8a4c';q.fillRect(0,0,220,110);q.strokeStyle='#fff';q.lineWidth=6;q.strokeRect(8,8,204,94);q.fillStyle='#fff';q.font='bold 44px system-ui';q.textAlign='center';q.textBaseline='middle';q.fillText('USCITA',110,58);
   const mt=new THREE.CanvasTexture(mc);mt.colorSpace=THREE.SRGBColorSpace;const mat=new THREE.Mesh(new THREE.PlaneGeometry(2.2,1.1),noLine(new THREE.MeshBasicMaterial({map:mt})));mat.rotation.x=-Math.PI/2;mat.position.set(W/2,.02,D-.6);S.add(mat);}
  // Pareti visibili solo da dentro: quella tra la telecamera e la stanza sparisce da sola, così si vede sempre l'interno.
  for(const [side,len,x,z,r] of [['n',W,W/2,0,0],['s',W,W/2,D,Math.PI],['w',D,0,D/2,Math.PI/2],['e',D,W,D/2,-Math.PI/2]]){if(side==='n'&&(th.kind==='mall'||th.kind==='club'))continue;const w=new THREE.Mesh(new THREE.PlaneGeometry(len,3.4),noLine(new THREE.MeshBasicMaterial({map:this.wallTex(th,len,side)})));w.position.set(x,1.7,z);w.rotation.y=r;S.add(w);}
  // Scala mobile tra piano terra e primo piano: rampa a gradini con corrimano; al piano terra sale, al primo piano scende.
  if(room==='mall'||room==='mall2'){const up=room==='mall',e=new THREE.Group(),K=(...a)=>this.bx(e,...a);for(let i=0;i<9;i++)K(1.2,.12,.42,0,up?.1+i*.34:.1,-i*.4,i%2?'#3a3f47':'#2b2f36');if(up){for(const sx of [-.66,.66]){const r=new THREE.Mesh(new THREE.BoxGeometry(.07,.1,4.7),this.sm('#c9ccd3'));r.position.set(sx,2.45,-1.6);r.rotation.x=.705;e.add(r);}}else{K(1.6,.06,1.6,0,.04,-.4,'#17181c');for(const sx of [-.8,.8])K(.08,1,1.6,sx,.5,-.4,'#c9ccd3');}
   e.position.set(14,0,12.4);S.add(e);S.add(this.label(up?'⬆ Primo piano':'⬇ Piano terra',14,2.3,11.2,'rgba(17,24,39,.85)','#ffe9a8',.6));}
  if(room==='mall'||room==='mall2')for(const sh of MALL_SHOPS.filter(q=>(q.room||'mall')===room)){const lb=this.label(sh.icon+' '+sh.name,sh.x,2.5,sh.y,'rgba(17,24,39,.85)','#ffe9a8',.6);S.add(lb);const g2=new THREE.Group(),K=(...a)=>this.bx(g2,...a),ac=sh.kind==='sim'?'#1d4e89':sh.kind==='fashion'?'#b3261e':'#1f6f50';K(3,.3,.12,0,2.05,0,ac);for(const sx of [-1.45,1.45])K(.1,2.1,.1,sx,1.05,0,'#2b2f36');if(sh.kind==='sim')for(let i=0;i<5;i++)K(.16,.3,.03,-.6+i*.3,1.3,.05,['#17181c','#f4f1ea','#c1121f','#1d4e89','#d9b24a'][i]);g2.position.set(sh.x,0,sh.y-(sh.y<5?.2:1.3));S.add(g2);}
  // Jukebox del locale: mobile ad arco con le luci colorate, vetrina dei dischi e pulsantiera.
  if(JUKEBOX[room]){const j=new THREE.Group(),B=(...a)=>this.bx(j,...a),P=JUKEBOX[room];B(.95,1.1,.6,0,.55,0,'#7a2f1c');const arch=new THREE.Mesh(new THREE.CylinderGeometry(.475,.475,.6,20,1,false,0,Math.PI),this.sm('#7a2f1c'));arch.rotation.set(Math.PI/2,Math.PI/2,0);arch.position.set(0,1.1,0);j.add(arch);
   for(const [i,c] of ['#ff4fd8','#ffd352','#3fd9e2','#7dff7a'].entries()){const t=new THREE.Mesh(new THREE.TorusGeometry(.5-i*.045,.022,6,18,Math.PI),this.neonMat(c));t.position.set(0,1.1,.31);j.add(t);}
   const scr=new THREE.Mesh(new THREE.PlaneGeometry(.62,.36),this.neonMat('#ffe9a8'));scr.position.set(0,1.02,.305);j.add(scr);B(.7,.12,.08,0,.72,.32,'#d9b24a');B(.7,.34,.04,0,.36,.31,'#2b1a12');for(let k=0;k<5;k++)B(.08,.05,.03,-.24+k*.12,.72,.37,['#e5484d','#ffc928','#2f9e5b','#3fa7d6','#f4f1ea'][k]);
   j.position.set(P.x,0,P.y);j.rotation.y=P.x<4?Math.PI/2:P.x>W-4?-Math.PI/2:0;S.add(j);const lb=this.label('🎵 Jukebox',P.x,1.95,P.y,'rgba(17,24,39,.75)','#ffe9a8',.5);S.add(lb);}
  // Arredi: stesse posizioni del 2D. Gli oggetti vicino a un muro guardano verso il centro della stanza.
  const tables=m.props.filter(p=>p.kind==='table'),faceIn=p=>p.y<=4?0:p.x<4?Math.PI/2:p.x>W-4?-Math.PI/2:0,C6=['#d93a3a','#1f3a6b','#f2f2f2','#2f9e5b','#ffc928','#8a5cff'];
  for(const p of m.props){const g=new THREE.Group(),k=p.kind,sd=hash(p.id||p.x+','+p.y);let rot=faceIn(p);
   if(k==='counter'){const dj=th.kind==='club';box(g,3,1,.8,0,.5,0,dj?'#1c1530':'#745345');box(g,3.15,.07,.95,0,1.04,0,dj?'#ff4fd8':'#422f28');if(dj)for(const x of [-.7,.7])cyl(g,.32,.32,.04,x,1.1,0,'#111',16);else if(['bar','pizzeria','rest','burger','restaurant'].includes(th.kind)||th.art==='bar'||th.art==='food')for(let i=0;i<5;i++)cyl(g,.05,.06,.3,-1.1+i*.3,1.22,-.2,['#9c5945','#427756','#c6a162'][i%3],6);else{box(g,.5,.34,.4,.9,1.24,0,'#2b2f36');box(g,.44,.3,.04,-.2,1.3,.1,'#1f2c38');box(g,.3,.03,.22,-.2,1.09,.3,'#c9ccd3');if(th.kind==='bank'){const gl=new THREE.Mesh(new THREE.PlaneGeometry(3,.9),new THREE.MeshBasicMaterial({color:'#cfe9f7',transparent:true,opacity:.25,depthWrite:false,side:THREE.DoubleSide}));gl.position.set(0,1.55,.42);g.add(gl);}}rot=0;}
   else if(room==='shop'&&k==='seat'){rot=0;}
   else if(room==='shop'&&k==='table'){box(g,1.5,.5,.9,0,.25,0,'#8a6a45');box(g,1.5,.05,.9,0,.52,0,'#6e5238');for(let i=0;i<3;i++)for(let j=0;j<2;j++){box(g,.42,.16,.36,-.5+i*.5,.62,-.22+j*.44,'#b98a55');for(let q=0;q<4;q++){const fr=new THREE.Mesh(new THREE.SphereGeometry(.07,7,5),this.sm(['#e5484d','#ffc928','#2f9e5b','#ff8a3d','#8a5cff','#f4f1ea'][(i*2+j+sd)%6]));fr.position.set(-.5+i*.5-.12+(q%2)*.24,.74,-.22+j*.44-.08+(q>>1)*.16);g.add(fr);}}rot=0;}
   else if(k==='table'){cyl(g,.6,.6,.06,0,.74,0,th.dark?'#2b2140':'#f4f1ea',14);cyl(g,.05,.06,.72,0,.37,0,'#2b2f36',6);cyl(g,.28,.28,.03,0,.02,0,'#2b2f36');rot=0;}
   else if(k==='seat'){const t=tables.reduce((b,q)=>!b||Math.hypot(q.x-p.x,q.y-p.y)<Math.hypot(b.x-p.x,b.y-p.y)?q:b,null);box(g,.42,.05,.42,0,.45,0,'#9a6a3e');box(g,.05,.5,.42,.2,.72,0,'#9a6a3e');for(const [lx,lz] of [[-.17,-.17],[.17,-.17],[-.17,.17],[.17,.17]])box(g,.04,.45,.04,lx,.22,lz,'#2b2f36');rot=t?Math.atan2(t.y-p.y,-(t.x-p.x)):0;}
   else if(k==='atm')g.add(this.atm());
   else if(k==='bench'){box(g,1.8,.08,.5,0,.45,0,'#8a5a32');box(g,1.8,.45,.08,0,.75,-.22,'#8a5a32');for(const x of [-.75,.75])box(g,.07,.45,.45,x,.22,0,'#2b2f36');rot=p.y>D/2?Math.PI:rot;}
   else if(k==='slot'){box(g,.8,1.6,.6,0,.8,0,'#3b1d5c');box(g,.86,.16,.66,0,1.68,0,'#ffd35a');box(g,.6,.4,.04,0,1.2,.3,'#111');for(let i=0;i<3;i++)box(g,.15,.26,.03,-.2+i*.2,1.2,.32,['#e5484d','#ffd352','#3fd9e2'][(i+sd)%3]);box(g,.6,.12,.2,0,.85,.34,'#d4a73a');cyl(g,.025,.025,.5,.46,1.15,.1,'#c9c9c9',6);cyl(g,.06,.06,.06,.46,1.42,.1,'#e5484d',8);rot=0;}
   else if(k==='rack'){for(const x of [-.8,.8])cyl(g,.03,.03,1.55,x,.78,0,'#9aa3a9',6);box(g,1.66,.04,.04,0,1.55,0,'#9aa3a9');for(let i=0;i<6;i++)box(g,.07,.75,.46,-.62+i*.25,1.13,0,C6[(i+sd)%6]);rot=0;}
   else if(k==='mirror'){box(g,.75,1.9,.08,0,.95,0,'#c9a24a');box(g,.62,1.74,.02,0,.95,.05,'#cfe8f3');}
   else if(k==='barberchair'){cyl(g,.3,.36,.12,0,.06,0,'#6b6b72',12);cyl(g,.07,.07,.4,0,.3,0,'#8a8a92',8);box(g,.6,.14,.6,0,.55,0,'#a0303f');box(g,.6,.7,.12,0,.95,.3,'#7a1f2b');for(const x of [-.33,.33])box(g,.07,.07,.5,x,.78,.02,'#8a8a92');box(g,.9,1.3,.07,0,1.5,-1.05,'#c9a24a');box(g,.78,1.16,.02,0,1.5,-1.01,'#cfe8f3');box(g,1,.06,.3,0,.82,-.95,'#e9e4da');rot=0;}
   else if(k==='sofa'){box(g,2,.42,.85,0,.21,0,'#5a7fa6');box(g,2,.5,.22,0,.6,-.32,'#4a6c90');for(const x of [-.9,.9])box(g,.2,.32,.85,x,.56,0,'#4a6c90');}
   else if(k==='bed'){box(g,1.6,.32,2.1,0,.16,0,'#8a5a32');box(g,1.5,.2,2,0,.4,0,'#f4f1ea');box(g,1.52,.06,1.25,0,.52,.36,C6[sd%6]);box(g,.9,.14,.4,0,.56,-.72,'#fff');box(g,1.6,.9,.1,0,.45,-1.05,'#8a5a32');rot=0;}
   else if(k==='picture'){for(const x of [-.3,.3])cyl(g,.025,.025,1.5,x,.75,-.1,'#6b4a32',6);box(g,1,.8,.05,0,1.45,0,'#c9a24a');box(g,.86,.66,.02,0,1.45,.03,['#8fc8ee','#f6d28a','#d98f7a'][sd%3]);box(g,.86,.24,.02,0,1.24,.035,'#2f7fb8');}
   else if(k==='lamp'){cyl(g,.18,.2,.04,0,.02,0,'#2b2f36');cyl(g,.025,.025,1.5,0,.78,0,'#2b2f36',6);const s=new THREE.Mesh(new THREE.CylinderGeometry(.16,.28,.36,12,1,true),new THREE.MeshBasicMaterial({color:'#ffe9a8',side:THREE.DoubleSide}));s.position.y=1.6;s.userData.keep=true;g.add(s);}
   else{cyl(g,.3,.22,.4,0,.2,0,'#b5654a',12);const l=new THREE.Mesh(new THREE.SphereGeometry(.42,10,8),M('#3f7d3a'));l.position.y=.78;l.scale.y=1.25;g.add(l);}
   this.mergeGroup(g);g.rotation.y=rot;g.position.set(p.x,0,p.y);g.traverse(o=>{if(o.isMesh)o.castShadow=!this.mobile;});S.add(g);}
  const glassI=noLine(new THREE.MeshStandardMaterial({color:'#cfe9f7',transparent:true,opacity:.22,roughness:.1,depthWrite:false})),pane=(g,w,h,x,y,z,ry=0)=>{const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),glassI);o.material.side=THREE.DoubleSide;o.position.set(x,y,z);o.rotation.y=ry;g.add(o);},glow=(g,w,h,x,y,z,col,ry=0)=>{const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),noLine(new THREE.MeshBasicMaterial({color:col})));o.position.set(x,y,z);o.rotation.y=ry;g.add(o);return o;};
  // Centro commerciale: oltre la balaustra di vetro si apre la galleria a due piani con scale mobili, negozi illuminati, bar, colonne e lucernario.
  if(th.kind==='mall'){const g=new THREE.Group(),Z=-17,X0=-7,X1=W+7,XW=X1-X0,xc=W/2;
   box(g,XW,.1,-Z,xc,-.05,Z/2,'#e6ebef');for(let i=0;i<9;i++)box(g,XW,.02,.5,xc,.012,-1-i*2,i%2?'#cfd8df':'#f4f6f8');
   box(g,XW,8.4,.3,xc,4.2,Z,'#f4f6f8');for(const x of [X0,X1])box(g,.3,8.4,-Z,x,4.2,Z/2,'#eef1f4');box(g,XW,.3,5.5,xc,3.7,Z+2.75,'#dfe6ec');pane(g,XW,1,xc,4.35,Z+5.5);box(g,XW,.06,.1,xc,4.86,Z+5.5,'#8a8f98');
   pane(g,W,.95,xc,.5,-.3);box(g,W,.06,.1,xc,.98,-.3,'#8a8f98');
   const names=['MODA','SPORT','GELATI','LIBRI','SCARPE','GIOCHI','CASA','OTTICA'];
   for(let i=0;i<4;i++)for(const k of [0,1]){const x=X0+3.8+i*(XW-7.6)/3,y=k*3.85,c=C6[(i*2+k)%6];box(g,6.2,.7,.5,x,y+3.05,Z+.4,c);const sg=this.sign(names[i+k*4],i+k);sg.position.set(x,y+3.05,Z+.68);g.add(sg);glow(g,6,2.6,x,y+1.4,Z+.2,'#fff3d6');box(g,.2,2.7,.3,x-3,y+1.4,Z+.3,'#22272d');box(g,.2,2.7,.3,x+3,y+1.4,Z+.3,'#22272d');
     for(let m=0;m<4;m++){const mx=x-2.2+m*1.45;cyl(g,.16,.13,.6,mx,y+1.3,Z+.9,C6[(m+i+k)%6]);cyl(g,.13,.16,.5,mx,y+.9,Z+.9,C6[(m+i+k+2)%6]);cyl(g,.05,.05,.7,mx,y+.4,Z+.9,'#e9e4da',6);box(g,.3,.3,.3,mx,y+1.75,Z+.9,'#e9e4da');}}
   // Scale mobili: due rampe con gradini scuri, fianchi di vetro e corrimano.
   for(const [x,up] of [[xc-1.5,1],[xc+1.5,0]]){const L=9.2,a=Math.atan2(3.75,8.4);const r=box(g,1.15,.3,L,x,1.87,-7.3,'#3a3f45');r.rotation.x=a;for(let i=0;i<20;i++){const t=(i+.5)/20-.5,st=box(g,1,.05,.34,x,1.87+Math.sin(a)*-t*L+.19,-7.3+Math.cos(a)*t*L,i%2?'#6b7480':'#565d66');st.rotation.x=0;}
    for(const sx of [-.6,.6]){const p=new THREE.Mesh(new THREE.PlaneGeometry(L,.9),glassI);p.position.set(x+sx,2.45,-7.3);p.rotation.set(0,Math.PI/2,0);p.rotation.z=sx>0?-a:a;g.add(p);const hr=box(g,.07,.07,L,x+sx,2.95,-7.3,'#15161a');hr.rotation.x=a;}
    glow(g,.5,.5,x,3.2,-2.4,up?'#2f9e5b':'#e5484d');}
   // Bar al centro della galleria: bancone tondo, sgabelli, tettoia e bottiglie.
   {const bx=X0+4.5,bz=-5.5;cyl(g,1.9,1.9,1.05,bx,.52,bz,'#745345',20);cyl(g,2,2,.07,bx,1.08,bz,'#422f28',20);cyl(g,.14,.14,3,bx,1.5,bz,'#e9e4da');cyl(g,2.4,2.2,.25,bx,3.05,bz,'#b3261e',20);for(let i=0;i<8;i++){const an=i/8*Math.PI*2;cyl(g,.17,.17,.06,bx+Math.cos(an)*2.5,.72,bz+Math.sin(an)*2.5,'#22272d',8);cyl(g,.035,.035,.7,bx+Math.cos(an)*2.5,.35,bz+Math.sin(an)*2.5,'#8a8f98',6);cyl(g,.05,.06,.28,bx+Math.cos(an)*.9,1.26,bz+Math.sin(an)*.9,C6[i%6],6);}const sb=this.sign('BAR',2);sb.position.set(bx,3.45,bz+2.3);g.add(sb);}
   // Chiosco dei gelati, panchine, fioriere, colonne, striscioni e lucernario.
   {const kx=X1-4.5,kz=-5;box(g,2.6,1.1,1.6,kx,.55,kz,'#f7c6d9');box(g,3,.12,2,kx,2.5,kz,'#ffffff');for(const sx of [-1.2,1.2])cyl(g,.05,.05,1.4,kx+sx,1.8,kz+.7,'#8a8f98',6);for(let i=0;i<5;i++)cyl(g,.16,.12,.14,kx-.9+i*.45,1.17,kz,C6[i],8);const sk=this.sign('GELATI',3);sk.position.set(kx,2.9,kz+1.02);g.add(sk);}
   for(const x of [X0+2.2,xc-5,xc+5,X1-2.2]){cyl(g,.38,.38,8.4,x,4.2,-10.8,'#e9e4da',14);cyl(g,.7,.6,.6,x,.3,-2.2,'#b5654a',12);const l=new THREE.Mesh(new THREE.SphereGeometry(.75,10,8),M('#3f7d3a'));l.position.set(x,1.25,-2.2);g.add(l);}
   for(const x of [xc-3.6,xc+3.6])box(g,2.2,.1,.6,x,.45,-3.6,'#8a5a32');
   for(let i=0;i<5;i++){box(g,.9,2.6,.04,X0+5+i*(XW-10)/4,6.6,-9,C6[i]);box(g,XW,.14,.14,xc,8.3,-2-i*3.4,'#8a8f98');}glow(g,XW-2,-Z-2,xc,8.38,Z/2,'#cfe9fb').rotation.x=Math.PI/2;
   this.mergeGroup(g);S.add(g);}
  // Discoteca: palco con console e DJ, parete di LED, casse, americane con fari che si muovono, laser e bancone del bar illuminato.
  let beams=[];if(th.kind==='club'){const g=new THREE.Group(),xc=W/2,N=['#ff4fd8','#3fffe2','#566dff','#ffd352','#7dff6b'];
   box(g,W+8,.7,6.5,xc,.35,-3.25,'#15101f');box(g,W+8,.08,.12,xc,.72,-.05,'#ff4fd8');for(const x of [-4,W+4])box(g,.3,7,6.5,x,3.5,-3.25,'#120c1e');box(g,W+8,.3,6.5,xc,7,-3.25,'#0d0916');
   {const c=document.createElement('canvas');c.width=512;c.height=160;const q=c.getContext('2d');q.fillStyle='#0b0616';q.fillRect(0,0,512,160);for(let i=0;i<64;i++){const h=20+((i*37)%19)/19*120;const gr=q.createLinearGradient(0,160-h,0,160);gr.addColorStop(0,N[i%5]);gr.addColorStop(1,'#1a0f33');q.fillStyle=gr;q.fillRect(i*8+1,160-h,6,h);}q.fillStyle='#ffffff';q.font='bold 46px system-ui';q.textAlign='center';q.fillText('L U N A',256,56);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const led=new THREE.Mesh(new THREE.PlaneGeometry(W+7.4,5.6),noLine(new THREE.MeshBasicMaterial({map:t})));led.position.set(xc,3.9,-6.3);g.add(led);}
   box(g,3.4,1.05,.9,xc,1.22,-1.6,'#1c1530');glow(g,3.4,.12,xc,1.2,-1.14,'#3fffe2');for(const x of [-.8,.8])cyl(g,.34,.34,.05,xc+x,1.78,-1.6,'#111',16);cyl(g,.2,.16,.7,xc,1.75,-2.5,'#2346c8');const hd=new THREE.Mesh(new THREE.SphereGeometry(.16,10,8),M('#e3a983'));hd.position.set(xc,2.28,-2.5);g.add(hd);box(g,.36,.1,.2,xc,2.36,-2.5,'#111');
   for(const x of [xc-6.5,xc+6.5])for(let k=0;k<3;k++){box(g,1.3,1.3,1.1,x,1.35+k*1.32,-1.4,'#0c0c10');glow(g,.8,.8,x,1.35+k*1.32,-.84,'#2a2a33');}
   for(const z of [-1,4,9]){box(g,W+4,.16,.16,xc,5.2,z,'#8a8f98');box(g,W+4,.16,.16,xc,5.6,z,'#8a8f98');for(let i=0;i<5;i++){const x=1.5+i*(W-3)/4,col=N[(i+Math.round(z))%5];cyl(g,.16,.2,.34,x,5,z,'#15161a',8);
     const cone=new THREE.Mesh(new THREE.ConeGeometry(1.15,5,14,1,true).translate(0,-2.5,0),noLine(new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.16,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide})));cone.position.set(x,4.85,z);cone.userData.keep=true;S.add(cone);beams.push(cone);}}
   for(let i=0;i<6;i++){const lz=new THREE.Mesh(new THREE.BoxGeometry(.03,.03,22),noLine(new THREE.MeshBasicMaterial({color:i%2?'#7dff6b':'#ff4fd8',transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false})));lz.position.set(xc,4.2,4);lz.rotation.set(-.12,(i-2.5)*.22,0);lz.userData.keep=true;S.add(lz);beams.push(lz);}
   // Bancone del bar con bottiglie illuminate lungo la parete di sinistra (oltre il muro, solo scena).
   box(g,1,1.1,9,-2.2,.55,6,'#1c1530');glow(g,9,.14,-1.69,1.0,6,'#ff4fd8',Math.PI/2);box(g,.5,2.4,9,-3.5,1.9,6,'#0d0916');for(let i=0;i<18;i++){const o=new THREE.Mesh(new THREE.BoxGeometry(.14,.4,.14),noLine(new THREE.MeshBasicMaterial({color:N[i%5]})));o.position.set(-3.2,1.5+(i%2)*.7,2+i*.47);g.add(o);}
   this.mergeGroup(g);S.add(g);}
  // Discoteca: palla a specchi che gira e fari colorati che si muovono sulla pista (come nel 2D).
  this.fx=null;if(th.kind==='club'){const ball=new THREE.Mesh(new THREE.IcosahedronGeometry(.45,1),new THREE.MeshBasicMaterial({color:'#e8ecf5',wireframe:false}));ball.position.set(W/2,3.1,8);const wire=new THREE.Mesh(new THREE.IcosahedronGeometry(.46,1),new THREE.MeshBasicMaterial({color:'#7d86a3',wireframe:true}));ball.add(wire);S.add(ball);
   const spots=['#de42ce','#3fffe2','#566dff','#ffd352'].map(col=>{const s=new THREE.Mesh(new THREE.CircleGeometry(1.5,24),noLine(new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.3,depthWrite:false})));s.rotation.x=-Math.PI/2;S.add(s);return s;});this.fx={ball,spots,beams};}
  this.toonify(S);}
 // ---- Giocatori ----
 // Personaggi: avatar 3D modulari (client/world/avatar3d.js) costruiti dai dati dell'avatar del giocatore (capelli, vestiti,
 // accessori, colori scelti dal barbiere, in negozio e nel profilo) o dal personaggio pronto scelto all'ingresso.
 // Lo stesso avatar si usa in grafica realistica e a cartone: cambia solo il materiale.
 // Che tipo di personaggio usare: 'q3d' = persona 3D animata (normale nella grafica realistica), '2d' = figura disegnata del 2D, '3d' = avatar costruito dal codice.
 setAvatarKind(v){try{localStorage.setItem('humana-avatar2',v);}catch{}for(const [id,e] of [...this.players])this.dropAvatar(id,e);if(this.npcs){for(const n of this.npcs)this.cityG?.remove(n.av.root);this.npcs=null;}}
 avatarKind(){if(this.toon)return '2d';try{const v=localStorage.getItem('humana-avatar2');return ['2d','q3d','3d'].includes(v)?v:'real';}catch{return 'real';}}
 // Persone realistiche (Microsoft Rocketbox Avatar Library, licenza MIT): modelli veri con viso, capelli e vestiti fotografati e le loro animazioni originali
 // (fermo, cammina, passeggia, corre, saluta, balla). I file pronti stanno in characters/persone-vere e si rigenerano con scripts/converti-modelli.mjs.
 // look 0…7 = Ciro, Giulia, Enzo, Sofia, Luca, Marta, Diego, Aurora (i dispari sono donne); senza look (passanti) si sceglie dal nome.
 // I modelli delle persone arrivano spezzati in tanti pezzi (fino a 26) anche se i materiali sono 2 o 3: qui i pezzi con lo stesso materiale
 // diventano uno solo (una volta per modello), così ogni persona costa 2-3 disegni invece di 26.
 fuseSkin(sc){if(sc.userData.fused)return;sc.userData.fused=true;const by=new Map();sc.traverse(o=>{if(o.isSkinnedMesh&&!Array.isArray(o.material)){const k=o.material.uuid+'|'+o.skeleton.uuid+'|'+o.parent.uuid;(by.get(k)||by.set(k,[]).get(k)).push(o);}});
  for(const l of by.values()){if(l.length<2)continue;const a=l[0],names=Object.keys(a.geometry.attributes);if(!l.every(o=>!!o.geometry.index===!!a.geometry.index&&Object.keys(o.geometry.attributes).length===names.length&&names.every(n=>o.geometry.attributes[n])&&o.matrix.equals(a.matrix)))continue;
   let g=null;try{g=mergeGeometries(l.map(o=>o.geometry));}catch{}if(!g)continue;a.geometry=g;for(const o of l.slice(1))o.parent.remove(o);}}
 realPerson(look,id,av){const M=['Male_Adult_11','Male_Adult_02','Male_Adult_17','Male_Adult_16','Male_Adult_06','Male_Adult_13'],F=['Female_Adult_01','Female_Adult_03','Female_Adult_08','Female_Adult_17','Female_Adult_05','Female_Adult_14'];
  const own=Number.isInteger(look)&&look>=0&&look<8,h=hash(String(id)),fem=own?look%2===1:h%2===1,name=(fem?F:M)[own?look>>1:(h>>1)%6];
  return Promise.all([this.load('people/persone-vere/'+name+'.glb'),this.load('people/persone-vere/anim-'+(fem?'f':'m')+'.glb')]).then(([g,an])=>{if(!g||!an)return this.person(look,id,av);this.fuseSkin(g.scene);
   const root=cloneSkinned(g.scene);let hgt=0;g.scene.traverse(o=>{if(!hgt&&o.userData&&o.userData.altezza)hgt=o.userData.altezza;});root.scale.multiplyScalar((fem?1.66:1.77)/(hgt||180));
   root.traverse(o=>{if(o.isMesh){o.castShadow=false;o.frustumCulled=false;o.userData.toon=o.userData.real=true;}});
   // Le animazioni portano l'altezza del bacino del loro modello: si riporta a quella di questa persona (altrimenti i piedi galleggiano o affondano). Una copia per modello.
   let meta=null;an.scene.traverse(o=>{if(!meta&&o.userData&&o.userData.bacino)meta=o.userData;});meta??={bacino:90,velocita:{Walk:2,Stroll:1.4,Run:3.1}};
   const bip=root.getObjectByName('Bip01'),kk=bip?bip.position.y/meta.bacino:1,clips=((this.realClips??={})[name]??=an.animations.map(c=>{const cc=c.clone();for(const t of cc.tracks)if(t.name==='Bip01.position')for(let i=0;i<t.values.length;i++)t.values[i]*=kk;return cc;}));
   const mixer=new THREE.AnimationMixer(root),actions={};for(const c of clips)actions[c.name]=mixer.clipAction(c);
   // Ossa usate dalla posa seduta: ognuna ricorda il proprio asse lungo (verso l'osso figlio), che in questi scheletri non è Y.
   const B=n=>{const b=root.getObjectByName(n);if(b){const kid=b.children.find(c=>c.isBone);b.userData.ax=kid?kid.position.clone().normalize():new THREE.Vector3(1,0,0);}return b;};
   const legs={u:[B('Bip01_L_Thigh'),B('Bip01_R_Thigh')].filter(Boolean),l:[B('Bip01_L_Calf'),B('Bip01_R_Calf')].filter(Boolean),a:[B('Bip01_L_UpperArm'),B('Bip01_R_UpperArm')].filter(Boolean),f:[B('Bip01_L_Forearm'),B('Bip01_R_Forearm')].filter(Boolean),ft:[]};
   return {root,mixer,actions,legs,real:{fem,name,meta}};});}
 person(look,id,av){const WR=av?.wear||{},TC=WR.top?.color,PC=WR.pants?.color,SC=WR.shoes?.color,HC=av?.hair?.color;const F=['men/Hoodie','women/Casual','men/Suit','women/Formal','men/Casual','women/Punk','men/Beach','women/Adventurer','men/Punk','women/Suit','men/Worker','women/Worker'],k=Number.isInteger(look)&&look>=0&&look<8?look:hash(String(id))%F.length,q=F[k].split('/');
  return this.load('people/quaternius-'+q[0]+'/'+q[1]+'.gltf').then(g=>{if(!g)return null;const root=cloneSkinned(g.scene),box=new THREE.Box3().setFromObject(root),hgt=(box.max.y-box.min.y)||1;root.scale.multiplyScalar(1.74/hgt);
   root.traverse(o=>{if(/pistol|gun|sword|knife|rifle|weapon/i.test(o.name))o.visible=false;if(o.isMesh){o.castShadow=false;o.frustumCulled=false;o.userData.toon=o.userData.real=true;if(o.material){o.material=o.material.clone();o.material.metalness=0;o.material.roughness=.85;const mn=o.material.name||'',part=(o.parent?.name||'')+' '+o.name;if(HC&&/^hair/i.test(mn))o.material.color.set(HC);else if(!/skin|eye|hair|white|brow|teeth|mouth/i.test(mn)){if(TC&&/body/i.test(part))o.material.color.set(TC);else if(PC&&/legs/i.test(part))o.material.color.set(PC);else if(SC&&/feet/i.test(part))o.material.color.set(SC);}}}});
   // Una persona = un solo pezzo da disegnare: le sue 8–10 parti (stesso scheletro, colori a tinta unita) vengono fuse in una sola, col colore scritto nei vertici. Prima 11 persone erano più di 100 pezzi a fotogramma.
   try{root.updateMatrixWorld(true);const parts=[];root.traverse(o=>{if(!o.isSkinnedMesh)return;for(let p=o;p;p=p.parent)if(!p.visible)return;parts.push(o);});
    const f0=parts[0],same=(m,n)=>m.elements.every((v,i)=>Math.abs(v-n.elements[i])<1e-5),ok=parts.length>1&&parts.every(o=>!Array.isArray(o.material)&&!o.material.map&&!o.geometry.morphAttributes.position&&o.skeleton.bones.length===f0.skeleton.bones.length&&o.skeleton.bones.every((b,i)=>b===f0.skeleton.bones[i])&&same(o.bindMatrix,f0.bindMatrix)&&same(o.matrixWorld,f0.matrixWorld)&&!!o.geometry.index===!!f0.geometry.index);
    if(ok){const gs=parts.map(o=>{const q=o.geometry.clone();for(const k of Object.keys(q.attributes))if(!['position','normal','skinIndex','skinWeight'].includes(k))q.deleteAttribute(k);const n=q.attributes.position.count,c=new Float32Array(n*3),col=o.material.color;for(let i=0;i<n;i++){c[i*3]=col.r;c[i*3+1]=col.g;c[i*3+2]=col.b;}q.setAttribute('color',new THREE.BufferAttribute(c,3));return q;}),mg=mergeGeometries(gs);
     if(mg){this.personM??=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.78,metalness:0});const one=new THREE.SkinnedMesh(mg,this.personM);one.position.copy(f0.position);one.quaternion.copy(f0.quaternion);one.scale.copy(f0.scale);one.bind(f0.skeleton,f0.bindMatrix);one.castShadow=f0.castShadow;one.receiveShadow=f0.receiveShadow;one.frustumCulled=false;one.userData.toon=one.userData.real=true;f0.parent.add(one);for(const o of parts)o.parent.remove(o);}}}catch(err){console.warn('persona non fusa',err);}
   const mixer=new THREE.AnimationMixer(root),actions={};for(const c of g.animations)actions[c.name]=mixer.clipAction(c);const B=n=>root.getObjectByName(n),legs={u:[B('UpperLegL'),B('UpperLegR')].filter(Boolean),l:[B('LowerLegL'),B('LowerLegR')].filter(Boolean),a:[B('UpperArmL'),B('UpperArmR')].filter(Boolean),f:[B('LowerArmL'),B('LowerArmR')].filter(Boolean),ft:[B('FootL'),B('FootR')].filter(Boolean)};return {root,mixer,actions,legs};});}
 figure(){const cv=document.createElement('canvas');cv.width=160;cv.height=230;const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,alphaTest:.35}));sprite.center.set(.5,22/230);sprite.scale.set(160*FIG,230*FIG,1);sprite.userData.outlineParameters={visible:false};return {cv,tex,sprite};}
 avatar(p){const e={root:new THREE.Group(),sig:JSON.stringify(p.avatar||{})};this.players.set(p.id,e);this.dynamic.add(e.root);
  {const bl=e.blob=new THREE.Mesh(this.blobG??=new THREE.CircleGeometry(.42,20).rotateX(-Math.PI/2),this.blobMat());bl.position.y=.03;bl.userData.toon=true;e.root.add(bl);}
  const AK=this.avatarKind();if(AK==='q3d'||AK==='real'){(AK==='real'?this.realPerson(p.avatar?.look,p.id,p.avatar):this.person(p.avatar?.look,p.id,p.avatar)).then(o=>{if(!o||this.players.get(p.id)!==e)return;e.body=o.root;e.mixer=o.mixer;e.actions=o.actions;e.legs=o.legs;e.real=o.real||null;e.anim=null;e.act=null;e.root.add(o.root);});}
  else if(AK!=='3d'){Object.assign(e,this.figure());e.body=e.sprite;e.root.add(e.sprite);e.blob.visible=false;}
  else try{const mat=this.avatarMat??=this.toon?new THREE.MeshToonMaterial({vertexColors:true,gradientMap:this.grad}):new THREE.MeshStandardMaterial({vertexColors:true,roughness:.74,metalness:0});
   const av=e.av=buildAvatar(avatarSpec(p.avatar,p.id,LOOKS[p.avatar?.look]),mat,this.toon?this.grad:null);av.root.traverse(o=>{if(o.isMesh){o.castShadow=!this.mobile;o.userData.toon=o.userData.real=true;}});e.body=av.root;e.root.add(av.root);}
  catch(err){console.warn('Avatar 3D non costruito:',err);}
  e.tag=this.label(p.username||'',0,2.15,0,'rgba(17,24,39,.6)','#fff',.42);e.root.add(e.tag);}
 dropAvatar(id,e){this.dynamic.remove(e.root);e.av?.dispose();e.tex?.dispose();e.sprite?.material.dispose();e.tag?.material.map?.dispose();this.players.delete(id);}
 // Auto lasciata parcheggiata dove il giocatore è sceso (resta per un minuto).
 park(a){if(Date.now()-a.t>60000)return;const o=this.ride(a.v);if(!o)return;o.position.set(a.x,this.lev(a.x,a.y),a.y);o.rotation.y=heading(a.h);this.dynamic.add(o);setTimeout(()=>this.dynamic.remove(o),60000-(Date.now()-a.t));}
 // Ridisegna la figura 2D vista dalla telecamera: la direzione viene ruotata così che "verso la telecamera" corrisponda a "verso chi guarda" nel 2D.
 paint2d(e,p,me){const g=e.cv.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,160,230);g.translate(80,208);const toCam=Math.atan2(Math.cos(this.yaw),Math.sin(this.yaw));
  try{this.r2d.avatarBase(g,{...p,x:0,y:0,direction:(p.direction||0)-toCam+Math.PI/4,vehicle:null},{id:me.id});}catch{}e.tex.needsUpdate=true;}
 // Punta un osso (il suo asse lungo è Y) verso una direzione data nello spazio del corpo: x sinistra, y alto, z avanti. k = quanto (0…1).
 aimBone(e,b,x,y,z,k){const T=this.aimT??={v:new THREE.Vector3(),c:new THREE.Vector3(),q:new THREE.Quaternion(),p:new THREE.Quaternion(),d:new THREE.Quaternion(),i:new THREE.Quaternion()};
  T.v.set(x,y,z).normalize().applyQuaternion(e.body.getWorldQuaternion(T.q));(b.userData.ax?T.c.copy(b.userData.ax):T.c.set(0,1,0)).applyQuaternion(b.getWorldQuaternion(T.q)).normalize();T.d.setFromUnitVectors(T.c,T.v);if(k<1)T.d.copy(T.i.identity().slerp(T.d,k));
  b.parent.getWorldQuaternion(T.p);b.quaternion.premultiply(T.q.copy(T.p).invert().multiply(T.d).multiply(T.p));}
 sitPose(e,kind,k){const L=e.legs,P={car:{u:[.06,-.03,1],l:[0,-.22,.97],a:[.04,-.5,.86],f:[-.1,.12,1]},moto:{u:[.2,-.3,.93],l:[.05,-1,-.1],a:[.03,-.55,.83],f:[-.03,-.08,1]},chair:{u:[.08,-.1,1],l:[0,-1,.05]}}[kind];
  for(const part of ['u','l','a','f']){const d=P[part];if(d)(L[part]||[]).forEach((b,i)=>this.aimBone(e,b,d[0]*(i?-1:1),d[1],d[2],k));}
  // in auto i piedi (ossa a parte, non figlie della gamba) seguono lo stinco: altrimenti restano a terra e la gamba si allunga sotto la macchina
  if(kind==='car'&&L.ft?.length===L.l.length){const T=this.aimT;L.l.forEach((sh,i)=>{const ft=L.ft[i],len=sh.getWorldPosition(T.v).distanceTo(L.u[i].getWorldPosition(T.c));T.c.set(0,1,0).applyQuaternion(sh.getWorldQuaternion(T.q));sh.getWorldPosition(T.v).addScaledVector(T.c,len);ft.parent.updateWorldMatrix(true,false);ft.parent.worldToLocal(T.v);ft.position.lerp(T.v,k);});}}
 present(){if(this.gfx!=='ultra'||this.postOff||!this.gl.capabilities.isWebGL2){this.gl.render(this.scene,this.camera);return;}
  try{const P=this.postK??=(()=>{const rt=new THREE.WebGLRenderTarget(4,4,{type:THREE.HalfFloatType,samples:4,depthBuffer:true}),sc=new THREE.Scene(),cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1),sz=new THREE.Vector2();
     const mat=new THREE.ShaderMaterial({uniforms:{tD:{value:rt.texture},px:{value:new THREE.Vector2()}},depthTest:false,depthWrite:false,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:'uniform sampler2D tD;uniform vec2 px;varying vec2 vUv;void main(){vec3 c=texture2D(tD,vUv).rgb;vec3 n=texture2D(tD,vUv+vec2(px.x,0.)).rgb+texture2D(tD,vUv-vec2(px.x,0.)).rgb+texture2D(tD,vUv+vec2(0.,px.y)).rgb+texture2D(tD,vUv-vec2(0.,px.y)).rgb;c=max(c+clamp(c-n*.25,-.12,.12)*.45,0.);gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\nvec3 g=gl_FragColor.rgb;float l=dot(g,vec3(.299,.587,.114));g=mix(vec3(l),g,1.1);g=(g-.5)*1.06+.5;g*=vec3(1.02,1.,.975);vec2 q=vUv-.5;g*=1.-dot(q,q)*.2;gl_FragColor=vec4(clamp(g,0.,1.),1.);}'});
     const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat);quad.frustumCulled=false;sc.add(quad);return {rt,sc,cam,mat,sz};})();
   this.gl.getDrawingBufferSize(P.sz);if(P.rt.width!==P.sz.x||P.rt.height!==P.sz.y){P.rt.setSize(P.sz.x,P.sz.y);P.mat.uniforms.px.value.set(1/P.sz.x,1/P.sz.y);}
   this.gl.setRenderTarget(P.rt);this.gl.render(this.scene,this.camera);this.gl.setRenderTarget(null);this.gl.render(P.sc,P.cam);}
  catch(err){console.warn('ritocco immagine spento',err);this.postOff=true;this.gl.setRenderTarget(null);this.gl.render(this.scene,this.camera);}}
 // Tombini di ghisa e macchie sull'asfalto: due sole mesh per tutta la città.
 roadDecals(){const mk=(sz,fn)=>{const c=document.createElement('canvas');c.width=c.height=sz;fn(c.getContext('2d'));const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;};
  const tomb=mk(128,g=>{g.clearRect(0,0,128,128);g.fillStyle='#3b3d40';g.beginPath();g.arc(64,64,62,0,6.3);g.fill();g.fillStyle='#232527';g.beginPath();g.arc(64,64,54,0,6.3);g.fill();g.strokeStyle='#4a4d51';g.lineWidth=4;for(let r=14;r<54;r+=13){g.beginPath();g.arc(64,64,r,0,6.3);g.stroke();}for(let a=0;a<8;a++){g.beginPath();g.moveTo(64+Math.cos(a*.785)*14,64+Math.sin(a*.785)*14);g.lineTo(64+Math.cos(a*.785)*52,64+Math.sin(a*.785)*52);g.stroke();}g.fillStyle='#17181a';for(const [x,y] of [[40,64],[88,64]]){g.beginPath();g.arc(x,y,4,0,6.3);g.fill();}});
  const stain=mk(128,g=>{g.clearRect(0,0,128,128);for(let i=0;i<9;i++){const x=30+(i*47)%70,y=28+(i*31)%72,r=14+(i*13)%26,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(0,0,0,.5)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);}});
  const grate=mk(64,g=>{g.fillStyle='#2a2c2f';g.fillRect(0,0,64,64);g.strokeStyle='#55585c';g.lineWidth=3;g.strokeRect(2,2,60,60);g.fillStyle='#0c0d0e';for(let x=9;x<56;x+=9)g.fillRect(x,8,4,48);});
  const C={p:[],u:[]},A={p:[],u:[]},B={p:[],u:[]},quad=(o,x,z,w,d,y)=>{o.p.push(x-w,y,z-d,x+w,y,z+d,x+w,y,z-d,x-w,y,z-d,x-w,y,z+d,x+w,y,z+d);o.u.push(0,0,1,1,1,0,0,0,0,1,1,1);};
  for(const st of STREETS){const hz=st.w>=st.h,L=hz?st.w:st.h,Wd=hz?st.h:st.w;if(Wd<3||L<10)continue;const h=hash(st.x+':'+st.y);
   for(let t=4+h%9;t<L-3;t+=17+h%7){const c=(hz?st.y:st.x)+Wd*(.28+((t*7+h)%5)*.11),x=hz?st.x+t:c,z=hz?c:st.y+t;quad(A,x,z,.36,.36,.036);}
   for(let t=7+h%11;t<L-4;t+=23+h%5)for(const sd of [0,1]){const c=(hz?st.y:st.x)+(sd?Wd-.32:.32),x=hz?st.x+t+sd*6:c,z=hz?c:st.y+t+sd*6;quad(C,x,z,hz?.3:.2,hz?.2:.3,.035);}
   for(let t=2+h%5;t<L-3;t+=9+(h>>3)%6){const c=(hz?st.y:st.x)+Wd*(.2+((t*13+h)%7)*.1),x=hz?st.x+t:c,z=hz?c:st.y+t,r=.9+((t*5+h)%6)*.35;quad(B,x,z,hz?r*1.5:r,hz?r:r*1.5,.033);}}
  const mesh=(o,m)=>{if(!o.p.length)return;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(o.p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(o.u,2));g.computeVertexNormals();const q=new THREE.Mesh(g,m);q.receiveShadow=true;q.userData.toon=q.userData.real=true;m.userData.outlineParameters={visible:false};this.static.add(q);};
  mesh(B,new THREE.MeshBasicMaterial({map:stain,color:'#0c0d0f',transparent:true,opacity:.42,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));
  mesh(C,new THREE.MeshLambertMaterial({map:grate,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}));
  mesh(A,this.mobile?new THREE.MeshLambertMaterial({map:tomb,alphaTest:.5,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}):new THREE.MeshStandardMaterial({map:tomb,alphaTest:.5,roughness:.5,metalness:.55,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}));}
 play(e,name){if(!e.actions||e.anim===name)return;const ALIAS={idle:['Idle'],walk:['Walk'],sprint:['Run'],sit:['Idle_Neutral','Idle'],drive:['Idle_Neutral','Idle'],'emote-yes':['Wave'],'emote-dance':['Dance','Wave']};const a=e.actions[name]||(ALIAS[name]||[]).map(n=>e.actions[n]).find(Boolean)||e.actions.idle||e.actions.Idle;if(!a)return;const old=e.act;e.anim=name;if(old===a)return;a.reset().fadeIn(.2).play();if(old)old.fadeOut(.2);e.act=a;}
 vehicle(e,v){if(e.carId===v)return;e.carId=v;if(e.car){e.root.remove(e.car);e.car=null;}e.carT=0;const o=v&&this.ride(v,null,true);if(!o)return;o.traverse(m=>{if(m.isMesh)m.castShadow=false;});e.car=o;e.root.add(o);}
 draw(list,me,dt){if(!me)return;this.clock+=dt;this.r2d.time=(this.r2d.time||0)+dt;const inR=this.indoor(me.room);this.room=me.room==='mergellina'?'mergellina':inR?me.room:'lungomare';if(this.travelBtn)this.travelBtn.hidden=inR;
  if(this.fx){this.fx.beams?.forEach((b,i)=>{if(b.geometry.type==='ConeGeometry'){b.rotation.x=Math.sin(this.clock*1.3+i)*.55;b.rotation.z=Math.cos(this.clock*.9+i*1.7)*.55;}else b.rotation.y=(i-2.5)*.22+Math.sin(this.clock*.7+i)*.25;});this.fx.ball.rotation.y=this.clock*.8;this.fx.spots.forEach((s,i)=>s.position.set(3+i*3,.03,7+Math.sin(this.clock+i)*3));}
  // Entrando (o cambiando zona) la telecamera guarda verso la città, non verso il mare: così "avanti" porta subito tra le strade.
  // Nei locali guarda dal lato della porta verso il bancone.
  const key=me.id+':'+this.room;if(me.id&&key!==this.entered){this.entered=key;this.yaw=inR?0:this.room==='mergellina'?Math.PI/4:MODE.front?Math.PI:-3*Math.PI/4;this.autoYaw=true;this.snap=true;}{const sg=this.signature();if(sg!==this.sig){this.sig=sg;this.swap();}}this.daylight(dt);this.city(list,dt);
  if(this.seaT)this.seaT.offset.set(this.clock*.012,this.clock*.007);if(this.seaN)this.seaN.offset.set(this.clock*.011,this.clock*.006);if(this.foam){const o=Math.sin(this.clock*.9)*.45/Math.SQRT2;this.foam.position.set(o,0,o);this.foamT.offset.x=this.clock*.02;}
  // Destinazione della mappa: colonna di luce sul punto scelto; sparisce quando ci arrivi.
  {const wp=this.waypoint;if(wp&&wp.room===me.room&&me.id){if(!this.beam){this.beam=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,60,16,1,true),new THREE.MeshBasicMaterial({color:'#ffd23f',transparent:true,opacity:.35,depthWrite:false,side:THREE.DoubleSide}));this.scene.add(this.beam);}this.beam.visible=true;this.beam.position.set(wp.x,30,wp.y);this.beam.material.opacity=.25+.12*Math.sin(this.clock*4);if(Math.hypot(me.x-wp.x,me.y-wp.y)<2.5){this.waypoint=null;dispatchEvent(new CustomEvent('humana-arrived',{detail:wp}));}}else if(this.beam)this.beam.visible=false;}
  for(const b of this.boats||[]){if(Math.abs(b.position.x-this.target.x)+Math.abs(b.position.z-this.target.z)>120)continue;const t=this.clock+b.userData.phase;b.position.y=Math.sin(t*1.3)*.08;b.rotation.z=Math.sin(t*.9)*.04;}
  if(this.lod&&this.room==='mergellina')this.lod(this.target.x,this.target.z);
  const seen=new Set();this.hit=[];
  for(const p of list){if(p.npc||p.room!==me.room)continue;seen.add(p.id);let e=this.players.get(p.id);if(e&&this.clock-(e.chk||0)>1){e.chk=this.clock;if(e.sig!==JSON.stringify(p.avatar||{})){this.dropAvatar(p.id,e);e=null;}}if(!e){this.avatar(p);e=this.players.get(p.id);}
   const onBoat=p.seat==='boat';if(onBoat&&!e.boatO){e.boatO=this.boat(7);e.boatO.scale.setScalar(1.25);e.boatO.position.set(0,-.5,2.6);e.root.add(e.boatO);
    if(!this.wakeM){const c=document.createElement('canvas');c.width=64;c.height=256;const q=c.getContext('2d'),gr=q.createLinearGradient(0,0,0,256);gr.addColorStop(0,'rgba(255,255,255,.85)');gr.addColorStop(.35,'rgba(255,255,255,.4)');gr.addColorStop(1,'rgba(255,255,255,0)');q.fillStyle=gr;q.beginPath();q.moveTo(26,0);q.lineTo(38,0);q.lineTo(64,256);q.lineTo(0,256);q.fill();for(let i=0;i<70;i++){q.fillStyle='rgba(255,255,255,'+(.5*(1-i/70))+')';q.beginPath();q.arc((i*37)%64,i*3.6,2.4,0,6.283);q.fill();}
     this.wakeM=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,side:THREE.DoubleSide});this.wakeM.userData.outlineParameters={visible:false};}
    const wk=new THREE.Mesh(new THREE.PlaneGeometry(7,26).rotateX(-Math.PI/2),this.wakeM);wk.position.set(0,.42,-16);wk.rotation.y=Math.PI;wk.renderOrder=11;e.boatO.add(wk);e.wake=wk;}else if(!onBoat&&e.boatO){e.root.remove(e.boatO);e.boatO=null;}
   if(e.boatO){e.boatO.rotation.x=Math.sin(this.clock*1.7)*.035-.03;e.boatO.rotation.z=Math.sin(this.clock*1.1)*.05;}
   const onBus=p.seat==='bus',hidden=p.seat==='car';e.root.visible=!hidden;if(onBus&&!e.busO){e.busO=this.bus();e.root.add(e.busO);}else if(!onBus&&e.busO){e.root.remove(e.busO);e.busO=null;}if(e.blob)e.blob.visible=!onBus&&!e.sprite;{const gy=onBoat?.42+Math.sin(this.clock*1.3)*.06:this.lev(p.x,p.y);e.gy=e.gy===undefined?gy:e.gy+(gy-e.gy)*Math.min(1,dt*12);e.root.position.set(p.x,e.gy,p.y);}
   const carId=p.vehicle&&!p.seat?p.vehicle:null,car=carId&&(VEHICLE[carId]?.base||carId);this.vehicle(e,carId);{const big=car&&['auto','furgone','cabrio'].includes(car);e.blob.scale.set(big?2.3:car?1.2:1,1,big?5.2:car?2.3:1);if(e.sprite)e.sprite.material.color.copy(this.tint);}
   const yaw=heading(p.direction||0);if(e.yaw===undefined||car)e.yaw=yaw;else{let dd=yaw-e.yaw;dd=Math.atan2(Math.sin(dd),Math.cos(dd));e.yaw+=dd*Math.min(1,12*dt);}e.root.rotation.y=e.yaw;
   if(p.parkedAt&&p.parkedAt.t!==e.parkedT&&!car){e.parkedT=p.parkedAt.t;this.park(p.parkedAt);}
   if(e.mixer)e.mixer.timeScale=car?1:e.real?(p.moving&&!p.seat?Math.max(.7,Math.min(1.6,(p.running?4.4:2.5)/(e.real.meta.velocita?.[p.running?'Run':'Walk']||2))):1):p.running?1.15:1;
   if(e.body){const inCar=car&&['auto','furgone','cabrio'].includes(car);e.body.visible=(!inCar||car==='cabrio'||!!e.legs)&&!(onBus&&e.sprite);e.body.position.y=car?(inCar?.35:.45):0;
    this.play(e,p.seat?'sit':car?'drive':p.moving?(p.running?'sprint':'walk'):p.action==='WAVE'?'emote-yes':p.action==='DANCE'?'emote-dance':'idle');e.mixer?.update(dt);e.body.position.x=e.body.position.z=0;if(car){e.carT=(e.carT||0)+dt;const st=e.car?.userData.seat,dr=e.car?.userData.door,t=e.carT,T0=st?.35:0,T1=st?.9:.55,k=Math.max(0,Math.min(1,(t-T0)/(T1-T0))),sk=k*k*(3-2*k);
      if(dr){dr.rotation.y=-1.15*(t<.35?t/.35:t<.9?1:Math.max(0,1-(t-.9)/.35));dr.visible=t<1.27;}
      if(st&&e.legs){e.body.visible=!(p.id===me.id&&(this.carMode==='car-cockpit'||this.carMode==='car-hood'));e.body.position.set(st.x+(st.hw+.55-st.x)*(1-sk),st.y*sk,st.z);}else if(e.legs)e.body.position.set(.75*(1-sk),(e.body.position.y-(car==='monopattino'?0:.5))*sk,car==='scooter'?-.18*sk:0);
      if(e.legs&&car!=='monopattino')this.sitPose(e,st?'car':'moto',sk);}
     else if(p.seat==='boat'){e.boatT=(e.boatT||0)+dt;const k=Math.min(1,e.boatT/.9),sk=k*k*(3-2*k);e.body.position.set(1.6*(1-sk),-.14*sk+.35*Math.sin(Math.PI*sk),-.85*sk);if(e.legs)this.sitPose(e,'chair',sk);}
     else{e.boatT=0;if(e.hadCar&&p.parkedAt&&e.legs){const dx=p.parkedAt.x-p.x,dz=p.parkedAt.y-p.y,c=Math.cos(e.root.rotation.y),sn=Math.sin(e.root.rotation.y);if(Math.hypot(dx,dz)<3){e.exitT=0;e.exitL=[dx*c-dz*sn,dx*sn+dz*c];}}
      if(e.exitL&&e.exitT<.55){e.exitT+=dt;const k=1-Math.min(1,e.exitT/.55),sk=k*k*(3-2*k);e.body.position.x=e.exitL[0]*sk;e.body.position.z=e.exitL[1]*sk;e.body.position.y=-.3*sk;if(e.legs)this.sitPose(e,'chair',sk);}
      if(e.legs&&p.seat&&p.seat!=='bus'){this.sitPose(e,'chair',1);e.body.position.y-=.36;}}e.hadCar=!!car;if(e.sprite){e.pt=(e.pt||0)+dt;if(e.pt>=1/15){e.pt=0;this.paint2d(e,p,me);}}
    if(e.av){if(onBus)e.body.visible=false;e.body.position.y=car?({cabrio:.2,scooter:.3,bici:.42,monopattino:.16}[car]??.3):0;poseAvatar(e.av,{moving:p.moving&&!car,running:p.running,sit:!!p.seat||!!car&&car!=='monopattino',drive:!!car,action:p.action,talking:p.talking},this.clock,dt);}}
   if(e.tag){e.tag.position.y=car?2.4:e.sprite?1.78:2.1;const td=Math.hypot(this.camera.position.x-p.x,this.camera.position.y-(e.gy||0)-e.tag.position.y,this.camera.position.z-p.y);if(p.id===me.id)e.tag.visible=td>2.4;}
   const s=new THREE.Vector3(p.x,1.9,p.y).project(this.camera);if(s.z<1&&p.id!==me.id)this.hit.push({id:p.id,x:(s.x+1)/2*this.w,y:(1-s.y)/2*this.h});}
  for(const [id,e] of this.players)if(!seen.has(id))this.dropAvatar(id,e);
  // Telecamere: a piedi 2.5D (bassa, vede cielo e palazzi), terza persona, prima persona;
  // in auto: dietro l'auto, esterna (orbita), cofano, abitacolo. Il passaggio tra una e l'altra è sfumato.
  this.target.lerp(new THREE.Vector3(me.x,0,me.y),1-Math.exp(-12*dt));
  if(this.spin)this.yaw+=this.spin*1.8*dt;
  const mode=this.mode(me),car=!!me.vehicle,dirYaw=Math.atan2(-Math.cos(me.direction||0),-Math.sin(me.direction||0));
  const follow=car?(mode!=='car-orbit'):(mode==='third'||mode==='first');
  if(follow&&this.autoYaw&&me.moving){let d=dirYaw-this.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));this.yaw+=d*(1-Math.exp(-(car?(mode==='car-chase'?3:8):mode==='first'?0:1.4)*dt));}
  if(car&&(mode==='car-hood'||mode==='car-cockpit'))this.yaw=dirYaw;
  const zoom=this.r2d.zoom||1,sy=Math.sin(this.yaw),cy=Math.cos(this.yaw),T=this.target,eye=new THREE.Vector3(),look=new THREE.Vector3();
  const back=(dist,h,lookH)=>{eye.set(T.x+sy*dist,h,T.z+cy*dist);look.set(T.x-sy*4,lookH,T.z-cy*4);};
  if(mode==='25d'&&inR){const dist=10.5/zoom;eye.set(T.x+sy*dist,5.6/zoom+1.2,T.z+cy*dist);look.set(T.x-sy*3,1.6,T.z-cy*3);}
  else if(mode==='25d'){const dist=15/zoom;eye.set(T.x+sy*dist,6.5/zoom+1.5,T.z+cy*dist);look.set(T.x-sy*6,4,T.z-cy*6);}
  else if(mode==='third')back(5.2/zoom+.6,2.5+this.pitch*4,1.5);
  else if(mode==='first'){eye.set(T.x-sy*.25,1.62,T.z-cy*.25);look.set(T.x-sy*10,1.5+this.pitch*6,T.z-cy*10);}
  else if(mode==='car-chase')back(8.5/zoom,3.2,1.4);
  else if(mode==='car-orbit')back(14/zoom,6,1);
  else if(mode==='car-hood'){eye.set(T.x-sy*.9,1.45,T.z-cy*.9);look.set(T.x-sy*20,1.3,T.z-cy*20);}
  else {eye.set(T.x+sy*.15,1.25,T.z+cy*.15);look.set(T.x-sy*20,1.15,T.z-cy*20);}
  // Collisione: se tra il personaggio e la telecamera c'è un palazzo, la telecamera si avvicina.
  if(mode!=='first'&&mode!=='car-hood'&&mode!=='car-cockpit'&&this.solid.length){const from=new THREE.Vector3(T.x,1.6,T.z),dir=eye.clone().sub(from),len=dir.length();dir.normalize();this.ray.set(from,dir);this.ray.far=len;const hit=this.ray.intersectObjects(this.solid,true)[0];if(hit){const dd=Math.max(1.7,hit.distance-.45);eye.copy(from).addScaledVector(dir,dd);if(hit.distance<2.4)eye.y=Math.max(eye.y,2.6+(2.4-hit.distance)*1.2);}}
  const k=1-Math.exp(-(this.snap?60:9)*dt);this.snap=false;this.camEye.lerp(eye,k);this.camLook.lerp(look,k);
  this.camera.position.copy(this.camEye);this.camera.lookAt(this.camLook);
  // In prima persona e nell'abitacolo il proprio personaggio non si vede; nell'abitacolo si vede il cruscotto.
  {const on=mode==='car-cockpit';if(on&&!this.cock){const c=this.cock=new THREE.Group(),m=(col)=>new THREE.MeshBasicMaterial({color:col}),B=(w,h,d,x,y,z,col,rx=0,rz=0)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m(col));o.position.set(x,y,z);o.rotation.set(rx,0,rz);c.add(o);return o;};
    B(1.7,.26,.5,0,-.44,-.72,'#2a2d33',.25);B(1.7,.05,.5,0,-.3,-.82,'#3a3e46',.25);B(.5,.16,.04,-.36,-.3,-.62,'#0b0c0f',.5);B(.4,.2,.04,.2,-.3,-.66,'#0f1a24',.5);
    const wh=new THREE.Mesh(new THREE.TorusGeometry(.17,.022,8,22),m('#0b0c0f'));wh.position.set(-.36,-.33,-.5);wh.rotation.x=-.45;c.add(wh);B(.3,.03,.03,-.36,-.33,-.5,'#0b0c0f',-.45);
    B(.06,1.1,.06,-.9,.06,-.82,'#2a2d33',.5,.28);B(.06,1.1,.06,.9,.06,-.82,'#2a2d33',.5,-.28);B(1.9,.07,.7,0,.6,-.5,'#33363d');B(.24,.08,.04,0,.5,-.6,'#15171b');
    this.hoodM=m('#2563eb');const hd=new THREE.Mesh(new THREE.BoxGeometry(1.6,.06,1.5),this.hoodM);hd.position.set(0,-.56,-1.75);hd.rotation.x=.06;c.add(hd);
    c.traverse(o=>{if(o.isMesh){o.userData.toon=o.userData.real=true;o.frustumCulled=false;o.renderOrder=20;}});c.position.y=.05;this.camera.add(c);if(!this.camera.parent)this.scene.add(this.camera);}
   if(this.cock){this.cock.visible=on;if(on)this.hoodM.color.set(VEHICLE[me.vehicle]?.color||'#2563eb');}}
  const meB=VEHICLE[me.vehicle]?.base||me.vehicle,meE=this.players.get(me.id);if(meE?.body)meE.body.visible=!(mode==='first')&&!(car&&(['auto','furgone'].includes(meB)&&!meE.legs||['auto','furgone','cabrio'].includes(meB)&&(mode==='car-cockpit'||mode==='car-hood')));
  if(meE?.car)meE.car.visible=!(mode==='car-cockpit'||mode==='car-hood');if(meE?.tag)meE.tag.visible=mode!=='first'&&mode!=='car-cockpit'&&mode!=='car-hood';
  this.dash.visible=mode==='car-cockpit';this.dash.position.copy(this.camera.position);this.dash.quaternion.copy(this.camera.quaternion);
  {this.shN=(this.shN||0)+1;const sT=this.shT??=new THREE.Vector3(1e9,0,0);if(this.shN%1500===0||sT.distanceTo(this.target)>(this.inCar?32:20)){sT.copy(this.target);this.sun.position.copy(sT).addScaledVector(this.sunDir,90);this.sun.target.position.copy(sT);this.gl.shadowMap.needsUpdate=true;}}this.skyG.position.copy(this.camera.position);this.dome.rotation.y=this.clock*.004;
  // Insegne lontane nascoste: a 90 m non si leggono e costano.
  this.cullClock=(this.cullClock||0)+dt;if(this.cullClock>.4){this.cullClock=0;for(const o of this.static.children){if(o.isSprite)o.visible=Math.hypot(o.position.x-this.target.x,o.position.z-this.target.z)<90;else if(o.userData.zone&&o.boundingSphere)o.visible=Math.hypot(o.boundingSphere.center.x-this.target.x,o.boundingSphere.center.z-this.target.z)<260;}}
  {this.toonClock=(this.toonClock||0)+dt;if(this.toonClock>.5){this.toonClock=0;this.toonify(this.static);this.toonify(this.dynamic);}}
  if(this.toon&&this.lines!==false)this.outline.render(this.scene,this.camera);else this.present();
  // Qualità automatica: sotto i 28 FPS abbassa la risoluzione (fino al 60%), sopra i 50 la rialza.
  if(document.hidden){this.fpsT=-3;this.fpsN=0;}// con la finestra nascosta il browser rallenta apposta: non conta come PC lento
  this.fpsT=(this.fpsT||0)+dt;this.fpsN=this.fpsT<0?0:(this.fpsN||0)+1;if(this.fpsT>2){const fps=this.fpsN/this.fpsT;this.fpsT=this.fpsN=0;const base=Math.min(devicePixelRatio,this.mobile?1.25:2);this.scale??=1;// Prima si spengono le ombre (costano un secondo disegno della scena), poi cala la risoluzione.
  if(!this.mobile)this.scale=1;else if(fps<27){if(this.toon&&this.lines!==false&&fps<22){this.lines=false;}else if(!this.toon&&this.scale>(this.lite?.55:.74))this.scale=Math.max(this.lite?.55:.74,this.scale-.13);else if(!this.toon&&fps<21&&this.scale>.6)this.scale=Math.max(.6,this.scale-.14);}else if(fps>50&&this.scale<1)this.scale=Math.min(1,this.scale+.13);if(this.prK!==base*this.scale){this.prK=base*this.scale;this.gl.setPixelRatio(this.prK);}this.fps=Math.round(fps);}}
}
