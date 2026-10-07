// Polizia di HUMANA life 3D: chi prende senza pagare può essere visto da un agente (si viene «ricercati» per qualche secondo) e finisce in cella per un minuto.
// Qui c'è anche l'elenco delle auto comprate e lasciate parcheggiate: restano dove le hai lasciate, anche dopo l'uscita dal gioco.
import {POLICE,PRISON,policeGeom,prisonCell,CAR_BASES,VEHICLE} from '../shared/catalog.js';
import {state} from './storage.js';
export class Police{
 constructor(game){this.game=game;}
 nearest(p){return [...POLICE].sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];}
 tell(p,message){this.game.send(p.ws,{type:'notification',message});}
 crime(p,amount){if(!p||p.jail)return;const now=Date.now(),st=this.nearest(p);
  if(p.wanted){this.tell(p,'🚨 Stai già rubando: gli agenti ti cercano!');return;}
  const caught=Math.random()<PRISON.catch,delay=PRISON.delay[0]+Math.random()*(PRISON.delay[1]-PRISON.delay[0]);
  p.wanted={t0:now,until:now+delay*1000,caught,station:st.id,value:Math.round(amount)};this.tell(p,'🚨 Hai preso senza pagare! Se un agente ti vede finisci in prigione…');}
 // Mette il giocatore in cella (dentro la caserma più vicina); l'auto di proprietà resta parcheggiata dove si trovava.
 arrest(p){const now=Date.now(),st=POLICE.find(c=>c.id===p.wanted?.station)||this.nearest(p);
  this.game.living?.parkCar(p);this.game.arena?.leave(p);p.wanted=null;p.vehicle=null;p.seat=null;p.passenger=null;p.music=null;p.fueling=null;p.consuming=null;p.from=null;p.room='lungomare';
  const c=prisonCell(st);p.x=c.x;p.y=c.y;p.input={x:0,y:0};p.vel=0;p.jail={t0:now,until:now+PRISON.seconds*1000,station:st.id,name:st.name};
  this.tell(p,'🚔 Ti hanno beccato! Un minuto in prigione…');}
 release(p){const st=POLICE.find(c=>c.id===p.jail?.station)||POLICE[0],d=policeGeom(st).door;p.jail=null;p.x=d.x;p.y=d.y+1.4;p.input={x:0,y:0};this.tell(p,'👮 Un agente è venuto a liberarti. Comportati bene!');}
 loadCars(p){const g=state(this.game.db,p.id).progress;p.myCars=Object.entries(g.parked||{}).map(([v,c])=>({v,x:c.x,y:c.y,h:c.h}));}
 tick(p){const now=Date.now();if(p.myCars===undefined)this.loadCars(p);
  if(p.jail){p.input={x:0,y:0};p.vel=0;p.vehicle=null;if(now>=p.jail.until)this.release(p);return;}
  if(p.wanted&&now>=p.wanted.until){if(p.wanted.caught)this.arrest(p);else{p.wanted=null;this.tell(p,'😮‍💨 Nessuno ti ha visto: l’hai fatta franca…');}}}
}
export const isCar=id=>CAR_BASES.includes(VEHICLE[id]?.base||id);
