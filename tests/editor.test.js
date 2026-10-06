import {test} from 'node:test';import assert from 'node:assert/strict';
import {database} from '../server/database.js';import {MapEditor} from '../server/editor.js';import {MAPS,canStand,applyMapEdits} from '../shared/world.js';
test('Editor mappa: solo admin, aggiungi/sposta/ruota/elimina/annulla, salvataggio e invio a tutti',()=>{
 process.env.ADMIN_USERS='Boss';const db=database(':memory:'),sent=[],game={players:new Map([['x',{ws:{}}]]),send:(ws,m)=>sent.push(m)};
 for(const [id,name] of [['a','Boss'],['b','Ospite']])db.prepare('INSERT INTO users(id,username,password) VALUES(?,?,?)').run(id,name,'x');
 const ed=new MapEditor(db,game),boss={id:'a',username:'Boss'},guest={id:'b',username:'Ospite'},m=MAPS.lungomare,n=m.buildings.length;
 assert.throws(()=>ed.apply(guest,{op:'add',type:'prop',kind:'bench',x:30,y:30}),/admin/);
 const v=ed.apply(boss,{op:'add',type:'building',art:'villa-2',x:70,y:120});assert.equal(m.buildings.length,n+1);assert.equal(canStand('lungomare',70,120),false);
 ed.apply(boss,{op:'update',id:v.id,dx:4,dy:0});assert.equal(canStand('lungomare',70,120),true);assert.equal(canStand('lungomare',74,120),false);
 ed.apply(boss,{op:'update',id:v.id,flip:true});assert.equal(m.buildings.find(b=>b.id===v.id).flip,true);
 const bench=ed.apply(boss,{op:'add',type:'prop',kind:'parked-auto',x:40,y:40});assert.equal(m.props.find(p=>p.id===bench.id).kind,'parked');
 ed.apply(boss,{op:'remove',id:'bar'});assert.ok(!m.buildings.some(b=>b.id==='bar'));ed.apply(boss,{op:'undo'});assert.ok(m.buildings.some(b=>b.id==='bar'));
 assert.throws(()=>ed.apply(boss,{op:'add',type:'prop',kind:'razzo',x:1,y:1}),/sconosciuto/);assert.throws(()=>ed.apply(boss,{op:'add',type:'prop',kind:'bench',x:-5,y:1}),/fuori/);
 assert.ok(sent.every(s=>s.type==='mapEdits'));const saved=JSON.parse(db.prepare('SELECT doc FROM map_edits').get().doc);assert.equal(saved.add.length,2);
 ed.apply(boss,{op:'reset'});assert.equal(m.buildings.length,n);applyMapEdits({});delete process.env.ADMIN_USERS;});
