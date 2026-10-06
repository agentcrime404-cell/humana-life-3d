// Importa le immagini degli edifici: sfondo bianco → trasparente, ritaglio, misura degli angoli della base.
// Uso: node scripts/import-edifici.mjs <cartella-sorgente> <mappa.json: { "file.png": "nome" }> [--pulite = solo edificio, senza terreno]
import {createCanvas,loadImage} from '@napi-rs/canvas';import {readdir,readFile,writeFile,stat} from 'node:fs/promises';import {join} from 'node:path';
const [src,mapFile]=process.argv.slice(2);const map=JSON.parse((await readFile(mapFile,'utf8')).replace(/^﻿/,''));const names=Object.values(map);const out=new URL('../client/assets/edifici/',import.meta.url);
const files=Object.keys(map).map(f=>({f}));
const bases=JSON.parse(await readFile(new URL('basi.json',out),'utf8').catch(()=>'{}'));
for(const [i,name] of names.entries()){const {f}=files[i];const img=await loadImage(await readFile(join(src,f)));const W=img.width,H=img.height;
 const cv=createCanvas(W,H),g=cv.getContext('2d');g.drawImage(img,0,0);const d=g.getImageData(0,0,W,H),px=d.data;
 // Sfondo: riempimento dai bordi dei pixel quasi bianchi e poco saturi.
 const bg=p=>{const r=px[p],gg=px[p+1],b=px[p+2],mx=Math.max(r,gg,b),mn=Math.min(r,gg,b);return mx>232&&mx-mn<20;};const seen=new Uint8Array(W*H),stack=[];
 for(let x=0;x<W;x++)stack.push(x,(H-1)*W+x);for(let y=0;y<H;y++)stack.push(y*W,y*W+W-1);
 while(stack.length){const k=stack.pop();if(seen[k])continue;seen[k]=1;if(!bg(k*4))continue;px[k*4+3]=0;const x=k%W,y=(k-x)/W;if(x>0)stack.push(k-1);if(x<W-1)stack.push(k+1);if(y>0)stack.push(k-W);if(y<H-1)stack.push(k+W);}
 // Bordo morbido: pixel chiari confinanti con lo sfondo diventano semitrasparenti.
 for(let k=0;k<W*H;k++){if(px[k*4+3]===0)continue;const x=k%W;if(((x>0&&px[(k-1)*4+3]===0)||(x<W-1&&px[(k+1)*4+3]===0)||px[(k-W)*4+3]===0||px[(k+W)*4+3]===0)&&Math.min(px[k*4],px[k*4+1],px[k*4+2])>200)px[k*4+3]=110;}
 g.putImageData(d,0,0);
 // Ritaglio e profilo inferiore.
 let minX=W,maxX=0,minY=H,maxY=0;const bottom=new Int32Array(W).fill(-1);for(let x=0;x<W;x++)for(let y=H-1;y>=0;y--)if(px[(y*W+x)*4+3]>128){bottom[x]=y;if(x<minX)minX=x;if(x>maxX)maxX=x;if(y>maxY)maxY=y;break;}
 for(let y=0;y<H&&minY===H;y++)for(let x=0;x<W;x++)if(px[(y*W+x)*4+3]>128){minY=y;break;}
 const avg=(a,b)=>{let s=0,n=0;for(let x=a;x<=b;x++)if(bottom[x]>=0){s+=bottom[x];n++;}return s/n;};
 let fx=0,fy=-1;for(let x=minX+Math.round((maxX-minX)*.2);x<=maxX-Math.round((maxX-minX)*.2);x++)if(bottom[x]>fy){fy=bottom[x];fx=x;}
 const L=[minX+3,avg(minX+2,minX+10)],R=[maxX-3,avg(maxX-10,maxX-2)],F=[fx,fy];
 const tw=maxX-minX+1,th=maxY-minY+1,tc=createCanvas(tw,th);tc.getContext('2d').drawImage(cv,minX,minY,tw,th,0,0,tw,th);
 await writeFile(new URL(name+'.png',out),tc.toBuffer('image/png'));
 bases[name]={clean:process.argv[4]==='--pulite'||undefined,w:tw,h:th,L:[L[0]-minX,L[1]-minY],F:[F[0]-minX,F[1]-minY],R:[R[0]-minX,R[1]-minY]};console.log(name,'←',f,JSON.stringify(bases[name]));}
await writeFile(new URL('basi.json',out),JSON.stringify(bases,null,1));
