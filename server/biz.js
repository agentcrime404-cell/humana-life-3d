// Locali da comprare e gestire (stile server FiveM). Ogni porta di Mergellina è un locale con un solo proprietario (tabella businesses).
// Quando un altro giocatore entrato da quella porta spende, BIZ.cut della spesa va nella cassa; il proprietario in gioco riceve anche BIZ.passive
// ogni BIZ.every secondi per locale. Dalla cassa si ritira l'incasso; si può rivendere a BIZ.sell del prezzo.
import {BIZ} from '../shared/catalog.js';
import {MAPS,doors} from '../shared/world.js';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export class Biz{
 constructor(game){this.game=game;this.db.exec('CREATE TABLE IF NOT EXISTS businesses(door TEXT PRIMARY KEY,owner TEXT NOT NULL,name TEXT NOT NULL,room TEXT NOT NULL,price INTEGER NOT NULL,cassa INTEGER NOT NULL DEFAULT 0,since INTEGER NOT NULL)');}
 get db(){return this.game.db;}
 tell(p,message){if(p?.ws)this.game.send(p.ws,{type:'notification',message});}
 // La porta da cui il giocatore è entrato nel locale (solo Mergellina: ogni porta ha un nome vero o di fantasia).
 door(p){const f=p?.from;if(!p||f?.room!=='mergellina'||!BIZ.price[p.room])return null;let best=null,bd=3;
  for(const d of doors('mergellina')){if(d.to!==p.room)continue;const k=Math.hypot((d.exitX??d.x)-f.x,(d.exitY??d.y)-f.y);if(k<bd){bd=k;best=d;}}return best;}
 row(id){return this.db.prepare('SELECT * FROM businesses WHERE door=?').get(id);}
 mine(owner){return this.db.prepare('SELECT * FROM businesses WHERE owner=? ORDER BY since').all(owner);}
 credit(id,n){this.db.prepare('UPDATE player_state SET balance=balance+? WHERE user_id=?').run(n,id);}
 // Spesa di un cliente (chiamata da living/service dopo un pagamento vero, non un furto): una parte va nella cassa del proprietario.
 sale(p,amount){const d=this.door(p);if(!d||!(amount>0))return;const r=this.row(d.id);if(!r||r.owner===p.id)return;const cut=Math.max(1,Math.round(amount*BIZ.cut));this.db.prepare('UPDATE businesses SET cassa=cassa+? WHERE door=?').run(cut,d.id);}
 tick(p){if(!p.bizAt){p.bizAt=Date.now()+BIZ.every*1000;return;}if(Date.now()<p.bizAt)return;p.bizAt=Date.now()+BIZ.every*1000;const n=this.mine(p.id).length;if(!n)return;
  this.db.prepare('UPDATE businesses SET cassa=cassa+? WHERE owner=?').run(BIZ.passive,p.id);this.tell(p,'🏪 I tuoi '+n+' locali hanno incassato +'+BIZ.passive*n+' 🪙 (ritira dall’app Lavoro)');}
 view(p){const d=this.door(p),here=d&&{door:d.id,name:d.name,room:p.room,price:BIZ.price[p.room],owner:null};
  if(here){const r=this.row(d.id);if(r){here.owner=r.owner===p.id?'tu':(this.db.prepare('SELECT username FROM users WHERE id=?').get(r.owner)?.username||'qualcuno');}}
  return {here,mine:this.mine(p.id).map(r=>({door:r.door,name:r.name,room:MAPS[r.room]?.name||r.room,cassa:r.cassa,price:r.price}))};}
 route(path,method,p,b){if(!p)fail('Entra prima nel gioco');
  if(path==='/api/biz'&&method==='GET')return this.view(p);
  if(method!=='POST')return undefined;
  if(path==='/api/biz/buy'){const d=this.door(p);if(!d)fail('Entra in un locale di Mergellina per comprarlo');if(p.jail)fail('Sei in prigione');if(this.row(d.id))fail('Questo locale ha già un proprietario');const price=BIZ.price[p.room];
   this.db.exec('BEGIN IMMEDIATE');try{const ok=this.db.prepare('UPDATE player_state SET balance=balance-? WHERE user_id=? AND balance>=?').run(price,p.id,price).changes;if(!ok)fail('Monete insufficienti: servono '+price+' 🪙');
    this.db.prepare('INSERT INTO businesses(door,owner,name,room,price,cassa,since) VALUES(?,?,?,?,?,0,?)').run(d.id,p.id,d.name,p.room,price,Date.now());this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');throw e;}
   this.tell(p,'🏪 Complimenti! '+d.name+' ora è tuo.');this.game.send(p.ws,{type:'wallet'});return this.view(p);}
  if(path==='/api/biz/collect'){const r=this.row(String(b.door||''));if(!r||r.owner!==p.id)fail('Non è un tuo locale');if(!r.cassa)fail('La cassa è vuota');this.db.prepare('UPDATE businesses SET cassa=0 WHERE door=?').run(r.door);this.credit(p.id,r.cassa);
   this.tell(p,'💰 Hai ritirato '+r.cassa+' 🪙 da '+r.name);this.game.send(p.ws,{type:'wallet'});return this.view(p);}
  if(path==='/api/biz/sell'){const r=this.row(String(b.door||''));if(!r||r.owner!==p.id)fail('Non è un tuo locale');const back=Math.round(r.price*BIZ.sell)+r.cassa;this.db.prepare('DELETE FROM businesses WHERE door=?').run(r.door);this.credit(p.id,back);
   this.tell(p,'🏷️ Hai venduto '+r.name+': +'+back+' 🪙');this.game.send(p.ws,{type:'wallet'});return this.view(p);}
  return undefined;}
}
