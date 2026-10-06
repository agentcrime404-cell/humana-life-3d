import {test} from 'node:test';import assert from 'node:assert/strict';
import {database} from '../server/database.js';import {Game} from '../server/game.js';
test('Chiamate: solo tra amici, segnalazione inoltrata all’interlocutore e chiusura alla disconnessione',()=>{
 const db=database(':memory:'),game=new Game(db);const inbox={a:[],b:[],c:[]};
 game.send=(ws,m)=>inbox[ws.id].push(m);game.living={friends:(x,y)=>[x,y].sort().join()==='a,b'};
 for(const id of ['a','b','c'])game.players.set(id,{id,username:id.toUpperCase(),ws:{id}});
 const [a,b,c]=['a','b','c'].map(id=>game.players.get(id));
 game.call(c,{action:'invite',to:'a'});assert.equal(inbox.c.pop().reason,'not-friend');assert.equal(a.call,undefined);
 game.call(a,{action:'invite',to:'b'});assert.deepEqual(inbox.b.pop(),{type:'call',action:'invite',from:'a',username:'A'});
 game.call(a,{action:'signal',description:{type:'offer',sdp:'x'}});assert.equal(inbox.b.length,0,'nessun segnale prima della risposta');
 game.call(b,{action:'accept'});assert.equal(inbox.a.pop().action,'accept');
 game.call(a,{action:'signal',description:{type:'offer',sdp:'v=0'}});assert.equal(inbox.b.pop().description.sdp,'v=0');
 game.call(c,{action:'invite',to:'b'});assert.equal(inbox.c.pop().reason,'not-friend');
 game.hangup(b,'offline');assert.equal(inbox.a.pop().reason,'offline');assert.equal(a.call,null);
 clearInterval(game.clock);
});
