import test from 'node:test';
import assert from 'node:assert/strict';
import {Traffic,INTERSECTIONS,lightState,LIGHT_CYCLE} from '../shared/traffic.js';

// Nessuna auto deve restare bloccata (prima 8 auto su 10 si fermavano per sempre guardandosi in corsie opposte).
test('Traffico: tutte le auto circolano per 10 minuti, anche con i semafori',()=>{
 for(const lights of [false,true]){const tr=new Traffic();tr.lights=lights;const n=tr.cars.length,still=new Array(n).fill(0),worst=new Array(n).fill(0),run=new Array(n).fill(0);
  for(let t=0;t<600;t+=.05){tr.update(.05,[]);tr.cars.forEach((c,i)=>{if(c.v<.15){still[i]+=.05;worst[i]=Math.max(worst[i],still[i]);}else still[i]=0;run[i]+=c.v*.05;});}
  assert.ok(Math.max(...worst)<(lights?16:3),'sosta troppo lunga (semafori '+lights+'): '+worst.map(w=>w.toFixed(0)).join(','));
  assert.ok(Math.min(...run)>800,'un\'auto ha fatto troppa poca strada: '+run.map(r=>Math.round(r)).join(','));}
});

test('Traffico: davanti a una persona l’auto si ferma e quando se ne va riparte',()=>{
 const tr=new Traffic();for(let i=0;i<200;i++)tr.update(.05,[]);const c=tr.cars[0],q=c.path.pointAt(c.s),h=q.direction,p={x:q.x+Math.cos(h)*7,y:q.y+Math.sin(h)*7};
 for(let i=0;i<120;i++)tr.update(.05,[p]);const q2=c.path.pointAt(c.s);
 assert.ok(c.v<.2,'ferma davanti alla persona');assert.ok(Math.hypot(p.x-q2.x,p.y-q2.y)>2.5,'senza investirla');
 for(let i=0;i<120;i++)tr.update(.05,[]);assert.ok(c.v>1.5,'riparte quando la persona si sposta');
});

test('Semafori: verde su un asse solo, con giallo e un secondo di rosso per tutti',()=>{
 for(const I of INTERSECTIONS)for(let t=0;t<LIGHT_CYCLE;t+=.25){const a=lightState(I,'ew',t),b=lightState(I,'ns',t);assert.ok(!(a==='green'&&b!=='red')&&!(b==='green'&&a!=='red'),'verde incompatibile a '+t);}
 const I=INTERSECTIONS[0],seen=new Set();for(let t=0;t<LIGHT_CYCLE;t+=.25)seen.add(lightState(I,'ew',t));assert.deepEqual([...seen].sort(),['green','red','yellow']);
});

test('Semafori: col rosso l’auto si ferma prima dell’incrocio e non lo attraversa',()=>{
 const tr=new Traffic();tr.lights=true;let violations=0;
 for(let t=0;t<600;t+=.05){tr.update(.05,[]);for(const c of tr.cars){const q=c.path.pointAt(c.s),fx=Math.cos(q.direction),fy=Math.sin(q.direction);for(const I of INTERSECTIONS){const dx=I.x-q.x,dy=I.y-q.y,d=Math.hypot(dx,dy);if(d<2.5&&c.v>2){const st=lightState(I,Math.abs(fx)>Math.abs(fy)?'ew':'ns',tr.time);if(st==='red'&&d<1.5)violations++;}}}}
 assert.ok(violations<40,'auto passate con il rosso: '+violations);
});
