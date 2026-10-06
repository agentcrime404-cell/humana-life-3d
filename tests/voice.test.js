import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('../client/audio/voice.js',import.meta.url),'utf8')).replace("'/shared/world.js'",JSON.stringify(new URL('../shared/world.js',import.meta.url).href)).replace("import {api} from '../networking/api.js';","const api=async()=>({iceServers:[]});");
const {Voice}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
class Context{state='suspended';async resume(){this.state='running';}async close(){this.state='closed';}createAnalyser(){return {getByteTimeDomainData(a){a.fill(128);}};}createMediaStreamSource(){return {connect(){}};}}
test('Microfono: annullare il permesso in attesa arresta il flusso ottenuto in ritardo',async()=>{
 globalThis.AudioContext=Context;let resolveMedia;let stopped=false;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:()=>new Promise(r=>resolveMedia=r)}}});
 const net=new EventTarget();net.send=()=>{};const voice=new Voice(net,()=>{});
 try{const starting=voice.toggle();for(let i=0;i<10&&!resolveMedia;i++)await Promise.resolve();assert.ok(resolveMedia);voice.stop();resolveMedia({getTracks:()=>[{stop(){stopped=true;}}]});assert.equal(await starting,false);assert.equal(stopped,true);assert.equal(voice.enabled,false);assert.equal(voice.ctx.state,'closed');}finally{voice.stop();clearInterval(voice.timer);}
});
test('Voce: stop cancella parlato e mute individuale azzera il volume',()=>{
 const net=new EventTarget();const sent=[];net.send=m=>sent.push(m);const voice=new Voice(net,()=>{});
 try{const gain={gain:{value:1},disconnect(){}};voice.peers.set('utente',{gain,pc:{close(){}}});voice.setPeerMuted('utente',true);assert.equal(gain.gain.value,0);assert.ok(voice.mutedPeers.has('utente'));voice.lastTalk=true;voice.stop();assert.equal(voice.lastTalk,false);assert.deepEqual(sent.at(-1),{type:'voice',enabled:false,talking:false});assert.equal(voice.peers.size,0);}finally{clearInterval(voice.timer);}
});
