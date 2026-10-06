// Audio sintetizzato originale: nessuna traccia musicale di terzi o registrazione vocale.
// Musica dei locali: house in discoteca e sala slot, lounge bar in bar e ristoranti. Sequencer a 16 passi con programmazione anticipata.
const CHILL_ROOMS=new Set(['mall','fashion','shop','bank']),HOUSE_ROOMS=new Set(['club','casino']),LOUNGE_ROOMS=new Set(['bar','pizzeria','osteria','vesuvio','trattoria','panorama','burger']);
const mtof=m=>440*2**((m-69)/12);
// House: La minore, Am7 – Fmaj7 – C – G (accordi in levare) e basso sul contrattempo.
const HOUSE={bpm:124,chords:[[57,60,64,67],[53,57,60,64],[48,52,55,60],[55,59,62,67]],bass:[33,29,36,31]};
// Chill da centro commerciale: Fmaj7 – Em7 – Dm7 – Cmaj7, lento e arioso.
const CHILL={bpm:72,chords:[[53,57,60,64],[52,55,59,62],[50,53,57,60],[48,52,55,59]],bass:[41,40,38,36]};
// Lounge: Dm9 – G13 – Cmaj9 – A7(b9), voicing morbidi da piano elettrico.
const LOUNGE={bpm:86,chords:[[50,53,57,60,64],[43,53,57,59,64],[48,52,55,59,62],[45,49,55,58,61]],bass:[[38,41,45,43],[31,35,38,40],[36,40,43,45],[33,37,40,39]]};
export class AmbientAudio{
 constructor(){this.enabled=false;this.settings={master:.6,music:.5,ambient:.5};this.beat=0;this.step=0;this.style=null;}
 async start(){if(this.enabled||this.starting)return;this.starting=true;this.ctx=new AudioContext();try{await this.ctx.resume();}catch(e){this.starting=false;await this.ctx.close().catch(()=>{});throw e;}this.starting=false;
  const c=this.ctx;this.master=c.createGain();this.master.connect(c.destination);
  // Bus musica con eco leggera (ambiente del locale).
  this.music=c.createGain();this.music.gain.value=0;const delay=c.createDelay(1),fb=c.createGain(),wet=c.createGain(),tone=c.createBiquadFilter();delay.delayTime.value=.36;fb.gain.value=.28;wet.gain.value=.22;tone.type='lowpass';tone.frequency.value=2600;
  this.music.connect(this.master);this.music.connect(delay);delay.connect(tone).connect(fb).connect(delay);tone.connect(wet).connect(this.master);
  this.noise=c.createBuffer(1,c.sampleRate,c.sampleRate);const d=this.noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  this.enabled=true;this.next=c.currentTime+.1;this.timer=setInterval(()=>this.schedule(),40);this.ambientTimer=setInterval(()=>this.pulse(),240);}
 update(player){this.player=player;if(!this.enabled)return;const t=this.ctx.currentTime;this.master.gain.setTargetAtTime(this.settings.master,t,.2);
  const room=player?.room||'',style=HOUSE_ROOMS.has(room)?'house':LOUNGE_ROOMS.has(room)?'lounge':CHILL_ROOMS.has(room)?'chill':null;
  if(style!==this.style){this.style=style;this.step=0;this.next=t+.05;}
  this.music.gain.setTargetAtTime(style?this.settings.music*({house:.9,lounge:.75,chill:.6})[style]:0,t,.6);}
 // Programma le note nei prossimi 120 ms (temporizzazione precisa anche se il gioco rallenta).
 schedule(){if(!this.enabled)return;const c=this.ctx;if(this.next<c.currentTime-.2)this.next=c.currentTime+.05;
  while(this.next<c.currentTime+.12){if(this.style){const song={house:HOUSE,lounge:LOUNGE,chill:CHILL}[this.style],dur=60/song.bpm/4;
    // Swing leggero nel lounge.
    const t=this.next+(this.style==='lounge'&&this.step%2?dur*.18:0);this[this.style](this.step,t,dur);this.next+=dur;this.step=(this.step+1)%64;}
   else this.next+=.1;}}
 house(s,t,d){const bar=Math.floor(s/16)%4,i=s%16;
  if(i%4===0)this.kick(t,.95);if(i===4||i===12)this.clap(t,.35);if(i%4===2)this.hat(t,.16,.09,7000);else if(i%2===1)this.hat(t,.05,.03,9000);
  if(i%4===2||i===15)this.bassNote(mtof(HOUSE.bass[bar]+(i===15?12:0)),t,d*1.6,.32,'sawtooth',420);
  if(i===2||i===6||i===10||i===13)this.stab(HOUSE.chords[bar],t,d*1.4,.07);
  if(s%64===0)this.pad(HOUSE.chords[0],t,d*16,.035);}
 lounge(s,t,d){const bar=Math.floor(s/16)%4,i=s%16;
  if(i===0||i===10)this.kick(t,.35,90);if(i===4||i===12)this.brush(t,.14);if(i%2===0)this.hat(t,.035,.06,6000);
  if(i%4===0)this.bassNote(mtof(LOUNGE.bass[bar][i/4]),t,d*3.6,.3,'triangle',700);
  if(i===0)this.rhodes(LOUNGE.chords[bar],t,d*14,.06);if(i===7||i===11)this.rhodes(LOUNGE.chords[bar].slice(2),t,d*3,.035);}
 chill(s,t,d){const bar=Math.floor(s/16)%4,i=s%16;
  if(i===0)this.pad(CHILL.chords[bar],t,d*16,.05);if(i===0||i===8)this.bassNote(mtof(CHILL.bass[bar]),t,d*7,.2,'sine',500);
  if(i%4===2)this.hat(t,.02,.08,8000);if(i===0||i===9)this.kick(t,.18,80);
  // Arpeggio leggero tipo carillon.
  if(i%3===0){const ch=CHILL.chords[bar],n=ch[(i/3+bar)%ch.length]+12;this.rhodes([n],t,d*5,.03);}}
 env(g,t,a,peak,dec){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+dec);}
 osc(type,f,t,len,out){const o=this.ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);o.connect(out);o.start(t);o.stop(t+len+.05);o.onended=()=>o.disconnect();return o;}
 kick(t,v,f0=150){const c=this.ctx,g=c.createGain();g.connect(this.music);const o=this.osc('sine',f0,t,.45,g);o.frequency.exponentialRampToValueAtTime(42,t+.12);this.env(g,t,.002,v,.38);setTimeout(()=>g.disconnect(),1200);}
 noiseHit(t,v,dec,type,freq,q=1){const c=this.ctx,n=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();n.buffer=this.noise;f.type=type;f.frequency.value=freq;f.Q.value=q;n.connect(f).connect(g).connect(this.music);this.env(g,t,.001,v,dec);n.start(t,Math.random()*.5);n.stop(t+dec+.05);n.onended=()=>{n.disconnect();f.disconnect();g.disconnect();};}
 hat(t,v,dec,freq){this.noiseHit(t,v,dec,'highpass',freq);}
 clap(t,v){for(const k of [0,.012,.024])this.noiseHit(t+k,v,.09,'bandpass',1500,1.2);}
 brush(t,v){this.noiseHit(t,v,.22,'bandpass',3200,.6);}
 bassNote(f,t,len,v,type,cut){const c=this.ctx,g=c.createGain(),lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=cut;lp.connect(g).connect(this.music);this.osc(type,f,t,len,lp);this.env(g,t,.008,v,len);setTimeout(()=>{lp.disconnect();g.disconnect();},(len+1)*1000);}
 stab(notes,t,len,v){const c=this.ctx,g=c.createGain(),lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(2400,t);lp.frequency.exponentialRampToValueAtTime(600,t+len);lp.connect(g).connect(this.music);for(const n of notes){this.osc('sawtooth',mtof(n),t,len,lp);this.osc('sawtooth',mtof(n)*1.006,t,len,lp);}this.env(g,t,.004,v,len);setTimeout(()=>{lp.disconnect();g.disconnect();},(len+1)*1000);}
 pad(notes,t,len,v){const c=this.ctx,g=c.createGain(),lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;lp.connect(g).connect(this.music);for(const n of notes)this.osc('triangle',mtof(n),t,len,lp);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+len*.4);g.gain.linearRampToValueAtTime(0,t+len);setTimeout(()=>{lp.disconnect();g.disconnect();},(len+1)*1000);}
 // Piano elettrico: sinusoide + armonica leggera con tremolo.
 rhodes(notes,t,len,v){const c=this.ctx,g=c.createGain(),trem=c.createGain(),lfo=c.createOscillator(),depth=c.createGain();lfo.frequency.value=4.5;depth.gain.value=.25;lfo.connect(depth).connect(trem.gain);trem.gain.value=.75;g.connect(trem).connect(this.music);lfo.start(t);lfo.stop(t+len+.1);
  for(const n of notes){this.osc('sine',mtof(n),t,len,g);const h=c.createGain();h.gain.value=.18;h.connect(g);this.osc('triangle',mtof(n)*2,t,len*.4,h);}this.env(g,t,.01,v,len);setTimeout(()=>{g.disconnect();trem.disconnect();depth.disconnect();lfo.disconnect();},(len+1)*1000);}
 tone(freq,duration,volume,type='sine'){const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration);o.connect(g).connect(this.master);o.start();o.stop(c.currentTime+duration);o.onended=()=>{o.disconnect();g.disconnect();};}
 // Ambiente: passi e mare (all'aperto) o brusio leggero (al chiuso senza musica).
 pulse(){if(!this.player||!this.enabled)return;const p=this.player;
  if(p.moving&&!p.vehicle)this.tone(80,.065,.025*this.settings.ambient,'triangle');
  if(this.beat%8===0&&!this.style){const c=this.ctx,b=c.createBuffer(1,c.sampleRate*1.7,c.sampleRate),data=b.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()-.5)*.1;const n=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();filter.type='lowpass';filter.frequency.value=p.room==='lungomare'?450:180;gain.gain.value=this.settings.ambient*(p.room==='lungomare'?.03+.09*Math.max(0,1-(p.x+p.y-24)/30):.04);n.buffer=b;n.connect(filter).connect(gain).connect(this.master);n.start();n.onended=()=>{n.disconnect();filter.disconnect();gain.disconnect();};}
  this.beat++;}
 stop(){this.enabled=false;clearInterval(this.timer);clearInterval(this.ambientTimer);if(this.ctx&&this.ctx.state!=='closed')this.ctx.close().catch(()=>{});}
}
