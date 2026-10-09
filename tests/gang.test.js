import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from '../server/database.js';
import {ensureState} from '../server/storage.js';
import {Gangs} from '../server/gang.js';
import {GANG} from '../shared/catalog.js';

const setup=()=>{const db=database(':memory:'),log=[];const N={a:'Capo',b:'Socio',c:'Lontano'};for(const [id,name] of Object.entries(N)){db.prepare('INSERT INTO users(id,username,password) VALUES(?,?,?)').run(id,name,'x');ensureState(db,id);db.prepare('UPDATE player_state SET balance=5000 WHERE user_id=?').run(id);}
 const game={db,log,send:(ws,m)=>log.push({to:ws.id,...m}),players:new Map()};game.gangs=new Gangs(game);
 const mk=(id,o={})=>{const p={id,username:N[id],room:'mergellina',x:0,y:0,ws:{id},...o};game.players.set(id,p);return p;};
 const bal=id=>db.prepare('SELECT balance FROM player_state WHERE user_id=?').get(id).balance;return {game,mk,bal,G:game.gangs,said:(id,re)=>log.some(m=>m.to===id&&re.test(m.message||''))};};

test('Gang: fondare, invitare chi è vicino, accettare, nome sopra la testa',()=>{
 const {mk,bal,G,said}=setup(),a=mk('a'),b=mk('b',{x:2}),c=mk('c',{x:50});
 assert.throws(()=>G.route('/api/gang/create','POST',a,{name:'x'}),/Nome da 3/);
 G.route('/api/gang/create','POST',a,{name:'I Mergellini',color:GANG.colors[1]});assert.equal(bal('a'),5000-GANG.price);assert.equal(a.gang.name,'I Mergellini');
 assert.throws(()=>G.route('/api/gang/create','POST',b,{name:'i mergellini'}),/già preso/,'nome unico (senza badare alle maiuscole)');
 assert.throws(()=>G.route('/api/gang/invite','POST',a,{id:'c'}),/Avvicinati/);
 G.route('/api/gang/invite','POST',a,{id:'b'});assert.ok(said('b',/ti invita/));assert.equal(G.view(b).invites.length,1);
 assert.throws(()=>G.route('/api/gang/invite','POST',b,{id:'c'}),/Solo il capo/);
 G.route('/api/gang/accept','POST',b,{gang:a.gang.id});assert.equal(b.gang.name,'I Mergellini');assert.equal(G.view(a).gang.members.length,2);
});

test('Gang: cassa comune, quota delle rapine, capo che esce e scioglimento',()=>{
 const {mk,bal,G}=setup(),a=mk('a'),b=mk('b',{x:2});
 G.route('/api/gang/create','POST',a,{name:'Borgo Marinari'});G.route('/api/gang/invite','POST',a,{id:'b'});G.route('/api/gang/accept','POST',b,{gang:a.gang.id});
 G.route('/api/gang/deposit','POST',b,{amount:300});assert.equal(bal('b'),4700);assert.equal(G.of('a').cassa,300);
 assert.throws(()=>G.route('/api/gang/withdraw','POST',b,{amount:100}),/Solo il capo/);
 G.loot(b,500);assert.equal(G.of('a').cassa,300+500*GANG.cut,'10% del bottino in cassa');
 G.route('/api/gang/withdraw','POST',a,{amount:100});assert.equal(G.of('a').cassa,250);
 G.route('/api/gang/leave','POST',a,{});assert.equal(a.gang,null);assert.equal(G.of('b').leader,'b','il socio diventa capo');
 const before=bal('b');G.route('/api/gang/leave','POST',b,{});assert.equal(G.of('b'),null);assert.equal(bal('b'),before+250,'l’ultimo prende la cassa');
});
