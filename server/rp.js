// Vita "roleplay" in stile server FiveM: mestieri con turno di servizio e stipendio, polizia fatta dai giocatori (allarmi, arresti, multe).
// Tutto deciso dal server; il mestiere e il servizio stanno in progress.work / progress.duty e viaggiano agli altri come p.work / p.duty.
import {WORKS,RP,HOSPITAL,hospGeom} from '../shared/catalog.js';
import {state} from './storage.js';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export class Roleplay{
 constructor(game){this.game=game;}
 get db(){return this.game.db;}
 tell(p,message){if(p?.ws)this.game.send(p.ws,{type:'notification',message});}
 save(p){try{const g=state(this.db,p.id).progress;g.work=p.work||null;g.duty=!!p.duty;this.db.prepare('UPDATE player_state SET progress=? WHERE user_id=?').run(JSON.stringify(g),p.id);}catch(e){console.warn('rp.save',e.message);}}
 load(p){if(p.rpLoaded)return;p.rpLoaded=true;try{const g=state(this.db,p.id).progress;p.work=WORKS[g.work]?g.work:null;p.duty=!!(p.work&&g.duty);p.payAt=Date.now()+RP.payEvery*1000;}catch{p.work=null;p.duty=false;}}
 credit(id,coins){this.db.prepare('UPDATE player_state SET balance=balance+? WHERE user_id=?').run(coins,id);}
 medics(){return [...this.game.players.values()].filter(p=>p.work==='medico'&&p.duty&&!p.jail&&!p.down);}
 // Feriti (stile FiveM): chi beve troppo sviene e resta a terra; i paramedici in servizio ricevono l'allarme e lo rianimano, altrimenti si risveglia in ospedale.
 knockDown(p,cause){if(p.down||p.jail)return;const now=Date.now();if(p.vehicle){p.vehicle=null;p.seat=null;}p.input={x:0,y:0};p.vel=0;p.down={t0:now,until:now+RP.downSeconds*1000,cause,called:0};this.tell(p,'😵 '+cause+': sei a terra! Chiama il 118 o aspetta un paramedico.');this.call118(p,true);}
 call118(p,auto){const now=Date.now();if(!p.down)fail('Non sei ferito');if(!auto&&now-p.down.called<RP.callEvery*1000)fail('Hai già chiamato: il 118 sta arrivando');p.down.called=now;const ms=this.medics().filter(m=>m.id!==p.id);
  for(const m of ms)this.tell(m,'🚑 Centrale 118: '+p.username+' è a terra'+(m.room===p.room?' a '+Math.round(Math.hypot(m.x-p.x,m.y-p.y))+' m da te':'')+'. Apri 💼 Lavoro per rianimarlo.');if(!auto)this.tell(p,ms.length?'📞 118 chiamato: '+ms.length+' paramedico/i avvisati.':'📞 Nessun paramedico in servizio: tra poco ti porteranno in ospedale.');return true;}
 hospital(p){const d=hospGeom(HOSPITAL).door,bal=this.game.db.prepare('SELECT balance FROM player_state WHERE user_id=?').get(p.id)?.balance||0,fee=Math.min(bal,RP.hospitalFee);if(fee)this.game.db.prepare('UPDATE player_state SET balance=balance-? WHERE user_id=?').run(fee,p.id);
  p.down=null;p.room='lungomare';p.from=null;p.x=d.x;p.y=d.y+1.2;p.input={x:0,y:0};p.alcohol=0;p.alcRate=0;this.tell(p,'🏥 Ti sei svegliato all’Ospedale del Golfo. Cure: '+fee+' 🪙');this.game.send(p.ws,{type:'wallet'});}
 cops(){return [...this.game.players.values()].filter(p=>p.work==='polizia'&&p.duty&&!p.jail);}
 // Furto appena commesso: tutti gli agenti in servizio ricevono l'allarme; con agenti in giro la ricerca dura di più, così possono inseguire.
 alert(p){const cops=this.cops().filter(c=>c.id!==p.id);if(!cops.length||!p.wanted)return;p.wanted.until=Math.max(p.wanted.until,Date.now()+RP.chase*1000);p.wanted.cops=true;this.game.police?.save(p);
  for(const c of cops)this.tell(c,'🚨 Centrale: furto in corso! '+p.username+' è ricercato'+(c.room===p.room?' a '+Math.round(Math.hypot(c.x-p.x,c.y-p.y))+' m da te':'')+'. Apri 💼 Lavoro per arrestarlo.');}
 tick(p){this.load(p);if(p.down){p.input={x:0,y:0};p.vel=0;if(Date.now()>=p.down.until)this.hospital(p);}else if((p.alcohol||0)>=RP.faintAlcohol)this.knockDown(p,'Hai bevuto troppo');if(!p.duty||p.jail)return;const now=Date.now();if(now<p.payAt)return;p.payAt=now+RP.payEvery*1000;const W=WORKS[p.work];if(!W)return;this.credit(p.id,W.salary);this.tell(p,W.icon+' Stipendio da '+W.name+': +'+W.salary+' 🪙');this.game.send(p.ws,{type:'wallet'});}
 near(cop,id){const t=[...this.game.players.values()].find(q=>String(q.id)===String(id));if(!t||t.id===cop.id)fail('Giocatore non trovato');if(t.room!==cop.room||Math.hypot(t.x-cop.x,t.y-cop.y)>RP.reach)fail('Devi essere vicino (meno di '+RP.reach+' m)');return t;}
 view(p){this.load(p);const cop=p.work==='polizia'&&p.duty,medic=p.work==='medico'&&p.duty,list=[...this.game.players.values()].filter(q=>q.id!==p.id&&q.room===p.room);
  return {work:p.work,duty:p.duty,works:WORKS,payEvery:RP.payEvery,payIn:p.duty?Math.max(0,Math.round((p.payAt-Date.now())/1000)):null,
   wanted:cop?[...this.game.players.values()].filter(q=>q.wanted&&!q.jail&&q.id!==p.id).map(q=>({id:q.id,name:q.username,room:q.room,dist:q.room===p.room?Math.round(Math.hypot(q.x-p.x,q.y-p.y)):null})):[],
   injured:medic?[...this.game.players.values()].filter(q=>q.down&&q.id!==p.id).map(q=>({id:q.id,name:q.username,room:q.room,dist:q.room===p.room?Math.round(Math.hypot(q.x-p.x,q.y-p.y)):null,left:Math.max(0,Math.round((q.down.until-Date.now())/1000))})):[],
   nearby:cop||medic?list.filter(q=>Math.hypot(q.x-p.x,q.y-p.y)<=RP.reach).map(q=>({id:q.id,name:q.username,wanted:!!q.wanted,down:!!q.down})):[],down:p.down?{left:Math.max(0,Math.round((p.down.until-Date.now())/1000)),cause:p.down.cause}:null};}
 route(path,method,p,b){if(!p)fail('Entra prima nel gioco');this.load(p);
  if(path==='/api/rp'&&method==='GET')return this.view(p);
  if(method!=='POST')return undefined;
  if(path==='/api/rp/work'){const w=b.work?String(b.work):null;if(w&&!WORKS[w])fail('Lavoro sconosciuto');if(p.jail)fail('Sei in prigione');if(w&&p.wanted)fail('Con la polizia alle calcagna nessuno ti assume');p.work=w;p.duty=false;this.save(p);this.tell(p,w?WORKS[w].icon+' Assunto come '+WORKS[w].name+'! Entra in servizio per prendere lo stipendio.':'Ti sei licenziato.');return this.view(p);}
  if(path==='/api/rp/duty'){if(!p.work)fail('Prima scegli un lavoro');if(b.on&&p.wanted)fail('Sei ricercato: non puoi entrare in servizio');p.duty=!!b.on;p.payAt=Date.now()+RP.payEvery*1000;this.save(p);this.tell(p,p.duty?'✅ In servizio come '+WORKS[p.work].name+': stipendio ogni '+Math.round(RP.payEvery/60)+' minuti.':'Fine turno.');return this.view(p);}
  if(path==='/api/rp/call118'){this.call118(p,false);return this.view(p);}
  if(path==='/api/rp/revive'){if(!(p.work==='medico'&&p.duty))fail('Solo i paramedici in servizio',403);if(p.down)fail('Sei a terra anche tu');const t=this.near(p,b.id);if(!t.down)fail('Non è ferito');t.down=null;t.alcohol=0;t.alcRate=0;this.credit(p.id,RP.reviveReward);
   this.tell(t,'💚 Il paramedico '+p.username+' ti ha rianimato!');this.tell(p,'🚑 Hai rianimato '+t.username+': premio +'+RP.reviveReward+' 🪙');this.game.send(p.ws,{type:'wallet'});return this.view(p);}
  const cop=p.work==='polizia'&&p.duty;
  if(path==='/api/rp/arrest'){if(!cop)fail('Solo gli agenti in servizio',403);const t=this.near(p,b.id);if(!t.wanted)fail('Non è ricercato: non puoi arrestarlo');this.game.police.arrest(t);this.credit(p.id,RP.arrestReward);this.tell(t,'👮 Arrestato dall’agente '+p.username+'.');this.tell(p,'🚔 Hai arrestato '+t.username+': premio +'+RP.arrestReward+' 🪙');this.game.send(p.ws,{type:'wallet'});return this.view(p);}
  if(path==='/api/rp/fine'){if(!cop)fail('Solo gli agenti in servizio',403);const t=this.near(p,b.id),amount=Math.round(Number(b.amount));if(!(amount>=RP.fine[0]&&amount<=RP.fine[1]))fail('Multa da '+RP.fine[0]+' a '+RP.fine[1]+' monete');const reason=String(b.reason||'infrazione').slice(0,60);
   const bal=this.db.prepare('SELECT balance FROM player_state WHERE user_id=?').get(t.id)?.balance||0,take=Math.min(bal,amount);this.db.prepare('UPDATE player_state SET balance=balance-? WHERE user_id=?').run(take,t.id);const cut=Math.round(take*RP.fineCut);if(cut)this.credit(p.id,cut);
   this.tell(t,'🧾 Multa di '+take+' 🪙 dall’agente '+p.username+' ('+reason+')');this.tell(p,'🧾 Multa fatta a '+t.username+': '+take+' 🪙 (a te '+cut+' 🪙)');this.game.send(t.ws,{type:'wallet'});this.game.send(p.ws,{type:'wallet'});return this.view(p);}
  return undefined;}
}
