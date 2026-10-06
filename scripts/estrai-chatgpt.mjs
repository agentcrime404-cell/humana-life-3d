// Salva le immagini estratte da ChatGPT (risultato JSON del browser) in data/nuovi/<nome>.jpg
import {readFile,writeFile} from 'node:fs/promises';
const raw=JSON.parse(await readFile(process.argv[2],'utf8'));let txt=Array.isArray(raw)?raw.map(x=>x.text).join(''):raw;const k=txt.indexOf('(captured at origin');if(k>0)txt=txt.slice(0,k);let obj=JSON.parse(txt.trim());if(typeof obj==='string')obj=JSON.parse(obj);
for(const [n,d] of Object.entries(obj)){await writeFile(new URL((process.argv[3]||'../data/nuovi/')+n+'.jpg',import.meta.url),Buffer.from(d.split(',')[1],'base64'));console.log('salvato',n);}
