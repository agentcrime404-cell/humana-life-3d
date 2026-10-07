import fs from 'node:fs';
const rep=(s,x,y)=>{if(!s.includes(x))throw new Error('manca: '+x.slice(0,100));return s.replace(x,()=>y);};
let f='client/world/world3d.js',s=fs.readFileSync(f,'utf8');
s=rep(s,"import {Ambient} from './ambient.js';","import {Ambient} from './ambient.js';import {MergLife} from './merglife.js';");
// tavoli dei locali disponibili alla vita di Mergellina
s=rep(s,"  for(let v=0;v<4;v++)this.instanced(this.palm(v),palms.filter((q,i)=>(i*7+3)%4===v));","  this.napoliTables=tables;\n  for(let v=0;v<4;v++)this.instanced(this.palm(v),palms.filter((q,i)=>(i*7+3)%4===v));");
// ciclo: Mergellina ha la sua vita; l'ambiente (suoni, uccelli) funziona in tutte e due le zone
s=rep(s,"  if(this.room!=='lungomare'){this.life?.hide();this.amb?.hide();}","  if(this.room!=='lungomare')this.life?.hide();if(this.room!=='mergellina')this.mlife?.hide();if(this.room!=='lungomare'&&this.room!=='mergellina')this.amb?.hide();\n  if(this.room==='mergellina'&&window.HUMANA_3D&&!this.toon){try{(this.mlife??=new MergLife(this)).update(dt,list);}catch(e){if(!this.mlErr){this.mlErr=1;console.warn('vita-mergellina',e);}}try{(this.amb??=new Ambient(this)).update(dt,list);}catch(e){if(!this.ambErr){this.ambErr=1;console.warn('ambiente',e);}}}");
s=rep(s," hd(d){return heading(d);}"," hd(d){return heading(d);}\n activeLife(){return this.room==='mergellina'?this.mlife:this.life;}");
fs.writeFileSync(f,s);
// ambiente: barche solo sul Lungomare di fantasia, eventi senza strade finte a Mergellina
f='client/world/ambient.js';s=fs.readFileSync(f,'utf8');
s=rep(s,"  for(const b of this.boats){b.t=","  for(const b of this.boats){if(w.room!=='lungomare'){b.o.visible=false;continue;}b.t=");
s=rep(s," life(h){const L=this.w.life;if(L)L.weather=this.weather;}"," life(h){for(const L of [this.w.life,this.w.mlife])if(L)L.weather=this.weather;}");
s=rep(s,"const k=pick(kinds);this.ev=","const k=this.w.room==='mergellina'?pick(['temporale','temporale','fuochi','traffico'].filter(x=>x!=='traffico'&&(x!=='fuochi'||h>=21||h<1))):pick(kinds);this.ev=");
fs.writeFileSync(f,s);
// interazione con i passanti anche a Mergellina
f='client/ui/city.js';s=fs.readFileSync(f,'utf8');
s=rep(s,"const a=getW3?.()?.life?.nearest(me.x,me.y);if(a)return {kind:'npc'","const a=getW3?.()?.activeLife?.()?.nearest(me.x,me.y);if(a)return {kind:'npc'");
s=rep(s,"if(window.HUMANA_3D&&me.room==='lungomare'&&!me.seat&&!me.vehicle&&!me.arena&&!me.jail){const a=getW3","if(window.HUMANA_3D&&(me.room==='lungomare'||me.room==='mergellina')&&!me.seat&&!me.vehicle&&!me.arena&&!me.jail){const a=getW3");
s=rep(s,"const L=w3?.life,hr=","const L=w3?.activeLife?.(),hr=");
s=rep(s,"sweeper:'Operatore ESI',crew:'Operatore ESI',busker:'Musicista'};","sweeper:'Operatore ESI',crew:'Operatore ESI',busker:'Musicista',fisher:'Pescatore',courier:'Fattorino'};");
fs.writeFileSync(f,s);
f='client/sw.js';s=fs.readFileSync(f,'utf8');s=rep(s,"'/world/ambient.js',","'/world/ambient.js','/world/merglife.js',").replace(/humana-life-\d+/,m=>'humana-life-'+(Number(m.split('-').pop())+1));fs.writeFileSync(f,s);
console.log('ok');
