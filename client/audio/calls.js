import {api} from '../networking/api.js';
// Chiamata vocale 1:1 tra amici. Stati: idle, calling (in uscita), ringing (in arrivo), active.
const REASONS={offline:'Utente non connesso',busy:'Utente occupato in un’altra chiamata','not-friend':'Puoi chiamare solo i tuoi amici',rejected:'Chiamata rifiutata','no-answer':'Nessuna risposta',ended:'Chiamata terminata'};
export class Calls extends EventTarget{
 constructor(net,notify){super();this.net=net;this.notify=notify;this.state='idle';this.peer=null;this.muted=false;net.addEventListener('call',e=>this.message(e.detail).catch(err=>{this.notify('Chiamata: '+err.message);this.cleanup();}));}
 emit(){this.dispatchEvent(new Event('change'));}
 async media(){if(this.stream)return;if(!navigator.mediaDevices?.getUserMedia)throw new Error('Il microfono richiede HTTPS (o localhost)');this.config=await api('/config');
  try{this.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});}catch(e){throw new Error(e.name==='NotAllowedError'?'Permesso microfono negato':e.message);}}
 async start(friend){if(this.state!=='idle')throw new Error('Sei già in una chiamata');this.peer={id:friend.id,name:friend.username};this.state='calling';this.emit();
  try{await this.media();}catch(e){this.cleanup();throw e;}this.net.send({type:'call',action:'invite',to:friend.id,number:friend.number});this.tone('back');}
 async accept(){if(this.state!=='ringing')return;this.stopTone();try{await this.media();}catch(e){this.reject();throw e;}this.state='active';this.startedAt=Date.now();this.net.send({type:'call',action:'accept'});this.emit();}
 reject(){if(this.state==='idle')return;this.net.send({type:'call',action:'reject'});this.cleanup('Chiamata rifiutata');}
 end(){if(this.state==='idle')return;this.net.send({type:'call',action:'end'});this.cleanup('Chiamata terminata');}
 toggleMute(){this.muted=!this.muted;this.stream?.getAudioTracks().forEach(t=>t.enabled=!this.muted);this.emit();}
 connection(){if(this.pc)return this.pc;const pc=this.pc=new RTCPeerConnection(this.config);this.pending=[];for(const t of this.stream.getTracks())pc.addTrack(t,this.stream);
  pc.onicecandidate=e=>{if(e.candidate)this.net.send({type:'call',action:'signal',candidate:e.candidate.toJSON()});};
  pc.ontrack=e=>{this.audio??=Object.assign(new Audio(),{autoplay:true});this.audio.srcObject=e.streams[0]||new MediaStream([e.track]);this.audio.play().catch(()=>{});};
  pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed'){this.notify('Audio non raggiungibile: su reti diverse serve un server TURN');this.end();}};return pc;}
 async message(m){
  if(m.action==='invite'){if(this.state!=='idle'){this.net.send({type:'call',action:'reject'});return;}this.peer={id:m.from,name:m.username};this.state='ringing';this.tone('ring');this.emit();return;}
  if(m.action==='accept'&&this.state==='calling'){this.stopTone();this.state='active';this.startedAt=Date.now();this.emit();const pc=this.connection();await pc.setLocalDescription(await pc.createOffer());this.net.send({type:'call',action:'signal',description:pc.localDescription.toJSON()});return;}
  if(m.action==='signal'&&this.state==='active'){const pc=this.connection();
   if(m.description){await pc.setRemoteDescription(m.description);for(const c of this.pending)await pc.addIceCandidate(c);this.pending=[];if(m.description.type==='offer'){await pc.setLocalDescription(await pc.createAnswer());this.net.send({type:'call',action:'signal',description:pc.localDescription.toJSON()});}}
   else if(m.candidate){if(pc.remoteDescription)await pc.addIceCandidate(m.candidate);else this.pending.push(m.candidate);}return;}
  if(m.action==='end')this.cleanup(REASONS[m.reason]||'Chiamata terminata');}
 // Suoneria e tono di attesa sintetizzati, vibrazione dove disponibile.
 tone(kind){this.stopTone();try{const ctx=this.toneCtx=new AudioContext(),gain=ctx.createGain();gain.gain.value=0;gain.connect(ctx.destination);const osc=ctx.createOscillator();osc.frequency.value=kind==='ring'?880:425;osc.connect(gain);osc.start();
  const beat=()=>{const t=ctx.currentTime;gain.gain.setValueAtTime(kind==='ring'?.12:.06,t);gain.gain.setValueAtTime(0,t+(kind==='ring'?.9:1));if(kind==='ring')navigator.vibrate?.([400,200,400]);};beat();this.toneTimer=setInterval(beat,kind==='ring'?2000:3000);}catch{}}
 stopTone(){clearInterval(this.toneTimer);this.toneCtx?.close().catch(()=>{});this.toneCtx=null;navigator.vibrate?.(0);}
 cleanup(message){this.stopTone();this.pc?.close();this.pc=null;this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;if(this.audio)this.audio.srcObject=null;this.state='idle';this.muted=false;this.startedAt=null;const was=this.peer;this.peer=null;this.lastMessage=message;if(message&&was)this.notify(message+' · '+was.name);this.emit();}
}
