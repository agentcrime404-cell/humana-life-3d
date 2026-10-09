// Scheda «I miei locali» (stile FiveM) nell'app Lavoro: comprare il locale in cui si è entrati, vedere la cassa, ritirare l'incasso, rivendere.
export function bizCard({api,notify,button}){
 const mk=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=x;return e;};
 const card=mk('section','job-card rp-card');card.append(mk('p','muted','Caricamento locali…'));
 const run=async(path,body)=>{try{paint(await api(path,'POST',body));document.dispatchEvent(new CustomEvent('humana:wallet'));}catch(e){notify(e.message);}};
 function paint(v){card.replaceChildren(mk('h3',null,'🏪 I miei locali'));
  if(v.here){const h=v.here,row=mk('div','rp-work');row.append(mk('b',null,'📍 Sei in: '+h.name),mk('small',null,h.owner?(h.owner==='tu'?'È tuo!':'Proprietario: '+h.owner):'In vendita · '+h.price+' 🪙'));
   if(!h.owner)row.append(button('Compra questo locale',()=>{if(confirm('Comprare '+h.name+' per '+h.price+' monete?'))run('/biz/buy',{});}));card.append(row);}
  else card.append(mk('p','muted','Entra in un bar, ristorante o negozio di Mergellina per comprarlo. I clienti che spendono riempiono la tua cassa (20%).'));
  if(!v.mine.length)card.append(mk('p','muted','Non hai ancora locali.'));
  for(const r of v.mine){const row=mk('div','rp-work');row.append(mk('b',null,r.name),mk('small',null,r.room+' · cassa: '+r.cassa+' 🪙'),button('💰 Ritira incasso',()=>run('/biz/collect',{door:r.door})),button('🏷️ Rivendi',()=>{if(confirm('Rivendere '+r.name+' a metà prezzo?'))run('/biz/sell',{door:r.door});}));card.append(row);}}
 api('/biz').then(paint).catch(e=>card.replaceChildren(mk('p','muted',e.message)));
 return card;}
