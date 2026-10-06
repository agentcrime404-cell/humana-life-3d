// Sprite dei mezzi: ogni immagine ha due viste (metà sinistra = verso il basso a sinistra, metà destra = verso l'alto a destra).
// Uso: node scripts/import-veicoli.mjs <cartella con v-<id>.jpg>  →  client/assets/veicoli/<id>-front.png, <id>-back.png
import {createCanvas,loadImage} from '@napi-rs/canvas';import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';import {join} from 'node:path';
const src=process.argv[2],out=new URL('../client/assets/veicoli/',import.meta.url);await mkdir(out,{recursive:true});
const cut=(img,x0,w)=>{const H=img.height,cv=createCanvas(w,H),g=cv.getContext('2d');g.drawImage(img,x0,0,w,H,0,0,w,H);const d=g.getImageData(0,0,w,H),px=d.data;
 const bg=k=>{const r=px[k*4],gg=px[k*4+1],b=px[k*4+2],mx=Math.max(r,gg,b),mn=Math.min(r,gg,b);return mx>228&&mx-mn<22;};const seen=new Uint8Array(w*H),st=[];
 for(let x=0;x<w;x++)st.push(x,(H-1)*w+x);for(let y=0;y<H;y++)st.push(y*w,y*w+w-1);
 while(st.length){const k=st.pop();if(seen[k])continue;seen[k]=1;if(!bg(k))continue;px[k*4+3]=0;const x=k%w,y=(k-x)/w;if(x>0)st.push(k-1);if(x<w-1)st.push(k+1);if(y>0)st.push(k-w);if(y<H-1)st.push(k+w);}
 // Solo il soggetto più grande: elimina schegge dell'altra vista.
 {const lab=new Int32Array(w*H).fill(-1),sizes=[];for(let k=0;k<w*H;k++){if(px[k*4+3]<100||lab[k]>=0)continue;const id=sizes.length;let n=0;const q=[k];lab[k]=id;while(q.length){const j=q.pop();n++;const x=j%w;for(const t of [x>0?j-1:-1,x<w-1?j+1:-1,j-w,j+w])if(t>=0&&t<w*H&&lab[t]<0&&px[t*4+3]>=100){lab[t]=id;q.push(t);}}sizes.push(n);}const big=sizes.indexOf(Math.max(...sizes));for(let k=0;k<w*H;k++)if(lab[k]!==big&&lab[k]>=0&&sizes[lab[k]]<sizes[big]*.05)px[k*4+3]=0;}
 g.putImageData(d,0,0);let a=w,b=0,c=H,e=0;for(let y=0;y<H;y++)for(let x=0;x<w;x++)if(px[(y*w+x)*4+3]>100){if(x<a)a=x;if(x>b)b=x;if(y<c)c=y;if(y>e)e=y;}
 const tw=b-a+1,th=e-c+1,t=createCanvas(tw,th);t.getContext('2d').drawImage(cv,a,c,tw,th,0,0,tw,th);return t;};
for(const f of (await readdir(src)).filter(f=>/^v-.*\.(jpg|png)$/.test(f))){const id=f.slice(2).replace(/\.(jpg|png)$/,''),img=await loadImage(await readFile(join(src,f))),h=img.width>>1;
 for(const [k,x] of [['front',0],['back',h]]){const t=cut(img,x,h);await writeFile(new URL(id+'-'+k+'.png',out),t.toBuffer('image/png'));console.log(id,k,t.width+'x'+t.height);}}
