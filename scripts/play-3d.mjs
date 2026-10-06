// Avvio di HUMANA life 3D: un gioco separato da HUMANA life (2D).
// Ha la sua porta (3079, oppure PORT_3D nel file .env), il suo archivio (data/humana-3d.sqlite, oppure DATABASE_PATH_3D)
// e parte solo quando lo avvii tu: non si accende insieme al 2D e non ne tocca account, monete o posizioni.
import {networkInterfaces} from 'node:os';
import {createApp} from '../server/index.js';
// Su Render (server in affitto) la porta la decide Render (PORT) e l'indirizzo pubblico è RENDER_EXTERNAL_URL: serve per accettare il collegamento del gioco via HTTPS.
const onRender=!!process.env.RENDER;if(onRender&&!process.env.PUBLIC_ORIGIN&&process.env.RENDER_EXTERNAL_URL)process.env.PUBLIC_ORIGIN=process.env.RENDER_EXTERNAL_URL.replace(/\/+$/,'');
const port=Number(process.env.PORT_3D)||(onRender&&Number(process.env.PORT))||3079,host=process.env.HOST||'0.0.0.0';
const secure=!!(process.env.TLS_CERT&&process.env.TLS_KEY),protocol=secure?'https':'http';
const app=createApp({dbPath:process.env.DATABASE_PATH_3D||'./data/humana-3d.sqlite',edition:'3d'});
app.server.on('error',error=>{
 console.error(error.code==='EADDRINUSE'?'Porta '+port+' occupata: HUMANA life 3D è già acceso, oppure cambia PORT_3D nel file .env.':error.message);
 app.game.close();app.db.close();process.exitCode=1;
});
app.server.listen(port,host,()=>{
 console.log(`\nHUMANA life 3D pronta sul PC: ${protocol}://localhost:${port}`);
 if(host==='0.0.0.0')for(const list of Object.values(networkInterfaces()))for(const address of list||[])if(address.family==='IPv4'&&!address.internal)console.log(`Telefono sulla stessa rete Wi-Fi: ${protocol}://${address.address}:${port}`);
 console.log('Gioco separato da HUMANA life (2D): account e dati suoi. Lascia aperta questa finestra.');
 console.log('Per fermare: Ctrl+C.\n');
});
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await app.close();process.exit(0);});
