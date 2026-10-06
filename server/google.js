// Accesso con Google (Google Identity Services): il client riceve un ID token, il server lo verifica presso Google.
import {randomUUID,randomBytes} from 'node:crypto';
export const googleClientId=()=>process.env.GOOGLE_CLIENT_ID||'';
export async function verifyGoogle(credential,fetchImpl=fetch){
 const id=googleClientId();if(!id)throw Object.assign(new Error('Accesso con Google non configurato sul server'),{status:503});
 if(typeof credential!=='string'||credential.length>4096)throw Object.assign(new Error('Token Google non valido'),{status:400});
 const r=await fetchImpl('https://oauth2.googleapis.com/tokeninfo?id_token='+encodeURIComponent(credential));if(!r.ok)throw Object.assign(new Error('Token Google non valido'),{status:401});
 const t=await r.json();
 if(t.aud!==id||!['accounts.google.com','https://accounts.google.com'].includes(t.iss)||Number(t.exp)*1000<Date.now()||String(t.email_verified)!=='true'||!t.sub)throw Object.assign(new Error('Token Google non valido'),{status:401});
 return {sub:t.sub,email:t.email,name:t.given_name||t.name||t.email.split('@')[0]};}
// Trova l'utente collegato all'account Google o ne crea uno nuovo con un nome libero.
export function googleUser(db,g,hashed){
 const link=db.prepare('SELECT user_id FROM google_accounts WHERE sub=?').get(g.sub);if(link)return {user:db.prepare('SELECT * FROM users WHERE id=?').get(link.user_id),created:false};
 const base=(g.name.normalize('NFD').replace(/[^a-zA-Z0-9_]/g,'')||'Giocatore').slice(0,14);let name=base.length>=3?base:'Giocatore';
 for(let i=0;db.prepare('SELECT 1 FROM users WHERE username=?').get(name);i++)name=base.slice(0,14)+'_'+(100+Math.floor(Math.random()*9900));
 const id=randomUUID();db.prepare('INSERT INTO users(id,username,password) VALUES(?,?,?)').run(id,name,hashed);db.prepare('INSERT INTO google_accounts(sub,user_id,email) VALUES(?,?,?)').run(g.sub,id,g.email||'');
 return {user:db.prepare('SELECT * FROM users WHERE id=?').get(id),created:true};}
export const randomSecret=()=>randomBytes(32).toString('hex');
