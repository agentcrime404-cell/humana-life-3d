// Zaino in stile FiveM: griglia di caselle con gli oggetti e il peso in alto; toccando un oggetto: Usa / Dai (a chi è vicino) / Butta.
// Schede: Zaino, Vestiti (indossa i cosmetici), Arredi (porta in casa), Compra (oggetti della Bottega Marina / Centro Commerciale).
import {BAG,BAG_ITEMS} from '/shared/catalog.js';
export function installBag({api,net,notify,modal,button,getMe,getPlayers,livingUI,getUser,onUser}){
 const mk=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=x;return e;};
 const rid=()=>globalThis.crypto?.randomUUID?.()||('r'+Date.now()+Math.random().toString(36).slice(2,12));
 const fmt=n=>(Math.round(n*10)/10).toLocaleString('it-IT');
 let box=null,tab='zaino',sel=null,data=null;
 const alive=()=>!!box?.isConnected&&!!document.getElementById('modal')?.open&&document.getElementById('modal-title')?.textContent==='🎒 Zaino';
 if(net&&!net.__bagMsg){net.__bagMsg=true;net.addEventListener('bag',()=>{if(alive()&&tab==='zaino')refresh();});}
 async function refresh(){try{data=await api('/bag');}catch(e){box.replaceChildren(mk('p','muted',e.message));return;}paint();}
 async function act(path,body){try{data=await api(path,'POST',body);document.dispatchEvent(new CustomEvent('humana:wallet'));}catch(e){notify(e.message);}if(sel&&!data.items.some(i=>i.id===sel))sel=null;paint();}
 function tabs(){const t=mk('div','bag-tabs');for(const [k,label] of [['zaino','🎒 Zaino'],['vestiti','👕 Vestiti'],['arredi','🛋️ Arredi'],['compra','🛒 Compra']]){const b=mk('button',tab===k?'on':'',label);b.type='button';b.onclick=()=>{tab=k;sel=null;paint();};t.append(b);}return t;}
 function nearby(){const me=getMe();if(!me)return [];return (getPlayers()||[]).filter(q=>q.id!==me.id&&q.room===me.room&&Math.hypot(q.x-me.x,q.y-me.y)<=BAG.reach);}
 function paint(){if(!alive()||!data)return;box.replaceChildren(tabs());
  if(tab==='zaino'){
   const kg=mk('div','bag-kg'),bar=mk('div','dh-bar'),fill=mk('i');fill.style.width=Math.min(100,data.kg/data.max*100)+'%';if(data.kg>data.max*.85)fill.style.background='#ef4444';bar.append(fill);kg.append(mk('span',null,'⚖️ '+fmt(data.kg)+' / '+data.max+' kg'),bar);box.append(kg);
   const grid=mk('div','bag-grid');for(let i=0;i<data.slots;i++){const it=data.items[i],s=mk('button','bag-slot'+(it?'':' empty')+(it&&it.id===sel?' sel':''));s.type='button';
    if(it){s.append(mk('span','bag-ic',it.icon),mk('b',null,'×'+it.qty));s.title=it.name;s.onclick=()=>{sel=it.id;paint();};}else s.disabled=true;grid.append(s);}box.append(grid);
   const it=data.items.find(i=>i.id===sel);
   if(!data.items.length)box.append(mk('p','muted','Lo zaino è vuoto. Compra qualcosa nella scheda 🛒 Compra (nella Bottega Marina o al Centro Commerciale).'));
   else if(!it)box.append(mk('p','muted','Tocca un oggetto per usarlo, darlo a qualcuno vicino o buttarlo.'));
   else{const d=mk('div','bag-detail');d.append(mk('h4',null,it.icon+' '+it.name+' ×'+it.qty),mk('small',null,it.desc+' · '+fmt(it.kg)+' kg'));const row=mk('div','bag-acts');
    row.append(button(it.use==='gift'?'💐 Annusa':'✋ Usa',()=>act('/bag/use',{item:it.id})));
    row.append(button('🎁 Dai',()=>{const who=nearby();const p=mk('div','bag-give');if(!who.length)p.append(mk('small','muted','Nessuno vicino: avvicinati a meno di '+BAG.reach+' m da un giocatore.'));for(const q of who)p.append(button('🎁 a '+(q.username||'giocatore'),()=>act('/bag/give',{item:it.id,to:q.id})));d.querySelector('.bag-give')?.remove();d.append(p);}));
    row.append(button('🗑️ Butta',()=>{if(confirm('Buttare '+it.icon+' '+it.name+'?'))act('/bag/drop',{item:it.id});}));d.append(row);box.append(d);}}
  else if(tab==='vestiti'){if(!data.cosmetics.length)box.append(mk('p','muted','Nessun cosmetico: si comprano nella Bottega Marina e i vestiti al Moda Market.'));
   for(const c of data.cosmetics){const r=mk('div','bag-row');r.append(mk('strong',null,c.name),button('Indossa',async()=>{const avatar=await api('/equip','POST',{item:c.id});onUser?.({...getUser(),avatar});notify('👕 Indossato: '+c.name);}));box.append(r);}}
  else if(tab==='arredi'){if(!data.furniture.length)box.append(mk('p','muted','Nessun arredo: si comprano nella Bottega Marina.'));
   for(const f of data.furniture){const r=mk('div','bag-row');r.append(mk('strong',null,f.name+' ×'+f.qty));box.append(r);}box.append(button('🏠 Arreda la tua casa',()=>livingUI.home()));}
  else{box.append(mk('p','muted','Si compra nella Bottega Marina o al Centro Commerciale. Lo zaino porta al massimo '+data.max+' kg.'));
   for(const it of BAG_ITEMS){const r=mk('div','bag-row');r.append(mk('strong',null,it.icon+' '+it.name),mk('small',null,it.price+' 🪙 · '+fmt(it.kg)+' kg'),button('Compra',async()=>{await api('/purchase','POST',{item:it.id,requestId:rid()});notify('🎒 Nello zaino: '+it.icon+' '+it.name);document.dispatchEvent(new CustomEvent('humana:wallet'));await refresh();}));box.append(r);}}}
 async function open(){box=modal('🎒 Zaino');tab='zaino';sel=null;box.append(mk('p','muted','Apro lo zaino…'));await refresh();}
 return {open};
}
