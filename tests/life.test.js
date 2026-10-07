import test from 'node:test';
import assert from 'node:assert/strict';
import {Fuel} from '../server/fuel.js';
import {Service} from '../server/service.js';
import {FUEL,GAS,gasGeom,MENU,COUNTER,ALCOHOL_SECONDS,solidBlocks,POLICE,policeGeom} from '../shared/catalog.js';
import {step,canStand,EXTRA_BLOCKS} from '../shared/world.js';

const game=()=>{const log=[];return {log,send:(ws,m)=>log.push(m)};};
const player=(o={})=>({id:'p',username:'p',room:'lungomare',x:50,y:50,input:{x:0,y:0},ws:{},...o});

test('Benzina: si consuma con i metri, a zero il mezzo si ferma, ogni mezzo ha il suo serbatoio',()=>{
 const g=game(),f=new Fuel(g),p=player({vehicle:'auto'});f.tick(p,0);assert.equal(p.fuel,FUEL.tank);
 f.tick(p,100);assert.equal(Math.round(p.fuel),Math.round(FUEL.tank-100*FUEL.perMeter));
 f.tick(p,100000);assert.equal(p.fuel,0);assert.ok(g.log.some(m=>/finita/.test(m.message)),'avviso benzina finita');
 // senza benzina il mezzo non avanza (stessa funzione step usata da client e server)
 p.heading=0;p.vel=0;const x0=p.x;for(let i=0;i<100;i++)step(p,{x:1,y:0},.05);assert.ok(Math.abs(p.x-x0)<.05,'fermo senza benzina');
 // con benzina avanza
 p.fuel=50;p.vel=0;for(let i=0;i<100;i++)step(p,{x:1,y:0},.05);assert.ok(p.x-x0>3,'avanza con benzina');
 // cambiare mezzo non regala il pieno del vecchio
 p.fuel=0;f.tick(p,0);p.vehicle='cabrio';f.tick(p,0);assert.equal(p.fuel,FUEL.tank,'altro mezzo: suo serbatoio pieno');p.vehicle='auto';f.tick(p,0);assert.equal(p.fuel,0,'tornando sul primo è ancora vuoto');
 // bici e monopattino non consumano
 const b=player({vehicle:'bici'});f.tick(b,500);assert.equal(b.fuel,undefined);
});

test('Distributore: serve essere alle pompe, si paga il mancante, il mezzo resta fermo e poi è pieno',()=>{
 const g=game(),f=new Fuel(g),I=gasGeom(GAS[0]).island,p=player({vehicle:'auto',x:I.x,y:I.y+2});f.tick(p,0);p.fuel=40;
 const q=f.quote(p);assert.equal(q.cost,Math.ceil(60*FUEL.price));f.start(p,q);assert.ok(p.fueling);assert.throws(()=>f.quote(p),/già/);
 p.input={x:1,y:0};f.tick(p,5);assert.deepEqual(p.input,{x:0,y:0},'fermo mentre fa il pieno');assert.equal(p.fuel,40,'non consuma mentre rifornisce');
 p.fueling.until=Date.now()-1;f.tick(p,0);assert.equal(p.fuel,FUEL.tank);assert.equal(p.fueling,null);
 assert.throws(()=>f.quote(p),/pieno/);
 const far=player({vehicle:'auto',x:5,y:5});assert.throws(()=>f.quote(far),/pompe/);
 // a piedi si può rifornire l'ultimo mezzo (così non si resta bloccati senza benzina)
 const foot=player({x:I.x,y:I.y+2,fuelFor:'auto',fuel:0,tanks:{auto:0}});assert.equal(f.quote(foot).level,0);
 assert.throws(()=>f.quote(player({x:I.x,y:I.y+2})),/mezzo a motore/);
});

test('Bancone: ordinare serve il bancone e il menu; l’alcol dura 50 secondi e scende a zero',()=>{
 const g=game(),s=new Service(g),p=player({room:'bar',x:COUNTER.x,y:COUNTER.y+1.5});
 assert.throws(()=>s.quote(p,'sushi'),/menu/);assert.throws(()=>s.quote(player({room:'bar',x:2,y:12}),'birra'),/bancone/);assert.throws(()=>s.quote(player({room:'lungomare'}),'birra'),/ordina/);
 const beer=s.quote(p,'birra');s.serve(p,beer);assert.ok(p.consuming&&p.consuming.item==='birra');assert.equal(p.alcohol,beer.alc);assert.throws(()=>s.quote(p,'caffe'),/mano/);
 p.consuming.until=Date.now()-1;s.tick(p,.05);assert.equal(p.consuming,null);
 // il livello scende linearmente e arriva a zero in ALCOHOL_SECONDS
 let t=0;while(p.alcohol>0&&t<200){s.tick(p,.05);t+=.05;}assert.ok(Math.abs(t-ALCOHOL_SECONDS)<1,'ci mette circa 50 s: '+t.toFixed(1));assert.ok(g.log.some(m=>/sbornia/.test(m.message)));
 // più bicchieri si sommano (max 100) e ripartono i 50 s
 s.serve(p,MENU.bar.find(i=>i.id==='limoncello'));p.consuming=null;s.serve(p,MENU.bar.find(i=>i.id==='limoncello'));p.consuming=null;assert.equal(p.alcohol,100);
 // il caffè fa scendere un po' il livello, l'acqua non è alcolica
 s.serve(p,MENU.bar.find(i=>i.id==='caffe'));assert.ok(p.alcohol<100);
});

test('Distributori e caserme: blocchi solidi e lotti raggiungibili',()=>{
 const before=EXTRA_BLOCKS.length;EXTRA_BLOCKS.push(...solidBlocks());
 try{for(const g of GAS){const G=gasGeom(g);assert.equal(canStand('lungomare',(G.shop[0]+G.shop[2])/2,(G.shop[1]+G.shop[3])/2),false,'negozio solido');assert.equal(canStand('lungomare',G.island.x,G.island.y+G.s*3),true,'accesso alle pompe');}
  for(const c of POLICE){const P=policeGeom(c);assert.equal(canStand('lungomare',(P.build[0]+P.build[2])/2,(P.build[1]+P.build[3])/2),false,'caserma solida');assert.equal(canStand('lungomare',P.door.x,P.door.y+2),true,'ingresso libero');}}
 finally{EXTRA_BLOCKS.length=before;}
});
