// Zona "Mergellina" di HUMANA life 3D: mappa vera da OpenStreetMap (© OpenStreetMap contributors, ODbL).
// La griglia (1 cella = 1 m) dice dove si cammina: niente palazzi né mare; i pontili sono calpestabili.
export const NAPOLI={data:null,grid:null,x0:0,y0:0,w:0,h:0};
const decode=b64=>typeof Buffer!=='undefined'?new Uint8Array(Buffer.from(b64,'base64')):Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
export function setNapoli(data){const g=data.grid;Object.assign(NAPOLI,{data,grid:decode(g.bits),x0:g.x0,y0:g.y0,w:g.w,h:g.h});}
export function napoliCell(x,y){if(!NAPOLI.grid)return false;const cx=Math.floor(x)-NAPOLI.x0,cy=Math.floor(y)-NAPOLI.y0;if(cx<0||cy<0||cx>=NAPOLI.w||cy>=NAPOLI.h)return false;const i=cy*NAPOLI.w+cx;return !!(NAPOLI.grid[i>>3]&(1<<(i&7)));}
// Un giocatore (raggio r) sta in piedi se il centro e i quattro lati sono calpestabili.
export function napoliStand(x,y,r=.25){return napoliCell(x,y)&&napoliCell(x+r,y)&&napoliCell(x-r,y)&&napoliCell(x,y+r)&&napoliCell(x,y-r);}
// Punto di partenza: Piazza Sannazaro (o la cella libera più vicina).
export function napoliSpawn(){const want={x:253,y:306};if(!NAPOLI.grid)return want;for(let d=0;d<200;d++)for(let a=0;a<16;a++){const x=want.x+Math.cos(a/16*Math.PI*2)*d,y=want.y+Math.sin(a/16*Math.PI*2)*d;if(napoliStand(x,y,.4))return {x:Math.round(x*10)/10,y:Math.round(y*10)/10};}return want;}
// Locali di Mergellina: ogni bar, ristorante, banca… della mappa vera porta all'interno corrispondente del gioco
// (stessi interni del Lungomare). Nomi inventati: niente marchi reali.
const KIND={bar:'bar',cafe:'bar',ice_cream:'bar',pastry:'bar',restaurant:['trattoria','osteria','vesuvio','panorama'],fast_food:['pizzeria','pizzeria','burger'],pub:'club',bank:'bank',
 supermarket:'shop',convenience:'shop',greengrocer:'shop',deli:'shop',dairy:'shop',bakery:'shop',seafood:'shop',butcher:'shop',clothes:'fashion',tailor:'fashion',hairdresser:'barber',beauty:'barber',bookmaker:'casino'};
const NAMES={bar:['Bar Sirena','Caffè del Molo','Bar Partenope','Bar Posillipo','Caffè Sannazaro','Bar Marechiaro','Caffè Mergellina','Gelateria del Porto'],trattoria:['Trattoria Mergellina','Trattoria Sannazaro','Da Gennaro'],osteria:['Osteria del Porto','Osteria Lucia'],vesuvio:['Ristorante Vesuvio','Ristorante Lucia'],panorama:['Ristorante Panorama','Terrazza sul Golfo'],
 pizzeria:['Pizzeria Sannazaro','Pizza a Portafoglio','Pizzeria del Molo'],burger:['Friggitoria del Molo'],club:['Discoteca Luna'],bank:['Banca del Golfo'],shop:['Bottega Mergellina','Alimentari del Porto','Bottega Marina'],fashion:['Moda Mergellina','Sartoria del Golfo'],barber:['Barbiere Totò','Salone Sirena'],casino:['Sala Slot Vesuvio']};
const H=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))|0;return Math.abs(h);};
// Porta = cella libera più vicina al punto del locale (davanti all'ingresso).
const near=(x,y)=>{for(let d=0;d<12;d+=.5)for(let a=0;a<12;a++){const px=x+Math.cos(a/12*Math.PI*2)*d,py=y+Math.sin(a/12*Math.PI*2)*d;if(napoliStand(px,py,.35))return {x:px,y:py};}return null;};
export function napoliPlaces(){if(NAPOLI.places)return NAPOLI.places;const out={doors:[],props:[]};if(!NAPOLI.data)return out;
 NAPOLI.data.pois.forEach((p,i)=>{const t=p.amenity||p.shop;if(t==='atm'){const q=near(p.x,p.y);if(q)out.props.push({id:'matm'+i,kind:'atm',x:q.x,y:q.y,r:.35});return;}
  if(t==='bench'){const q=near(p.x,p.y);if(q)out.props.push({id:'mbench'+i,kind:'bench',x:q.x,y:q.y,r:.5});return;}
  let to=KIND[t];if(!to)return;if(Array.isArray(to))to=to[H(p.x+','+p.y)%to.length];const q=near(p.x,p.y);if(!q)return;const names=NAMES[to];
  out.doors.push({id:'m'+i,name:names[H(i+':'+t)%names.length],x:q.x,y:q.y,exitX:q.x,exitY:q.y,to,kind:t});
  if(t==='bank'){const a=near(q.x+1.4,q.y);if(a)out.props.push({id:'matmb'+i,kind:'atm',x:a.x,y:a.y,r:.35});}});
 return NAPOLI.places=out;}
