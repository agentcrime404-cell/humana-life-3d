// Codice QR della pagina di download (/scarica) con l'indirizzo del PC sulla rete di casa.
import QRCode from 'qrcode';import {networkInterfaces} from 'node:os';import {mkdir} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
const ip=process.argv[2]||Object.values(networkInterfaces()).flat().find(a=>a.family==='IPv4'&&!a.internal&&/^192\.168\.1\./.test(a.address))?.address||'192.168.1.36';
const url=`http://${ip}:3077/scarica`;await mkdir(new URL('../dist/',import.meta.url),{recursive:true});
await QRCode.toFile(fileURLToPath(new URL('../dist/qr-scarica.png',import.meta.url)),url,{width:640,margin:2,color:{dark:'#0b1622',light:'#ffffff'}});console.log('QR per',url);
// Il QR viene inserito anche dentro la pagina /scarica (immagine incorporata: si vede sempre, anche aprendo il file).
import {readFile,writeFile} from 'node:fs/promises';
const page=new URL('../client/scarica.html',import.meta.url),data=await QRCode.toDataURL(url,{width:440,margin:2,color:{dark:'#0b1622',light:'#ffffff'}});
const html=await readFile(page,'utf8');await writeFile(page,html.replace(/<img [^>]*alt="Codice QR[^"]*"[^>]*>/,`<img src="${data}" alt="Codice QR per scaricare HUMANA life (${url})">`));
{const h=await readFile(page,'utf8');await writeFile(page,h.replace(/<a class="btn" href="[^"]*" download>/,`<a class="btn" href="http://${ip}:3077/scarica/HUMANA-life.apk" download>`));}
