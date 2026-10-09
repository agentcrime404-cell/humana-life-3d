// Gang (stile server FiveM): si fonda pagando GANG.price, il capo invita i giocatori vicini (fino a GANG.max membri), cassa comune
// (versano tutti, ritira il capo), e GANG.cut del bottino delle rapine dei membri va in cassa. p.gang = {id,name,color} viaggia agli altri giocatori.
import {GANG} from '../shared/catalog.js';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export class Gangs{
 constructor(game){this.game=game;this.db.exec('CREATE TABLE IF NOT EXISTS gangs(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL UNIQUE COLLATE NOCASE,color TEXT NOT NULL,leader TEXT NOT NULL,cassa INTEGER NOT NULL DEFAULT 0,since INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS gang_members(user_id TEXT PRIMARY KEY,gang INTEGER NOT NULL,since INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS gang_invites(user_id TEXT NOT NULL,gang INTEGER NOT NULL,PRIMARY KEY(user_id,gang))');}
 get db(){return this.game.db;}
 tell(p,message){if(p?.ws)this.game.send(p.ws,{type:'notification',message});}
 online(id){return [...this.game.players.values()].find(q=>String(q.id)===String(id));}
 of(id){const m=this.db.prepare('SELECT gang FROM gang_members WHERE user_id=?').get(id);return m?this.db.prepare('SELECT * FROM gangs WHERE id=?').get(m.gang):null;}
 members(g){return this.db.prepare('SELECT m.user_id id,u.username name FROM gang_members m JOIN users u ON u.id=m.user_id WHERE m.gang=? ORDER BY m.since').all(g);}
 refresh(id){const p=this.online(id);if(!p)return;const g=this.of(id);p.gang=g?{id:g.id,name:g.name,color:g.color}:null;}
 tellGang(g,message,skip){for(const m of this.members(g)){if(m.id!==skip)this.tell(this.online(m.id),message);}}
 balance(id){return this.db.prepare('SELECT balance FROM player_state WHERE user_id=?').get(id)?.balance||0;}
 tick(p){if(p.gangLoaded)return;p.gangLoaded=true;this.refresh(p.id);}
 // Rapina riuscita di un membro: una parte del bottino va nella cassa della gang (chiamata da heist.js).
 loot(p,amount){const g=this.of(p.id);if(!g||!(amount>0))return 0;const cut=Math.round(amount*GANG.cut);if(!cut)return 0;this.db.prepare('UPDATE gangs SET cassa=cassa+? WHERE id=?').run(cut,g.id);this.db.prepare('UPDATE player_state SET balance=balance-? WHERE user_id=?').run(cut,p.id);this.tellGang(g.id,'🏴 '+p.username+' ha portato '+cut+' 🪙 alla cassa della gang');return cut;}
 view(p){const g=this.of(p.id),inv=this.db.prepare('SELECT g.id,g.name,g.color FROM gang_invites i JOIN gangs g ON g.id=i.gang WHERE i.user_id=?').all(p.id);
  const near=[...this.game.players.values()].filter(q=>q.id!==p.id&&q.room===p.room&&Math.hypot(q.x-p.x,q.y-p.y)<=GANG.reach).map(q=>({id:q.id,name:q.username,gang:q.gang?.name||null}));
  return {price:GANG.price,max:GANG.max,colors:GANG.colors,invites:inv,near,gang:g?{id:g.id,name:g.name,color:g.color,cassa:g.cassa,leader:g.leader===p.id,members:this.members(g.id).map(m=>({...m,online:!!this.online(m.id),leader:m.id===g.leader}))}:null};}
 route(path,method,p,b){if(!p)fail('Entra prima nel gioco');
  if(path==='/api/gang'&&method==='GET')return this.view(p);
  if(method!=='POST')return undefined;const g=this.of(p.id),now=Date.now();
  if(path==='/api/gang/create'){if(g)fail('Sei già in una gang');const name=String(b.name||'').trim().replace(/\s+/g,' ');if(!/^[\p{L}\p{N} '._-]{3,20}$/u.test(name))fail('Nome da 3 a 20 lettere o numeri');const color=GANG.colors.includes(b.color)?b.color:GANG.colors[0];
   if(this.db.prepare('SELECT 1 FROM gangs WHERE name=?').get(name))fail('Questo nome è già preso');
   this.db.exec('BEGIN IMMEDIATE');try{if(!this.db.prepare('UPDATE player_state SET balance=balance-? WHERE user_id=? AND balance>=?').run(GANG.price,p.id,GANG.price).changes)fail('Servono '+GANG.price+' 🪙 per fondare una gang');
    const id=this.db.prepare('INSERT INTO gangs(name,color,leader,since) VALUES(?,?,?,?)').run(name,color,p.id,now).lastInsertRowid;this.db.prepare('INSERT INTO gang_members VALUES(?,?,?)').run(p.id,id,now);this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');throw e;}
   this.refresh(p.id);this.tell(p,'🏴 Hai fondato la gang «'+name+'»: invita i tuoi amici!');this.game.send(p.ws,{type:'wallet'});return this.view(p);}
  if(path==='/api/gang/invite'){if(!g||g.leader!==p.id)fail('Solo il capo invita');if(this.members(g.id).length>=GANG.max)fail('La gang è al completo ('+GANG.max+')');const t=this.online(b.id);
   if(!t||t.id===p.id||t.room!==p.room||Math.hypot(t.x-p.x,t.y-p.y)>GANG.reach)fail('Avvicinati al giocatore (meno di '+GANG.reach+' m)');if(this.of(t.id))fail(t.username+' è già in una gang');
   this.db.prepare('INSERT OR IGNORE INTO gang_invites VALUES(?,?)').run(t.id,g.id);this.tell(t,'🏴 '+p.username+' ti invita nella gang «'+g.name+'»: accetta dall’app Lavoro');this.tell(p,'Invito mandato a '+t.username);return this.view(p);}
  if(path==='/api/gang/accept'){if(g)fail('Sei già in una gang');const gid=Number(b.gang);if(!this.db.prepare('SELECT 1 FROM gang_invites WHERE user_id=? AND gang=?').get(p.id,gid))fail('Nessun invito da questa gang');if(this.members(gid).length>=GANG.max)fail('La gang è al completo');
   this.db.prepare('DELETE FROM gang_invites WHERE user_id=?').run(p.id);this.db.prepare('INSERT INTO gang_members VALUES(?,?,?)').run(p.id,gid,now);this.refresh(p.id);const ng=this.of(p.id);this.tellGang(gid,'🏴 '+p.username+' è entrato nella gang «'+ng.name+'»');return this.view(p);}
  if(path==='/api/gang/leave'){if(!g)fail('Non sei in una gang');this.db.prepare('DELETE FROM gang_members WHERE user_id=?').run(p.id);const rest=this.members(g.id);
   if(!rest.length){this.db.prepare('DELETE FROM gangs WHERE id=?').run(g.id);this.db.prepare('DELETE FROM gang_invites WHERE gang=?').run(g.id);if(g.cassa)this.db.prepare('UPDATE player_state SET balance=balance+? WHERE user_id=?').run(g.cassa,p.id);this.tell(p,'La gang «'+g.name+'» è sciolta'+(g.cassa?': la cassa ('+g.cassa+' 🪙) è tua':''));}
   else{if(g.leader===p.id)this.db.prepare('UPDATE gangs SET leader=? WHERE id=?').run(rest[0].id,g.id);this.tellGang(g.id,'🏴 '+p.username+' ha lasciato la gang'+(g.leader===p.id?': il nuovo capo è '+rest[0].name:''));}
   this.refresh(p.id);this.game.send(p.ws,{type:'wallet'});return this.view(p);}
  if(path==='/api/gang/kick'){if(!g||g.leader!==p.id)fail('Solo il capo può cacciare');const id=String(b.id||'');if(id===p.id||!this.members(g.id).some(m=>m.id===id))fail('Non è nella tua gang');this.db.prepare('DELETE FROM gang_members WHERE user_id=?').run(id);this.refresh(id);this.tell(this.online(id),'🏴 Sei stato cacciato dalla gang «'+g.name+'»');return this.view(p);}
  if(path==='/api/gang/deposit'){if(!g)fail('Non sei in una gang');const n=Math.round(Number(b.amount));if(!(n>0))fail('Importo non valido');if(!this.db.prepare('UPDATE player_state SET balance=balance-? WHERE user_id=? AND balance>=?').run(n,p.id,n).changes)fail('Monete insufficienti');
   this.db.prepare('UPDATE gangs SET cassa=cassa+? WHERE id=?').run(n,g.id);this.tellGang(g.id,'🏴 '+p.username+' ha versato '+n+' 🪙 nella cassa');this.game.send(p.ws,{type:'wallet'});return this.view(p);}
  if(path==='/api/gang/withdraw'){if(!g||g.leader!==p.id)fail('Solo il capo ritira dalla cassa');const n=Math.round(Number(b.amount));if(!(n>0)||n>g.cassa)fail('In cassa ci sono '+g.cassa+' 🪙');
   this.db.prepare('UPDATE gangs SET cassa=cassa-? WHERE id=?').run(n,g.id);this.db.prepare('UPDATE player_state SET balance=balance+? WHERE user_id=?').run(n,p.id);this.tellGang(g.id,'🏴 Il capo ha ritirato '+n+' 🪙 dalla cassa');this.game.send(p.ws,{type:'wallet'});return this.view(p);}
  return undefined;}
}
