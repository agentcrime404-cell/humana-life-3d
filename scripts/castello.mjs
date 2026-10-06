// Ritaglia le mura vere di Castel dell'Ovo da una foto CC0 (Jebulon, Wikimedia Commons: vedi LICENZE.md).
// Uso: node scripts/castello.mjs <foto a 1920 px>   →  client/assets/world/napoli/buildings/castello/{alto,basso,molo,tufo}.jpg
import {createCanvas,loadImage} from '@napi-rs/canvas';import fs from 'node:fs';
const out=new URL('../client/assets/world/napoli/buildings/castello/',import.meta.url);fs.mkdirSync(out,{recursive:true});const im=await loadImage(process.argv[2]);
for(const [n,x,y,w,h] of [['alto',1131,219,377,439],['basso',885,675,430,365],['molo',1035,1063,480,95],['tufo',638,823,219,205]]){const c=createCanvas(w,h);c.getContext('2d').drawImage(im,x,y,w,h,0,0,w,h);fs.writeFileSync(new URL(n+'.jpg',out),c.toBuffer('image/jpeg',86));}
console.log('fatto');
