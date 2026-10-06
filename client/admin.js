// Pannello admin separato dal gioco: mappa intera a schermo, telecamera libera e strumenti di costruzione (stile The Sims).
import {Renderer} from './world/renderer.js';
import {api,setToken,token} from './networking/api.js';
import {installEditor} from './ui/editor.js';
import {MAPS,applyMapEdits} from '/shared/world.js';
const $=id=>document.getElementById(id),renderer=new Renderer($('world'));renderer.resize();addEventListener('resize',()=>renderer.resize());
let toastTimer;const notify=t=>{const n=$('toast');n.textContent=t;n.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.classList.remove('show'),2600);};
// Nessun personaggio: un punto di vista fisso sulla piazza, la telecamera la muove l'editor.
const me={id:'admin-view',room:'lungomare',...MAPS.lungomare.spawn};
const net=new EventTarget(),controls={enabled:false,reset(){}};
// Aggiornamenti in tempo reale dagli altri admin: si ricarica il documento ogni pochi secondi.
// Anteprima solo per l'admin: /admin?anteprima=front mostra la città frontale senza cambiarla per i giocatori.
const PREVIEW=new URLSearchParams(location.search).get('anteprima');const view=r=>PREVIEW?{...r,doc:{...r.doc,settings:{...(r.doc.settings||{}),view:PREVIEW==='front'?'front':'iso'}}}:r;
setInterval(async()=>{if(!token)return;try{const r=view(await api('/map/edits'));net.dispatchEvent(new CustomEvent('mapEdits',{detail:r}));}catch{}},5000);
const editor=installEditor({renderer,api,net,notify,controls,getMe:()=>me,standalone:true});
let last=performance.now();const frame=now=>{const dt=Math.min(.05,(now-last)/1000);last=now;renderer.draw([],me,dt);requestAnimationFrame(frame);};
async function enter(){const u=await api('/me');const r=view(await api('/map/edits'));if(!r.admin){setToken('');throw new Error(u.username+' non è un admin. Aggiungi il nome in ADMIN_USERS nel file .env.');}
 applyMapEdits(r.doc);Object.assign(me,MAPS.lungomare.spawn);renderer.camera={x:0,y:0};renderer.noNpc=r.doc?.settings?.npc===false;npcLabel(r.doc);viewLabel(r.doc);$('admin-login').hidden=true;$('admin-bar').hidden=false;$('admin-user').textContent='Admin: '+u.username;editor.open();}
$('admin-form').onsubmit=async e=>{e.preventDefault();$('admin-error').textContent='';try{const d=await api('/auth/login','POST',Object.fromEntries(new FormData(e.target)));setToken(d.token);await enter();}catch(err){$('admin-error').textContent=err.message;}};
const npcLabel=d=>{$('admin-npc').textContent=(d?.settings?.npc===false?'👥 Persone finte: SPENTE':'👥 Persone finte: ACCESE');};
net.addEventListener('mapEdits',e=>npcLabel(e.detail.doc));
$('admin-npc').onclick=async()=>{try{const cur=await api('/map/edits');const r=await api('/admin/map','POST',{op:'settings',npc:cur.doc?.settings?.npc===false});renderer.noNpc=r.doc.settings.npc===false;npcLabel(r.doc);notify(r.doc.settings.npc===false?'Persone finte spente per tutti':'Persone finte accese per tutti');}catch(err){notify(err.message);}};
$('admin-update').onclick=async()=>{try{const r=await api('/admin/reload','POST',{});notify('⬆️ Aggiornamento inviato a '+r.players+' giocatori collegati');}catch(e){notify(e.message);}};
const viewLabel=d=>{$('admin-view').textContent=d?.settings?.view==='front'?'🏙️ Vista: FRONTALE':'🏙️ Vista: ISOMETRICA';};
net.addEventListener('mapEdits',e=>viewLabel(e.detail.doc));
// Cambia la città per tutti: vista frontale (nuova) o isometrica (originale).
$('admin-view').onclick=async()=>{try{const cur=await api('/map/edits');const front=cur.doc?.settings?.view!=='front';if(!confirm(front?'Passare tutti alla città FRONTALE? Chi è all’aperto viene portato in piazza.':'Tornare alla città ISOMETRICA originale?'))return;const r=await api('/admin/map','POST',{op:'settings',view:front?'front':'iso'});applyMapEdits(r.doc);renderer.chunks.clear();renderer.miniCache=null;viewLabel(r.doc);notify(front?'Vista frontale attiva per tutti':'Vista isometrica attiva per tutti');}catch(err){notify(err.message);}};
$('admin-logout').onclick=async()=>{try{await api('/logout','POST',{});}catch{}setToken('');location.reload();};
$('admin-reset').onclick=async()=>{if(!confirm('Eliminare TUTTE le modifiche e tornare alla mappa originale? (Si può annullare con ↩️ Annulla)'))return;try{const r=await api('/admin/map','POST',{op:'reset'});applyMapEdits(r.doc);notify('Mappa originale ripristinata');}catch(e){notify(e.message);}};
// Accesso con Google, se configurato sul server.
(async()=>{try{const o=await api('/auth/options');if(!o.googleClientId)return;await new Promise((ok,ko)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=ok;s.onerror=ko;document.head.append(s);});
 google.accounts.id.initialize({client_id:o.googleClientId,callback:async r=>{try{const d=await api('/auth/google','POST',{credential:r.credential});setToken(d.token);await enter();}catch(err){$('admin-error').textContent=err.message;}}});
 google.accounts.id.renderButton($('admin-google'),{theme:'filled_black',size:'large',shape:'pill',text:'continue_with',locale:'it',width:260});}catch{}})();
renderer.ready.then(()=>{requestAnimationFrame(frame);if(token)enter().catch(()=>setToken(''));});
