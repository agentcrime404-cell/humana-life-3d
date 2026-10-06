// Attrezzo di lavoro (non fa parte del gioco): converte i modelli scaricati nel formato che il gioco carica in fretta.
// Serve SOLO su questo computer (127.0.0.1) una pagina che usa il browser come convertitore:
//  - persone: FBX + texture TGA (Microsoft Rocketbox)  →  GLB con texture JPEG ridotte
//  - alberi:  modello glTF pesante                      →  immagini "sagoma" PNG da usare su due piani incrociati
// Uso:  node scripts/converti-modelli.mjs   poi aprire http://127.0.0.1:3391/
import {createServer} from 'node:http';
import {readFile, writeFile, mkdir, stat} from 'node:fs/promises';
import {dirname, join, normalize, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..'),PORT=Number(process.env.PORT_CONVERTI||3391);
const MOUNT={'/three/':'client/vendor/three','/jsm/':'tools/modelli/three-r170','/src/':'tools/modelli/sorgenti','/assets/':'client/assets/world/napoli','/tool/':'tools/modelli'};
// Dove la pagina può scrivere: solo le cartelle dei modelli nuovi.
const WRITABLE=['client/assets/world/napoli/characters/persone-vere/','client/assets/world/napoli/vegetation/alberi-veri/','client/assets/world/napoli/vehicles/auto-vere/','tools/modelli/prove/'];
const TYPES={'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.gltf':'model/gltf+json','.glb':'model/gltf-binary','.bin':'application/octet-stream','.fbx':'application/octet-stream','.tga':'application/octet-stream','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.hdr':'application/octet-stream','.html':'text/html; charset=utf-8','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const PAGE=`<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Convertitore modelli HUMANA</title>
<style>body{margin:0;background:#20242b;color:#e8e8e8;font:14px system-ui}#log{position:fixed;left:8px;top:8px;white-space:pre-wrap;max-width:46vw;z-index:2}canvas{display:block}</style>
<script type="importmap">{"imports":{"three":"/three/three.module.min.js"}}</script></head><body><div id="log">Convertitore modelli: pronto.</div>
<script type="module" src="/tool/pagina.js"></script></body></html>`;
const inside=(base,p)=>{const full=normalize(join(ROOT,base,p));return full.startsWith(normalize(join(ROOT,base))+sep)||full===normalize(join(ROOT,base))?full:null;};

createServer(async (req,res)=>{
 try{
  const url=new URL(req.url,'http://x'),path=decodeURIComponent(url.pathname);
  if(req.method==='GET'&&path==='/'){res.writeHead(200,{'content-type':TYPES['.html'],'cache-control':'no-store'});return res.end(PAGE);}
  if(req.method==='GET'){
   const m=Object.keys(MOUNT).find(k=>path.startsWith(k));const full=m&&inside(MOUNT[m],path.slice(m.length));
   if(!full){res.writeHead(404);return res.end('non trovato');}
   const data=await readFile(full);res.writeHead(200,{'content-type':TYPES[extname(full).toLowerCase()]||'application/octet-stream','cache-control':'no-store'});return res.end(data);}
  if(req.method==='POST'&&path==='/save'){
   const to=String(url.searchParams.get('to')||'').replaceAll('\\','/');
   if(!WRITABLE.some(w=>to.startsWith(w))||to.includes('..')||!/\.(glb|gltf|bin|png|jpg|json|md)$/i.test(to)){res.writeHead(403);return res.end('percorso non permesso');}
   const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks),full=join(ROOT,to);
   await mkdir(dirname(full),{recursive:true});await writeFile(full,body);const st=await stat(full);
   res.writeHead(200,{'content-type':'application/json'});return res.end(JSON.stringify({ok:true,to,bytes:st.size}));}
  res.writeHead(405);res.end('metodo non permesso');
 }catch(err){res.writeHead(err.code==='ENOENT'?404:500);res.end(String(err.message||err));}
}).listen(PORT,'127.0.0.1',()=>console.log('Convertitore modelli su http://127.0.0.1:'+PORT+'/  (solo questo computer)'));
