import {test} from 'node:test';import assert from 'node:assert/strict';
import {rendererFixture} from '../scripts/render-fixture.mjs';import {canStand} from '../shared/world.js';
test('Rendering terreno: nessun buco marino nelle zone percorribili e cache limitata',async()=>{
 const {renderer,canvas,player,iso,ANCHOR}=await rendererFixture({x:43,y:36});
 renderer.building=()=>{};renderer.avatar=()=>{};renderer.prop=()=>{};renderer.label=()=>{};
 for(const [x,y] of [[43,36],[18,19],[33.5,44],[50,59],[60,22]]){
  Object.assign(player,{x,y});renderer.camera=iso(x,y);renderer.draw([],player,0);
  for(let dx=-10;dx<=10;dx+=2)for(let dy=-10;dy<=10;dy+=2){
   const wx=x+dx,wy=y+dy;if(!canStand('lungomare',wx,wy,.6))continue;
   const p=iso(wx,wy),sx=Math.round((p.x-renderer.camera.x)*renderer.viewZoom+renderer.w*.5),sy=Math.round((p.y-renderer.camera.y)*renderer.viewZoom+renderer.h*ANCHOR);
   if(sx<10||sx>renderer.w-10||sy<10||sy>renderer.h-10)continue;
   const [red,green,blue]=canvas.getContext('2d').getImageData(sx,sy,1,1).data;
   assert.ok(blue-red<65,`Terreno mancante a ${wx},${wy}: ${red},${green},${blue}`);
  }
  assert.ok(renderer.chunks.size<=36);
 }
});
test('Renderer con tutti gli asset e minimappa ad alta densità',async()=>{
 const {renderer,canvas,player}=await rendererFixture({dpr:2});renderer.draw([player],player,.016);assert.equal(canvas.width,2560);
 const mini=document.createElement('canvas');renderer.minimap(mini,[player],player);assert.equal(mini.width,480);assert.equal(renderer.hitPlayers.length,1);
});
test('V2: casa arredata, notte e nuovi distretti renderizzano senza errori',async()=>{
 const {MAPS}=await import('../shared/world.js');
 const {renderer,player,iso}=await rendererFixture();
 MAPS['home:fixture']={id:'home:fixture',name:'Casa',bounds:{x:0,y:0,w:16,h:14},spawn:{x:8,y:12},buildings:[],props:['bed','sofa','picture','table','seat','lamp','plant'].map((kind,i)=>({id:kind,kind,x:2+i*1.8,y:5,r:.3}))};
 Object.assign(player,{room:'home:fixture',x:8,y:12,avatar:{color:'#abcdef',accessory:'cap',body:'broad',glasses:true,outfit:'sea'},animation:'DANCE'});renderer.camera=iso(player.x,player.y);renderer.worldTime=2400000;
 renderer.draw([player],player,.1);assert.equal(renderer.hitPlayers.length,1);
 for(const [x,y] of [[72,20],[72,58],[27,74]]){Object.assign(player,{room:'lungomare',x,y});renderer.camera=iso(x,y);renderer.draw([player],player,.1);assert.ok(renderer.chunks.size<=36);}
 delete MAPS['home:fixture'];
});
