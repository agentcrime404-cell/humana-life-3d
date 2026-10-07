// Crea docs/ATTIVITA-31.md: le 31 attività della legenda del Lungomare di fantasia ("Napoli Centro") e cosa le corrisponde a Mergellina (OpenStreetMap).
//   node scripts/attivita-31.mjs
import {readFileSync,writeFileSync} from 'node:fs';
import {doors,MAPS} from '../shared/world.js';
import {GAS,POLICE,ESI,HOSPITAL,MODERN,DEALERS,FUNFAIR,ARENA,MARKET,esiGeom,hospGeom,policeGeom,gasGeom} from '../shared/catalog.js';
const m=JSON.parse(readFileSync('client/assets/world/napoli/map/mergellina.json','utf8'));
const by=(f)=>m.pois.filter(f),named=l=>l.filter(p=>p.name).slice(0,4).map(p=>p.name).join(', ')||'—';
const cat={bar:by(p=>['bar','cafe','ice_cream'].includes(p.amenity)||p.shop==='pastry'),pizzeria:by(p=>p.amenity==='fast_food'&&/pizza/i.test(p.cuisine||'')),burger:by(p=>p.amenity==='fast_food'),restaurant:by(p=>p.amenity==='restaurant'),bank:by(p=>p.amenity==='bank'),shop:by(p=>['supermarket','convenience','greengrocer','bakery','deli','seafood','butcher'].includes(p.shop)),fashion:by(p=>['clothes','tailor','shoes','jewelry'].includes(p.shop)),barber:by(p=>['hairdresser','beauty'].includes(p.shop)),club:by(p=>p.amenity==='pub'||p.amenity==='nightclub'),casino:by(p=>p.shop==='bookmaker'||p.amenity==='casino'),fuel:by(p=>p.amenity==='fuel'),police:by(p=>p.amenity==='police'),hospital:by(p=>['hospital','clinic'].includes(p.amenity)),mall:by(p=>p.shop==='mall'||p.shop==='department_store'),boat:by(p=>p.amenity==='boat_rental'||p.leisure==='marina'),bike:by(p=>p.shop==='bicycle'||p.shop==='motorcycle'||p.shop==='car')};
const R={ bar:['bar','Bar, caffè, gelaterie, pasticcerie'], pizzeria:['pizzeria','Pizzerie'], burger:['burger','Fast food'], trattoria:['restaurant','Ristoranti'], osteria:['restaurant','Ristoranti'], vesuvio:['restaurant','Ristoranti'], panorama:['restaurant','Ristoranti'], bank:['bank','Banche'], shop:['shop','Negozi di alimentari'], mall:['mall','Centri commerciali'], fashion:['fashion','Negozi di abbigliamento'], barber:['barber','Parrucchieri'], club:['club','Locali notturni'], casino:['casino','Sale scommesse'] };
const rows=[];let n=0;const add=(nome,x,y,tipo,real,nota)=>rows.push(`| ${++n} | ${nome} | (${Math.round(x)}, ${Math.round(y)}) | ${tipo} | ${real} | ${nota} |`);
for(const d of doors('lungomare').filter(d=>!d.to.startsWith('villa'))){const r=R[d.to]||['',''],list=cat[r[0]]||[];add(d.name,d.exitX??d.x,d.exitY??d.y,d.to,list.length?`**${list.length} reali** su OSM (es. ${named(list)})`:'nessuno',list.length?'A Mergellina esistono attività dello stesso tipo con nome vero (porte generate da OpenStreetMap, stesso interno di gioco). Questa versione di fantasia resta nel Lungomare.':'Solo fantasia.');}
for(const g of GAS)add(g.name,g.x+g.w/2,g.y+g.h/2,'benzinaio',cat.fuel.length?`**${cat.fuel.length} reali** su OSM`:'nessuno','A Mergellina OSM ha '+cat.fuel.length+' distributori: il rifornimento oggi funziona solo ai distributori di fantasia del Lungomare.');
for(const c of POLICE)add(c.name,c.x+c.w/2,c.y+c.h/2,'polizia',cat.police.length?`${cat.police.length} su OSM (${named(cat.police)})`:'nessuno','Caserma di fantasia (prigione e furti funzionano qui).');
add(ESI.name,ESI.x+ESI.w/2,ESI.y+ESI.h/2,'rifiuti (ESI)','inventata','Camion ESI e spazzini girano anche a Mergellina sulle strade vere (6-13).');
add(HOSPITAL.name,HOSPITAL.x+HOSPITAL.w/2,HOSPITAL.y+HOSPITAL.h/2,'ospedale',cat.hospital.length?`${cat.hospital.length} su OSM (${named(cat.hospital)})`:'nessuno nel riquadro','Edificio di fantasia, solo scenografia.');
for(const mo of MODERN)add(mo.name,mo.x+mo.w/2,mo.y+mo.h/2,'residenze moderne','inventate','Scenografia del Lungomare di fantasia.');
for(const d of DEALERS)add(d.name,d.x+d.w/2,d.y+d.h/2,'concessionario/noleggio',cat.bike.length?`${cat.bike.length} negozi simili su OSM`:'nessuno','Solo nel Lungomare di fantasia (i veicoli si comprano qui).');
for(const [id,r] of Object.entries(FUNFAIR.rides||{}))add(r.name,r.x,r.y,'giostra (luna park)','inventata','Luna park di fantasia.');
add('Arena paintball',ARENA.kiosk.x,ARENA.kiosk.y,'arena','inventata','Solo nel Lungomare di fantasia.');add(MARKET.name,MARKET.x+MARKET.w/2,MARKET.y+MARKET.h/2,'mercato (evento 8-14)','inventato','Bancarelle nel Lungomare di fantasia.');
const md=`# Le 31 attività della legenda (Napoli Centro) → Mergellina

Generato il ${new Date().toISOString().slice(0,10)} da \`scripts/attivita-31.mjs\`. **Napoli Centro** resta come **area di fantasia** (dove ci sono tutte queste strutture, con collisioni risolte); **Mergellina** è la geografia vera da OpenStreetMap, con 295 porte: ${'~150'} attività con nome vero (non verificate sul posto) e ~150 inventate nelle zone vuote.

La legenda mostra ${rows.length} voci. Regola: **reale** = nome e posizione presi da OpenStreetMap; **inventata** = creata dal gioco.

| # | Attività (Napoli Centro) | Posizione (x, y) | Tipo | Corrispondenza reale a Mergellina | Nota |
|---|---|---|---|---|---|
${rows.join('\n')}

**Sovrapposizione risolta**: "Sala Slot Vesuvio" (casinò, porta in 108, 76) e "Moto e Scooter Vesuvio" (concessionario) occupavano lo stesso punto; il concessionario è stato spostato in (96, 40) fuori da corsie e altri edifici.
`;
writeFileSync('docs/ATTIVITA-31.md',md);console.log('righe',rows.length);
