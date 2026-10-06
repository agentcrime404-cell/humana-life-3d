// Modalità costruzione per gli admin (stile The Sims): inventario, piazzamento, selezione, sposta, ruota, duplica, elimina, annulla.
// Il personaggio resta fermo e la telecamera è libera; ogni modifica passa dal server e arriva a tutti i giocatori.
import {GROUND_PAINTS,MAPS,EDIT_PROPS,EDIT_BUILDINGS,previewBuilding,blockedByBuilding,artName,applyMapEdits} from '/shared/world.js';
export function installEditor({renderer,api,net,notify,controls,getMe,resetPaths,standalone=false}){
 let doc={add:[],mod:{},del:[]},admin=false,on=false,tool=null,selected=null,cat='Edifici';
 const $=id=>document.getElementById(id),el=(t,c,txt)=>{const e=document.createElement(t);if(c)e.className=c;if(txt!==undefined)e.textContent=txt;return e;};
 net.addEventListener('mapEdits',e=>{doc=e.detail.doc;renderer.noNpc=doc?.settings?.npc===false;applyMapEdits(doc);renderer.chunks.clear();renderer.miniCache=null;resetPaths?.();if(selected&&!find(selected.id))select(null);});
 const btn=el('button',null,'🛠 Costruisci');btn.id='build-toggle';btn.type='button';btn.hidden=true;document.body.append(btn);
 const panel=el('aside');panel.id='build-panel';panel.hidden=true;document.body.append(panel);
 const tab=el('button',null,'🛠 Mostra editor');tab.id='build-tab';tab.type='button';tab.hidden=true;document.body.append(tab);let collapsed=false;
 const collapse=v=>{collapsed=v;panel.hidden=!on||collapsed;tab.hidden=!on||!collapsed;};tab.onclick=()=>collapse(false);
 const layer=el('div');layer.id='build-layer';layer.hidden=true;document.body.append(layer);
 async function refresh(){try{const r=await api('/map/edits');doc=r.doc;admin=r.admin;btn.hidden=standalone||!admin;}catch{}}
 net.addEventListener('welcome',refresh);setTimeout(refresh,2500);
 const send=async op=>{try{const r=await api('/admin/map','POST',op);doc=r.doc;renderer.noNpc=doc?.settings?.npc===false;applyMapEdits(doc);renderer.chunks.clear();renderer.miniCache=null;resetPaths?.();return r;}catch(e){notify('⚠️ '+e.message);return null;}};
 // Elementi della mappa: posizione corrente, tipo e immagine.
 const find=id=>{const m=MAPS.lungomare;return m.props.find(p=>p.id===id)||m.buildings.find(b=>b.id===id);};
 const centerOf=o=>o.base?{x:o.fx+o.fw/2,y:o.fy+o.fh/2}:{x:o.x,y:o.y};
 const propKey=o=>o.kind==='parked'?'parked-'+o.v:o.kind;
 const snap=(v,free)=>free?v:Math.round(v*2)/2;
 // Verifica sovrapposizioni (rosso = non si può posare, Maiusc per forzare).
 const valid=(g,ignore)=>{const m=MAPS.lungomare;if(g.building){const b=g.building,pts=[...b.base,{x:b.fx+b.fw/2,y:b.fy+b.fh/2}];return !m.buildings.some(o=>o.id!==ignore&&pts.some(q=>blockedByBuilding(o,q.x,q.y,.2)));}
  return !m.buildings.some(o=>o.id!==ignore&&blockedByBuilding(o,g.x,g.y,g.r||.3));};
 function ghostFor(item,x,y){if(item.type==='building'){const b=previewBuilding(item.art,x,y,item.flip);return {building:b,x,y};}
  const t=EDIT_PROPS[item.kind];return {kind:t.kind||item.kind,v:t.v,art:t.art,w:t.w,x,y,r:t.r,flip:item.flip,rot:item.rot||0,tint:item.color||null};}
 // ── Interfaccia ──
 function paintPanel(){panel.replaceChildren();const head=el('div','bp-head');const hide=el('button','bp-hide','◀ Nascondi');hide.type='button';hide.title='Nascondi il pannello (H)';hide.onclick=()=>collapse(true);head.append(hide,el('b',null,'🛠 Costruisci'),el('small',null,'Clic: seleziona · Trascina vuoto (o tasto destro): sposta vista · Trascina con un oggetto: posa in fila · Rotella: zoom · R ruota · Canc elimina · Ctrl+Z annulla · + / − dimensione · H nascondi pannello'));panel.append(head);
  const cats=[...new Set([...Object.values(EDIT_BUILDINGS),...Object.values(EDIT_PROPS)].map(t=>t.cat)),'Terreno'],tabs=el('div','bp-tabs');for(const c of cats){const b=el('button',c===cat?'on':'',c);b.type='button';b.onclick=()=>{cat=c;paintPanel();};tabs.append(b);}panel.append(tabs);
  const grid=el('div','bp-grid');const items=[...Object.entries(EDIT_BUILDINGS).map(([art,t])=>({type:'building',art,name:t.name,cat:t.cat,img:(renderer.assetBase||'')+'/assets/edifici/'+art+'.png'})),...Object.entries(EDIT_PROPS).map(([kind,t])=>({type:'prop',kind,name:t.name,cat:t.cat,icon:t.icon,img:t.art?(renderer.assetBase||'')+'/assets/oggetti/'+t.art+'.png':null}))].filter(i=>i.cat===cat);
  if(cat==='Terreno'){paintGround(grid);panel.append(grid);}
  for(const it of items){const b=el('button','bp-item'+(tool?.mode==='place'&&tool.item.name===it.name?' on':''));b.type='button';if(it.img){const im=el('img');im.alt='';im.onerror=()=>{im.replaceWith(el('span','bp-icon','⏳'));b.disabled=true;b.title='Immagine in arrivo';b.querySelector('small').textContent=it.name+' (in arrivo)';};im.src=it.img;b.append(im);}else b.append(el('span','bp-icon',it.icon));b.append(el('small',null,it.name));b.onclick=()=>{select(null);tool={mode:'place',item:{...it,flip:false,rot:0}};paintPanel();};grid.append(b);}
  if(cat!=='Terreno')panel.append(grid);
  const sel=el('div','bp-sel');if(selected){const o=find(selected.id);sel.append(el('b',null,(o?.name||EDIT_PROPS[propKey(o||{})]?.name||o?.kind||'')+' '),el('small',null,selected.id));
   const act=(t,f,cls)=>{const b=el('button',cls||'',t);b.type='button';b.onclick=f;sel.append(b);};
   act('✋ Sposta',startMove);act('🔄 Ruota',rotate);act('📄 Duplica',duplicate);act('🗑 Elimina',remove,'danger');
   // Dimensione: rimpicciolisci / ingrandisci (40% – 300%).
   {const cur=doc.mod[selected.id]?.scale||1,sz=el('div','bp-size');sz.append(el('small',null,'Dimensione: '+Math.round(cur*100)+'%'));for(const [t,f] of [['−',.9],['+',1.1]]){const b=el('button',null,t);b.type='button';b.onclick=()=>send({op:'update',id:selected.id,scale:Math.round(Math.min(3,Math.max(.4,cur*f))*100)/100}).then(()=>paintPanel());sz.append(b);}const rs=el('button',null,'100%');rs.type='button';rs.onclick=()=>send({op:'update',id:selected.id,scale:1}).then(()=>paintPanel());sz.append(rs);sel.append(sz);}
   // Tavolozza: ricolora l'elemento selezionato (Originale = colori dell'immagine).
   const pal=el('div','bp-pal');for(const col of [null,...COLORS]){const s=el('button','bp-sw'+(col?'':' orig'));s.type='button';s.title=col||'Originale';if(col)s.style.background=col;else s.textContent='↺';s.onclick=()=>send({op:'update',id:selected.id,color:col});pal.append(s);}const pick=el('input');pick.type='color';pick.title='Colore libero';pick.onchange=()=>send({op:'update',id:selected.id,color:pick.value});pal.append(pick);sel.append(el('small',null,'Colore:'),pal);}
  else sel.append(el('small',null,tool?.mode==='place'?'Clicca sulla mappa per posare: '+tool.item.name+' (R per ruotare, Esc per annullare)':'Seleziona un oggetto dall’inventario o clicca un elemento sulla mappa.'));
  const foot=el('div','bp-foot');const u=el('button',null,'↩️ Annulla');u.type='button';u.onclick=()=>send({op:'undo'});const x=el('button',null,standalone?'✖ Deseleziona':'✖ Esci');x.type='button';x.onclick=()=>standalone?(tool=null,renderer.ghost=null,select(null)):set(false);foot.append(u,x);panel.append(sel,foot);}
 // Colori proposti (stile Sims): neutri, pastello e vivaci.
 const COLORS=['#ffffff','#e8e2d6','#c9b79c','#8d6e63','#3e3e3e','#111111','#e53935','#f06292','#ff9800','#fdd835','#8bc34a','#2e7d32','#26a69a','#29b6f6','#1e3a8a','#7e57c2','#b39ddb','#d4af37'];
 // Terreno: materiali, gomma e dimensione del pennello; si dipinge cliccando o trascinando.
 let brush=1;function paintGround(grid){grid.classList.add('bp-ground');for(const [mat,name] of [...Object.entries(GROUND_PAINTS),[null,'Gomma (originale)']]){const b=el('button','bp-item'+(tool?.mode==='paint'&&tool.material===mat?' on':''));b.type='button';const sw=el('span','bp-mat m-'+(mat||'erase'));b.append(sw,el('small',null,name));b.onclick=()=>{select(null);tool={mode:'paint',material:mat};paintPanel();};grid.append(b);}
  const sz=el('div','bp-brush');sz.append(el('small',null,'Pennello:'));for(const n of [1,3,5,9]){const b=el('button',brush===n?'on':'',n+'×'+n);b.type='button';b.onclick=()=>{brush=n;paintPanel();};sz.append(b);}grid.append(sz);}
 function cellsAt(w){const out=[],h=Math.floor(brush/2),cx=Math.floor(w.x),cy=Math.floor(w.y);for(let x=cx-h;x<=cx+h;x++)for(let y=cy-h;y<=cy+h;y++)out.push([x,y]);return out;}
 let painting=null;
 // Oggetti in fila lungo la linea trascinata; recinzioni orientate sull'asse prevalente (fino a 60 pezzi).
 async function placeLine(a,b){const t=EDIT_PROPS[tool.item.kind],step=Math.max(.8,(t.w||1.5)*(t.cat==='Recinzioni'?1:1.15)),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),n=Math.min(60,Math.floor(len/step)+1);
  const fence=t.cat==='Recinzioni',alongY=Math.abs(dy)>Math.abs(dx);let pts=[];for(let i=0;i<n;i++){const k=n>1?i/(n-1):0;pts.push(fence?(alongY?{x:a.x,y:a.y+Math.sign(dy)*i*step}:{x:a.x+Math.sign(dx)*i*step,y:a.y}):{x:a.x+dx*k,y:a.y+dy*k});}
  notify('Posa di '+n+' × '+tool.item.name+'…');for(const p of pts)await send({op:'add',type:'prop',kind:tool.item.kind,x:Math.round(p.x*2)/2,y:Math.round(p.y*2)/2,flip:fence?alongY:tool.item.flip,rot:tool.item.rot});notify('✅ Posati '+n+' × '+tool.item.name);}
 function select(s){selected=s;renderer.selectedId=s?.id||null;if(on)paintPanel();}
 function startMove(){const o=find(selected.id);if(!o)return;const item=o.base?{type:'building',art:o.art||artName(o.id),flip:!!o.flip,name:o.name}:{type:'prop',kind:propKey(o),flip:!!o.flip,rot:o.rot||0,name:o.name};tool={mode:'move',id:o.id,item,from:centerOf(o)};renderer.selectedId=null;notify('Clicca dove spostarlo');}
 async function rotate(){if(tool?.item){if(tool.item.kind?.startsWith('parked-'))tool.item.rot=(tool.item.rot||0)+Math.PI/4;else tool.item.flip=!tool.item.flip;return;}if(!selected)return;const o=find(selected.id),cur=doc.mod[o.id]||{};
  if(o.kind==='parked')await send({op:'update',id:o.id,rot:(o.rot||0)+Math.PI/4});else await send({op:'update',id:o.id,flip:!(cur.flip??o.flip)});}
 async function duplicate(){const o=find(selected.id);if(!o)return;const c=centerOf(o),off=o.base?Math.max(o.fw,o.fh)+1:1.5;const r=await send(o.base?{op:'add',type:'building',art:o.art||artName(o.id),x:c.x+off,y:c.y,flip:!!o.flip}:{op:'add',type:'prop',kind:propKey(o),x:c.x+off,y:c.y,flip:!!o.flip,rot:o.rot||0});if(r?.id)select({id:r.id});}
 async function remove(){if(!selected)return;const r=await send({op:'remove',id:selected.id});if(r){notify('🗑 Eliminato');select(null);}}
 // ── Mouse e tastiera ──
 let drag=null,last=null;
 layer.addEventListener('pointermove',e=>{last=e;if(painting){const w=renderer.screenToWorld(e.clientX,e.clientY);for(const c of cellsAt(w))painting.set(c.join(','),c);return;}if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>5)drag.moved=true;const z=renderer.viewZoom||1;renderer.freeCam={x:drag.cx-dx/z,y:drag.cy-dy/z};return;}updateGhost(e);});
 function updateGhost(e){if(!tool||tool.mode==='paint'){renderer.ghost=null;return;}const w=renderer.screenToWorld(e.clientX,e.clientY),x=snap(w.x,e.altKey),y=snap(w.y,e.altKey),g=ghostFor(tool.item,x,y);g.valid=valid(g.building?{building:g.building}:g,tool.id);renderer.ghost=g;}
 let lineFrom=null;
 layer.addEventListener('pointerdown',e=>{if(tool?.mode==='place'&&e.button===0&&tool.item.type==='prop'){lineFrom={sx:e.clientX,sy:e.clientY,g:renderer.ghost&&{x:renderer.ghost.x,y:renderer.ghost.y}};layer.setPointerCapture(e.pointerId);return;}if(tool?.mode==='paint'&&e.button===0){painting=new Map();const w=renderer.screenToWorld(e.clientX,e.clientY);for(const c of cellsAt(w))painting.set(c.join(','),c);layer.setPointerCapture(e.pointerId);return;}drag={x:e.clientX,y:e.clientY,cx:renderer.freeCam.x,cy:renderer.freeCam.y,moved:false,button:e.button};layer.setPointerCapture(e.pointerId);});
 layer.addEventListener('pointerup',async e=>{if(lineFrom){const L=lineFrom;lineFrom=null;const g=renderer.ghost;if(!L.g||!g)return;if(Math.hypot(e.clientX-L.sx,e.clientY-L.sy)>12){await placeLine(L.g,{x:g.x,y:g.y});return;}}
  if(painting){const cells=[...painting.values()];painting=null;for(let i=0;i<cells.length;i+=900)await send({op:'paint',cells:cells.slice(i,i+900),material:tool.material});return;}const d=drag;drag=null;if(!d||d.moved)return;if(e.button===2){tool=null;renderer.ghost=null;paintPanel();return;}
  const w=renderer.screenToWorld(e.clientX,e.clientY);
  if(tool){const g=renderer.ghost;if(!g)return;if(g.valid===false&&!e.shiftKey){notify('Spazio occupato (tieni Maiusc per forzare)');return;}
   if(tool.mode==='place'){const r=await send(tool.item.type==='building'?{op:'add',type:'building',art:tool.item.art,x:g.x,y:g.y,flip:tool.item.flip}:{op:'add',type:'prop',kind:tool.item.kind,x:g.x,y:g.y,flip:tool.item.flip,rot:tool.item.rot});if(r)notify('✅ Posato: '+tool.item.name);}
   else{const cur=doc.mod[tool.id]||{},r=await send({op:'update',id:tool.id,dx:(cur.dx||0)+g.x-tool.from.x,dy:(cur.dy||0)+g.y-tool.from.y,flip:tool.item.flip,rot:tool.item.rot});if(r){notify('✅ Spostato');tool=null;renderer.ghost=null;select({id:r.id});}}
   return;}
  // Selezione: prima gli oggetti vicini, poi gli edifici sotto il cursore.
  const m=MAPS.lungomare,z=renderer.viewZoom||1,toS=(x,y)=>{const X=(x-y)*38,Y=(x+y)*19;return {x:(X-renderer.camera.x)*z+renderer.w*.5,y:(Y-renderer.camera.y)*z+renderer.h*.66};};let best=null,bd=1e9;
  for(const p of m.props){const s=toS(p.x,p.y),half=Math.max(22,(p.r||.3)*40)*z,top=(p.kind==='palm'||p.kind==='tree'?110:p.kind==='lamp'?80:p.kind==='parked'?60:50)*z,dx=Math.abs(e.clientX-s.x),dy=s.y-e.clientY;if(dx<half&&dy>-14*z&&dy<top){const dd=dx+Math.abs(dy-top/3);if(dd<bd){best=p;bd=dd;}}}
  if(!best)best=m.buildings.find(b=>blockedByBuilding(b,w.x,w.y,0));
  select(best?{id:best.id}:null);});
 layer.addEventListener('contextmenu',e=>e.preventDefault());
 layer.addEventListener('wheel',e=>{e.preventDefault();renderer.freeZoom=Math.min(1.6,Math.max(.5,(renderer.freeZoom||1)*(e.deltaY>0?.88:1.14)));},{passive:false});
 addEventListener('keydown',e=>{if(!on||/INPUT|TEXTAREA/.test(e.target.tagName))return;const k=e.key;
  if(k==='Escape'){if(tool){tool=null;renderer.ghost=null;paintPanel();}else if(selected)select(null);else if(!standalone)set(false);}
  else if((k==='+'||k==='-')&&selected){const cur=doc.mod[selected.id]?.scale||1;send({op:'update',id:selected.id,scale:Math.round(Math.min(3,Math.max(.4,cur*(k==='+'?1.1:.9)))*100)/100}).then(()=>paintPanel());}
  else if(k==='h'||k==='H'){collapse(!collapsed);}
  else if(k==='r'||k==='R'){rotate();if(last)updateGhost(last);}
  else if(k==='Delete'||k==='Backspace'){remove();}
  else if((e.ctrlKey||e.metaKey)&&k.toLowerCase()==='z'){send({op:'undo'});}
  else if((e.ctrlKey||e.metaKey)&&k.toLowerCase()==='d'){e.preventDefault();duplicate();}
  else{const v={ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]}[k];if(v){const st=70/(renderer.viewZoom||1);renderer.freeCam={x:renderer.freeCam.x+v[0]*st,y:renderer.freeCam.y+v[1]*st};}else return;}
  e.preventDefault();e.stopPropagation();},true);
 function set(v){if(v&&getMe()?.room!=='lungomare'){notify('Esci all’aperto per costruire');return;}on=v;layer.hidden=!on;panel.hidden=!on;collapse(collapsed&&on);btn.classList.toggle('on',on);btn.textContent=on?'🛠 Costruzione ON':'🛠 Costruisci';
  if(on){controls.reset();controls.enabled=false;{const m=getMe(),c=renderer.camera;renderer.freeCam=c.x||c.y?{...c}:renderer.project(m.x,m.y);}renderer.freeZoom=renderer.zoom*.8;paintPanel();notify('🛠 Modalità costruzione: il personaggio è fermo');}
  else{tool=null;select(null);renderer.ghost=null;renderer.freeCam=null;controls.enabled=!$('modal')?.open;}}
 btn.onclick=()=>set(!on);
 return {refresh,isOn:()=>on,open:()=>set(true)};
}
