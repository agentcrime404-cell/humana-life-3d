import {SIM_PRICE} from '../shared/catalog.js';
// Telefono del gioco: ogni giocatore ha un numero (prefisso 081 come Napoli) e una rubrica personale.
// Si può chiamare chiunque di cui si conosce il numero, ovunque sia sulla mappa (l'audio va da telefono a telefono).
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export const cleanNumber=n=>String(n||'').replace(/\D/g,'').slice(0,12);
export const prettyNumber=n=>n.length===10?n.slice(0,3)+' '+n.slice(3,6)+' '+n.slice(6):n;
export class Phone{
 constructor(db,game){this.db=db;this.game=game;db.exec(`CREATE TABLE IF NOT EXISTS phone_numbers(number TEXT PRIMARY KEY,user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS phone_contacts(owner TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,name TEXT NOT NULL,number TEXT NOT NULL,PRIMARY KEY(owner,number));`);}
 // Numero assegnato al primo uso: 081 + 7 cifre, unico.
 numberOf(id){const row=this.db.prepare('SELECT number FROM phone_numbers WHERE user_id=?').get(id);if(row)return row.number;
  for(;;){const n='081'+String(Math.floor(1e6+Math.random()*9e6));try{this.db.prepare('INSERT INTO phone_numbers(number,user_id) VALUES(?,?)').run(n,id);return n;}catch(e){if(!/UNIQUE/.test(e.message))throw e;if(this.db.prepare('SELECT number FROM phone_numbers WHERE user_id=?').get(id))return this.numberOf(id);}}}
 owner(number){const r=this.db.prepare('SELECT u.id,u.username FROM phone_numbers p JOIN users u ON u.id=p.user_id WHERE p.number=?').get(cleanNumber(number));return r||null;}
 view(id){const contacts=this.db.prepare('SELECT name,number FROM phone_contacts WHERE owner=? ORDER BY name COLLATE NOCASE').all(id).map(c=>{const o=this.owner(c.number);return {...c,pretty:prettyNumber(c.number),id:o?.id||null,online:!!(o&&this.game.players.has(o.id))};});
  const mine=this.numberOf(id);return {number:mine,pretty:prettyNumber(mine),contacts};}
 route(path,method,user,b){const id=user.id;
  if(path==='/api/phone'&&method==='GET')return this.view(id);
  // Negozio SIM (centro commerciale del 3D): numeri liberi proposti e cambio numero a pagamento.
  if(path==='/api/phone/sim'&&method==='GET'){const free=n=>!this.db.prepare('SELECT 1 FROM phone_numbers WHERE number=?').get(n),out=[];const nice=['0811234567','0817777777','0815550000','0812020202','0813333333','0819999999','0811111111','0818080808'];for(const n of nice)if(free(n)&&out.length<4)out.push(n);while(out.length<8){const n='081'+String(Math.floor(1e6+Math.random()*9e6));if(free(n)&&!out.includes(n))out.push(n);}return {mine:prettyNumber(this.numberOf(id)),price:SIM_PRICE,numbers:out.map(n=>({number:n,pretty:prettyNumber(n)}))};}
  if(path==='/api/phone/sim'&&method==='POST'){const n=cleanNumber(b.number),p=this.game.players.get(id);if(!/^081\d{7}$/.test(n))fail('Il numero deve cominciare con 081 e avere 10 cifre');if(!p||(p.room!=='mall'&&p.room!=='mall2'))fail('Vai al Negozio SIM nel centro commerciale',403);if(this.db.prepare('SELECT 1 FROM phone_numbers WHERE number=?').get(n))fail('Numero già preso: scegline un altro');this.numberOf(id);
   if(!this.db.prepare('UPDATE player_state SET balance=balance-? WHERE user_id=? AND balance>=?').run(SIM_PRICE,id,SIM_PRICE).changes)fail('Monete insufficienti');this.db.prepare('UPDATE phone_numbers SET number=? WHERE user_id=?').run(n,id);return {...this.view(id),changed:true};}
  if(path==='/api/phone/lookup'&&method==='GET'){const o=this.owner(b.n);if(!o)fail('Numero inesistente',404);if(o.id===id)fail('È il tuo numero');return {id:o.id,username:o.username,online:this.game.players.has(o.id)};}
  if(path==='/api/phone/contacts'&&method==='POST'){const number=cleanNumber(b.number),name=String(b.name||'').trim().slice(0,30);if(number.length<6)fail('Numero non valido');if(!name)fail('Scrivi un nome');if(this.db.prepare('SELECT COUNT(*) n FROM phone_contacts WHERE owner=?').get(id).n>=300)fail('Rubrica piena');
   this.db.prepare('INSERT INTO phone_contacts(owner,name,number) VALUES(?,?,?) ON CONFLICT(owner,number) DO UPDATE SET name=excluded.name').run(id,name,number);return this.view(id);}
  if(path==='/api/phone/contacts/delete'&&method==='POST'){this.db.prepare('DELETE FROM phone_contacts WHERE owner=? AND number=?').run(id,cleanNumber(b.number));return this.view(id);}}
 // Chiamata ammessa se il chiamante ha composto il numero giusto del destinatario.
 allows(toId,number){return !!number&&this.numberOf(toId)===cleanNumber(number);}
}
