// Bot Telegram di Napoli life (@Napolilife_bot), da tenere acceso sul PC: node --env-file-if-exists=.env scripts/telegram-bot.mjs
// Comandi: /mappa (manda la mappa di Napoli Centro con punti numerati e legenda, così si possono segnare le modifiche), /aiuto.
// Ogni altro messaggio (testo, foto) viene salvato in data/telegram-inbox.jsonl: sono le richieste che l'utente vuole far fare a Claude.
import fs from 'node:fs';
import zlib from 'node:zlib';
import {MAPS,MODE,cityEdge,SHORE,BEACH,doors} from '../shared/world.js';
import {surface} from '../shared/district.js';
import {GAS,POLICE,ESI,esiGeom,HOSPITAL,hospGeom,MODERN,modernGeom,DEALERS,FUNFAIR,ARENA,gasGeom,policeGeom,MARKET} from '../shared/catalog.js';
const fromFile=(()=>{try{return (fs.readFileSync('.env','utf8').match(/^TELEGRAM_BOT_TOKEN=(.*)$/m)||[])[1]?.trim();}catch{return '';}})();
const TOKEN=(fromFile||process.env.TELEGRAM_BOT_TOKEN||'').trim();
if(!TOKEN){console.error('Manca TELEGRAM_BOT_TOKEN in .env');process.exit(2);}
const API='https://api.telegram.org/bot'+TOKEN+'/';
const call=async(m,body,form)=>(await fetch(API+m,{method:'POST',headers:form?undefined:{'Content-Type':'application/json'},body:form||JSON.stringify(body)})).json();

// ---- disegno della mappa in un PNG (senza librerie: pixel + zlib) ----
const COL={water:[52,132,201],sand:[236,217,166],grass:[134,192,96],garden:[124,179,90],road:[93,97,112],roadline:[93,97,112],parking:[107,110,120],crosswalk:[230,230,230],tiles:[232,224,210],marble:[240,236,228],cobble:[185,177,165],stone:[214,205,189],sidewalk:[216,207,191],curb:[207,199,184],pool:[79,195,224],track:[192,87,63],playground:[229,138,78],dirt:[167,132,92],wood:[168,119,79]};
const DIG={'0':'111101101101111','1':'010110010010111','2':'111001111100111','3':'111001111001111','4':'101101111001001','5':'111100111001111','6':'111100111101111','7':'111001001001001','8':'111101111101111','9':'111101111001111'};
const crcTable=zlib.crc32;
function png(w,h,rgb){const raw=Buffer.alloc((w*3+1)*h);for(let y=0;y<h;y++){raw[y*(w*3+1)]=0;rgb.copy(raw,y*(w*3+1)+1,y*w*3,(y+1)*w*3);}
 const chunk=(t,d)=>{const b=Buffer.alloc(12+d.length);b.writeUInt32BE(d.length,0);b.write(t,4);d.copy(b,8);b.writeUInt32BE(crcTable(b.subarray(4,8+d.length))>>>0,8+d.length);return b;};
 const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=2;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw,{level:6})),chunk('IEND',Buffer.alloc(0))]);}
function renderMap(){const E=cityEdge(),M=12,SC=5,x0=Math.floor(E.x0-M),y0=Math.floor(E.y0-M),W=Math.ceil(E.x1+10)-x0,H=Math.ceil(E.y1+10)-y0,pw=W*SC,ph=H*SC,buf=Buffer.alloc(pw*ph*3);
 const set=(px,py,c)=>{if(px<0||py<0||px>=pw||py>=ph)return;const i=(py*pw+px)*3;buf[i]=c[0];buf[i+1]=c[1];buf[i+2]=c[2];};
 const rect=(x,y,w,h,c)=>{for(let py=Math.round((y-y0)*SC);py<Math.round((y+h-y0)*SC);py++)for(let px=Math.round((x-x0)*SC);px<Math.round((x+w-x0)*SC);px++)set(px,py,c);};
 const frame=(x,y,w,h,c)=>{rect(x,y,w,.25,c);rect(x,y+h-.25,w,.25,c);rect(x,y,.25,h,c);rect(x+w-.25,y,.25,h,c);};
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const sh=x+x0+y+y0+1;let c=!MODE.front&&sh<SHORE-BEACH?(sh<SHORE-BEACH-3?COL.water:[143,196,232]):!MODE.front&&sh<SHORE?COL.sand:COL[surface(x+x0,y+y0)]||COL.grass;for(let a=0;a<SC;a++)for(let b=0;b<SC;b++)set(x*SC+a,y*SC+b,c);}
 // griglia ogni 20 m con la quota scritta ai bordi
 const grid=[0,0,0];for(let gx=Math.ceil(x0/20)*20;gx<x0+W;gx+=20)for(let py=0;py<ph;py+=2)set(Math.round((gx-x0)*SC),py,[40,50,70]);for(let gy=Math.ceil(y0/20)*20;gy<y0+H;gy+=20)for(let px=0;px<pw;px+=2)set(px,Math.round((gy-y0)*SC),[40,50,70]);
 const text=(s,px,py,sc,c,bg)=>{let x=px;for(const ch of String(s)){const d=DIG[ch];if(!d){x+=2*sc;continue;}if(bg)for(let a=-1;a<4*sc;a++)for(let b=-1;b<6*sc;b++)set(x+a,py+b,bg);for(let r=0;r<5;r++)for(let q=0;q<3;q++)if(d[r*3+q]==='1')for(let a=0;a<sc;a++)for(let b=0;b<sc;b++)set(x+q*sc+a,py+r*sc+b,c);x+=4*sc;}};
 for(let gx=Math.ceil(x0/20)*20;gx<x0+W;gx+=20)text(gx,Math.round((gx-x0)*SC)+3,3,2,[20,25,40],[255,255,255]);for(let gy=Math.ceil(y0/20)*20;gy<y0+H;gy+=20)text(gy,3,Math.round((gy-y0)*SC)+3,2,[20,25,40],[255,255,255]);
 for(const b of MAPS.lungomare.buildings){rect(b.fx,b.fy,b.fw,b.fh,[201,139,94]);frame(b.fx,b.fy,b.fw,b.fh,[122,78,50]);}
 const pois=[];const add=(name,x,y,c)=>pois.push({n:pois.length+1,name,x,y,c});
 for(const d of doors('lungomare')){if(d.to.startsWith('villa'))continue;add(d.name,d.exitX??d.x,d.exitY??d.y,[236,120,40]);}
 for(const g of GAS){const G=gasGeom(g);rect(g.x,g.y,g.w,g.h,[120,120,128]);add(g.name,G.cx,G.island.y,[214,45,45]);}
 for(const c of POLICE){const P=policeGeom(c);rect(P.build[0],P.build[1],P.build[2]-P.build[0],P.build[3]-P.build[1],[30,58,138]);add(c.name,P.door.x,P.door.y,[36,87,197]);}
 {const P=esiGeom(ESI);rect(P.build[0],P.build[1],P.build[2]-P.build[0],P.build[3]-P.build[1],[31,157,85]);add(ESI.name,P.door.x,P.door.y,[31,157,85]);}
 {const P=hospGeom(HOSPITAL);rect(P.build[0],P.build[1],P.build[2]-P.build[0],P.build[3]-P.build[1],[241,244,246]);add(HOSPITAL.name,P.door.x,P.door.y,[229,72,77]);}
 for(const m of MODERN){const P=modernGeom(m);for(const h of P.houses)rect(h[0],h[1],h[2]-h[0],h[3]-h[1],[240,240,240]);rect(P.pool[0],P.pool[1],P.pool[2]-P.pool[0],P.pool[3]-P.pool[1],[79,195,224]);add(m.name,m.x+m.w/2,m.y+m.h/2,[20,150,140]);}
 for(const d of DEALERS)add(d.name,d.x+d.w/2,d.y+d.h+1.2,[74,85,104]);
 for(const [id,r] of Object.entries(FUNFAIR.rides||{}))add(r.name,r.x,r.y,[142,68,173]);add('Arena paintball',ARENA.kiosk.x,ARENA.kiosk.y,[142,68,173]);
 add(MARKET.name+' (evento di mattina)',MARKET.x+MARKET.w/2,MARKET.y+MARKET.h/2,[242,183,5]);
 for(const p of pois){const cx=Math.round((p.x-x0)*SC),cy=Math.round((p.y-y0)*SC),r=10;for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++)if(a*a+b*b<=r*r)set(cx+a,cy+b,a*a+b*b>(r-2)*(r-2)?[255,255,255]:p.c);const s=String(p.n),sc=2,wd=s.length*4*sc-sc;text(s,cx-Math.floor(wd/2),cy-5,sc,[255,255,255]);}
 return {png:png(pw,ph,buf),pois,x0,y0,W,H};}

// ---- bot ----
fs.mkdirSync('data',{recursive:true});
const INBOX='data/telegram-inbox.jsonl',SAVE='data/telegram-chat.json';
const send=(id,text)=>call('sendMessage',{chat_id:id,text,disable_web_page_preview:true});
async function mappa(id){const r=renderMap(),f=new FormData();f.append('chat_id',String(id));
 f.append('caption','🗺 Napoli Centro: i numeri nei cerchi sono i luoghi (legenda nel messaggio sotto). La griglia ha una linea ogni 20 metri con le coordinate scritte ai bordi. Scrivimi qui le modifiche (es. «nuova spiaggia vicino a 12», «piazza a x=100 y=60») e le leggo.');
 f.append('document',new Blob([r.png],{type:'image/png'}),'mappa-napoli-life.png');const a=await call('sendDocument',null,f);
 const ph=new FormData();ph.append('chat_id',String(id));ph.append('photo',new Blob([r.png],{type:'image/png'}),'mappa.png');await call('sendPhoto',null,ph);
 const leg=r.pois.map(p=>p.n+'. '+p.name+' ('+Math.round(p.x)+', '+Math.round(p.y)+')').join('\n');for(let i=0;i<leg.length;i+=3800)await send(id,(i?'':'Legenda (x, y in metri):\n')+leg.slice(i,i+3800));return a.ok;}
if(process.argv[2]==='--prova'){const r=renderMap();fs.writeFileSync(process.argv[3]||'mappa-prova.png',r.png);console.log('mappa',r.W,r.H,r.pois.length,'luoghi');process.exit(0);}
if(process.argv[2]==='--invia'){const id=JSON.parse(fs.readFileSync(SAVE,'utf8')).id;console.log(await mappa(id)?'mappa inviata':'errore');process.exit(0);}
let offset=0;console.log('Bot acceso. Comandi: /mappa /aiuto');
for(;;){try{const u=await call('getUpdates',{offset,timeout:30,allowed_updates:['message']});for(const up of u.result||[]){offset=up.update_id+1;const m=up.message;if(!m)continue;const id=m.chat.id;try{fs.writeFileSync(SAVE,JSON.stringify({id,name:m.chat.first_name||''}));}catch{}
  const t=(m.text||m.caption||'').trim();
  if(/^\/(mappa|map)\b/i.test(t)){await send(id,'⏳ Preparo la mappa…');try{await mappa(id);}catch(e){await send(id,'Errore nella mappa: '+e.message);}}
  else if(/^\/(aiuto|help|start)\b/i.test(t))await send(id,'Napoli life · comandi:\n/mappa – ti mando la mappa con i luoghi numerati\nScrivimi qualsiasi modifica che vuoi e viene salvata per Claude.');
  else{fs.appendFileSync(INBOX,JSON.stringify({t:new Date(m.date*1000).toISOString(),text:t,foto:!!m.photo})+'\n');await send(id,'📝 Ricevuto, lo giro a Claude.');}}}catch(e){console.error('errore',e.message);await new Promise(r=>setTimeout(r,4000));}}
