import {readFileSync} from 'node:fs';
const base=(process.argv[2]||'http://localhost:3079').replace(/\/+$/,''); // senza barra finale: altrimenti gli indirizzi diventano //ui/...
const seen=new Set(),bad=[],q=['/','/app.js','/boot.js','/loader.js','/sw.js','/manifest.webmanifest','/scarica-3d','/health','/ui/style.css','/ui/hud.css'];
const sw=readFileSync('client/sw.js','utf8');
for(const m of sw.matchAll(/'(\/[^']*)'/g))q.push(m[1]);
for(const n of ['buildings','avatar','gulf','props','paving','residences','living','social-poses','icon-192','icon-512'])q.push('/assets/'+n+'.png');
const imports=src=>{const out=[];const re=/(?:from\s*|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g;let m;while((m=re.exec(src)))out.push(m[1]);return out.filter(x=>x.startsWith('.')||x.startsWith('/'));};
while(q.length){const u=q.shift();if(seen.has(u))continue;seen.add(u);if(u!=='/'&&u.endsWith('/'))continue;/* cartelle (es. '/assets/' nel codice), non file */let r;try{r=await fetch(base+u);}catch(e){bad.push(u+' → '+e.message);continue;}
 if(!r.ok){bad.push(u+' → '+r.status);continue;}
 if(/\.(js|mjs)$/.test(u)){const t=await r.text();for(const i of imports(t)){const p=i.startsWith('/')?i:new URL(i,base+u).pathname;if(!seen.has(p))q.push(p);}}
 else if(u==='/'){const t=await r.text();for(const m of t.matchAll(/(?:src|href)="(\/[^"#]*)"/g))q.push(m[1]);}}
console.log('file controllati',seen.size,'non raggiungibili',bad.length);for(const b of bad)console.log(' ',b);
