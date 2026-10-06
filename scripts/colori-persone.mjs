// Attrezzo di lavoro: calcola il colore medio di pelle (viso) e capelli di ognuna delle 12 persone realistiche e lo salva in
// client/assets/world/napoli/characters/persone-vere/_colori.json. Serve a «Crea avatar dalla foto»: sceglie la persona più vicina
// ai colori della foto e capisce di quanto schiarire/scurire pelle e capelli. Uso: node scripts/colori-persone.mjs
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createCanvas,loadImage} from '@napi-rs/canvas';
const D='client/assets/world/napoli/characters/persone-vere/',out={};
for(const f of (await readdir(D)).filter(n=>/^(Male|Female)_Adult_\d+\.glb$/.test(n))){
 const b=await readFile(D+f),n=b.readUInt32LE(12),j=JSON.parse(b.slice(20,20+n).toString()),bin=b.slice(20+n+8);
 const img=async mat=>{const m=j.materials.find(q=>mat.test(q.name||''));const ti=m?.pbrMetallicRoughness?.baseColorTexture?.index;if(ti==null)return null;const bv=j.bufferViews[j.images[j.textures[ti].source].bufferView];return loadImage(bin.slice(bv.byteOffset||0,(bv.byteOffset||0)+bv.byteLength));};
 const mean=(im,box,alphaOnly)=>{const c=createCanvas(im.width,im.height),x=c.getContext('2d');x.drawImage(im,0,0);const [x0,y0,x1,y1]=box.map((v,i)=>Math.floor(v*(i%2?im.height:im.width))),d=x.getImageData(x0,y0,x1-x0,y1-y0).data;let r=0,g=0,bl=0,k=0;for(let i=0;i<d.length;i+=4){if(alphaOnly&&d[i+3]<200)continue;const L=(d[i]+d[i+1]+d[i+2])/3;if(L<25||L>240)continue;r+=d[i];g+=d[i+1];bl+=d[i+2];k++;}return k?[r/k,g/k,bl/k].map(Math.round):null;};
 const head=await img(/head/i),hair=await img(/opacity|hair/i);
 out[f.replace('.glb','')]={skin:head?mean(head,[.3,.3,.7,.7]):null,hair:hair?mean(hair,[0,0,1,1],true):null};
}
await writeFile(D+'_colori.json',JSON.stringify(out,null,1));console.log(JSON.stringify(out));
