// Fa scaricare lo zip del progetto a un altro computer della rete di casa (es. il Mac), con un indirizzo segreto.
// Uso: node scripts/invia-al-mac.mjs   → stampa l'indirizzo da aprire sul Mac. Si spegne da solo dopo 3 ore.
import {createServer} from 'node:http';import {createReadStream,statSync,writeFileSync} from 'node:fs';import {networkInterfaces,homedir} from 'node:os';import {join} from 'node:path';import {randomBytes} from 'node:crypto';
const file=join(homedir(),'Desktop','HUMANA-per-Mac.zip'),size=statSync(file).size,code=randomBytes(9).toString('hex'),port=3090;
const ip=Object.values(networkInterfaces()).flat().find(a=>a.family==='IPv4'&&!a.internal&&/^(192\.168|10\.|172\.)/.test(a.address))?.address||'localhost';
createServer((req,res)=>{if(req.url!=='/'+code){res.writeHead(404);res.end('Non trovato');return;}
 res.writeHead(200,{'Content-Type':'application/zip','Content-Length':size,'Content-Disposition':'attachment; filename="HUMANA-per-Mac.zip"'});createReadStream(file).pipe(res);}).listen(port,'0.0.0.0',()=>{
 const url=`http://${ip}:${port}/${code}`;console.log(url);writeFileSync(join(homedir(),'Desktop','SCARICA-DAL-MAC.txt'),'Apri questo indirizzo sul Mac (stessa rete Wi-Fi di casa) per scaricare il progetto:\r\n\r\n'+url+'\r\n\r\nVale per 3 ore da quando è stato creato. Non darlo a nessuno: dentro ci sono i dati del gioco.\r\n');});
setTimeout(()=>process.exit(0),3*3600*1000);
