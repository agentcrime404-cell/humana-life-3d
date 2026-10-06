// Ritaglia campate vere di palazzi napoletani da foto di pubblico dominio (Carlo Raso, Wikimedia Commons: vedi LICENZE.md)
// e ne crea quattro tinte ciascuna. Uso: node scripts/facciate.mjs <partenope 3840px> <caracciolo 1920px>
//  partenope-N.jpg  290x600: piano con persiane e balcone + piano con finestra ad arco e balaustra di pietra
//  caracciolo-N.jpg 290x1170: due piani con persiane e balcone di ferro (370+370) + piano terra a bugnato con finestra ad arco (430)
import {createCanvas,loadImage} from '@napi-rs/canvas';import fs from 'node:fs';
const out=new URL('../client/assets/world/napoli/buildings/facciate/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const hsl=(r,g,b)=>{r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn;let h=0,s=0;if(d){s=d/(1-Math.abs(2*l-1));h=mx===r?((g-b)/d+6)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h*=60;}return [h,s,l];};
const rgb=(h,s,l)=>{const C=(1-Math.abs(2*l-1))*s,x=C*(1-Math.abs(h/60%2-1)),m=l-C/2,[r,g,b]=h<60?[C,x,0]:h<120?[x,C,0]:h<180?[0,C,x]:h<240?[0,x,C]:h<300?[x,0,C]:[C,0,x];return [(r+m)*255,(g+m)*255,(b+m)*255];};
// tinta: [tonalità, saturazione ×, luce ×]; null = colore originale. Si ricolora solo l'intonaco (rosa/rosso), non pietra, persiane e vetri.
async function set(name,src,W,H,parts,tints){if(!src)return;const im=await loadImage(src),c=createCanvas(W,H),g=c.getContext('2d');
 tints.forEach((t,n)=>{for(const [sx,sy,sh,dy] of parts)g.drawImage(im,sx,sy,W,sh,0,dy,W,sh);if(t){const d=g.getImageData(0,0,W,H),p=d.data;for(let i=0;i<p.length;i+=4){const [h,s,l]=hsl(p[i],p[i+1],p[i+2]);if((h<32||h>345)&&s>.17&&l>.25&&l<.8){const k=Math.min(1,(s-.17)/.1),[r,gg,b]=rgb(t[0],Math.min(1,s*t[1]),Math.min(.92,l*t[2]));p[i]+=(r-p[i])*k;p[i+1]+=(gg-p[i+1])*k;p[i+2]+=(b-p[i+2])*k;}}g.putImageData(d,0,0);}
  fs.writeFileSync(new URL(`${name}-${n}.jpg`,out),c.toBuffer('image/jpeg',88));});}
await set('partenope',process.argv[2],290,600,[[1960,935,600,0]],[null,[43,1.25,1.12],[9,1.45,.82],[38,.45,1.22]]);
await set('caracciolo',process.argv[3],290,1170,[[1050,1068,740,0],[1050,1815,430,740]],[null,[40,.85,1.3],[14,.55,1.35],[42,.3,1.5]]);
console.log('fatto');
