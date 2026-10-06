import {randomUUID} from 'node:crypto';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {PACKS} from '../shared/catalog.js';
import {ensureState} from './storage.js';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
// Stripe Checkout via API REST: nessuna dipendenza, chiavi solo da variabili d'ambiente.
export function payments(db,{env=process.env,fetchImpl=globalThis.fetch}={}){
 const key=()=>{const k=env.STRIPE_SECRET_KEY||'';if(!k)fail('Pagamenti non configurati: aggiungi STRIPE_SECRET_KEY (chiave di test sk_test_…) nel file .env',503);
  if(!/^(sk|rk)_test_/.test(k)&&env.STRIPE_ALLOW_LIVE!=='1')fail('Per sicurezza sono accettate solo chiavi di test Stripe',503);return k;};
 async function stripe(path,method='GET',form){const res=await fetchImpl('https://api.stripe.com/v1/'+path,{method,headers:{Authorization:'Bearer '+key(),...(form?{'Content-Type':'application/x-www-form-urlencoded'}:{})},body:form?new URLSearchParams(form).toString():undefined});const data=await res.json();if(!res.ok)fail('Stripe: '+(data.error?.message||'errore'),502);return data;}
 // Accredito idempotente: la sessione Stripe è la chiave, un solo accredito per pagamento.
 function credit(userId,sessionId,pack){ensureState(db,userId);db.exec('BEGIN IMMEDIATE');try{
   const done=db.prepare('SELECT result FROM purchases WHERE user_id=? AND request_id=?').get(userId,'stripe:'+sessionId);if(done){db.exec('COMMIT');return {...JSON.parse(done.result),already:true};}
   db.prepare("UPDATE player_state SET balance=balance+?,progress=json_set(progress,'$.gems',coalesce(json_extract(progress,'$.gems'),0)+?) WHERE user_id=?").run(pack.coins,pack.gems,userId);
   const result={ok:true,pack:pack.id,gems:pack.gems,coins:pack.coins};db.prepare('INSERT INTO purchases VALUES(?,?,?)').run(userId,'stripe:'+sessionId,JSON.stringify(result));db.exec('COMMIT');return result;
  }catch(e){db.exec('ROLLBACK');throw e;}}
 function settle(session){const pack=PACKS.find(p=>p.id===session.metadata?.pack);const user=session.client_reference_id;
  if(!pack||!user||session.payment_status!=='paid'||session.amount_total!==pack.amount||session.currency!=='eur')return null;
  if(!db.prepare('SELECT 1 FROM users WHERE id=?').get(user))return null;return credit(user,session.id,pack);}
 return {
  credit,settle,
  async checkout(user,body,origin){
   // Pagamenti di prova (solo test in casa, TEST_PAYMENTS=1 e nessuna chiave Stripe): accredito immediato, nessun addebito.
   if(env.TEST_PAYMENTS==='1'&&!env.STRIPE_SECRET_KEY){const cents=body.custom!==undefined?Math.round(Number(body.custom)):null;
    const pack=cents!==null?(Number.isInteger(cents)&&cents>=100&&cents<=50000?{id:'custom',name:(cents/100).toFixed(2)+' €',gems:0,coins:Math.round(cents*2.5),amount:cents}:fail('Importo da 1 a 500 €')):PACKS.find(p=>p.id===body.pack)||fail('Pacchetto non valido');
    const r=credit(user.id,'sim-'+randomUUID(),pack);return {simulated:true,coins:pack.coins,gems:pack.gems,amount:pack.amount,...(r||{})};}
   const pack=PACKS.find(p=>p.id===body.pack);if(!pack)fail('Pacchetto non valido');
   const base=(env.PUBLIC_ORIGIN||origin).replace(/\/+$/,'');
   const s=await stripe('checkout/sessions','POST',{mode:'payment','line_items[0][quantity]':'1','line_items[0][price_data][currency]':'eur','line_items[0][price_data][unit_amount]':String(pack.amount),'line_items[0][price_data][product_data][name]':'HUMANA · '+pack.name,client_reference_id:user.id,'metadata[pack]':pack.id,success_url:base+'/?checkout={CHECKOUT_SESSION_ID}',cancel_url:base+'/?checkout=cancel'});
   return {url:s.url,session:s.id};},
  async confirm(user,body){const id=String(body.session||'');if(!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(id))fail('Sessione non valida');const s=await stripe('checkout/sessions/'+id);
   if(s.client_reference_id!==user.id)fail('Pagamento di un altro account',403);if(s.payment_status!=='paid')return {ok:false,pending:true};const r=settle(s);if(!r)fail('Pagamento non valido');return r;},
  // Webhook firmato (Stripe-Signature: t=…,v1=…), tolleranza 5 minuti.
  webhook(raw,header,now=Date.now()){const secret=env.STRIPE_WEBHOOK_SECRET;if(!secret)fail('Webhook non configurato',503);
   const parts=Object.fromEntries(String(header||'').split(',').map(p=>p.split('=')).filter(p=>p.length===2));const t=Number(parts.t);
   if(!parts.v1||!Number.isFinite(t)||Math.abs(now/1000-t)>300)fail('Firma non valida',400);
   const expected=createHmac('sha256',secret).update(`${t}.${raw}`).digest('hex');const a=Buffer.from(expected),b=Buffer.from(String(parts.v1));
   if(a.length!==b.length||!timingSafeEqual(a,b))fail('Firma non valida',400);
   const event=JSON.parse(raw);if(event.type==='checkout.session.completed')settle(event.data.object);return {received:true};}
 };
}
