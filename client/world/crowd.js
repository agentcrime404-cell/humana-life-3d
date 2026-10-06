import {MAPS,canStand,doors,distance} from '/shared/world.js';
import {stretchRect,TRACK_OUT} from '/shared/district.js';
// Passanti d'ambiente: deterministici dal tempo del server, quindi uguali per tutti i client. Non sono giocatori.
export const LOOKS=[
 {hair:null,jacket:[0,.68,.2,1.4],pants:null},
 {hair:[42,.7,.42,1.1],jacket:[0,0,.72,1],pants:null},
 {hair:[24,.5,.12,1.2],jacket:[140,.42,.18,1.2],pants:[35,.3,.42,.6]},
 {hair:[8,.72,.26,1.2],jacket:[48,.82,.36,1],pants:null},
 {hair:null,jacket:[210,.06,.36,1],pants:[0,0,.08,.4]},
 {hair:[330,.55,.42,1],jacket:[330,.62,.44,1],pants:[0,0,.75,.5]},
 {hair:[24,.5,.12,1.2],jacket:[215,.55,.2,1.2],pants:[35,.3,.42,.6]},
 {hair:[42,.7,.42,1.1],jacket:null,pants:[0,0,.1,.4]},
 {hair:[0,0,.62,.8],jacket:[30,.35,.48,1],pants:[0,0,.3,.5]},
 {hair:[8,.72,.26,1.2],jacket:[275,.5,.3,1.2],pants:null}
];
const ACCESSORIES=['none','none','cap','none','flower','none','none','cap','none','flower'];
const BODIES=['regular','slim','regular','broad','slim','regular','broad','regular','slim','regular'];
const COLORS=['#e5484d','#ffffff','#2f9e5b','#ffc928','#3b4250','#ff7ab6','#2a6fd6','#ffc928','#c9a77a','#8a5cff'];
function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function hash(text){let h=2166136261;for(const ch of text)h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;}
const cache=new Map();
function clearOf(room,x,y,taken){
 if(!canStand(room,x,y,.4))return false;
 if(doors(room).some(d=>distance(d,{x,y})<1.8))return false;
 if(distance(MAPS[room].spawn,{x,y})<2.4)return false;
 return !taken.some(t=>distance(t,{x,y})<.95);
}
function segmentClear(room,a,b){const n=Math.ceil(distance(a,b)*3);for(let i=0;i<=n;i++){const t=i/n;if(!canStand(room,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,.4))return false;}return true;}
function look(i,r){const k=Math.floor(r()*LOOKS.length);return {id:'npc'+i,npc:true,look:k,avatar:{color:COLORS[k],accessory:ACCESSORIES[(k+i)%10],body:BODIES[(k*3+i)%10],glasses:r()<.15}};}
export function crowdPlan(room){
 if(cache.has(room))return cache.get(room);
 const m=MAPS[room];const plan=[];if(!m||room.startsWith('home:')||room.startsWith('villa')){cache.set(room,plan);return plan;}
 const r=rng(hash(room)),taken=[];
 const zones=room==='lungomare'?[
  {x:4,y:10,w:34,h:24,sit:10,groups:10,walk:12},
  {x:0,y:0,w:24,h:24,groups:5,walk:5},
  {x:0,y:32,w:80,h:10,groups:3,walk:7},
  {x:38,y:2,w:10,h:76,groups:2,walk:6},
  {x:27,y:40,w:14,h:10,groups:3,walk:2},
  {x:0,y:47,w:80,h:7,groups:2,walk:5},
  {x:46,y:53,w:10,h:11,groups:2,walk:2},
  {x:53,y:2,w:7,h:76,groups:1,walk:4},
  {x:62,y:2,w:16,h:45,groups:3,walk:5},
  {x:64,y:48,w:15,h:16,groups:4,walk:3},
  {x:0,y:63,w:80,h:9,groups:3,walk:6}
 ].map(stretchRect).concat([
  {x:102,y:2,w:27,h:44,groups:3,walk:3},{x:101,y:54,w:48,h:24,groups:4,walk:5},{x:101,y:84,w:48,h:30,groups:3,walk:5},
  {x:6,y:92,w:26,h:20,groups:4,walk:3},{x:0,y:119,w:150,h:31,groups:4,walk:8},{x:30,y:92,w:66,h:21,groups:3,walk:5}
 ]):[{x:m.bounds.x+1,y:m.bounds.y+2,w:m.bounds.w-2,h:m.bounds.h-4,...(room==='club'?{sit:2,groups:3,walk:0}:{sit:3,groups:1,walk:1})}];
 for(const area of zones){
 const want={sit:0,...area};
 // Seduti ai tavoli dei locali e della piazza.
 const seats=m.props.filter(p=>p.kind==='seat'&&p.x>area.x&&p.x<area.x+area.w&&p.y>area.y&&p.y<area.y+area.h);
 for(const s of seats.sort(()=>r()-.5).slice(0,want.sit)){if(distance(m.spawn,s)<1.6)continue;const n=look(plan.length,r);plan.push({...n,mode:'sit',x:s.x,y:s.y,phase:r()});taken.push(s);}
 // Gruppetti che chiacchierano in piedi.
 for(let g=0,tries=0;g<want.groups&&tries<400;tries++){
  const cx=area.x+r()*area.w,cy=area.y+r()*area.h,size=2+Math.floor(r()*2),members=[];
  for(let k=0;k<size;k++){const a=k/size*Math.PI*2+r()*.6,x=cx+Math.cos(a)*.75,y=cy+Math.sin(a)*.75;if(clearOf(room,x,y,[...taken,...members]))members.push({x,y,dir:Math.atan2(cy-y,cx-x)});}
  if(members.length<2)continue;g++;
  for(const p of members){const n=look(plan.length,r);plan.push({...n,mode:room==='club'?'dance':'idle',x:p.x,y:p.y,direction:p.dir,phase:r()});taken.push(p);}
 }
 // Passanti che vanno avanti e indietro su tratti liberi.
 for(let w=0,tries=0;w<want.walk&&tries<600;tries++){
  const a={x:area.x+r()*area.w,y:area.y+r()*area.h},angle=r()*Math.PI*2,len=3+r()*5,b={x:a.x+Math.cos(angle)*len,y:a.y+Math.sin(angle)*len};
  if(!clearOf(room,a.x,a.y,taken)||!clearOf(room,b.x,b.y,taken)||!segmentClear(room,a,b))continue;w++;
  const n=look(plan.length,r);plan.push({...n,mode:'walk',a,b,len,phase:r(),speed:.9+r()*.5});
 }
 }
 // Corridori sulla pista della villa comunale.
 if(room==='lungomare')for(let k=0;k<6;k++){const n=look(plan.length,r);plan.push({...n,mode:'jog',ring:{x:TRACK_OUT.x+1.5,y:TRACK_OUT.y+1.5,w:TRACK_OUT.w-3,h:TRACK_OUT.h-3},phase:k/6,speed:3.2+r()*.8});}
 cache.set(room,plan);return plan;
}
export function crowd(room,seconds){
 return crowdPlan(room).map(n=>{
  const base={id:n.id,npc:true,look:n.look,avatar:n.avatar,room,animation:null,emote:null,moving:false,running:false,direction:n.direction??Math.PI/4};
  if(n.mode==='sit')return {...base,x:n.x,y:n.y,seat:n.id};
  if(n.mode==='jog'){const g=n.ring,P=2*(g.w+g.h);let d=((seconds*n.speed+n.phase*P)%P+P)%P,x,y,dir;
   if(d<g.w){x=g.x+d;y=g.y;dir=0;}else if((d-=g.w)<g.h){x=g.x+g.w;y=g.y+d;dir=Math.PI/2;}else if((d-=g.h)<g.w){x=g.x+g.w-d;y=g.y+g.h;dir=Math.PI;}else{d-=g.w;x=g.x;y=g.y+g.h-d;dir=-Math.PI/2;}
   return {...base,x,y,direction:dir,moving:true,running:true};}
  if(n.mode==='dance')return {...base,x:n.x,y:n.y,animation:'DANCE'};
  if(n.mode==='idle'){const cycle=(seconds/24+n.phase)%1;return {...base,x:n.x,y:n.y,animation:cycle<.07?'WAVE':cycle>.5&&cycle<.56?'LAUGH':null};}
  const travel=n.len/n.speed,period=2*travel+6,u=((seconds+n.phase*period)%period);
  let t,dir,moving=true;
  if(u<travel){t=u/travel;dir=Math.atan2(n.b.y-n.a.y,n.b.x-n.a.x);}
  else if(u<travel+3){t=1;moving=false;dir=Math.atan2(n.b.y-n.a.y,n.b.x-n.a.x);}
  else if(u<2*travel+3){t=1-(u-travel-3)/travel;dir=Math.atan2(n.a.y-n.b.y,n.a.x-n.b.x);}
  else{t=0;moving=false;dir=Math.atan2(n.a.y-n.b.y,n.a.x-n.b.x);}
  return {...base,x:n.a.x+(n.b.x-n.a.x)*t,y:n.a.y+(n.b.y-n.a.y)*t,moving,direction:dir};
 });
}
