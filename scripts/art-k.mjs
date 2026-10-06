// Rigenera shared/art.js con le proporzioni delle basi misurate (basi.json).
import {readFile,writeFile} from 'node:fs/promises';
const b=JSON.parse(await readFile(new URL('../client/assets/edifici/basi.json',import.meta.url),'utf8'));const k={};for(const [n,v] of Object.entries(b))k[n]=+v.k.toFixed(3);
const f=new URL('../shared/art.js',import.meta.url),s=await readFile(f,'utf8');await writeFile(f,s.replace(/export const ART_K=\{[^}]*\};/,'export const ART_K='+JSON.stringify(k)+';'));
