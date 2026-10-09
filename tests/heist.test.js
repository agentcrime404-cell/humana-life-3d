import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from '../server/database.js';
import {ensureState} from '../server/storage.js';
import {Roleplay} from '../server/rp.js';
import {Police} from '../server/police.js';
import {Heists} from '../server/heist.js';
import {HEISTS,HEIST_TIERS,PRISON,RP} from '../shared/catalog.js';

const setup=()=>{const db=database(':memory:'),log=[];for(const [id,name] of [['c','Agente'],['l','Ladro'],['x','Cliente'],['y','Ladro2']]){db.prepare('INSERT INTO users(id,username,password) VALUES(?,?,?)').run(id,name,'x');ensureState(db,id);db.prepare('UPDATE player_state SET balance=1000 WHERE user_id=?').run(id);}
 const game={db,log,send:(ws,m)=>log.push({to:ws.id,...m}),players:new Map(),living:null,arena:null};game.police=new Police(game);game.rp=new Roleplay(game);game.heist=new Heists(game);
 const names={c:'Agente',l:'Ladro',x:'Cliente',y:'Ladro2'};const mk=(id,o={})=>{const p={id,username:names[id],room:'bar',x:8,y:6,input:{x:0,y:0},ws:{id},myCars:[],...o};game.players.set(id,p);return p;};
 const bal=id=>db.prepare('SELECT balance FROM player_state WHERE user_id=?').get(id).balance;const said=(id,re)=>log.some(m=>m.to===id&&re.test(m.message||''));return {game,mk,bal,said};};
const finish=p=>{p.heist.until=Date.now()-1;};

test('Rapine: solo nei locali giusti, una alla volta, e il locale resta «chiuso» per un po',()=>{
 const {game,mk}=setup(),H=game.heist;
 assert.equal(HEISTS.villa0,undefined,'le ville private non si rapinano');
 const v=mk('l',{room:'villa0'});assert.throws(()=>H.route('/api/heist/start','POST',v,{}),/niente da rapinare/);
 const l=mk('l');H.route('/api/heist/start','POST',l,{});assert.ok(l.heist&&l.heist.room==='bar');
 assert.ok(l.heist.until-l.heist.t0===HEIST_TIERS.small.sec*1000,'30 secondi per un bar');
 assert.throws(()=>H.route('/api/heist/start','POST',l,{}),/già rapinando/);
 const y=mk('y');assert.throws(()=>H.route('/api/heist/start','POST',y,{}),/appena rapinato/,'il bar è in pausa');
 const b=mk('y',{room:'bank'});H.route('/api/heist/start','POST',b,{});assert.equal(b.heist.until-b.heist.t0,HEIST_TIERS.bank.sec*1000,'la banca dura 90 secondi');
});

test('Rapine: chi esce prima non prende niente; chi resiste prende il bottino e poi deve scappare fuori',()=>{
 const {game,mk,bal,said}=setup(),H=game.heist,P=game.police;
 const l=mk('l'),x=mk('x');H.start(l);assert.ok(said('x',/Rapina!/),'chi è nel locale vede la rapina');
 l.room='mergellina';H.tick(l);assert.equal(l.heist,null);assert.equal(bal('l'),1000,'uscito prima: niente soldi');assert.ok(said('l',/fallita/));
 const y=mk('y',{room:'shop'});H.start(y);H.tick(y);assert.ok(y.heist,'prima della fine non succede niente');
 finish(y);H.tick(y);assert.equal(y.heist,null);const got=bal('y')-1000;assert.ok(got>=HEIST_TIERS.small.loot[0]&&got<=HEIST_TIERS.small.loot[1],'bottino nel limite: '+got);
 assert.ok(y.wanted&&y.wanted.room==='shop','dopo il colpo è ricercato');
 y.wanted.caught=true;y.room='mergellina';y.x=200;y.wanted.until=Date.now()-1;P.tick(y);assert.ok(!y.jail,'uscito dal locale: ha seminato la polizia');assert.ok(said('y',/seminati/));
 const z=mk('x',{room:'pizzeria'});H.start(z);finish(z);H.tick(z);z.wanted.caught=true;z.wanted.until=Date.now()-1;P.tick(z);assert.ok(z.jail,'rimasto dentro: arrestato');
});

test('Rapine con la polizia dei giocatori: allarme subito, ricercato durante il colpo, l’arresto annulla il bottino',()=>{
 const {game,mk,bal,said}=setup(),H=game.heist,R=game.rp;
 const c=mk('c',{room:'mergellina',x:0,y:0});R.route('/api/rp/work','POST',c,{work:'polizia'});R.route('/api/rp/duty','POST',c,{on:true});
 assert.throws(()=>H.start(mk('x',{room:'bar',work:'polizia',duty:true,rpLoaded:true})),/agente in servizio/,'un agente in servizio non rapina');
 const l=mk('l',{room:'bank'});H.start(l);assert.ok(said('c',/RAPINA in corso/),'allarme all’agente');assert.ok(l.wanted&&l.wanted.cops,'ricercato da subito');
 assert.ok(R.view(c).wanted.some(q=>q.id==='l'),'compare tra i ricercati');
 c.room='bank';c.x=l.x+1;c.y=l.y;R.route('/api/rp/arrest','POST',c,{id:'l'});assert.ok(l.jail,'arrestato durante la rapina');
 H.tick(l);assert.equal(l.heist,null);assert.equal(bal('l'),1000,'niente bottino');assert.equal(bal('c'),1000+RP.arrestReward);
 const y=mk('y',{room:'casino'});y.wanted={until:Date.now()+5000};assert.throws(()=>H.start(y),/polizia alle calcagna/,'chi è già ricercato non rapina');
});
