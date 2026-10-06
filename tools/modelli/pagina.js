// Pagina del convertitore (vedi scripts/converti-modelli.mjs). Il browser fa da convertitore: carica i modelli scaricati,
// li mostra per controllarli e salva i file pronti per il gioco. Le funzioni stanno in window.tools e si chiamano dalla console.
import * as THREE from 'three';
import {GLTFLoader} from '/three/GLTFLoader.js';

const logEl=document.getElementById('log'),log=t=>{logEl.textContent=String(t);};
const tools={THREE,log};window.tools=tools;window.THREE=THREE;

// --- anteprima ---
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;document.body.append(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,.05,500);scene.add(new THREE.HemisphereLight('#ffffff','#8a8478',1.6));const sun=new THREE.DirectionalLight('#fff4e0',2.2);sun.position.set(3,6,5);scene.add(sun);
const stage=new THREE.Group();scene.add(stage);
Object.assign(tools,{renderer,scene,camera,stage});
tools.show=(obj,{dist=1.6,yaw=0,pitch=.1}={})=>{stage.clear();if(obj)stage.add(obj);const box=new THREE.Box3().setFromObject(stage),c=box.getCenter(new THREE.Vector3()),s=box.getSize(new THREE.Vector3()),r=Math.max(s.x,s.y,s.z)*dist;
 camera.position.set(c.x+Math.sin(yaw)*Math.cos(pitch)*r,c.y+Math.sin(pitch)*r,c.z+Math.cos(yaw)*Math.cos(pitch)*r);camera.lookAt(c);camera.near=r/100;camera.far=r*10;camera.updateProjectionMatrix();renderer.setClearColor('#20242b',1);renderer.render(scene,camera);return {size:s.toArray().map(v=>+v.toFixed(3)),center:c.toArray().map(v=>+v.toFixed(3))};};
tools.view=(x,y,z,tx,ty,tz)=>{camera.position.set(x,y,z);camera.lookAt(tx,ty,tz);camera.updateProjectionMatrix();renderer.setClearColor('#20242b',1);renderer.render(scene,camera);};
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});

// --- caricamento e salvataggio ---
tools.save=async(to,data)=>{const r=await fetch('/save?to='+encodeURIComponent(to),{method:'POST',body:data});if(!r.ok)throw new Error(await r.text());return r.json();};
tools.loadGLTF=url=>new Promise((res,rej)=>new GLTFLoader().load(url,res,undefined,rej));
tools.loadFBX=async(url,texPath)=>{const [{FBXLoader},{TGALoader}]=await Promise.all([import('/jsm/loaders/FBXLoader.js'),import('/jsm/loaders/TGALoader.js')]);const man=new THREE.LoadingManager();man.addHandler(/\.tga$/i,new TGALoader(man));const l=new FBXLoader(man);if(texPath)l.setResourcePath(texPath);return new Promise((res,rej)=>l.load(url,res,undefined,rej));};
tools.stats=obj=>{let tris=0,meshes=0,skinned=0;const mats=new Set(),bones=[];obj.traverse(o=>{if(o.isBone)bones.push(o.name);if(!o.isMesh)return;meshes++;if(o.isSkinnedMesh)skinned++;const g=o.geometry;tris+=(g.index?g.index.count:g.attributes.position.count)/3;for(const m of [].concat(o.material))mats.add(m.name+'|'+(m.map?.name||m.map?.image?.src?.split('/').pop()||'')+'|'+(m.transparent?'T':'')+(m.alphaTest?'A':''));});return {tris:Math.round(tris),meshes,skinned,bones:bones.length,mats:[...mats]};};
log('Convertitore modelli: pronto.');

// ================= PERSONE (Microsoft Rocketbox, licenza MIT) =================
// Carica un FBX e aspetta che siano arrivate anche le sue texture.
tools.loadFBX=async(url,texPath)=>{const [{FBXLoader},{TGALoader}]=await Promise.all([import('/jsm/loaders/FBXLoader.js'),import('/jsm/loaders/TGALoader.js')]);const man=new THREE.LoadingManager();let done;const all=new Promise(r=>done=r);man.onLoad=()=>done();man.onError=()=>{};man.addHandler(/\.tga$/i,new TGALoader(man));const l=new FBXLoader(man);if(texPath)l.setResourcePath(texPath);const obj=await new Promise((res,rej)=>l.load(url,res,undefined,rej));await Promise.race([all,new Promise(r=>setTimeout(r,90000))]);return obj;};
// Texture → tela più piccola (le TGA originali sono 2048×2048 e pesano 12 MB l'una).
tools.texCanvas=(tex,W,H)=>{const im=tex.image,src=document.createElement('canvas');src.width=im.width;src.height=im.height;const sx=src.getContext('2d');if(im.data){const id=sx.createImageData(im.width,im.height);id.data.set(im.data);sx.putImageData(id,0,0);}else sx.drawImage(im,0,0);const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(src,0,0,W,H);return c;};
// Materiali nuovi: i materiali di 3ds Max hanno il colore nero (contava solo la texture). Corpo e testa JPEG, capelli/ciglia PNG con trasparenza a soglia.
tools.fixMats=(root,{body=1024,head=1024,hair=512}={})=>{const info=[];root.traverse(o=>{if(!o.isMesh)return;const arr=[].concat(o.material).map(m=>{const kind=/opacity/i.test(m.name)?'hair':/head/i.test(m.name)?'head':'body',src=m.map;if(!src||!src.image)return new THREE.MeshStandardMaterial({name:m.name,color:'#808080'});const W=kind==='hair'?hair:kind==='head'?head:body,H=Math.max(1,Math.round(W*src.image.height/src.image.width)),tx=new THREE.CanvasTexture(tools.texCanvas(src,W,H));tx.colorSpace=THREE.SRGBColorSpace;tx.flipY=src.flipY;tx.name=m.name;tx.userData.mimeType=kind==='hair'?'image/png':'image/jpeg';const nm=new THREE.MeshStandardMaterial({name:m.name,map:tx,roughness:kind==='head'?.72:.9,metalness:0});if(kind==='hair'){nm.alphaTest=.45;nm.side=THREE.DoubleSide;}info.push(m.name+' '+src.image.width+'x'+src.image.height+'->'+W+'x'+H);return nm;});o.material=Array.isArray(o.material)?arr:arr[0];});return info;};
tools.exportGLB=async(obj,animations=[])=>{const {GLTFExporter}=await import('/jsm/exporters/GLTFExporter.js');return new Promise((res,rej)=>new GLTFExporter().parse(obj,res,rej,{binary:true,animations,onlyVisible:false}));};
tools.convertPerson=async(name,opt={})=>{const dir='/src/persone/'+name+'/',fbx=await tools.loadFBX(dir+name+'.fbx',dir);const lights=[];fbx.traverse(o=>{if(o.isLight)lights.push(o);});lights.forEach(o=>o.parent.remove(o));fbx.animations=[];
 const info=tools.fixMats(fbx,opt),st=tools.stats(fbx),box=new THREE.Box3().setFromObject(fbx),height=+(box.max.y-box.min.y).toFixed(2);fbx.userData={fonte:'Microsoft Rocketbox Avatar Library (MIT)',nome:name,altezza:height};
 const glb=await tools.exportGLB(fbx),r=await tools.save('client/assets/world/napoli/characters/persone-vere/'+name+'.glb',glb);tools.last=fbx;return {name,height,tris:st.tris,bones:st.bones,bytes:r.bytes,info};};
// Animazioni: solo rotazioni di corpo e dita + altezza del bacino; niente scala, niente ossa del viso; camminata e corsa "sul posto" (è il gioco a spostare il personaggio).
tools.KEEP=/^Bip01(_Pelvis|_Spine\d?|_Neck|_Head|_[LR]_(Clavicle|UpperArm|Forearm|Hand|Thigh|Calf|Foot|Toe0|Finger\d+))?$/;
tools.cleanClip=(clip,name,inPlace)=>{const tracks=[];let speed=0;for(const k of clip.tracks){const i=k.name.lastIndexOf('.'),node=k.name.slice(0,i),prop=k.name.slice(i+1);if(!tools.KEEP.test(node))continue;if(prop==='quaternion')tracks.push(k.clone());else if(prop==='position'&&node==='Bip01'){const c=k.clone(),v=c.values,n=v.length;speed=Math.hypot(v[n-3]-v[0],v[n-1]-v[2])/100/Math.max(.001,clip.duration);if(inPlace){const x0=v[0],z0=v[2];for(let j=0;j<n;j+=3){v[j]=x0;v[j+2]=z0;}}tracks.push(c);}}const c=new THREE.AnimationClip(name,clip.duration,tracks);c.optimize();return {clip:c,speed:+speed.toFixed(3)};};
tools.convertAnims=async g=>{const LIST=[['Idle','idle_neutral_01',false],['Walk','walk_fast_02',true],['Stroll','walk_neutral',true],['Run','run_neutral',true],['Wave','wave_01',false],['Dance','dancing_neutral',false]];let base=null;const clips=[],meta={velocita:{},durata:{}};
 for(const [name,file,inPlace] of LIST){const o=await tools.loadFBX('/src/animazioni/'+g+'_'+file+'.fbx','/src/animazioni/');const raw=o.animations[0],r=tools.cleanClip(raw,name,inPlace);clips.push(r.clip);meta.velocita[name]=r.speed;meta.durata[name]=+raw.duration.toFixed(2);if(!base){base=o;const p=r.clip.tracks.find(k=>k.name==='Bip01.position');meta.bacino=+p.values[1].toFixed(2);}}
 const lights=[];base.traverse(o=>{if(o.isLight)lights.push(o);});lights.forEach(o=>o.parent.remove(o));base.animations=[];base.userData={fonte:'Microsoft Rocketbox Avatar Library (MIT)',...meta};
 const glb=await tools.exportGLB(base,clips),r=await tools.save('client/assets/world/napoli/characters/persone-vere/anim-'+g+'.glb',glb);return {g,bytes:r.bytes,meta,tracks:clips.map(c=>c.name+':'+c.tracks.length)};};

// ================= ALBERI: "sagome" =================
// Un albero vero di Poly Haven ha 1–4 milioni di triangoli: impossibile metterne centinaia. Qui lo si fotografa da davanti, di lato e dall'alto
// (sfondo trasparente) e nel gioco quelle tre immagini stanno su tre piani incrociati: 12 triangoli per albero, aspetto fotografico.
tools.loadTree=async(dir,id)=>{const g=await tools.loadGLTF(dir+id+'/'+id+'_1k.gltf'),obj=g.scene,tl=new THREE.TextureLoader(),mats=new Set();obj.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material))mats.add(m);});const info=[];
 for(const m of mats){const leaf=/lea(f|ves)|twig|needle|flower|petal|plant|shrub|foliage/i.test(m.name)||m.alphaMode==='BLEND'||m.transparent;info.push(m.name+(leaf?' [foglie]':''));if(!leaf)continue;
  const a=await new Promise(res=>tl.load(dir+id+'/textures/'+id+'_leaves_alpha_1k.png',res,undefined,()=>tl.load(dir+id+'/textures/'+id+'_alpha_1k.png',res,undefined,()=>res(null))));if(a){a.flipY=false;a.wrapS=m.map?.wrapS??a.wrapS;a.wrapT=m.map?.wrapT??a.wrapT;if(m.map){a.repeat.copy(m.map.repeat);a.offset.copy(m.map.offset);}m.alphaMap=a;}m.alphaTest=.4;m.transparent=false;m.side=THREE.DoubleSide;m.depthWrite=true;m.needsUpdate=true;}
 return {obj,info};};
tools.bakeView=async(obj,dirName,halfW,H,px)=>{const top=dirName==='top',w=top?px:Math.max(64,Math.round(px*(2*halfW)/H)),h=px,rt=new THREE.WebGLRenderTarget(w,h,{samples:4}),cam=top?new THREE.OrthographicCamera(-halfW,halfW,halfW,-halfW,.01,H*4+50):new THREE.OrthographicCamera(-halfW,halfW,H,0,.01,halfW*8+50);
 if(top){cam.position.set(0,H*2+10,0);cam.up.set(0,0,-1);cam.lookAt(0,0,0);}else if(dirName==='front'){cam.position.set(0,0,halfW*4+10);cam.lookAt(0,0,0);cam.position.y=0;}else{cam.position.set(halfW*4+10,0,0);cam.lookAt(0,0,0);}
 if(!top){cam.rotation.set(0,dirName==='front'?0:Math.PI/2,0);}cam.updateMatrixWorld(true);
 const sc=new THREE.Scene();const LK=tools.luce||1;sc.add(new THREE.HemisphereLight('#ffffff','#c9c2ae',4.4*LK));sc.add(new THREE.AmbientLight('#ffffff',1.2*LK));const d=new THREE.DirectionalLight('#fff3dc',3.4*LK);d.position.set(top?0:-2,6,top?0:3);sc.add(d);sc.add(obj);
 renderer.setRenderTarget(rt);renderer.setClearColor('#4a6a34',0);renderer.clear();renderer.render(sc,cam);const buf=new Uint8Array(w*h*4);renderer.readRenderTargetPixels(rt,0,0,w,h,buf);renderer.setRenderTarget(null);rt.dispose();
 const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d'),id=x.createImageData(w,h);for(let y=0;y<h;y++)id.data.set(buf.subarray((h-1-y)*w*4,(h-y)*w*4),y*w*4);x.putImageData(id,0,0);let cover=0;for(let i=3;i<buf.length;i+=4)if(buf[i]>100)cover++;
 return {canvas:c,w,h,cover:+(cover/(w*h)).toFixed(3)};};
// Fotografa un albero (o una sua parte, già centrata sul tronco e appoggiata a terra) e salva le tre sagome + una scheda con le misure.
tools.bakeTree=async(obj,name,{px=1024,topPx=512}={})=>{obj.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(obj),halfW=+(Math.max(-box.min.x,box.max.x,-box.min.z,box.max.z)*1.03).toFixed(3),H=+(box.max.y*1.02).toFixed(3),out={nome:name,larghezza:+(halfW*2).toFixed(3),altezza:H,file:{}};
 for(const [k,p] of [['front',px],['side',px],['top',topPx]]){const r=await tools.bakeView(obj,k,halfW,H,p),blob=await new Promise(res=>r.canvas.toBlob(res,'image/png')),s=await tools.save('client/assets/world/napoli/vegetation/alberi-veri/sagome/'+name+'-'+k+'.png',blob);out.file[k]={w:r.w,h:r.h,bytes:s.bytes,copertura:r.cover};tools['last_'+k]=r.canvas;}
 await tools.save('client/assets/world/napoli/vegetation/alberi-veri/sagome/'+name+'.json',JSON.stringify(out));return out;};
tools.showCanvas=c=>{let el=document.getElementById('anteprima');if(!el){el=document.createElement('div');el.id='anteprima';el.style.cssText='position:fixed;inset:0;background:#7a8fa5;display:flex;gap:12px;align-items:flex-end;justify-content:center;z-index:5;padding:10px';document.body.append(el);}el.replaceChildren(...[].concat(c).map(q=>{q.style.height='96vh';q.style.objectFit='contain';q.style.maxWidth=(92/[].concat(c).length)+'vw';return q;}));};

// ================= VEICOLI (modelli GLB scaricati, vedi tools/modelli/sorgenti/veicoli-objaverse/ELENCO.md) =================
// Carica un veicolo e lo mette "in bolla": muso verso +Z, ruote a terra (y=0), centrato, lungo `len` metri.
// yaw = giri di 90° da dare a mano dopo averlo guardato (0…3); senza, il lato più lungo diventa l'asse Z.
tools.loadCar=async(url,{len=4.3,yaw=null,up=null}={})=>{const g=await tools.loadGLTF(url),inner=g.scene,holder=new THREE.Group();holder.add(inner);const junk=[];inner.traverse(o=>{if(o.isLight||o.isCamera)junk.push(o);});junk.forEach(o=>o.parent.remove(o));
 if(up==='z')inner.rotation.x=-Math.PI/2;inner.updateMatrixWorld(true);let box=new THREE.Box3().setFromObject(inner),s=box.getSize(new THREE.Vector3());
 holder.rotation.y=yaw==null?(s.x>s.z?Math.PI/2:0):yaw*Math.PI/2;holder.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(holder);s=box.getSize(new THREE.Vector3());
 const k=len/s.z,root=new THREE.Group();holder.scale.setScalar(k);holder.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(holder);const c=box.getCenter(new THREE.Vector3());holder.position.set(-c.x,-box.min.y,-c.z);root.add(holder);root.updateMatrixWorld(true);
 const b2=new THREE.Box3().setFromObject(root);root.userData.misure=b2.getSize(new THREE.Vector3()).toArray().map(v=>+v.toFixed(2));return root;};
// Texture ridotte (lato massimo `tex`), JPEG dove non serve la trasparenza.
tools.shrinkMaps=(root,tex=1024)=>{const seen=new Map(),info=[];root.traverse(o=>{if(!o.isMesh)return;for(const m of [].concat(o.material))for(const key of ['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap','alphaMap']){const t=m[key];if(!t||!t.image)continue;if(seen.has(t)){m[key]=seen.get(t);continue;}const W0=t.image.width,H0=t.image.height,kk=Math.min(1,tex/Math.max(W0,H0)),W=Math.max(4,Math.round(W0*kk)),H=Math.max(4,Math.round(H0*kk)),nt=new THREE.CanvasTexture(tools.texCanvas(t,W,H));
   nt.colorSpace=t.colorSpace;nt.flipY=t.flipY;nt.wrapS=t.wrapS;nt.wrapT=t.wrapT;nt.repeat.copy(t.repeat);nt.offset.copy(t.offset);nt.name=t.name||key;nt.userData.mimeType=key==='map'&&(m.transparent||m.alphaTest>0)?'image/png':'image/jpeg';seen.set(t,nt);m[key]=nt;info.push(key+' '+W0+'x'+H0+'->'+W+'x'+H);}});return info;};
tools.convertCar=async(folder,out,opt={})=>{const root=await tools.loadCar('/src/veicoli-objaverse/'+folder+'/model.glb',opt),info=tools.shrinkMaps(root,opt.tex||1024),st=tools.stats(root);root.userData={...root.userData,fonte:opt.fonte||folder,nome:out};
 const glb=await tools.exportGLB(root),r=await tools.save('client/assets/world/napoli/vehicles/auto-vere/gioco/'+out+'.glb',glb);tools.last=root;return {out,misure:root.userData.misure,tris:st.tris,meshes:st.meshes,mats:st.mats.length,bytes:r.bytes,info};};
