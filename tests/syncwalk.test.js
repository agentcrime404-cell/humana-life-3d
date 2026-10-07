import test from 'node:test';
import assert from 'node:assert/strict';
import {Chain} from '../client/world/syncwalk.js';
// Due giocatori (due orologi interrogati in modo diverso) devono vedere la stessa persona nello stesso punto.
const mk=()=>{const roads=[];for(let i=0;i<6;i++){const p=[[i*40,0],[i*40+40,0],[i*40+40,40]],cum=[0,40,80];roads.push({p,cum,len:80,k:'residential',w:6,car:true,walk:true});}
 const node=new Map(),key=q=>Math.round(q[0]*2)+','+Math.round(q[1]*2);for(const r of roads)r.p.forEach((q,j)=>{const k=key(q);(node.get(k)||node.set(k,[]).get(k)).push([r,j]);});return {roads,net:{node,key}};};
test('Pedoni e auto: stessa posizione per tutti i giocatori',()=>{const {roads,net}=mk();
 const a=new Chain(net,roads,()=>1.3,()=>true,7,11),b=new Chain(net,roads,()=>1.3,()=>true,7,11);
 const T0=1_800_000_000;a.advance(T0+500);for(let t=0;t<=500;t+=3.7)b.advance(T0+t);b.advance(T0+500);
 assert.equal(a.r,b.r);assert.ok(Math.abs(a.s-b.s)<0.05,a.s+' vs '+b.s);assert.equal(a.dir,b.dir);
 const c=new Chain(net,roads,()=>1.3,()=>true,8,11);c.advance(T0+500);assert.ok(c.r!==a.r||Math.abs(c.s-a.s)>0.5,'figuranti diversi');});
