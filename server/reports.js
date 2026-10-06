// Segnalazioni bug dalla modalità ispezione: salvate in data/segnalazioni/ (JSON + ritaglio PNG) e in un elenco leggibile.
import {mkdir,writeFile,appendFile} from 'node:fs/promises';import {join} from 'node:path';
export async function saveReport(dir,user,r){
 const note=String(r.note||'').slice(0,2000).trim(),label=String(r.label||'Punto della mappa').slice(0,300);if(!note&&!r.label)throw Object.assign(new Error('Scrivi cosa non va'),{status:400});
 await mkdir(dir,{recursive:true});const id=new Date().toISOString().replace(/[:.]/g,'-')+'-'+Math.random().toString(36).slice(2,6);
 const rec={id,time:new Date().toISOString(),user:user.username,room:String(r.room||'').slice(0,40),x:Number(r.x)||0,y:Number(r.y)||0,label,note,view:{zoom:Number(r.zoom)||1}};
 let image=null;if(typeof r.image==='string'&&r.image.startsWith('data:image/png;base64,')){image=id+'.png';await writeFile(join(dir,image),Buffer.from(r.image.slice(22),'base64'));}
 await writeFile(join(dir,id+'.json'),JSON.stringify({...rec,image},null,1));
 await appendFile(join(dir,'ELENCO.md'),`- [ ] ${rec.time} · ${rec.user} · ${rec.room} x ${rec.x.toFixed(1)} y ${rec.y.toFixed(1)} · ${label} — ${note}${image?' (immagine: '+image+')':''}\n`);
 return {ok:true,id};}

// Errori capitati ai giocatori, mandati dal browser da soli: una riga per errore in errori.log (al massimo 300 righe l'ora).
let errCount=0,errHour=0;
export async function logError(dir,r,ua){const h=Math.floor(Date.now()/3600000);if(h!==errHour){errHour=h;errCount=0;}if(++errCount>300)return {ok:false};await mkdir(dir,{recursive:true});const line=`${new Date().toISOString()} | ${String(r.p||'').slice(0,40)} | ${String(r.room||'').slice(0,20)} | ${String(r.m||'').replace(/\s+/g,' ').slice(0,400)} | ${String(r.s||'').replace(/\s+/g,' ').slice(0,300)} | ${String(ua||'').slice(0,120)}\n`;await appendFile(join(dir,'errori.log'),line);return {ok:true};}
