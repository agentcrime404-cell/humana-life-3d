// Scheda "Il tuo mestiere" (stile server FiveM) dentro l'app Lavoro: scelta del lavoro, turno di servizio, e per la polizia ricercati, arresti e multe.
export function rpCard({api,notify,button,net}){
 const mk=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=x;return e;};
 if(net&&!net.__rpWallet){net.__rpWallet=true;net.addEventListener('wallet',()=>document.dispatchEvent(new CustomEvent('humana:wallet')));}
 const card=mk('section','job-card rp-card');card.append(mk('p','muted','Caricamento lavoro…'));
 const run=async(path,body)=>{try{paint(await api(path,'POST',body));document.dispatchEvent(new CustomEvent('humana:wallet'));}catch(e){notify(e.message);}};
 function paint(v){card.replaceChildren();const W=v.works,cur=v.work&&W[v.work];
  card.append(mk('h3',null,cur?cur.icon+' '+cur.name+(v.duty?' · IN SERVIZIO':' · fuori servizio'):'👔 Scegli un lavoro'));
  if(cur){card.append(mk('p','muted',cur.desc+' Stipendio: '+cur.salary+' 🪙 ogni '+Math.round(v.payEvery/60)+' minuti di servizio'+(v.duty&&v.payIn!=null?' (prossimo tra '+Math.ceil(v.payIn/60)+' min)':'')+'.'));
   card.append(button(v.duty?'⏹ Fine turno':'▶ Entra in servizio',()=>run('/rp/duty',{on:!v.duty})));card.append(button('Licenziati',()=>run('/rp/work',{work:null})));}
  else{card.append(mk('p','muted','Come in un server roleplay: scegli un mestiere, entra in servizio e prendi lo stipendio.'));
   for(const [id,w] of Object.entries(W)){const row=mk('div','rp-work');row.append(mk('b',null,w.icon+' '+w.name+' · '+w.salary+' 🪙'),mk('small',null,w.desc),button('Fai domanda',()=>run('/rp/work',{work:id})));card.append(row);}}
  {const row=mk('div','rp-work');row.append(button('🚕 Chiama un taxi',()=>run('/rp/calltaxi',{})));if(v.mine?.broken)row.append(button('📞 Chiama il meccanico',()=>run('/rp/callmech',{})));card.append(row);}
  if(v.work==='meccanico'&&v.duty){card.append(mk('h4',null,'🔧 Mezzi in panne'));if(!v.broken.length)card.append(mk('p','muted','Nessun guasto in questo momento.'));for(const q of v.broken)card.append(mk('p',null,'🚗 '+q.name+(q.dist!=null?' · '+q.dist+' m':' · in un’altra zona')));
   card.append(mk('h4',null,'👥 Vicino a te'));const vic=v.nearby.filter(q=>q.broken||q.motor);if(!vic.length)card.append(mk('p','muted','Avvicinati (meno di 4 m) a chi ha un mezzo per ripararlo o rifornirlo.'));
   for(const q of vic){const row=mk('div','rp-work');row.append(mk('b',null,(q.broken?'🔧 ':'🚗 ')+q.name));if(q.broken)row.append(button('🔧 Ripara',()=>run('/rp/repair',{id:q.id})));if(q.motor)row.append(button('⛽ Rifornisci',()=>run('/rp/refuel',{id:q.id})));card.append(row);}
   card.append(button('↻ Aggiorna',async()=>paint(await api('/rp'))));}
  if(v.work==='taxi'&&v.duty)card.append(mk('p','muted','🚕 Guida un’auto: quando un cliente sale accanto a te parte il tassametro, e paga la corsa quando scende. Le chiamate arrivano come avvisi.'));
  if(v.work==='medico'&&v.duty){
   card.append(mk('h4',null,'🚑 Feriti'));if(!v.injured.length)card.append(mk('p','muted','Nessun ferito in questo momento.'));
   for(const q of v.injured)card.append(mk('p',null,'🩹 '+q.name+(q.dist!=null?' · '+q.dist+' m':' · in un’altra zona')+' · '+q.left+' s'));
   card.append(mk('h4',null,'👥 Vicino a te'));const hurt=v.nearby.filter(q=>q.down);if(!hurt.length)card.append(mk('p','muted','Avvicinati a un ferito (meno di 4 m) per rianimarlo.'));
   for(const q of hurt){const row=mk('div','rp-work');row.append(mk('b',null,'🩹 '+q.name),button('🚑 Rianima',()=>run('/rp/revive',{id:q.id})));card.append(row);}
   card.append(button('↻ Aggiorna',async()=>paint(await api('/rp'))));}
  if(v.work==='polizia'&&v.duty){
   card.append(mk('h4',null,'🚨 Ricercati'));if(!v.wanted.length)card.append(mk('p','muted','Nessun ricercato in questo momento.'));
   for(const q of v.wanted)card.append(mk('p',null,'🔴 '+q.name+(q.dist!=null?' · '+q.dist+' m':' · in un’altra zona')));
   card.append(mk('h4',null,'👥 Vicino a te'));if(!v.nearby.length)card.append(mk('p','muted','Avvicinati a un giocatore (meno di 4 m) per arrestarlo o multarlo.'));
   for(const q of v.nearby){const row=mk('div','rp-work');row.append(mk('b',null,(q.wanted?'🔴 ':'')+q.name));
    if(q.wanted)row.append(button('🚔 Arresta',()=>run('/rp/arrest',{id:q.id})));
    row.append(button('🧾 Multa',()=>{const a=Number(prompt('Importo della multa (20-500 monete):','100'));if(!a)return;const r=prompt('Motivo:','eccesso di velocità')||'infrazione';run('/rp/fine',{id:q.id,amount:a,reason:r});}));card.append(row);}
   card.append(button('↻ Aggiorna',async()=>paint(await api('/rp'))));}}
 api('/rp').then(paint).catch(e=>{card.replaceChildren(mk('p','muted',e.message));});
 return card;}
