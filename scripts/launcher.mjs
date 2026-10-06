// Lanciatore di HUMANA life: resta in ascolto sulla porta 3078 (solo rete di casa) e accende il server del gioco
// quando l'app sul telefono lo chiede. Non fa nient'altro: niente comandi arbitrari, nessun dato.
import http from 'node:http';import net from 'node:net';import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),GAME=3077,PORT=Number(process.env.LAUNCHER_PORT)||3078;
const up=()=>new Promise(ok=>{const s=net.connect(GAME,'127.0.0.1');s.once('connect',()=>{s.destroy();ok(true);});s.once('error',()=>ok(false));});
// Solo indirizzi privati (casa): 192.168.x, 10.x, 172.16-31.x e il PC stesso.
const local=a=>/^(::ffff:)?(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)|^::1$/.test(a||'');
let starting=null;
async function start(){if(await up())return 'acceso';if(starting)return 'in avvio';
 starting=spawn(process.execPath,['--env-file-if-exists=.env','scripts/play.mjs'],{cwd:root,detached:true,stdio:'ignore',windowsHide:true});starting.unref();
 for(let i=0;i<40&&!(await up());i++)await new Promise(r=>setTimeout(r,250));starting=null;return (await up())?'acceso':'errore';}
http.createServer(async(req,res)=>{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Content-Type','application/json');
 if(!local(req.socket.remoteAddress)){res.writeHead(403).end('{"error":"solo rete di casa"}');return;}
 if(req.url==='/stato'){res.end(JSON.stringify({server:(await up())?'acceso':'spento'}));return;}
 if(req.url==='/avvia'){res.end(JSON.stringify({server:await start()}));return;}
 res.writeHead(404).end('{"error":"non trovato"}');
}).listen(PORT,'0.0.0.0',()=>console.log('Lanciatore HUMANA life in ascolto sulla porta '+PORT));
// Guardiano: ogni 15 secondi controlla il gioco e, se è spento o è caduto, lo riaccende (tiene il server vivo per giorni).
if(process.env.HUMANA_GUARD!=='0'){const guard=async()=>{if(!(await up())&&!starting){console.log(new Date().toLocaleString('it-IT')+' gioco spento: riavvio');await start();}};setTimeout(guard,3000);setInterval(guard,15000);}
