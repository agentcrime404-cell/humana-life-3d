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
