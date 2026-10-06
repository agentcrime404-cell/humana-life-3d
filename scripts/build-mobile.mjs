// Prepara i file web dell'app Android: client alla radice, moduli condivisi in /shared come sul server.
import {cp,rm,mkdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url),www=new URL('mobile/www/',root);
await rm(www,{recursive:true,force:true});await mkdir(www,{recursive:true});
// I file che servono solo a HUMANA life 3D restano fuori dall'app del 2D.
const solo3d=['/assets/world','/assets/personaggi','/vendor/three','/3d.html','/world/world3d.js','/world/avatar3d.js','/ui/bigmap.js'];
await cp(new URL('client/',root),www,{recursive:true,filter:src=>{const p=src.replace(/\\/g,'/');return !solo3d.some(x=>p.includes('/client'+x));}});
await cp(new URL('shared/',root),new URL('shared/',www),{recursive:true});
console.log('File web pronti in mobile/www');
