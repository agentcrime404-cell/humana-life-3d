// «Aggiungi alla Home»: su iPhone/iPad (che non installano APK) e su Android/Chrome il gioco diventa un'icona sulla schermata Home e si apre a tutto schermo come un'app.
// iPhone: Safari → Condividi → «Aggiungi alla schermata Home» (Apple non permette di farlo da dentro la pagina, quindi si mostrano i passaggi).
// Android/Chrome: se il browser offre l'installazione parte con un tocco, altrimenti si indica il menu.
const ua=navigator.userAgent||'',ios=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const inApp=/FBAN|FBAV|Instagram|Snapchat|TikTok|Telegram|Line\//i.test(ua)||(ios&&/GSA\//.test(ua));
let deferred=null;addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;mount();});
addEventListener('appinstalled',()=>{deferred=null;document.getElementById('a2hs')?.remove();});
function card(){const old=document.getElementById('a2hs-card');if(old){old.remove();return;}
 const c=document.createElement('div');c.id='a2hs-card';c.style.cssText='position:fixed;left:50%;bottom:calc(64px + env(safe-area-inset-bottom));transform:translateX(-50%);width:min(360px,92vw);z-index:200;background:#10233a;color:#eef4fb;border:1px solid #f4d59788;border-radius:16px;padding:14px 16px;font:14px/1.5 system-ui,sans-serif;box-shadow:0 14px 40px #000a';
 const steps=ios?(inApp?'<b>Prima apri questa pagina in Safari</b> (menu ⋯ → «Apri in Safari»), poi:<br>':'')+'1. Tocca il tasto <b>Condividi</b> ⬆️ (in basso o in alto in Safari)<br>2. Scorri e scegli <b>«Aggiungi alla schermata Home»</b><br>3. Tocca <b>Aggiungi</b>: trovi l’icona di Napoli life sulla Home e si apre a tutto schermo come un’app.':
  'Apri il menu del browser <b>⋮</b> e scegli <b>«Installa app»</b> oppure <b>«Aggiungi a schermata Home»</b>. Compare l’icona di Napoli life sulla Home.';
 c.innerHTML='<b style="color:#f4d597">📲 Metti Napoli life sulla Home</b><div style="margin-top:6px">'+steps+'</div><button type="button" style="margin-top:10px;width:100%;padding:9px;border-radius:10px;border:0;background:#f4d597;color:#1a1205;font-weight:700">Ho capito</button>';
 c.querySelector('button').onclick=()=>c.remove();document.body.append(c);}
async function ask(){if(deferred){try{deferred.prompt();await deferred.userChoice;}catch{}deferred=null;document.getElementById('a2hs')?.remove();return;}card();}
function mount(){if(standalone()||document.getElementById('a2hs'))return;const host=document.getElementById('auth')||document.body;
 const b=document.createElement('button');b.id='a2hs';b.type='button';b.textContent='📲 Aggiungi alla Home';
 b.style.cssText='position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:150;padding:10px 18px;border-radius:999px;border:1px solid #f4d59799;background:#10233acc;color:#f4d597;font:600 14px system-ui,sans-serif;backdrop-filter:blur(6px)';
 b.onclick=ask;host.append(b);}
// il bottone sta nella schermata d'ingresso e sparisce quando si entra in gioco
const go=()=>{if(standalone())return;mount();const au=document.getElementById('auth');if(au){const upd=()=>{const b=document.getElementById('a2hs');if(b)b.style.display=getComputedStyle(au).display==='none'||au.hidden?'none':'';};new MutationObserver(upd).observe(au,{attributes:true});setInterval(upd,1500);}};
if(document.readyState==='loading')addEventListener('DOMContentLoaded',go);else go();
