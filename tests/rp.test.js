import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from '../server/database.js';
import {ensureState} from '../server/storage.js';
import {Roleplay} from '../server/rp.js';
import {Police} from '../server/police.js';
import {WORKS,RP} from '../shared/catalog.js';

const setup=()=>{const db=database(':memory:'),log=[];for(const [id,name] of [['c','Agente'],['l','Ladro'],['x','Passante']]){db.prepare('INSERT INTO users(id,username,password) VALUES(?,?,?)').run(id,name,'x');ensureState(db,id);db.prepare('UPDATE player_state SET balance=1000 WHERE user_id=?').run(id);}
 const game={db,log,send:(ws,m)=>log.push({to:ws.id,...m}),players:new Map(),living:null,arena:null};game.police=new Police(game);game.rp=new Roleplay(game);
 const mk=(id,o={})=>{const p={id,username:id==='c'?'Agente':id==='l'?'Ladro':'Passante',room:'mergellina',x:0,y:0,input:{x:0,y:0},ws:{id},myCars:[],...o};game.players.set(id,p);return p;};
 const bal=id=>db.prepare('SELECT balance FROM player_state WHERE user_id=?').get(id).balance;return {db,game,log,mk,bal};};

test('Mestieri: si sceglie un lavoro, si entra in servizio e arriva lo stipendio; resta salvato',()=>{
 const {game,mk,bal}=setup(),rp=game.rp,c=mk('c');
 assert.throws(()=>rp.route('/api/rp/duty','POST',c,{on:true}),/scegli un lavoro/);
 assert.throws(()=>rp.route('/api/rp/work','POST',c,{work:'pirata'}),/sconosciuto/);
 let v=rp.route('/api/rp/work','POST',c,{work:'polizia'});assert.equal(v.work,'polizia');assert.equal(v.duty,false);
 v=rp.route('/api/rp/duty','POST',c,{on:true});assert.equal(v.duty,true);
 rp.tick(c);assert.equal(bal('c'),1000,'stipendio non ancora');c.payAt=Date.now()-1;rp.tick(c);assert.equal(bal('c'),1000+WORKS.polizia.salary,'stipendio');
 const again={id:'c',username:'Agente',room:'mergellina',x:0,y:0,ws:{id:'c'}};rp.load(again);assert.equal(again.work,'polizia');assert.equal(again.duty,true,'salvato');
});

test('Polizia dei giocatori: allarme del furto, arresto solo da vicino e solo dei ricercati, multa',()=>{
 const {game,mk,bal,log}=setup(),rp=game.rp,c=mk('c'),l=mk('l',{x:30}),x=mk('x',{x:2});
 rp.route('/api/rp/work','POST',c,{work:'polizia'});rp.route('/api/rp/duty','POST',c,{on:true});
 assert.throws(()=>rp.route('/api/rp/arrest','POST',x,{id:'l'}),/agenti in servizio/,'un civile non arresta');
 const r=Math.random;Math.random=()=>.99;game.police.crime(l,50);Math.random=r;
 assert.ok(l.wanted.until-Date.now()>(RP.chase-2)*1000,'con agenti in giro la ricerca dura di più');assert.ok(log.some(m=>m.to==='c'&&/furto in corso/i.test(m.message)),'allarme all’agente');
 assert.ok(rp.view(c).wanted.some(q=>q.id==='l'),'il ricercato è nell’elenco');
 assert.throws(()=>rp.route('/api/rp/arrest','POST',c,{id:'l'}),/vicino/,'troppo lontano');
 assert.throws(()=>rp.route('/api/rp/arrest','POST',c,{id:'x'}),/Non è ricercato/);
 l.x=2;l.y=1;rp.route('/api/rp/arrest','POST',c,{id:'l'});assert.ok(l.jail,'in cella');assert.equal(l.wanted,null);assert.equal(bal('c'),1000+RP.arrestReward);
 assert.throws(()=>rp.route('/api/rp/fine','POST',c,{id:'x',amount:9999}),/Multa da/);
 rp.route('/api/rp/fine','POST',c,{id:'x',amount:100,reason:'sosta vietata'});assert.equal(bal('x'),900);assert.equal(bal('c'),1000+RP.arrestReward+Math.round(100*RP.fineCut));
});

test('Feriti e paramedici: chi beve troppo sviene, il 118 avvisa i paramedici, la rianimazione o l’ospedale',()=>{
 const {game,mk,bal,log}=setup(),rp=game.rp,m=mk('c'),x=mk('x',{x:2});
 rp.route('/api/rp/work','POST',m,{work:'medico'});rp.route('/api/rp/duty','POST',m,{on:true});
 x.alcohol=95;x.vehicle='scooter';rp.tick(x);assert.ok(x.down,'svenuto');assert.equal(x.vehicle,null,'giù dal mezzo');
 assert.ok(log.some(q=>q.to==='c'&&/Centrale 118/.test(q.message)),'allarme al paramedico');
 x.input={x:1,y:0};rp.tick(x);assert.deepEqual(x.input,{x:0,y:0},'a terra non si cammina');
 assert.ok(rp.view(m).injured.some(q=>q.id==='x'),'il ferito è nell’elenco');
 assert.throws(()=>rp.route('/api/rp/call118','POST',x,{}),/già chiamato/,'non si chiama di continuo');
 assert.throws(()=>rp.route('/api/rp/revive','POST',mk('l',{x:1}),{id:'x'}),/paramedici/,'solo i paramedici');
 rp.route('/api/rp/revive','POST',m,{id:'x'});assert.equal(x.down,null,'rianimato');assert.equal(bal('c'),1000+RP.reviveReward);
 x.alcohol=95;rp.tick(x);assert.ok(x.down);x.down.until=Date.now()-1;rp.tick(x);
 assert.equal(x.down,null);assert.equal(x.room,'lungomare','in ospedale');assert.equal(bal('x'),1000-RP.hospitalFee,'paga le cure');
});

test('Meccanico: guasto, chiamata, riparazione pagata, rifornimento, carro attrezzi',()=>{
 const {game,mk,bal,log}=setup(),rp=game.rp,m=mk('c'),x=mk('x',{x:2});
 rp.route('/api/rp/work','POST',m,{work:'meccanico'});rp.route('/api/rp/duty','POST',m,{on:true});
 x.vehicle='auto';x.fuel=50;x.fuelFor='auto';const r=Math.random;Math.random=()=>0;
 rp.tick(x);x.x+=RP.breakEvery;rp.tick(x);x.x=2;rp.tick(x);for(let i=0;i<RP.breakEvery/10+2;i++){x.x+=10;rp.tick(x);}Math.random=r;
 assert.ok(x.broken,'guasto');assert.ok(log.some(q=>q.to==='c'&&/in panne/.test(q.message)),'chiamata al meccanico');
 x.input={x:1,y:0};rp.tick(x);assert.deepEqual(x.input,{x:0,y:0},'il mezzo guasto non parte');
 x.x=m.x+1;rp.route('/api/rp/repair','POST',m,{id:'x'});assert.equal(x.broken,null);assert.equal(bal('x'),1000-RP.repairFee);assert.equal(bal('c'),1000+RP.repairFee+RP.repairReward);
 rp.route('/api/rp/refuel','POST',m,{id:'x'});assert.equal(x.fuel,50+RP.mechFuel,'benzina +50');
 x.broken={t0:0,until:Date.now()-1,called:0};rp.tick(x);assert.equal(x.broken,null,'carro attrezzi');
});

test('Taxi: chiamata, tassametro durante la corsa, pagamento quando si scende',()=>{
 const {game,mk,bal,log}=setup(),rp=game.rp,t=mk('c',{vehicle:'auto'}),x=mk('x',{x:1});
 rp.route('/api/rp/work','POST',t,{work:'taxi'});rp.route('/api/rp/duty','POST',t,{on:true});
 rp.route('/api/rp/calltaxi','POST',x,{});assert.ok(log.some(q=>q.to==='c'&&/vuole un passaggio/.test(q.message)));
 x.seat='car';x.passenger='c';rp.tick(x);for(let i=0;i<100;i++){x.x+=10;rp.tick(x);}
 x.seat=null;x.passenger=null;rp.tick(x);const cost=Math.round(RP.taxiBase+1*RP.taxiPerKm);
 assert.equal(bal('x'),1000-cost,'il cliente paga la corsa di 1 km');assert.equal(bal('c'),1000+cost,'il tassista incassa');
});
