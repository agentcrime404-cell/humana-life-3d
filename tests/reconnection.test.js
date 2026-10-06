import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('Client: riconnessione automatica, backoff e nessun retry dopo logout',async()=>{
 const store=new Map();globalThis.sessionStorage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};globalThis.location={origin:'http://localhost'};
 const sockets=[];class Socket{readyState=0;constructor(){sockets.push(this);}send(){}close(){this.readyState=3;}open(){this.readyState=1;this.onopen();}message(m){this.onmessage({data:JSON.stringify(m)});}}
 globalThis.WebSocket=Socket;
 const source=await readFile(new URL('../client/networking/api.js',import.meta.url),'utf8');const {Connection,setToken}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 setToken('test-token');const net=new Connection();let retry=0,disconnected=false;net.addEventListener('reconnecting',e=>retry=e.detail);net.addEventListener('disconnected',()=>disconnected=true);
 const first=net.connect();sockets[0].open();sockets[0].message({type:'welcome',id:'test'});await first;sockets[0].readyState=3;sockets[0].onclose({code:1006});assert.equal(retry,1);
 // Accelera soltanto il tempo del test; il callback reale sarà eseguito dal timer.
 await new Promise(r=>setTimeout(r,1050));assert.equal(sockets.length,2);sockets[1].open();sockets[1].message({type:'welcome',id:'test'});assert.equal(net.attempts,0);
 sockets[1].readyState=3;sockets[1].onclose({code:4001,reason:'Logout'});assert.equal(disconnected,true);clearInterval(net.heartbeat);clearTimeout(net.retry);
});
