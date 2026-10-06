// Avvio unico per PC e rete locale. Non pubblica il server su Internet.
import {networkInterfaces} from 'node:os';
import {createApp} from '../server/index.js';
const port=Number(process.env.PORT)||3000,host=process.env.HOST||'0.0.0.0';
const secure=!!(process.env.TLS_CERT&&process.env.TLS_KEY),protocol=secure?'https':'http';
const app=createApp();
app.server.on('error',error=>{
 console.error(error.code==='EADDRINUSE'?'Porta occupata. Chiudi il precedente server HUMANA o cambia PORT nel file .env.':error.message);
 app.game.close();app.db.close();process.exitCode=1;
});
app.server.listen(port,host,()=>{
 console.log(`\nHUMANA pronta sul PC: ${protocol}://localhost:${port}`);
 if(host==='0.0.0.0')for(const list of Object.values(networkInterfaces()))for(const address of list||[])if(address.family==='IPv4'&&!address.internal)console.log(`Telefono sulla stessa rete Wi-Fi: ${protocol}://${address.address}:${port}`);
 console.log('Crea un account diverso per ogni giocatore. Lascia aperto questo terminale.');
 if(!secure)console.log('Voce: localhost sul PC; sul telefono serve HTTPS con certificato valido.');
 console.log('Per fermare: Ctrl+C. I profili rimangono nel database locale.\n');
});
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await app.close();process.exit(0);});
