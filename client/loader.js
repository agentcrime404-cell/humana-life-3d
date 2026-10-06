// Avvio del gioco. Sul telefono (app Android) carica la versione più recente dal server del PC: così gli aggiornamenti
// arrivano senza reinstallare l'APK. Se il PC non risponde (anche dopo aver chiesto al lanciatore di accenderlo) usa la copia interna.
const native=!!globalThis.Capacitor?.isNativePlatform?.();
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function fromServer(){
 let base='';try{base=(localStorage.getItem('humana-server')||'').replace(/\/+$/,'');}catch{}
 if(!/^https?:\/\//.test(base))base='http://192.168.1.36:3077';
 const host=base.replace(/:\d+$/,''),page=()=>fetch(base+'/index.html',{cache:'no-store',signal:AbortSignal.timeout(2500)}).then(r=>r.ok?r.text():null).catch(()=>null);
 let html=await page();
 if(!html){const note=document.getElementById('startup-error');try{await fetch(host+':3078/avvia',{signal:AbortSignal.timeout(15000)});}catch{}for(let i=0;i<15&&!html;i++){await wait(700);html=await page();}}
 if(!html)return false;
 const doc=new DOMParser().parseFromString(html,'text/html');
 // Stili e struttura della pagina presi dal server (versione aggiornata).
 for(const l of [...document.querySelectorAll('link[rel=stylesheet]')])l.remove();
 for(const l of doc.querySelectorAll('link[rel=stylesheet]')){const n=document.createElement('link');n.rel='stylesheet';n.href=base+l.getAttribute('href')+'?v='+Date.now();document.head.append(n);}
 document.body.replaceChildren(...[...doc.body.childNodes].filter(n=>n.nodeName!=='SCRIPT').map(n=>document.importNode(n,true)));
 window.HUMANA_REMOTE=base;
 await import(base+'/app.js?v='+Date.now());
 return true;}
if(native)fromServer().then(ok=>{if(!ok)import('./app.js');}).catch(e=>{console.warn('Aggiornamento dal server non riuscito',e);import('./app.js');});
else import('./app.js');
