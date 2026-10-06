import {test} from 'node:test';import assert from 'node:assert/strict';
import {database} from '../server/database.js';import {Living} from '../server/living.js';import {MAPS} from '../shared/world.js';
function setup(){const db=database(':memory:');for(const id of ['a','b'])db.prepare('INSERT INTO users(id,username,password) VALUES(?,?,?)').run(id,id.toUpperCase(),'x');
 const players=new Map(),living=new Living(db,{players,blocked:()=>false});const villa=MAPS.lungomare.buildings.find(b=>b.id==='villa0');
 for(const id of ['a','b'])players.set(id,{id,room:'lungomare',x:villa.door.x,y:villa.door.y});living.route('/api/state','GET',{id:'a'},{});living.route('/api/state','GET',{id:'b'},{});return {db,living,players};}
test('Ville: affitto, acquisto, esclusività e prezzo in monete',()=>{
 const {db,living}=setup();assert.throws(()=>living.villaDeal('villa0','a','buy'),/5000 monete/);
 db.prepare("UPDATE player_state SET balance=6000 WHERE user_id='a'").run();db.prepare("UPDATE player_state SET balance=1000 WHERE user_id='b'").run();
 const r=living.villaDeal('villa0','a','rent');assert.equal(r.status,'mine');assert.equal(r.balance,5600);assert.ok(living.villaAccess('a','villa0'));assert.equal(living.villaAccess('b','villa0'),false);
 assert.throws(()=>living.villaDeal('villa0','b','rent'),/occupata/);assert.equal(living.villaInfo('villa0','b').owner,'A');
 living.villaDeal('villa0','a','buy');assert.equal(living.villaInfo('villa0','a').mode,'buy');assert.throws(()=>living.villaDeal('villa0','a','buy'),/già tua/);
});
test('Moda e barbiere: catalogo ampio, acquisto solo nel negozio, look salvato nell’avatar',async()=>{
 const {WEAR_ITEMS,HAIR_STYLES,BEARD_STYLES}=await import('../shared/catalog.js');assert.ok(WEAR_ITEMS.length>=1000);assert.equal(HAIR_STYLES.length+BEARD_STYLES.length,30);
 const {db,living,players}=setup();db.prepare("UPDATE player_state SET balance=500 WHERE user_id='a'").run();const item=WEAR_ITEMS.find(i=>i.slot==='hat');
 assert.throws(()=>living.purchase('a',{item:item.id,requestId:'req-hat-0001'}),/Moda Market/);players.get('a').room='fashion';
 living.purchase('a',{item:item.id,requestId:'req-hat-0002'});const av=living.route('/api/wear','POST',{id:'a',avatar:'{}'},{item:item.id});assert.equal(av.wear.hat.color,item.color);
 assert.throws(()=>living.route('/api/barber','POST',{id:'a'},{hair:6,beard:2,color:3}),/Barbiere/);players.get('a').room='barber';
 const r=living.route('/api/barber','POST',{id:'a'},{hair:6,beard:2,color:3});assert.equal(r.avatar.hair.style,6);assert.equal(r.avatar.beard,2);assert.ok(r.avatar.wear.hat,'il cappello resta');
});
test('Recinzioni delle ville: cancello aperto, lati chiusi; autobus su percorso reale',async()=>{
 const {VILLA_LOTS,routePoint,routeDistance,BUS_STOPS}=await import('../shared/district.js');const {canStand}=await import('../shared/world.js');const l=VILLA_LOTS[0];
 assert.equal(canStand('lungomare',l.x+4,l.y+l.h),true,'cancello pedonale');assert.equal(canStand('lungomare',l.x+6.5,l.y+l.h),false,'recinzione frontale');assert.equal(canStand('lungomare',l.x,l.y+5),false,'lato');
 const s=BUS_STOPS[2];const p=routePoint(routeDistance(s.at));assert.ok(Math.hypot(p.x-s.at.x,p.y-s.at.y)<1.2,'la corsia dell’autobus passa accanto alla fermata');
});
test('Slot: solo nella sala, fiches gratuite e mai monete',()=>{
 const {db,living,players}=setup();assert.throws(()=>living.spin('a',5),/Sala Slot/);
 Object.assign(players.get('a'),{room:'casino',x:3,y:4});const before=db.prepare("SELECT balance FROM player_state WHERE user_id='a'").get().balance;
 let fiches;for(let i=0;i<20;i++)fiches=living.spin('a',1).fiches;assert.ok(fiches>=0&&fiches<=100+20*60);
 assert.equal(db.prepare("SELECT balance FROM player_state WHERE user_id='a'").get().balance,before);assert.throws(()=>living.spin('a',7),/Puntata/);
});
