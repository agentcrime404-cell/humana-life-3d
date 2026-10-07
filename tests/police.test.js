import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {Police} from '../server/police.js';
import {PRISON,POLICE,policeGeom,prisonCell,STEAL_PATHS} from '../shared/catalog.js';

const game=()=>{const log=[];return {log,send:(ws,m)=>log.push(m),living:null,arena:null,players:new Map()};};
const player=(o={})=>({id:'p',username:'p',room:'lungomare',x:60,y:60,input:{x:0,y:0},ws:{},myCars:[],...o});

test('Furto: chi prende senza pagare diventa ricercato; se lo vedono va in cella 60 secondi, poi lo liberano alla porta',()=>{
 const g=game(),po=new Police(g),p=player({vehicle:'auto',seat:null});
 const r=Math.random;Math.random=()=>0;
 po.crime(p,20);Math.random=r;assert.ok(p.wanted&&p.wanted.caught,'ricercato e visto');assert.ok(g.log.some(m=>/senza pagare/.test(m.message)));
 po.tick(p);assert.ok(p.wanted&&!p.jail,'prima del tempo non succede nulla');
 p.wanted.until=Date.now()-1;po.tick(p);assert.ok(p.jail,'arrestato');assert.equal(p.vehicle,null);assert.equal(p.wanted,null);
 const st=POLICE.find(c=>c.id===p.jail.station),cell=prisonCell(st);assert.deepEqual([p.x,p.y],[cell.x,cell.y]);
 assert.ok(Math.abs((p.jail.until-p.jail.t0)-PRISON.seconds*1000)<50,'un minuto');
 p.input={x:1,y:0};po.tick(p);assert.deepEqual(p.input,{x:0,y:0},'in cella non ci si muove');assert.ok(p.jail);
 p.jail.until=Date.now()-1;po.tick(p);assert.equal(p.jail,null,'liberato');const d=policeGeom(st).door;assert.ok(Math.hypot(p.x-d.x,p.y-d.y)<2,'alla porta della caserma');
 assert.ok(g.log.some(m=>/liberarti/.test(m.message)));
});

test('Furto: a volte nessuno vede e la fai franca',()=>{
 const g=game(),po=new Police(g),p=player();const r=Math.random;Math.random=()=>.99;po.crime(p,5);Math.random=r;assert.equal(p.wanted.caught,false);
 p.wanted.until=Date.now()-1;po.tick(p);assert.equal(p.wanted,null);assert.equal(p.jail,undefined);assert.ok(g.log.some(m=>/franca/.test(m.message)));
});

test('Il furto vale per acquisti, barbiere, bevande, benzina e mezzi',()=>{
 for(const q of ['/api/purchase','/api/barber','/api/vending','/api/service/order','/api/fuel/refill','/api/vehicle/buy'])assert.ok(STEAL_PATHS.includes(q),q);
 assert.ok(!STEAL_PATHS.includes('/api/atm/exchange')&&!STEAL_PATHS.includes('/api/slot'),'banca e slot non si rubano');
});
