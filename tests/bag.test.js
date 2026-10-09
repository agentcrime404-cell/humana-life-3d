import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from '../server/database.js';
import {ensureState} from '../server/storage.js';
import {Living} from '../server/living.js';
import {Service} from '../server/service.js';
import {Fuel} from '../server/fuel.js';
import {Bag} from '../server/bag.js';
import {BAG} from '../shared/catalog.js';

const setup=()=>{const db=database(':memory:'),log=[];for(const [id,name] of [['a','Anna'],['b','Bruno']]){db.prepare('INSERT INTO users(id,username,password) VALUES(?,?,?)').run(id,name,'x');ensureState(db,id);db.prepare('UPDATE player_state SET balance=1000 WHERE user_id=?').run(id);}
 const game={db,log,send:(ws,m)=>log.push({to:ws.id,...m}),players:new Map(),arena:null};game.service=new Service(game);game.fuel=new Fuel(game);game.bag=new Bag(game);const living=new Living(db,game);living.edition='3d';game.living=living;
 const mk=(id,o={})=>{const p={id,username:id==='a'?'Anna':'Bruno',room:'shop',x:5,y:5,input:{x:0,y:0},ws:{id},myCars:[],...o};game.players.set(id,p);return p;};
 let n=0;const buy=(id,item)=>living.purchase(id,{item,requestId:'prova-acquisto-'+(++n)});const said=(id,re)=>log.some(m=>m.to===id&&re.test(m.message||''));return {game,mk,buy,said,bag:game.bag};};

test('Zaino: si compra nella Bottega, gli oggetti pesano e lo zaino ha un limite',()=>{
 const {mk,buy,bag}=setup();mk('a');
 assert.equal(bag.view('a').items.length,0,'zaino vuoto');
 buy('a','zaino-birra');buy('a','zaino-birra');buy('a','zaino-acqua');
 const v=bag.view('a');assert.equal(v.items.find(i=>i.id==='zaino-birra').qty,2);assert.equal(v.kg,1.5);assert.equal(v.max,BAG.max);
 for(let i=0;i<3;i++)buy('a','zaino-tanica');assert.equal(bag.view('a').kg,16.5);
 assert.throws(()=>buy('a','zaino-tanica'),/Zaino pieno/,'oltre 20 kg non si compra');
 buy('a','zaino-rosa');assert.equal(bag.view('a').kg,16.6,'una rosa ci sta ancora');
});

test('Zaino: usare birra, acqua, panino, tanica e rosa',()=>{
 const {mk,buy,bag,said}=setup();const a=mk('a');
 buy('a','zaino-birra');buy('a','zaino-acqua');buy('a','zaino-panino');buy('a','zaino-tanica');buy('a','zaino-rosa');
 bag.use(a,'zaino-birra');assert.ok(a.alcohol>=30,'brillo');assert.equal(a.consuming.kind,'drink','animazione del bere');assert.equal(bag.qty('a','zaino-birra'),0,'la birra è finita');
 assert.throws(()=>bag.use(a,'zaino-acqua'),/Finisci prima/,'un oggetto alla volta');
 a.consuming=null;const before=a.alcohol;bag.use(a,'zaino-acqua');assert.ok(a.alcohol<before,'l’acqua fa passare la sbornia');
 a.consuming=null;bag.use(a,'zaino-panino');assert.equal(a.consuming.kind,'food');assert.ok(said('a',/Mangi/));
 a.consuming=null;assert.throws(()=>bag.use(a,'zaino-tanica'),/mezzo a motore/,'la tanica serve a un mezzo');
 a.vehicle='scooter';a.fuel=10;a.fuelFor='scooter';a.tanks={scooter:10};bag.use(a,'zaino-tanica');assert.equal(a.fuel,10+BAG.fuel,'benzina +40');assert.equal(bag.qty('a','zaino-tanica'),0);
 bag.use(a,'zaino-rosa');assert.equal(bag.qty('a','zaino-rosa'),1,'la rosa non si consuma: si regala');
 assert.throws(()=>bag.use(a,'zaino-birra'),/Non ce l/,'senza birra non si beve');
});

test('Zaino: dare un oggetto a chi è vicino e buttare',()=>{
 const {mk,buy,bag,said,game}=setup();const a=mk('a'),b=mk('b',{x:40});
 buy('a','zaino-rosa');buy('a','zaino-caffe');
 assert.throws(()=>bag.give(a,'zaino-rosa','b'),/Avvicinati/,'troppo lontano');
 b.x=6;bag.give(a,'zaino-rosa','b');assert.equal(bag.qty('a','zaino-rosa'),0);assert.equal(bag.qty('b','zaino-rosa'),1);assert.ok(said('b',/Anna ti ha dato 🌹/));
 game.db.prepare('INSERT INTO inventory VALUES(?,?,4) ON CONFLICT(user_id,item) DO UPDATE SET quantity=4').run('b','zaino-tanica');
 buy('a','zaino-tanica');assert.throws(()=>bag.give(a,'zaino-tanica','b'),/pieno/,'lo zaino di Bruno è pieno');
 bag.drop(a,'zaino-caffe');assert.equal(bag.qty('a','zaino-caffe'),0);assert.throws(()=>bag.drop(a,'zaino-caffe'),/Non ce l/);
});
