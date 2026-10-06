import {canStand,MAPS} from '/shared/world.js';
// Clicca e vai: percorso A* su griglia di mezzo metro, poi semplificato in linee dritte libere.
const STEP=.5,R=.3;
// Ostacoli in più dati dal mondo 3D (solo dove serve): funzione (stanza,x,y) → vero se lì non si passa.
let extra=null;export const setExtraBlock=f=>{extra=f;grids.clear();};const stand=(room,x,y)=>canStand(room,x,y,R)&&!(extra&&extra(room,x,y));
function clear(room,a,b){const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/.2);for(let i=1;i<=n;i++){const t=i/n;if(!stand(room,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t))return false;}return true;}
function nearestFree(room,p){if(stand(room,p.x,p.y))return p;for(let r=.5;r<=3;r+=.5)for(let a=0;a<16;a++){const q={x:p.x+Math.cos(a/16*Math.PI*2)*r,y:p.y+Math.sin(a/16*Math.PI*2)*r};if(stand(room,q.x,q.y))return q;}return null;}
// Celle libere memorizzate per stanza: canStand viene calcolato una sola volta per cella.
const grids=new Map();
// Dopo una modifica alla mappa la griglia dei percorsi va ricalcolata.
export const resetPaths=()=>grids.clear();
// La griglia parte dall'angolo della mappa (anche negativo, es. Mergellina) e usa celle da 1 m sulle mappe grandi.
function grid(room){let g=grids.get(room);if(g)return g;const b=MAPS[room].bounds,S=b.w*b.h>200000?1:STEP,ox=Math.min(0,b.x),oy=Math.min(0,b.y),W=Math.ceil((b.x+b.w-ox)/S)+2,H=Math.ceil((b.y+b.h-oy)/S)+2;g={W,H,S,ox,oy,free:new Int8Array(W*H).fill(-1)};grids.set(room,g);return g;}
function freeCell(room,G,i,j){if(i<0||j<0||i>=G.W||j>=G.H)return false;const k=j*G.W+i;if(G.free[k]<0)G.free[k]=stand(room,G.ox+i*G.S,G.oy+j*G.S)?1:0;return G.free[k]===1;}
export function findPath(room,from,to,limit){
 const goal=nearestFree(room,to);if(!goal)return null;if(clear(room,from,goal))return [goal];
 const G=grid(room),W=G.W,N=W*G.H,S=G.S,gi=Math.round((goal.x-G.ox)/S),gj=Math.round((goal.y-G.oy)/S),si=Math.round((from.x-G.ox)/S),sj=Math.round((from.y-G.oy)/S);limit=limit||(S>STEP?400000:60000);
 const cost=new Float32Array(N).fill(Infinity),came=new Int32Array(N).fill(-1),closed=new Uint8Array(N);
 const heapF=[],heapK=[];const push=(f,k)=>{heapF.push(f);heapK.push(k);let i=heapF.length-1;while(i){const p=(i-1)>>1;if(heapF[p]<=heapF[i])break;[heapF[p],heapF[i]]=[heapF[i],heapF[p]];[heapK[p],heapK[i]]=[heapK[i],heapK[p]];i=p;}};
 const pop=()=>{const top=heapK[0],lf=heapF.pop(),lk=heapK.pop();if(heapF.length){heapF[0]=lf;heapK[0]=lk;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<heapF.length&&heapF[l]<heapF[m])m=l;if(r<heapF.length&&heapF[r]<heapF[m])m=r;if(m===i)break;[heapF[m],heapF[i]]=[heapF[i],heapF[m]];[heapK[m],heapK[i]]=[heapK[i],heapK[m]];i=m;}}return top;};
 const start=sj*W+si;cost[start]=0;push(0,start);let found=-1,n=0;
 while(heapF.length&&n++<limit){const k=pop();if(closed[k])continue;closed[k]=1;const i=k%W,j=(k-i)/W;if(Math.abs(i-gi)<=1&&Math.abs(j-gj)<=1){found=k;break;}
  for(let di=-1;di<=1;di++)for(let dj=-1;dj<=1;dj++){if(!di&&!dj)continue;const ni=i+di,nj=j+dj,nk=nj*W+ni;if(ni<0||nj<0||ni>=W||nj>=G.H||closed[nk]||!freeCell(room,G,ni,nj))continue;if(di&&dj&&(!freeCell(room,G,i+di,j)||!freeCell(room,G,i,j+dj)))continue;
   const c=cost[k]+(di&&dj?1.414:1);if(c<cost[nk]){cost[nk]=c;came[nk]=k;push(c+Math.hypot(ni-gi,nj-gj)*1.2,nk);}}}
 if(found<0)return null;const cells=[];for(let k=found;k>=0&&k!==start;k=came[k])cells.unshift({x:G.ox+(k%W)*S,y:G.oy+Math.floor(k/W)*S});cells.push(goal);
 // Tiene solo i punti necessari: da ogni punto salta al più lontano raggiungibile in linea retta.
 const path=[];let cur=from,idx=0;while(idx<cells.length){let far=idx;for(let t=cells.length-1;t>idx;t--)if(clear(room,cur,cells[t])){far=t;break;}path.push(cells[far]);cur=cells[far];idx=far+1;}return path;
}
export class PointerMove{
 constructor(){this.path=null;this.target=null;}
 go(me,to){const path=findPath(me.room,me,to);this.path=path;this.target=path?path[path.length-1]:null;this.room=me.room;this.stuck=0;return !!path;}
 cancel(){this.path=null;this.target=null;}
 // Direzione mondo verso il prossimo punto del percorso; null quando non c'è nulla da fare.
 input(me,dt){if(!this.path||!me||me.room!==this.room||me.seat){this.cancel();return null;}
  let next=this.path[0];while(next&&Math.hypot(next.x-me.x,next.y-me.y)<.25){this.path.shift();next=this.path[0];}
  if(!next){this.cancel();return null;}const dx=next.x-me.x,dy=next.y-me.y,d=Math.hypot(dx,dy);
  if(this.last&&Math.hypot(me.x-this.last.x,me.y-this.last.y)<.01)this.stuck+=dt;else this.stuck=0;this.last={x:me.x,y:me.y};if(this.stuck>1){this.cancel();return null;}
  const far=this.path.reduce((s,p,i,a)=>s+(i?Math.hypot(p.x-a[i-1].x,p.y-a[i-1].y):d),0);return {x:dx/d,y:dy/d,run:far>8};}
}
