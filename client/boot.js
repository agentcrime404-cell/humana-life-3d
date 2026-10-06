// Questo script indipendente resta disponibile anche se un modulo del gioco fallisce.
(() => {
 const panel=document.getElementById('startup-error');
 let sent=0;const send=(m,st)=>{if(sent++>4)return;try{fetch('/api/errore',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({m:String(m).slice(0,400),s:String(st||'').slice(0,300),p:location.pathname,room:window.__room||''}),keepalive:true}).catch(()=>{});}catch{}};
 function report(message,stack){panel.hidden=false;document.getElementById('startup-error-text').textContent=String(message).slice(0,300);send(message,stack);}
 addEventListener('error',e=>{if(e.target?.tagName==='SCRIPT')report('Caricamento del codice non riuscito. Controlla la connessione e premi Riprova.');else if(e.message)report(e.message,e.error?.stack);},true);
 addEventListener('unhandledrejection',e=>report(e.reason?.message||'Operazione non riuscita',e.reason?.stack));
 document.getElementById('retry-start').onclick=()=>location.reload();
})();
