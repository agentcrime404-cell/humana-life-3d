import {test} from 'node:test';import assert from 'node:assert/strict';
import {database} from '../server/database.js';import {Phone} from '../server/phone.js';
test('Telefono: numero unico per giocatore, rubrica, ricerca e chiamata col numero giusto',()=>{
 const db=database(':memory:');for(const [id,n] of [['a','A'],['b','B']])db.prepare('INSERT INTO users(id,username,password) VALUES(?,?,?)').run(id,n,'x');
 const ph=new Phone(db,{players:new Map([['b',{}]])}),na=ph.numberOf('a'),nb=ph.numberOf('b');
 assert.match(na,/^081\d{7}$/);assert.notEqual(na,nb);assert.equal(ph.numberOf('a'),na);
 assert.equal(ph.route('/api/phone/lookup','GET',{id:'a'},{n:nb}).username,'B');assert.throws(()=>ph.route('/api/phone/lookup','GET',{id:'a'},{n:'0810000000'}),/inesistente/);
 const v=ph.route('/api/phone/contacts','POST',{id:'a'},{name:'Babbo',number:nb});assert.equal(v.contacts[0].name,'Babbo');assert.equal(v.contacts[0].online,true);
 assert.equal(ph.allows('b',nb),true);assert.equal(ph.allows('b',na),false);
 assert.equal(ph.route('/api/phone/contacts/delete','POST',{id:'a'},{number:nb}).contacts.length,0);});
