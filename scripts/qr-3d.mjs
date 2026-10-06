// Codice QR per aprire HUMANA life 3D dal telefono di casa: indirizzo del PC sulla rete Wi-Fi + porta del 3D.
// Uso: npm run qr3d   (oppure: node scripts/qr-3d.mjs 192.168.1.50 3079)
import QRCode from 'qrcode';import {networkInterfaces} from 'node:os';import {mkdir,writeFile,copyFile} from 'node:fs/promises';import {existsSync} from 'node:fs';import {fileURLToPath} from 'node:url';import {homedir} from 'node:os';import {join} from 'node:path';
const ip=process.argv[2]||Object.values(networkInterfaces()).flat().find(a=>a.family==='IPv4'&&!a.internal&&/^192\.168\.1\./.test(a.address))?.address||'192.168.1.36';
const port=Number(process.argv[3])||Number(process.env.PORT_3D)||3079,url=`http://${ip}:${port}/`;
await mkdir(new URL('../dist/',import.meta.url),{recursive:true});
const out=fileURLToPath(new URL('../dist/qr-3d.png',import.meta.url));
// QR con sotto il nome del gioco e l'indirizzo scritto in chiaro (se manca la libreria per disegnare, resta il solo QR).
try{
 const {createCanvas,loadImage}=await import('@napi-rs/canvas');
 const qr=await loadImage(await QRCode.toBuffer(url,{width:640,margin:2,color:{dark:'#0b1622',light:'#ffffff'}}));
 const c=createCanvas(640,760),g=c.getContext('2d');g.fillStyle='#ffffff';g.fillRect(0,0,640,760);g.drawImage(qr,0,0);
 g.fillStyle='#0b1622';g.textAlign='center';g.font='bold 44px sans-serif';g.fillText('HUMANA life 3D',320,680);g.font='30px sans-serif';g.fillText(url,320,728);
 await writeFile(out,c.toBuffer('image/png'));
}catch{await QRCode.toFile(out,url,{width:640,margin:2,color:{dark:'#0b1622',light:'#ffffff'}});}
console.log('QR per',url,'->',out);
// Copia anche nella cartella "HUMANA life 3D" sul Desktop, se c'è.
const desk=join(homedir(),'Desktop','HUMANA life 3D');if(existsSync(desk)){await copyFile(out,join(desk,'QR HUMANA life 3D.png'));console.log('Copiato in',desk);}
