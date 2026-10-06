import {makePath,laneLoop} from './lanes.js';
import {MODE,surfaceFront} from './front.js';
// Quartiere originale ispirato a Napoli: coordinate logiche, non geografia rilevata.
// La piazza sul mare (prime 36 unità) è allargata; il resto della città è solo traslato.
export const PLAZA_EDGE=36,PLAZA_GROW=14,OLD_CITY=80+PLAZA_GROW,CITY_SIZE=150;
// Mondo costruibile dagli admin: la città originale occupa 150×150 m, intorno c'è terreno libero fino a 1000×1000 m.
export const WORLD_SIZE=1000;
export const stretch=v=>v<=PLAZA_EDGE?v*(PLAZA_EDGE+PLAZA_GROW)/PLAZA_EDGE:v+PLAZA_GROW;
export const stretchPoint=p=>({...p,x:stretch(p.x),y:stretch(p.y)});
export const stretchRect=r=>{const x=stretch(r.x),y=stretch(r.y);return {...r,x,y,w:stretch(r.x+r.w)-x,h:stretch(r.y+r.h)-y};};
export const STREETS=[
 {name:'Passeggiata delle Arti',x:0,y:34,w:80,h:6},
 {name:'Viale dei Limoni',x:40,y:0,w:6,h:80},
 {name:'Vicolo Azzurro',x:0,y:49,w:80,h:3},
 {name:'Vicolo delle Terrazze',x:55,y:0,w:3,h:80},
 {name:'Via del Porto',x:64,y:0,w:4,h:80},
 {name:'Corso delle Piazze',x:0,y:65,w:80,h:5}
].map(stretchRect).map(s=>s.w>s.h?{...s,w:CITY_SIZE-s.x}:{...s,h:CITY_SIZE-s.y});
// Espansione: quartiere est (villa comunale, banca, fast food, centro commerciale) e sud (ville, parco giochi, ristoranti).
STREETS.push({name:'Corso Est',x:96,y:0,w:5,h:CITY_SIZE},{name:'Via del Commercio',x:130,y:0,w:4,h:CITY_SIZE},{name:'Viale delle Ville',x:0,y:114,w:CITY_SIZE,h:5});
export const VILLA_PARK={x:102,y:2,w:27,h:44},TRACK_OUT={x:104,y:4,w:23,h:40},TRACK_IN={x:107,y:7,w:17,h:34};
export const VILLA_LOTS=[];for(const y of [121,136])for(const x of [3,17,31,42.5,84,103,117,136])VILLA_LOTS.push({x,y,w:11,h:11});
// Recinzione di ogni lotto: continua sui quattro lati, con cancello pedonale (davanti alla porta) e passo carraio.
export const FENCE_GATES=l=>[[l.x+2.8,l.x+5.2],[l.x+8,l.x+10.6]];
export function fenceBlocked(x,y,r=0){const d=.18+r;for(const l of VILLA_LOTS){if(x<l.x-d||x>l.x+l.w+d||y<l.y-d||y>l.y+l.h+d)continue;
 if(Math.abs(y-l.y)<d||Math.abs(x-l.x)<d||Math.abs(x-l.x-l.w)<d)return true;
 if(Math.abs(y-l.y-l.h)<d&&!FENCE_GATES(l).some(([a,b])=>x>a+r&&x<b-r))return true;}return false;}
export const POOLS=VILLA_LOTS.filter((_,i)=>i%2===0).map(l=>({x:l.x+7.6,y:l.y+.8,w:2.6,h:3.2}));
export const GROUND=[
 {material:'grass',x:VILLA_PARK.x,y:VILLA_PARK.y,w:VILLA_PARK.w,h:VILLA_PARK.h},
 {material:'grass',x:136,y:4,w:13,h:40},
 {material:'playground',x:8,y:94,w:22,h:17},{material:'playground',x:138,y:10,w:9,h:12},
 {material:'parking',x:135,y:86,w:15,h:26},{material:'parking',x:135,y:55,w:14,h:7},
 ...VILLA_LOTS.map(l=>({material:'grass',...l}))
];
// Autobus: anello su Passeggiata, Via del Commercio, Viale delle Ville e Viale dei Limoni.
export const BUS_ROUTE=[{x:57,y:50.6},{x:132,y:50.6},{x:132,y:116.5},{x:57,y:116.5}];
export const BUS_STOPS=[
 {id:'passeggiata',name:'Passeggiata',x:66,y:46.4,at:{x:66,y:50.6}},
 {id:'villa',name:'Villa Comunale',x:116,y:46.4,at:{x:116,y:50.6}},
 {id:'mall',name:'Centro Commerciale',x:129.4,y:100,at:{x:132,y:100}},
 {id:'ville',name:'Le Ville',x:110,y:119.8,at:{x:110,y:116.5}},
 {id:'parco',name:'Parco Giochi',x:62,y:119.8,at:{x:62,y:116.5}},
 {id:'arti',name:'Piazza delle Arti',x:53.4,y:74,at:{x:57,y:74}}
];
const BUS_SPEED=7,BUS_DWELL=4;
// L'autobus segue la sua corsia (a destra del centro strada) con curve arrotondate: posizione sul percorso e rotazione
// dalla tangente; rallenta prima delle curve e riparte dolcemente.
const BUS_PATH=makePath(laneLoop(BUS_ROUTE[0].x,BUS_ROUTE[0].y,BUS_ROUTE[2].x,BUS_ROUTE[2].y,1.1),{radius:6});
const busSpeed=BUS_PATH.speedProfile(BUS_SPEED,{brake:9,slow:.55});
const timeline=(()=>{const P=BUS_PATH.points,stops=BUS_STOPS.map(st=>({id:st.id,s:BUS_PATH.nearest(st.at.x,st.at.y)})).sort((p,q)=>p.s-q.s),T=new Float64Array(P.length);let t=0,k=0;
 for(let i=0;i<P.length;i++){T[i]=t;while(k<stops.length&&stops[k].s<=P[i].s){stops[k].t=t;t+=BUS_DWELL;k++;}const next=i+1<P.length?P[i+1].s:BUS_PATH.length;t+=(next-P[i].s)/busSpeed(P[i].s);}
 return {T,stops,cycle:t};})();
// Distanza lungo l'anello (metri) e punto corrispondente: usati per il viaggio del giocatore.
export const ROUTE_LENGTH=BUS_PATH.length;
export function routeDistance(p){return BUS_PATH.nearest(p.x,p.y);}
export function routePoint(s){const q=BUS_PATH.pointAt(s);return {x:q.x,y:q.y,direction:q.direction};}
export function busPosition(seconds){const {T,stops,cycle}=timeline,t=((seconds%cycle)+cycle)%cycle;
 for(const st of stops)if(t>=st.t&&t<st.t+BUS_DWELL){const q=BUS_PATH.pointAt(st.s);return {x:q.x,y:q.y,direction:q.direction,stop:st.id};}
 let lo=0,hi=T.length-1;while(lo<hi){const m=(lo+hi+1)>>1;if(T[m]<=t)lo=m;else hi=m-1;}
 const P=BUS_PATH.points,i=lo,next=i+1<P.length?T[i+1]:cycle,s0=P[i].s,s1=i+1<P.length?P[i+1].s:BUS_PATH.length;
 // Dentro l'intervallo togli l'eventuale sosta già contata, poi interpola.
 let dwell=0;for(const st of stops)if(st.t>=T[i]&&st.t<next)dwell+=BUS_DWELL;
 const span=next-T[i]-dwell,f=span>0?Math.min(1,Math.max(0,(t-T[i]-(stops.some(st=>st.t>=T[i]&&st.t+BUS_DWELL<=t)?dwell:0))/span)):0;
 const q=BUS_PATH.pointAt(s0+(s1-s0)*f);return {x:q.x,y:q.y,direction:q.direction,stop:null};}
export const LANDMARKS=[{name:'Lungomare',x:12,y:15},{name:'Piazza delle Arti',x:33.5,y:44},{name:'Giardino dei Limoni',x:50,y:59},{name:'Vicolo Azzurro',x:20,y:50},{name:'Belvedere',x:60,y:22},{name:'Quartiere commerciale',x:35,y:29},{name:'Vicoli napoletani',x:20,y:50},{name:'Porto · Belvedere',x:72,y:20},{name:'Piazza principale',x:72,y:58},{name:'Zona residenziale',x:27,y:74}].map(stretchPoint);
// Palazzi decorativi: posizione dal centro, ingombro reale calcolato dalla base dello sprite in world.js.
export const RESIDENCES=[];
for(const [i,x,y,w,h] of [[0,4,41,6,5],[1,15,41,6,5],[2,24,41,5,5],[3,35,41,4,5],[4,47,27,5,5],[5,47,40,5,6],[6,47,13,5,5],[7,59,28,4,5],[8,5,55,6,5],[9,17,55,6,5],[10,29,55,6,5],[11,59,42,4,5]])RESIDENCES.push({id:`residence${i}`,name:'Palazzo mediterraneo',cx:stretch(x+w/2),cy:stretch(y+h/2),w,h,sprite:i%4,atlas:'residences',enterable:false,artWidth:300+w*15,artHeight:390+(i%3)*40});
for(const [i,x,y] of [[12,70,4],[13,70,27],[14,71,42],[15,4,72],[16,17,72],[17,33,72],[18,48,72],[19,59,72],[20,71,72]])RESIDENCES.push({id:`residence${i}`,name:'Palazzo mediterraneo',cx:stretch(x+2.5),cy:stretch(y+2.5),w:5,h:5,sprite:i%4,atlas:'residences',enterable:false,artWidth:390,artHeight:430+(i%3)*25});
LANDMARKS.push({name:'Villa Comunale',x:115.5,y:29.5},{name:'Centro Commerciale',x:115,y:112.4},{name:'Parco Giochi',x:19,y:112},{name:'Le Ville',x:60,y:133},{name:'Banca del Golfo',x:108,y:63.4});
const GARDEN=stretchRect({x:47,y:55,w:8,h:8});
const inRect=(r,x,y)=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h;
export const inPool=(x,y,pad=0)=>POOLS.some(p=>x>p.x-pad&&x<p.x+p.w+pad&&y>p.y-pad&&y<p.y+p.h+pad);
// Terreno dipinto dall'editor admin: "x,y" → materiale (ha la precedenza su tutto).
export const PAINT=new Map();
export function surface(x,y){
 const painted=PAINT.get(x+','+y);if(painted)return painted;
 if(MODE.front)return surfaceFront(x,y);
 if(x>=CITY_SIZE+4||y>=CITY_SIZE+4)return 'grass';
 if(STREETS.some(s=>x>=s.x&&x<s.x+s.w&&y>=s.y&&y<s.y+s.h))return 'road';
 if(STREETS.some(s=>x>=s.x-1&&x<s.x+s.w+1&&y>=s.y-1&&y<s.y+s.h+1))return 'sidewalk';
 if(inPool(x+.5,y+.5))return 'pool';
 if(inRect(TRACK_OUT,x+.5,y+.5)&&!inRect(TRACK_IN,x+.5,y+.5))return 'track';
 for(const g of GROUND)if(inRect(g,x+.5,y+.5))return g.material;
 if(x>=GARDEN.x&&x<GARDEN.x+GARDEN.w&&y>=GARDEN.y&&y<GARDEN.y+GARDEN.h)return 'garden';
 return 'stone';
}
