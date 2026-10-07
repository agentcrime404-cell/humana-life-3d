import {readFileSync} from 'node:fs';
import {setNapoli,NAPOLI,napoliPlaces,napoliCell,napoliSpawn} from '../shared/napoli.js';
setNapoli(JSON.parse(readFileSync('client/assets/world/napoli/map/mergellina.json','utf8')));
const {w:W,h:H,x0,y0}=NAPOLI,P=napoliPlaces();
console.log('porte',P.doors.length,'oggetti',P.props.length,'reali',P.doors.filter(d=>d.real).length);
// raggiungibilità dallo spawn
const sp=napoliSpawn(),start=(Math.floor(sp.y)-y0)*W+Math.floor(sp.x)-x0;console.log('spawn',sp);
const comp=new Int32Array(W*H).fill(-1);const sizes=[];const cell=i=>napoliCell((i%W)+x0+.5,Math.floor(i/W)+y0+.5);
for(let i0=0;i0<W*H;i0++){if(comp[i0]>=0||!cell(i0))continue;const id=sizes.length;let n=0;const st=[i0];comp[i0]=id;while(st.length){const i=st.pop();n++;const x=i%W,y=(i-x)/W;for(const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){if(nx<0||ny<0||nx>=W||ny>=H)continue;const j=ny*W+nx;if(comp[j]<0&&cell(j)){comp[j]=id;st.push(j);}}}sizes.push(n);}
const main=comp[start];console.log('regioni calpestabili',sizes.length,'principale',sizes[main],'celle; altre >2000:',sizes.map((s,i)=>[i,s]).filter(([i,s])=>i!==main&&s>2000).map(([i,s])=>s).join(','));
const unreachable=P.doors.filter(d=>comp[(Math.floor(d.y)-y0)*W+Math.floor(d.x)-x0]!==main);console.log('porte non raggiungibili',unreachable.length,unreachable.slice(0,5).map(d=>d.name+'@'+Math.round(d.x)+','+Math.round(d.y)).join(' | '));
// vicinanza fra porte
const pairs=[];for(let i=0;i<P.doors.length;i++)for(let j=i+1;j<P.doors.length;j++){const d=Math.hypot(P.doors[i].x-P.doors[j].x,P.doors[i].y-P.doors[j].y);if(d<12)pairs.push([d,P.doors[i],P.doors[j]]);}
console.log('coppie di porte a meno di 12 m:',pairs.length);const near3=P.doors.filter(a=>P.doors.filter(b=>Math.hypot(a.x-b.x,a.y-b.y)<25).length>=6);console.log('porte in zone con 6+ locali entro 25 m:',near3.length);
// distribuzione: celle di 250 m con numero di porte
const g=new Map();for(const d of P.doors){const k=Math.floor((d.x-x0)/250)+','+Math.floor((d.y-y0)/250);g.set(k,(g.get(k)||0)+1);}
const rows=[];for(let r=0;r<Math.ceil(H/250);r++){let s='';for(let c=0;c<Math.ceil(W/250);c++)s+=String(g.get(c+','+r)||0).padStart(3);rows.push(s);}console.log('porte per cella 250 m (righe = nord→sud):\n'+rows.join('\n'));
const walk=new Map();for(let i=0;i<W*H;i+=7){if(comp[i]===main){const x=i%W,y=(i-x)/W,k=Math.floor(x/250)+','+Math.floor(y/250);walk.set(k,(walk.get(k)||0)+7);}}
const rows2=[];for(let r=0;r<Math.ceil(H/250);r++){let s='';for(let c=0;c<Math.ceil(W/250);c++)s+=String(Math.round((walk.get(c+','+r)||0)/625)).padStart(3);rows2.push(s);}console.log('celle calpestabili (% di 250 m):\n'+rows2.join('\n'));
const kinds={};for(const d of P.doors)kinds[d.to]=(kinds[d.to]||0)+1;console.log(JSON.stringify(kinds));
console.log('edifici con nome ville/villa:',NAPOLI.data.buildings.filter(b=>/villa/i.test((b.kind||'')+(b.name||''))).length,'kind:',JSON.stringify(Object.entries(NAPOLI.data.buildings.reduce((a,b)=>{a[b.kind||'-']=(a[b.kind||'-']||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1]).slice(0,10)));
// isole non collegate più grandi di 300 celle
const bb=new Map();for(let i=0;i<W*H;i++){const c=comp[i];if(c<0||c===main||sizes[c]<300)continue;const x=i%W+x0,y=Math.floor(i/W)+y0;let b=bb.get(c);if(!b){b={n:sizes[c],x0:1e9,x1:-1e9,y0:1e9,y1:-1e9};bb.set(c,b);}b.x0=Math.min(b.x0,x);b.x1=Math.max(b.x1,x);b.y0=Math.min(b.y0,y);b.y1=Math.max(b.y1,y);}
console.log('isole >300 celle:',[...bb.values()].map(b=>b.n+' celle x '+b.x0+'…'+b.x1+' y '+b.y0+'…'+b.y1).join(' | '));
const lm=NAPOLI.data.landmarks.filter(l=>!l.missing).map(l=>{const c=comp[(Math.floor(l.y)-y0)*W+Math.floor(l.x)-x0];return l.name+':'+(c===main?'ok':c<0?'NON calpestabile':'ISOLATO');});console.log(lm.join(' | '));
