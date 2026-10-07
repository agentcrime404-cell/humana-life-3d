// Movimento "uguale per tutti": pedoni e auto seguono percorsi decisi solo dall'orologio del server e da numeri pseudo-casuali con seme,
// quindi due giocatori vicini vedono le stesse persone e le stesse auto negli stessi punti. Ogni 20 minuti il percorso riparte da un
// punto di partenza uguale per tutti (nessuno scambio di dati in rete). Il tempo "locale" di ogni figurante può restare indietro
// (se parla col giocatore o frena per lui) e poi recupera piano, così la scena resta simile anche dopo una interazione.
export const ANCHOR=1200;
export const hash=(...v)=>{let h=2166136261>>>0;for(const x of v){h^=(x|0)+0x9e3779b9;h=Math.imul(h,16777619);h^=h>>>13;h=Math.imul(h,0x85ebca6b);h^=h>>>16;}return h>>>0;};
export const prng=seed=>{let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};};
export class Chain{
 // net: rete stradale; roads: strade percorribili; speedOf(r): m/s; accept(o,j): vale per entrare in un incrocio; id/salt: identità
 constructor(net,roads,speedOf,accept,id,salt,opt={}){this.net=net;this.roads=roads;this.speedOf=speedOf;this.accept=accept;this.id=id;this.salt=salt;this.opt=opt;
  this.pref=[];let t=0;for(const r of roads){t+=r.len*(opt.weight?opt.weight(r):1);this.pref.push(t);}this.total=t;this.A=-1;this.holdUntil=0;this.park=false;}
 init(A){this.A=A;this.rng=prng(hash(this.id,this.salt,A));this.holdUntil=0;const x=this.rng()*this.total;let lo=0,hi=this.pref.length-1;while(lo<hi){const m=(lo+hi)>>1;if(this.pref[m]<x)lo=m+1;else hi=m;}
  const r=this.roads[lo];this.r=r;this.s=this.rng()*r.len;this.dir=r.ow||this.opt.oneWay&&r.ow?1:(this.rng()<.5?1:-1);this.t=A;this.j=this.target();}
 target(){const r=this.r;if(this.dir>0){let j=1;while(j<r.cum.length-1&&r.cum[j]<=this.s)j++;return j;}let j=r.cum.length-2;while(j>0&&r.cum[j]>=this.s)j--;return j;}
 arrive(){const r=this.r,j=this.j;this.arrRoad=r;this.arrJ=j;const last=r.p.length-1,end=j===0||j===last,rng=this.rng;
  const nodes=(this.net.node.get(this.net.key(r.p[j]))||[]).filter(([o,jj])=>o!==r&&this.accept(o,jj));
  if(nodes.length&&(end||rng()<(this.opt.turn??.35))){const [o,jj]=nodes[Math.floor(rng()*nodes.length)];this.r=o;this.s=o.cum[jj];this.dir=jj===0?1:jj===o.p.length-1?-1:(o.ow?1:(rng()<.5?1:-1));this.j=this.dir>0?jj+1:jj-1;}
  else if(end){if(r.ow){this.s=0;this.dir=1;this.j=1;}else{this.dir=-this.dir;this.j=this.dir>0?1:last-1;}}
  else this.j=j+this.dir;
  if(this.opt.work&&rng()<.14)this.holdUntil=this.t+6+rng()*4;
  if(this.opt.sig){const w=this.opt.sig(this.arrRoad,this.arrJ,this.t);if(w>0)this.holdUntil=Math.max(this.holdUntil,this.t+w);}}
 advance(te){const A=Math.floor(te/ANCHOR)*ANCHOR;if(A!==this.A)this.init(A);let g=0;
  while(this.t<te&&g++<6000){
   if(this.t<this.holdUntil){if(te<=this.holdUntil){this.t=te;this.park=true;return;}this.t=this.holdUntil;}
   const r=this.r,v=this.speedOf(r),dist=Math.abs(r.cum[this.j]-this.s),dt=dist/v;
   if(this.t+dt>te){this.s+=this.dir*v*(te-this.t);this.t=te;break;}
   this.t+=dt;this.s=r.cum[this.j];this.arrive();}
  this.park=this.t<this.holdUntil;if(g>=6000)this.init(A);}
}
