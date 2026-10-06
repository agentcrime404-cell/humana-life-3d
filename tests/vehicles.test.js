import {test} from 'node:test';import assert from 'node:assert/strict';
import {database} from '../server/database.js';import {Living} from '../server/living.js';import {step,MAPS} from '../shared/world.js';
function setup(balance){const db=database(':memory:');db.prepare('INSERT INTO users(id,username,password) VALUES(?,?,?)').run('a','A','x');const players=new Map([['a',{id:'a',room:'lungomare',x:0,y:0}]]),living=new Living(db,{players,blocked:()=>false});living.route('/api/state','GET',{id:'a'},{});db.prepare('UPDATE player_state SET balance=? WHERE user_id=?').run(balance,'a');return {db,living,players};}
test('Mezzi: sblocco, noleggio, saldo e mezzo ripreso al rientro',()=>{
 const {living,players}=setup(300),me=players.get('a'),call=(p,b)=>living.route('/api/vehicle/'+p,'POST',{id:'a'},b);
 assert.throws(()=>call('use',{id:'monopattino'}),/sblocca/);
 let g=call('buy',{id:'monopattino'});assert.equal(g.balance,50);assert.ok(g.vehicles.find(v=>v.id==='monopattino').owned);
 assert.throws(()=>call('buy',{id:'monopattino'}),/già/);assert.throws(()=>call('rent',{id:'auto'}),/insufficienti/);
 call('use',{id:'monopattino'});assert.equal(me.vehicle,'monopattino');assert.equal(living.lastVehicle('a'),'monopattino');
 call('use',{id:''});assert.equal(me.vehicle,null);assert.equal(living.lastVehicle('a'),null);
 me.room='bar';assert.throws(()=>call('use',{id:'monopattino'}),/aperto/);});
test('Mezzi: la velocità cresce solo all’aperto',()=>{const at=room=>{const p={room,x:MAPS[room].spawn?.x??10,y:MAPS[room].spawn?.y??10,vehicle:'auto'},x=p.x;for(let i=0;i<20;i++)step(p,{x:1,y:0},.1);return p.x-x;};
 const walk={room:'lungomare',x:MAPS.lungomare.spawn?.x??10,y:MAPS.lungomare.spawn?.y??10};const x0=walk.x;for(let i=0;i<20;i++)step(walk,{x:1,y:0},.1);assert.ok(at('lungomare')>(walk.x-x0)*1.6,'in 2 secondi l’auto (che accelera) supera di molto chi cammina');});
