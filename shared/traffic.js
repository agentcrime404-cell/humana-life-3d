// Traffico della città: auto che percorrono gli anelli di corsie attorno agli isolati (guida a destra).
// Posizione e direzione vengono dal percorso (punto e tangente), la velocità dal profilo delle curve;
// ogni auto frena se davanti ha un'altra auto, l'autobus o una persona, e accosta per far passare l'autobus.
import {makePath,laneLoop} from './lanes.js';
const BLOCKS=[[57,50.6,80,81.5],[80,50.6,98.5,81.5],[98.5,50.6,132,81.5],[57,81.5,98.5,116.5],[98.5,81.5,132,116.5]];
const MODELS=['auto','furgone','cabrio','auto','auto'];
// Semafori (solo HUMANA life 3D: il 2D non li disegna e quindi non li fa rispettare): uno a ogni incrocio delle strade grandi.
// Ciclo di 24 s: 9 s verde est-ovest, 2 giallo, 1 tutto rosso, 9 s verde nord-sud, 2 giallo, 1 tutto rosso. Ogni incrocio parte sfasato.
export const INTERSECTIONS=[];for(const x of [57,80,98.5,132])for(const y of [50.6,81.5,116.5])INTERSECTIONS.push({x,y,off:(INTERSECTIONS.length*5)%24});
export const LIGHT_CYCLE=24;
// axis: 'ew' (si viaggia lungo x) oppure 'ns'. Ritorna 'green' | 'yellow' | 'red'.
export function lightState(I,axis,t){const k=(((t+I.off)%LIGHT_CYCLE)+LIGHT_CYCLE)%LIGHT_CYCLE,u=axis==='ew'?k:(k+12)%LIGHT_CYCLE;return u<9?'green':u<11?'yellow':'red';}
export class Traffic{
 constructor(){this.cars=[];let n=0;
  for(const [x0,y0,x1,y1] of BLOCKS){const path=makePath(laneLoop(x0,y0,x1,y1,1.05),{radius:4.5}),speed=path.speedProfile(6.2,{brake:8,slow:.6});
   for(let k=0;k<2;k++)this.cars.push({path,speed,s:path.length*(k/2+.13*n),v:0,side:0,model:MODELS[n++%MODELS.length]});}}
 update(dt,others){dt=Math.min(dt,.1);this.time=(this.time||0)+dt;
  const list=this.cars.map(c=>{const q=c.path.pointAt(c.s);return {c,q};});
  for(const {c,q} of list){const h=q.direction,fx=Math.cos(h),fy=Math.sin(h);let limit=c.speed(c.s),pull=0;
   const check=(x,y,size,isBus)=>{const dx=x-q.x,dy=y-q.y,fwd=dx*fx+dy*fy,lat=Math.abs(-dx*fy+dy*fx);if(lat>1.7+size)return;
    if(fwd>0&&fwd<9+size)limit=Math.min(limit,Math.max(0,(fwd-3.2-size)*1.6));
    else if(isBus&&fwd<0&&fwd>-11)pull=1;};
   for(const o of list)if(o.c!==c&&Math.cos(o.q.direction-h)>-.35)check(o.q.x+Math.cos(o.q.direction+Math.PI/2)*o.c.side,o.q.y+Math.sin(o.q.direction+Math.PI/2)*o.c.side,.8,false);
   if(this.lights)for(const I of INTERSECTIONS){const dx=I.x-q.x,dy=I.y-q.y,fwd=dx*fx+dy*fy;if(fwd<2||fwd>17||Math.abs(-dx*fy+dy*fx)>6)continue;const st=lightState(I,Math.abs(fx)>Math.abs(fy)?'ew':'ns',this.time);
    // linea di arresto a 6 m dal centro: col rosso ci si ferma lì, col giallo ci si ferma solo se si fa in tempo; chi è già nell'incrocio lo libera
    if(fwd>5.5&&(st==='red'||st==='yellow'&&fwd>9))limit=Math.min(limit,Math.max(0,(fwd-6)*1.5));}
   for(const o of others)check(o.x,o.y,o.bus?2.2:o.vehicle?.8:0,!!o.bus);
   if(pull)limit=Math.min(limit,2.5);
   c.side+=((pull?1.25:0)-c.side)*Math.min(1,2.5*dt);
   c.v+=Math.max(-8*dt,Math.min(3*dt,limit-c.v));c.s=c.path.wrap(c.s+c.v*dt);}}
 // Entità da disegnare (stesso formato dei mezzi dei giocatori).
 entities(){return this.cars.map(c=>{const q=c.path.pointAt(c.s),r=q.direction+Math.PI/2;return {kind:'ride',traffic:true,v:c.model,x:q.x+Math.cos(r)*c.side,y:q.y+Math.sin(r)*c.side,direction:q.direction,depth:q.x+q.y};});}
}
