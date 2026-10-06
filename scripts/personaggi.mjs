// Ritaglia gli 8 personaggi dall'immagine di gruppo (sfondo grigio) e salva un ritratto per ciascuno,
// usato nella schermata "scegli il personaggio" di HUMANA life 3D.
// Uso: node scripts/personaggi.mjs <immagine-di-gruppo> [cartella-di-uscita]
// Il ritratto arriva fino alle ginocchia: le scarpe restano fuori (hanno segni che ricordano marchi veri).
import {createCanvas,loadImage} from '@napi-rs/canvas';import {mkdir,writeFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import {join} from 'node:path';
const src=process.argv[2];if(!src){console.error('Indica l\'immagine di gruppo');process.exit(1);}
const out=process.argv[3]||fileURLToPath(new URL('../client/assets/personaggi/',import.meta.url));await mkdir(out,{recursive:true});
const img=await loadImage(src),W=img.width,H=img.height,cv=createCanvas(W,H),g=cv.getContext('2d');g.drawImage(img,0,0);
const im=g.getImageData(0,0,W,H),d=im.data,bg=new Uint8Array(W*H);
// Lo sfondo è un grigio che sfuma piano: si parte dai bordi e ci si allarga finché il colore cambia poco da un pixel al vicino
// e resta "grigio" (poco colore, abbastanza chiaro). Dove c'è un bordo netto (vestito, capelli, pelle) ci si ferma.
const gray=i=>{const r=d[i],gr=d[i+1],b=d[i+2],mx=Math.max(r,gr,b),mn=Math.min(r,gr,b);return mx-mn<26&&mx>118&&b>=r-6;};
const near=(i,j,t)=>Math.abs(d[i]-d[j])+Math.abs(d[i+1]-d[j+1])+Math.abs(d[i+2]-d[j+2])<t;
const stack=[];const push=p=>{if(!bg[p]&&gray(p*4)){bg[p]=1;stack.push(p);}};
for(let x=0;x<W;x++){push(x);}for(let y=0;y<H;y++){push(y*W);push(y*W+W-1);}
while(stack.length){const p=stack.pop(),x=p%W,y=(p-x)/W;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;const q=ny*W+nx;if(!bg[q]&&gray(q*4)&&near(p*4,q*4,9)){bg[q]=1;stack.push(q);}}}
// Sfondo rimasto chiuso tra un braccio e il corpo o tra le gambe: stesso grigio della riga, in macchie abbastanza grandi.
{const row=[];for(let y=0;y<H;y++){let r=0,gr=0,b=0,n=0;for(let x=0;x<W;x++)if(bg[y*W+x]){const i=(y*W+x)*4;r+=d[i];gr+=d[i+1];b+=d[i+2];n++;}row.push(n>20?[r/n,gr/n,b/n]:null);}
 for(let y=0;y<H;y++)if(!row[y]){let k=1;while(y-k>=0&&!row[y-k]&&y+k<H&&!row[y+k])k++;row[y]=row[y-k]||row[y+k]||[205,208,215];}
 const cand=p=>{if(bg[p])return false;const i=p*4,y=(p/W)|0,c=row[y];return gray(i)&&Math.abs(d[i]-c[0])+Math.abs(d[i+1]-c[1])+Math.abs(d[i+2]-c[2])<30;},seen=new Uint8Array(W*H);
 for(let p0=0;p0<W*H;p0++){if(seen[p0]||!cand(p0))continue;const comp=[p0],st=[p0];seen[p0]=1;while(st.length){const p=st.pop(),x=p%W,y=(p-x)/W;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;const q=ny*W+nx;if(!seen[q]&&cand(q)){seen[q]=1;comp.push(q);st.push(q);}}}
  if(comp.length>=70)for(const p of comp)bg[p]=1;}}
// Trasparenza: sfondo via, con il bordo ammorbidito di un pixel.
for(let p=0;p<W*H;p++){if(bg[p]){d[p*4+3]=0;continue;}const x=p%W,y=(p-x)/W;let n=0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<W&&ny<H&&bg[ny*W+nx])n++;}if(n)d[p*4+3]=n>=2?120:200;}
g.putImageData(im,0,0);
// Taglio in 8: tra un personaggio e l'altro si cerca la colonna più "vuota" vicino al confine previsto.
const cutY=Math.round(H*.665),col=new Uint32Array(W);for(let x=0;x<W;x++)for(let y=0;y<cutY;y++)if(!bg[y*W+x])col[x]++;
const guess=[248,436,672,852,1098,1322,1548].map(v=>Math.round(v*W/1774)),cuts=[0];
for(const c of guess){let best=c,bv=1e9;for(let x=c-34;x<=c+34;x++){if(x<1||x>=W)continue;const v=col[x]+Math.abs(x-c)*.4;if(v<bv){bv=v;best=x;}}cuts.push(best);}cuts.push(W);
const PH=420;let sheet=createCanvas(8*230,PH+20),sg=sheet.getContext('2d');sg.fillStyle='#22303c';sg.fillRect(0,0,sheet.width,sheet.height);
for(let k=0;k<8;k++){const x0=cuts[k],x1=cuts[k+1];
 // Dentro la fetta resta solo il personaggio: via i pezzi dei vicini (macchie che toccano il bordo della fetta) e i puntini isolati.
 {const lab=new Int32Array(W*H),comps=[];for(let y=0;y<cutY;y++)for(let x=x0;x<x1;x++){const p0=y*W+x;if(bg[p0]||lab[p0])continue;const id=comps.length+1,c={n:0,edge:false,px:[]};comps.push(c);const st=[p0];lab[p0]=id;while(st.length){const p=st.pop(),px=p%W,py=(p-px)/W;c.n++;c.px.push(p);if(px===x0&&x0>0||px===x1-1&&x1<W)c.edge=true;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=px+dx,ny=py+dy;if(nx<x0||ny<0||nx>=x1||ny>=cutY)continue;const q=ny*W+nx;if(!bg[q]&&!lab[q]){lab[q]=id;st.push(q);}}}}
  const big=comps.reduce((m,c)=>c.n>m.n?c:m,{n:0});for(const c of comps)if(c!==big&&(c.edge||c.n<40))for(const p of c.px){bg[p]=1;d[p*4+3]=0;}g.putImageData(im,0,0);}
 let a=W,b=0,top=H;for(let x=x0;x<x1;x++)for(let y=0;y<cutY;y++)if(!bg[y*W+x]){a=Math.min(a,x);b=Math.max(b,x);top=Math.min(top,y);}
 const w=b-a+1,h=cutY-top,s=PH/h,pc=createCanvas(Math.round(w*s),PH),pg=pc.getContext('2d');pg.imageSmoothingQuality='high';pg.drawImage(cv,a,top,w,h,0,0,pc.width,PH);
 // Sfuma il bordo in basso (le gambe "svaniscono" invece di essere tagliate di netto).
 const pd=pg.getImageData(0,0,pc.width,PH);for(let y=PH-46;y<PH;y++){const f=(PH-y)/46;for(let x=0;x<pc.width;x++)pd.data[(y*pc.width+x)*4+3]*=f;}pg.putImageData(pd,0,0);
 await writeFile(join(out,(k+1)+'.webp'),pc.toBuffer('image/webp',90));sg.drawImage(pc,k*230+(230-pc.width)/2,10);console.log('personaggio',k+1,'x',a,'-',b,'->',pc.width+'x'+PH);}
await writeFile(join(out,'_anteprima.png'),sheet.toBuffer('image/png'));console.log('fatto in',out);
