import {LANDMARKS,CITY_SIZE} from '../shared/district.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MAPS,SHORE,canStand,doors,distance} from '../shared/world.js';
test('Lungomare: ogni ingresso è raggiungibile e il mare è invalicabile',()=>{
 const m=MAPS.lungomare;
 assert.equal(canStand(m.id,10,SHORE-10-.5),false);
 const queue=[m.spawn],seen=new Set([`${m.spawn.x},${m.spawn.y}`]);
 for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[.5,0],[-.5,0],[0,.5],[0,-.5]]){
  const p={x:queue[i].x+dx,y:queue[i].y+dy},key=`${p.x},${p.y}`;
  if(p.x<CITY_SIZE+12&&p.y<CITY_SIZE+12&&!seen.has(key)&&canStand(m.id,p.x,p.y)){seen.add(key);queue.push(p);}
 }
 for(const landmark of LANDMARKS){assert.ok(canStand(m.id,landmark.x,landmark.y),`Zona libera: ${landmark.name}`);assert.ok(queue.some(p=>distance(p,landmark)<.6),`Percorso fino a ${landmark.name}`);}
 for(const door of doors(m.id)){
  assert.ok(canStand(m.id,door.x,door.y),`Porta libera: ${door.id}`);
  assert.ok(queue.some(p=>distance(p,door)<.6),`Percorso raggiunge ${door.id}`);
 }
});
