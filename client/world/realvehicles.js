// Modelli 3D veri dei mezzi (Vespa, maxi-scooter, maxi-enduro, cinquecento, panda): se il file esiste nella cartella viene usato al posto del modello disegnato a mano.
//   client/assets/world/napoli/vehicles/moto-vere/{vespa,xadv,africa}.glb      client/assets/world/napoli/vehicles/auto-vere/{fiat500,panda}.glb
// Ogni modello viene messo in scala (lunghezza vera in metri), con la lunghezza lungo z, il muso verso +z e le ruote a terra.
// Opzionale: config.json nella stessa cartella, es. {"vespa":{"yaw":3.1416,"len":1.8}} per girare/ridimensionare un modello.
import * as THREE from '../vendor/three/three.module.min.js';
import {GLTFLoader} from '../vendor/three/GLTFLoader.js';
const LIST=[['vespa','moto-vere',1.8],['xadv','moto-vere',2.2],['africa','moto-vere',2.3],['fiat500','auto-vere',3.57],['panda','auto-vere',3.67]];
const BASE='/assets/world/napoli/vehicles/';
export async function loadRealVehicles(w){w.realV??={};const loader=new GLTFLoader(),cfg={};
 for(const d of ['moto-vere','auto-vere']){try{const r=await fetch(BASE+d+'/config.json',{cache:'no-cache'});if(r.ok)Object.assign(cfg,await r.json());}catch{}}
 await Promise.all(LIST.map(async([id,dir,len0])=>{try{const url=BASE+dir+'/'+id+'.glb',h=await fetch(url,{method:'HEAD',cache:'no-cache'});if(!h.ok)return;
  const g=await new Promise((ok,no)=>loader.load(url+'?v='+(window.__build||''),ok,undefined,no)),root=g.scene,C=cfg[id]||{};root.rotation.y=C.yaw||0;root.updateMatrixWorld(true);
  let b=new THREE.Box3().setFromObject(root),s=b.getSize(new THREE.Vector3());if(s.x>s.z*1.2){root.rotation.y+=Math.PI/2;root.updateMatrixWorld(true);b=new THREE.Box3().setFromObject(root);s=b.getSize(new THREE.Vector3());}
  const k=(C.len||len0)/Math.max(s.z,.01),box=new THREE.Group();root.scale.multiplyScalar(k);root.updateMatrixWorld(true);b=new THREE.Box3().setFromObject(root);const c=b.getCenter(new THREE.Vector3());root.position.set(-c.x,-b.min.y,-c.z);box.add(root);
  let tris=0;root.traverse(o=>{if(o.isMesh){o.castShadow=!w.mobile;o.receiveShadow=true;tris+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;}});
  if(tris>40000)console.warn('[modelli veri]',id,'ha',Math.round(tris),'triangoli: troppo pesante per il telefono, meglio ridurlo sotto 30000');
  box.userData.real=true;w.realV[id]=box;console.info('[modelli veri]',id,'caricato',Math.round(tris),'triangoli');}catch(e){console.warn('[modelli veri]',id,e?.message||e);}}));}
export const realCopy=(w,id)=>{const t=w.realV?.[id];return t?t.clone(true):null;};
