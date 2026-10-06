import {distance,attenuation} from '/shared/world.js';
import {api} from '../networking/api.js';
export class Voice{
 constructor(network,notify){this.net=network;this.notify=notify;this.peers=new Map();this.enabled=false;this.muted=false;this.volume=1;this.people=[];this.me=null;this.lastTalk=false;this.starting=false;this.generation=0;this.mutedPeers=new Set();network.addEventListener('signal',e=>this.signal(e.detail).catch(err=>notify('Voce: '+err.message)));this.timer=setInterval(()=>this.update(),250);}
 async toggle(){
  if(this.enabled||this.starting){this.stop();return false;}
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('Il microfono richiede HTTPS (oppure localhost sul PC).');
  this.starting=true;const generation=++this.generation;const ctx=new AudioContext();this.ctx=ctx;
  try{
   // Avvia AudioContext durante il gesto dell'utente, prima delle attese di rete.
   await ctx.resume();const config=await api('/config');
   if(generation!==this.generation)return false;
   let compat=/SM-|Samsung/i.test(navigator.userAgent);try{const pref=localStorage.getItem('humana-mic');if(pref)compat=pref==='compat';}catch{}
   const stream=await navigator.mediaDevices.getUserMedia({audio:compat?true:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});this.compat=compat;
   if(generation!==this.generation){stream.getTracks().forEach(t=>t.stop());return false;}
   this.config=config;this.stream=stream;this.analyser=ctx.createAnalyser();this.analyser.fftSize=256;
   ctx.createMediaStreamSource(stream).connect(this.analyser);this.samples=new Uint8Array(256);
   this.enabled=true;this.muted=false;this.lastTalk=false;this.net.send({type:'voice',enabled:true,talking:false});return true;
  }catch(e){if(generation===this.generation)this.stop();throw new Error(e.name==='NotAllowedError'?'Permesso microfono negato: abilitalo nelle impostazioni del browser.':e.message);}
  finally{if(generation===this.generation)this.starting=false;if(!this.enabled&&ctx.state!=='closed')await ctx.close();}
 }
 stop(){this.generation++;this.starting=false;this.enabled=false;this.lastTalk=false;this.net.send({type:'voice',enabled:false,talking:false});for(const id of [...this.peers.keys()])this.drop(id);this.stream?.getTracks().forEach(t=>t.stop());if(this.ctx?.state!=='closed')this.ctx?.close().catch(()=>{});this.stream=null;}
 setPeerMuted(id,value){if(value)this.mutedPeers.add(id);else this.mutedPeers.delete(id);const gain=this.peers.get(id)?.gain;if(gain&&value)gain.gain.value=0;}
 level(){if(!this.analyser)return 0;this.analyser.getByteTimeDomainData(this.samples);return Math.min(100,Math.round(Math.sqrt(this.samples.reduce((s,n)=>s+(n-128)**2,0)/this.samples.length)*6));}
 setMuted(value){this.muted=value;this.stream?.getAudioTracks().forEach(t=>t.enabled=!value);}
 state(people,me){if(this.me&&me&&this.me.room!==me.room&&this.enabled){this.stop();this.notify('Voce disattivata nel cambio stanza. Riattivala qui.');}this.people=people;this.me=me;}
 peer(id){if(this.peers.has(id))return this.peers.get(id);const pc=new RTCPeerConnection(this.config);const peer={pc,pending:[],gain:null};this.peers.set(id,peer);for(const t of this.stream.getTracks())pc.addTrack(t,this.stream);pc.onicecandidate=e=>{if(e.candidate)this.net.send({type:'signal',to:id,candidate:e.candidate.toJSON()});};pc.ontrack=e=>{if(!this.enabled||peer.el)return;const stream=e.streams[0]||new MediaStream([e.track]);
   // Riproduzione diretta con un elemento audio (funziona su tutti i telefoni Android/iOS); il volume segue la distanza.
   const el=new Audio();el.autoplay=true;el.setAttribute('playsinline','');el.volume=0;el.srcObject=stream;document.body.append(el);el.hidden=true;
   const play=()=>el.play().catch(()=>{const retry=()=>{el.play().catch(()=>{});removeEventListener('pointerdown',retry);};addEventListener('pointerdown',retry);});play();
   peer.el=el;const vol=value=>{el.volume=Math.max(0,Math.min(1,Number(value)||0));};peer.gain={gain:{setTargetAtTime:vol,set value(x){vol(x);},get value(){return el.volume;}},disconnect(){}};};pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed'){this.notify('Voce non raggiungibile: su reti diverse può servire TURN.');this.drop(id);}};return peer;}
 async signal(m){if(!this.enabled||!this.stream)return;const remote=this.people.find(p=>p.id===m.from);if(!remote||!remote.voice||!this.me||distance(remote,this.me)>15)return;const peer=this.peer(m.from),pc=peer.pc;if(m.description){await pc.setRemoteDescription(m.description);for(const c of peer.pending)await pc.addIceCandidate(c);peer.pending=[];if(m.description.type==='offer'){await pc.setLocalDescription(await pc.createAnswer());this.net.send({type:'signal',to:m.from,description:pc.localDescription.toJSON()});}}else if(m.candidate){if(pc.remoteDescription)await pc.addIceCandidate(m.candidate);else peer.pending.push(m.candidate);}}
 update(){if(!this.enabled||!this.me)return;this.analyser.getByteTimeDomainData(this.samples);const talking=!this.muted&&Math.sqrt(this.samples.reduce((sum,n)=>sum+(n-128)**2,0)/this.samples.length)>5;if(talking!==this.lastTalk){this.lastTalk=talking;this.net.send({type:'voice',enabled:true,talking});}const nearby=this.people.filter(p=>p.id!==this.me.id&&p.voice&&distance(p,this.me)<15).sort((a,b)=>distance(a,this.me)-distance(b,this.me)).slice(0,8);const ids=new Set(nearby.map(p=>p.id));for(const id of [...this.peers.keys()])if(!ids.has(id))this.drop(id);for(const remote of nearby){if(!this.peers.has(remote.id)&&this.me.id<remote.id){const peer=this.peer(remote.id);(async()=>{await peer.pc.setLocalDescription(await peer.pc.createOffer());this.net.send({type:'signal',to:remote.id,description:peer.pc.localDescription.toJSON()});})().catch(e=>{this.notify(e.message);this.drop(remote.id);});}const gain=this.peers.get(remote.id)?.gain;if(gain)gain.gain.setTargetAtTime((this.mutedPeers.has(remote.id)?0:attenuation(distance(remote,this.me))*this.volume),this.ctx.currentTime,.12);}}
 drop(id){const peer=this.peers.get(id);if(peer){peer.pc.close();peer.gain?.disconnect();peer.source?.disconnect();if(peer.el){peer.el.srcObject=null;peer.el.remove();peer.el=null;}this.peers.delete(id);}}
}
