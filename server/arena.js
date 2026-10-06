// Arena paintball di HUMANA life 3D. Tutto è deciso dal server: chi entra, la squadra, dove va il colpo, la vita, i punti, il premio.
// Fuori dal campo nessuno può essere colpito; dentro si usano armi a vernice (nessun sangue). Il campo e le armi stanno in shared/catalog.js (ARENA).
import {ARENA} from '../shared/catalog.js';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const OB=ARENA.obstacles.map(([x,y,w,h])=>[x,y,x+w,y+h]);
const inside=(p,m=0)=>p.x>ARENA.x0-m&&p.x<ARENA.x1+m&&p.y>ARENA.y0-m&&p.y<ARENA.y1+m;
// Distanza alla quale il raggio (origine, direzione unitaria) entra nel rettangolo; Infinity se non lo tocca entro L.
function rayRect(ox,oy,dx,dy,r,L){let t0=0,t1=L;for(const [o,d,a,b] of [[ox,dx,r[0],r[2]],[oy,dy,r[1],r[3]]]){if(Math.abs(d)<1e-9){if(o<a||o>b)return Infinity;}else{let u=(a-o)/d,v=(b-o)/d;if(u>v)[u,v]=[v,u];t0=Math.max(t0,u);t1=Math.min(t1,v);if(t0>t1)return Infinity;}}return t0;}
const clearTo=(ox,oy,dx,dy,L)=>{let t=L;for(const r of OB)t=Math.min(t,rayRect(ox,oy,dx,dy,r,L));return t;};
export class Arena{
 constructor(game){this.game=game;this.score={red:0,blue:0};this.round=1;}
 members(){return [...this.game.players.values()].filter(p=>p.arena);}
 sendTo(list,m){for(const p of list)this.game.send(p.ws,m);}
 notify(message,list=this.members()){this.sendTo(list,{type:'notification',message});}
 scoreMsg(){return {type:'arenaScore',red:this.score.red,blue:this.score.blue,target:ARENA.target,round:this.round};}
 info(){const m=this.members();return {...this.scoreMsg(),red:this.score.red,blue:this.score.blue,players:{red:m.filter(p=>p.arena.team==='red').length,blue:m.filter(p=>p.arena.team==='blue').length}};}
 // Chi si trovasse dentro il campo senza essere in partita (riavvio del server, vecchia posizione salvata) viene riportato fuori.
 sanitize(p){if(p.room==='lungomare'&&!p.arena&&inside(p,1)){p.x=ARENA.exit.x;p.y=ARENA.exit.y;}}
 checkJoin(p){if(!p||p.room!=='lungomare')fail('Vai al chiosco dell’arena sul Lungomare',403);if(Math.hypot(p.x-ARENA.kiosk.x,p.y-ARENA.kiosk.y)>6)fail('Avvicinati al chiosco dell’arena',403);if(p.arena)fail('Sei già in arena');if(p.seat||p.vehicle||p.ride)fail('Scendi prima dal mezzo');}
 spawn(p){const list=ARENA.spawns[p.arena.team],s=list[Math.floor(Math.random()*list.length)];p.x=s[0];p.y=s[1]+(Math.random()-.5)*.6;p.input={x:0,y:0};p.direction=p.arena.team==='red'?0:Math.PI;}
 join(p,weapon){const W=ARENA.weapons[weapon];if(!W)fail('Arma non valida');const m=this.members(),red=m.filter(q=>q.arena.team==='red').length,blue=m.length-red;
  const team=red<blue?'red':blue<red?'blue':this.score.red<this.score.blue?'red':this.score.blue<this.score.red?'blue':Math.random()<.5?'red':'blue';
  p.arena={team,weapon,hp:ARENA.hp,ammo:W.mag,mag:W.mag,reloadAt:0,nextShot:0,downUntil:0,kills:0,deaths:0};p.seat=null;this.spawn(p);
  this.game.send(p.ws,this.scoreMsg());this.notify((team==='red'?'🔴 ':'🔵 ')+p.username+' è entrato in arena',this.members().filter(q=>q!==p));
  this.game.send(p.ws,{type:'notification',message:'Sei in squadra '+(team==='red'?'🔴 ROSSA':'🔵 BLU')+' · '+W.emoji+' '+W.name+' · primo a '+ARENA.target+' punti'});}
 leave(p,message){if(!p?.arena)return;p.arena=null;p.x=ARENA.exit.x+(Math.random()-.5);p.y=ARENA.exit.y+(Math.random()-.5);p.input={x:0,y:0};this.game.send(p.ws,{type:'arenaScore',red:0,blue:0,target:ARENA.target,round:0,out:true});if(message)this.game.send(p.ws,{type:'notification',message});if(!this.members().length){this.score={red:0,blue:0};this.round=1;}}
 message(p,m){const A=p.arena;if(!A)return;const now=Date.now(),W=ARENA.weapons[A.weapon];
  if(m.type==='reload'){if(!A.downUntil&&!A.reloadAt&&A.ammo<A.mag)A.reloadAt=now+W.reload*1000;return;}
  if(m.type!=='shoot'||A.downUntil||A.reloadAt||A.ammo<=0||now<A.nextShot||!inside(p,2))return;
  let dx=Number(m.dx),dy=Number(m.dy);const l=Math.hypot(dx,dy);if(!Number.isFinite(l)||l<1e-6)return;dx/=l;dy/=l;
  // Un po' di aiuto a mirare: se un avversario è quasi nella direzione scelta e visibile, il colpo va verso di lui.
  const foes=this.members().filter(q=>q.arena.team!==A.team&&!q.arena.downUntil&&q.room===p.room);
  {let best=null,ba=W.assist*Math.PI/180;for(const q of foes){const vx=q.x-p.x,vy=q.y-p.y,d=Math.hypot(vx,vy);if(d<.5||d>W.range)continue;const a=Math.acos(Math.max(-1,Math.min(1,(vx*dx+vy*dy)/d)));if(a<ba&&clearTo(p.x,p.y,vx/d,vy/d,d)>=d-1e-6){ba=a;best=[vx/d,vy/d];}}if(best){dx=best[0];dy=best[1];}}
  const sp=(Math.random()-.5)*W.spread*Math.PI/180,c=Math.cos(sp),s=Math.sin(sp);[dx,dy]=[dx*c-dy*s,dx*s+dy*c];
  A.ammo--;A.nextShot=now+W.cd*1000;if(A.ammo<=0)A.reloadAt=now+W.reload*1000;p.direction=Math.atan2(dy,dx);
  let L=clearTo(p.x,p.y,dx,dy,W.range),victim=null;
  for(const q of foes){const vx=q.x-p.x,vy=q.y-p.y,along=vx*dx+vy*dy,off=Math.abs(vx*dy-vy*dx);if(along>0&&along<L&&off<=.5){L=along;victim=q;}}
  const ev={type:'shot',id:p.id,team:A.team,x:p.x,y:p.y,ex:p.x+dx*L,ey:p.y+dy*L,hit:!!victim};
  this.sendTo([...this.game.players.values()].filter(q=>q.room===p.room&&Math.hypot(q.x-p.x,q.y-p.y)<70),ev);
  if(victim){const V=victim.arena;V.hp=Math.max(0,V.hp-W.dmg);this.game.send(victim.ws,{type:'arenaHit',hp:V.hp,by:p.username});
   if(V.hp<=0){V.downUntil=now+ARENA.downSec*1000;V.deaths++;A.kills++;this.score[A.team]++;this.notify('💦 '+p.username+' ha colpito '+victim.username+'  ·  🔴 '+this.score.red+' – '+this.score.blue+' 🔵');this.sendTo(this.members(),this.scoreMsg());if(this.score[A.team]>=ARENA.target)this.endRound(A.team);}}}
 endRound(team){const win=this.members().filter(q=>q.arena.team===team);for(const q of win)this.game.db.prepare('UPDATE player_state SET balance=balance+? WHERE user_id=?').run(ARENA.reward,q.id);
  this.notify((team==='red'?'🔴 La squadra ROSSA':'🔵 La squadra BLU')+' vince! La squadra vincitrice riceve '+ARENA.reward+' monete. Nuova partita…');this.sendTo(this.members(),{type:'arenaEnd',winner:team,reward:ARENA.reward});
  this.score={red:0,blue:0};this.round++;for(const q of this.members()){const W=ARENA.weapons[q.arena.weapon];Object.assign(q.arena,{hp:ARENA.hp,ammo:W.mag,reloadAt:0,downUntil:0,nextShot:0});this.spawn(q);}this.sendTo(this.members(),this.scoreMsg());}
 tick(){const now=Date.now();if(this.score.red+this.score.blue>0&&!this.members().length){this.score={red:0,blue:0};this.round=1;}for(const p of this.members()){const A=p.arena,W=ARENA.weapons[A.weapon];
  if(A.reloadAt&&now>=A.reloadAt){A.reloadAt=0;A.ammo=A.mag;}
  if(A.downUntil&&now>=A.downUntil){Object.assign(A,{hp:ARENA.hp,ammo:A.mag,reloadAt:0,downUntil:0});this.spawn(p);}
  else if(A.downUntil)p.input={x:0,y:0};
  if(!inside(p,1.5))this.leave(p,'Sei uscito dall’arena');}}
}
