export let token=(()=>{try{return localStorage.getItem('humana-token')||sessionStorage.getItem('humana-token')||'';}catch{return '';}})();
export function setToken(t){token=t;try{localStorage.setItem('humana-token',t);sessionStorage.setItem('humana-token',t);}catch{}}
// Nel browser il server è la pagina stessa; nell'app Android è l'indirizzo scelto al login.
export let server=(globalThis.localStorage?.getItem('humana-server')||'').replace(/\/+$/,'');
export function setServer(url){server=url.trim().replace(/\/+$/,'');globalThis.localStorage?.setItem('humana-server',server);}
// La pagina dell'app 2D è una copia dentro l'APK (indirizzo https://localhost) e deve cercare il server: lì nativeApp è vero.
// L'app 3D invece è solo un guscio che apre il gioco da internet: la pagina arriva già dal server giusto, quindi si comporta come un normale browser.
export const nativeApp=!!globalThis.Capacitor?.isNativePlatform?.()&&/^(localhost|127.0.0.1)$/.test(globalThis.location?.hostname||'');
const base=()=>nativeApp?server:'';
export async function api(path,method='GET',body){if(globalThis.__steal&&method==='POST'&&body&&typeof body==='object')body={...body,steal:true};if(nativeApp&&!server)throw new Error('Inserisci l’indirizzo del server HUMANA');const response=await fetch(base()+'/api'+path,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:body===undefined?undefined:JSON.stringify(body)});let data;try{data=await response.json();}catch{data={};}if(!response.ok)throw Object.assign(new Error(data.error||'Errore di rete ('+response.status+')'),{status:response.status});return data;}
export class Connection extends EventTarget{
 connect(){clearTimeout(this.retry);this.attempts=this.attempts||0;return new Promise((resolve,reject)=>{
  if(this.ws&&this.ws.readyState<2)this.ws.close();
  const ws=new WebSocket((base()||location.origin).replace(/^http/,'ws')+'/ws');this.ws=ws;
  const timer=setTimeout(()=>{reject(new Error('Il server non risponde. Controlla rete e indirizzo.'));ws.close();},10000);
  ws.onopen=()=>this.send({type:'auth',token});
  ws.onmessage=e=>{let m;try{m=JSON.parse(e.data);}catch{return;}
   if(m.type==='welcome'){clearTimeout(timer);this.id=m.id;this.latency=null;this.wasConnected=true;this.attempts=0;clearInterval(this.heartbeat);this.heartbeat=setInterval(()=>this.send({type:'ping',time:Date.now()}),5000);resolve(m);}
   if(m.type==='pong')this.latency=Math.max(0,Date.now()-m.time);
   this.dispatchEvent(new CustomEvent(m.type,{detail:m}));
  };
  ws.onerror=()=>{clearTimeout(timer);reject(new Error('Connessione al server non riuscita'));};
  ws.onclose=e=>{clearTimeout(timer);if(this.ws!==ws)return;clearInterval(this.heartbeat);reject(new Error(e.reason||'Connessione chiusa'));if(this.wasConnected&&token&&![4001,4008,4009,4011].includes(e.code)&&this.attempts<8){const delay=Math.min(15000,1000*2**this.attempts++);this.dispatchEvent(new CustomEvent('reconnecting',{detail:this.attempts}));clearTimeout(this.retry);this.retry=setTimeout(()=>this.connect().catch(()=>{}),delay);}else{this.wasConnected=false;this.dispatchEvent(new CustomEvent('disconnected',{detail:e.reason||'Connessione interrotta: accedi di nuovo'}));}};
 });}
 send(m){if(this.ws?.readyState===1)this.ws.send(JSON.stringify(m));}
}
