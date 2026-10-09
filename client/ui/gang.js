// Scheda «Gang» (stile FiveM) nell'app Lavoro: fondare una gang, inviti, membri, cassa comune.
export function gangCard({api,notify,button}){
 const mk=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=x;return e;};
 const card=mk('section','job-card rp-card');card.append(mk('p','muted','Caricamento gang…'));
 const run=async(path,body)=>{try{paint(await api(path,'POST',body));document.dispatchEvent(new CustomEvent('humana:wallet'));}catch(e){notify(e.message);}};
 const ask=(q,def)=>{const v=prompt(q,def);return v===null?null:v;};
 function paint(v){card.replaceChildren();const g=v.gang;
  if(!g){card.append(mk('h3',null,'🏴 Gang'),mk('p','muted','Fonda la tua gang ('+v.price+' 🪙, fino a '+v.max+' membri): cassa comune e il 10% delle rapine dei membri va in cassa.'));
   const cols=mk('div','rp-work');let color=v.colors[0];for(const c of v.colors){const b=mk('button','gang-col');b.type='button';b.style.background=c;b.onclick=()=>{color=c;cols.querySelectorAll('.gang-col').forEach(x=>x.classList.toggle('on',x===b));};cols.append(b);}cols.firstChild?.classList.add('on');card.append(cols);
   card.append(button('🏴 Fonda una gang',()=>{const name=ask('Nome della gang (3-20 lettere):','');if(name)run('/gang/create',{name,color});}));
   for(const i of v.invites){const row=mk('div','rp-work');row.append(mk('b',null,'Invito: '+i.name),button('Accetta',()=>run('/gang/accept',{gang:i.id})));card.append(row);}return;}
  const h=mk('h3',null,'🏴 '+g.name);h.style.color=g.color;card.append(h,mk('p','muted','Cassa: '+g.cassa+' 🪙 · membri '+g.members.length+'/'+v.max));
  for(const m of g.members){const row=mk('div','rp-work');row.append(mk('b',null,(m.leader?'👑 ':'')+(m.online?'🟢 ':'⚪ ')+m.name));if(g.leader&&!m.leader)row.append(button('Caccia',()=>{if(confirm('Cacciare '+m.name+'?'))run('/gang/kick',{id:m.id});}));card.append(row);}
  const acts=mk('div','rp-work');acts.append(button('💰 Versa',()=>{const n=Number(ask('Quante monete versi nella cassa?','100'));if(n)run('/gang/deposit',{amount:n});}));
  if(g.leader)acts.append(button('🏦 Ritira',()=>{const n=Number(ask('Quante monete ritiri dalla cassa?',String(g.cassa)));if(n)run('/gang/withdraw',{amount:n});}));
  acts.append(button('🚪 Esci',()=>{if(confirm('Uscire dalla gang?'))run('/gang/leave',{});}));card.append(acts);
  if(g.leader){card.append(mk('h4',null,'Invita chi è vicino'));const near=v.near.filter(q=>!q.gang);if(!near.length)card.append(mk('p','muted','Avvicinati a un giocatore senza gang (meno di 6 m).'));for(const q of near){const row=mk('div','rp-work');row.append(mk('b',null,q.name),button('Invita',()=>run('/gang/invite',{id:q.id})));card.append(row);}}}
 api('/gang').then(paint).catch(e=>card.replaceChildren(mk('p','muted',e.message)));
 return card;}
