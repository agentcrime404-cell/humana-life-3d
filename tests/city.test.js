import {test} from 'node:test';import assert from 'node:assert/strict';import {createHmac} from 'node:crypto';
import {database} from '../server/database.js';import {payments} from '../server/payments.js';
import {MAPS,canStand,distance} from '../shared/world.js';import {BUS_STOPS,busPosition,CITY_SIZE,WORLD_SIZE} from '../shared/district.js';
test('Città ampliata: fermate, bancomat e confini percorribili correttamente',()=>{
 const m=MAPS.lungomare;assert.equal(m.bounds.w,WORLD_SIZE);
 for(const s of BUS_STOPS)assert.ok(canStand('lungomare',s.x,s.y),'Fermata libera: '+s.id);
 assert.ok(m.props.filter(p=>p.kind==='atm').every(a=>[[0,1.2],[0,-1.2],[1.2,0],[-1.2,0]].some(([dx,dy])=>canStand('lungomare',a.x+dx,a.y+dy))));
 assert.equal(canStand('lungomare',CITY_SIZE+20,40),true);assert.equal(canStand('lungomare',WORLD_SIZE+1,40),false);
 for(const id of ['bank','mall','burger','osteria'])assert.ok(MAPS[id],'Interno '+id);
 const stops=new Set();for(let t=0;t<200;t+=.5){const b=busPosition(t);if(b.stop)stops.add(b.stop);}assert.equal(stops.size,BUS_STOPS.length);
});
function setup(env={}){const db=database(':memory:');db.prepare("INSERT INTO users(id,username,password) VALUES('u1','buyer','x')").run();return {db,pay:payments(db,{env})};}
const gems=db=>JSON.parse(db.prepare('SELECT progress FROM player_state WHERE user_id=?').get('u1').progress).gems||0;
test('Stripe: senza chiave o con chiave live il checkout è rifiutato',async()=>{
 await assert.rejects(setup().pay.checkout({id:'u1'},{pack:'gems-10'},'http://x'),/STRIPE_SECRET_KEY/);
 await assert.rejects(setup({STRIPE_SECRET_KEY:'sk_live_abc'}).pay.checkout({id:'u1'},{pack:'gems-10'},'http://x'),/test/);
});
test('Stripe: checkout con prezzo deciso dal server e accredito una sola volta',async()=>{
 const sent=[];const {db}=setup();const pay=payments(db,{env:{STRIPE_SECRET_KEY:'sk_test_x'},fetchImpl:async(url,o)=>{sent.push({url,o});return {ok:true,json:async()=>url.includes('/cs_test_')?{id:'cs_test_abcdefghij12',client_reference_id:'u1',payment_status:'paid',amount_total:99,currency:'eur',metadata:{pack:'gems-10'}}:{id:'cs_test_abcdefghij12',url:'https://checkout.stripe.com/x'}};}});
 const r=await pay.checkout({id:'u1'},{pack:'gems-10',amount:1},'http://localhost:3077');assert.equal(r.url,'https://checkout.stripe.com/x');assert.match(sent[0].o.body,/unit_amount%5D=99/);
 await pay.confirm({id:'u1'},{session:'cs_test_abcdefghij12'});await pay.confirm({id:'u1'},{session:'cs_test_abcdefghij12'});assert.equal(gems(db),10);
 await assert.rejects(pay.confirm({id:'u2'},{session:'cs_test_abcdefghij12'}),/altro account/);
});
test('Stripe: webhook accetta solo firme valide e non accredita due volte',()=>{
 const {db}=setup();const pay=payments(db,{env:{STRIPE_WEBHOOK_SECRET:'whsec_test'}});
 const raw=JSON.stringify({type:'checkout.session.completed',data:{object:{id:'cs_test_hook1234567',client_reference_id:'u1',payment_status:'paid',amount_total:499,currency:'eur',metadata:{pack:'gems-60'}}}});
 const t=Math.floor(Date.now()/1000),sig=createHmac('sha256','whsec_test').update(`${t}.${raw}`).digest('hex');
 assert.throws(()=>pay.webhook(raw,`t=${t},v1=${'0'.repeat(64)}`),/Firma/);
 pay.webhook(raw,`t=${t},v1=${sig}`);pay.webhook(raw,`t=${t},v1=${sig}`);assert.equal(gems(db),60);
 const tampered=raw.replace('499','1');assert.throws(()=>pay.webhook(tampered,`t=${t},v1=${sig}`),/Firma/);
});
