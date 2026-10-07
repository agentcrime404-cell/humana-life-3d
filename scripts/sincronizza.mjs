// Copia il progetto nella cartella "Desktop\Napoli life" (solo i file cambiati). Si lancia a fine lavoro: node scripts/sincronizza.mjs
import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {homedir} from 'node:os';import {join} from 'node:path';
const src=fileURLToPath(new URL('../',import.meta.url)).replace(/[\/]$/,''),dst=process.argv[2]||join(homedir(),'Desktop','Napoli life');
if(src.toLowerCase()===dst.toLowerCase()){console.log('Sei già nella cartella Napoli life: niente da copiare.');process.exit(0);}
const r=spawnSync('robocopy',[src,dst,'/E','/COPY:DAT','/R:1','/W:1','/NFL','/NDL','/NJH','/NP','/MT:8'],{stdio:'inherit'});
console.log(r.status<8?'Cartella aggiornata: '+dst:'Errore nella copia (codice '+r.status+')');
