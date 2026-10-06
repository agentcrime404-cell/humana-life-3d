// Misura la geometria reale delle immagini: angolo frontale e pendenza dei due lati della base (profilo inferiore).
import {createCanvas,loadImage} from '@napi-rs/canvas';import {readFile,writeFile} from 'node:fs/promises';
const dir=new URL('../client/assets/edifici/',import.meta.url),f=new URL('basi.json',dir),bases=JSON.parse(await readFile(f,'utf8'));
const med=a=>a.sort((x,y)=>x-y)[a.length>>1];
for(const [n,v] of Object.entries(bases)){const im=await loadImage(await readFile(new URL(n+'.png',dir)));const W=im.width,H=im.height,g=createCanvas(W,H).getContext('2d');g.drawImage(im,0,0);const px=g.getImageData(0,0,W,H).data;
 const bot=new Float64Array(W).fill(-1);for(let x=0;x<W;x++)for(let y=H-1;y>=0;y--)if(px[(y*W+x)*4+3]>128){bot[x]=y;break;}
 // Angolo frontale: punto più basso (media dei massimi).
 let fy=0;for(let x=0;x<W;x++)fy=Math.max(fy,bot[x]);const lows=[];for(let x=0;x<W;x++)if(bot[x]>=fy-2)lows.push(x);const fx=med(lows);
 const slope=(a,b,dir)=>{const s=[];for(let x=a;x<b;x+=4){const x2=x+40;if(bot[x]<0||bot[x2]<0)continue;s.push(dir*(bot[x2]-bot[x])/40);}return med(s.length?s:[.5]);};
 const sl=slope(Math.round(fx*.15),Math.round(fx*.85)-40,1),sr=slope(Math.round(fx+(W-fx)*.15),Math.round(fx+(W-fx)*.85)-40,-1);
 Object.assign(v,{F:[fx,fy],sl:Math.min(.9,Math.max(.3,sl)),sr:Math.min(.9,Math.max(.3,sr)),k:fx/W});console.log(n,fx,fy,sl.toFixed(3),sr.toFixed(3),(fx/W).toFixed(2));}
await writeFile(f,JSON.stringify(bases,null,1));
