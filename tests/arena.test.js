import test from 'node:test';
import assert from 'node:assert/strict';
import {Arena} from '../server/arena.js';
import {ARENA,arenaBlocks} from '../shared/catalog.js';
import {canStand,EXTRA_BLOCKS} from '../shared/world.js';

// Un "game" finto: giocatori e invio dei messaggi, senza rete né database.
const setup=()=>{const sent=[],db={prepare:()=>({run:()=>{}})},game={players:new Map(),db,send:(ws,m)=>ws.log.push(m)};
 const mk=(id,x,y)=>{const p={id,username:id,room:'lungomare',x,y,input:{x:0,y:0},ws:{log:sent,readyState:1}};game.players.set(id,p);return p;};
 return {arena:new Arena(game),game,mk,sent};};
const enter=(arena,p,team,weapon='pistola')=>{arena.join(p,weapon);p.arena.team=team;};

test('Arena: colpo a segno toglie vita, colpo dietro un ostacolo no, fuori dal campo niente',()=>{
 const {arena,mk}=setup();const a=mk('a',152.6,90),b=mk('b',160,90);enter(arena,a,'red');enter(arena,b,'blue');a.x=152.6;a.y=86.8;b.x=162;b.y=86.8;
 arena.message(a,{type:'shoot',dx:1,dy:0});
 assert.equal(b.arena.hp,ARENA.hp-ARENA.weapons.pistola.dmg,'colpo a segno');
 // ostacolo al centro (163,95.5)-(169,102.5): da y=99 a y=99 il colpo si ferma
 a.x=153;a.y=99;b.x=172;b.y=99;a.arena.nextShot=0;b.arena.hp=ARENA.hp;
 arena.message(a,{type:'shoot',dx:1,dy:0});assert.equal(b.arena.hp,ARENA.hp,'l’ostacolo ferma il colpo');
 // fuori dal campo non si spara e non si colpisce
 const c=mk('c',140,90);arena.message(c,{type:'shoot',dx:1,dy:0});assert.equal(c.arena,undefined);
});

test('Arena: la squadra a 15 punti vince, la partita riparte e gli eliminati rientrano',()=>{
 const {arena,mk,game}=setup();const a=mk('a',0,0),b=mk('b',0,0);enter(arena,a,'red');enter(arena,b,'blue');
 const W=ARENA.weapons.pistola;
 for(let i=0;i<ARENA.target;i++){a.x=155;a.y=86.8;b.x=165;b.y=86.8;a.arena.nextShot=0;a.arena.reloadAt=0;a.arena.ammo=a.arena.mag;b.arena.hp=W.dmg;b.arena.downUntil=0;arena.message(a,{type:'shoot',dx:1,dy:0});}
 assert.equal(arena.round,2,'nuova partita dopo la vittoria');assert.equal(arena.score.red,0);assert.equal(b.arena.hp,ARENA.hp);
 // eliminato: dopo il tempo previsto torna in gioco
 b.arena.hp=0;b.arena.downUntil=Date.now()-1;arena.tick();assert.equal(b.arena.hp,ARENA.hp);assert.equal(b.arena.downUntil,0);
});

test('Arena: ricarica, nessun colpo da chi è a terra, uscita e bilanciamento delle squadre',()=>{
 const {arena,mk}=setup();const a=mk('a',0,0);arena.join(a,'fucile');const A=a.arena;assert.equal(A.ammo,ARENA.weapons.fucile.mag);
 a.x=160;a.y=86.8;A.nextShot=0;arena.message(a,{type:'shoot',dx:1,dy:0});assert.equal(A.ammo,ARENA.weapons.fucile.mag-1);
 A.nextShot=0;A.downUntil=Date.now()+5000;arena.message(a,{type:'shoot',dx:1,dy:0});assert.equal(A.ammo,ARENA.weapons.fucile.mag-1,'a terra non si spara');A.downUntil=0;
 arena.message(a,{type:'reload'});assert.ok(A.reloadAt>0);A.reloadAt=Date.now()-1;arena.tick();assert.equal(A.ammo,A.mag);
 const b=mk('b',0,0);arena.join(b,'pistola');assert.notEqual(a.arena.team,b.arena.team,'squadre bilanciate');
 arena.leave(a,'ciao');assert.equal(a.arena,null);assert.ok(Math.hypot(a.x-ARENA.exit.x,a.y-ARENA.exit.y)<2);
 const c=mk('c',160,100);arena.sanitize(c);assert.ok(c.x<ARENA.x0,'chi è nel campo senza partita viene riportato fuori');
});

test('Arena: recinto e ostacoli fermano i passi (solo quando registrati dal 3D)',()=>{
 const before=EXTRA_BLOCKS.length;EXTRA_BLOCKS.push(...arenaBlocks());
 try{assert.equal(canStand('lungomare',ARENA.x0-.25,99),false,'recinto');assert.equal(canStand('lungomare',166,99),false,'ostacolo centrale');assert.equal(canStand('lungomare',ARENA.exit.x,ARENA.exit.y),true,'uscita libera');assert.equal(canStand('lungomare',156,99),true,'campo libero');}
 finally{EXTRA_BLOCKS.length=before;}
 assert.equal(canStand('lungomare',166,99),true,'senza registrazione il 2D non cambia');
});
