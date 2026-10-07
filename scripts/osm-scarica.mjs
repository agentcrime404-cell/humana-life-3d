// Scarica da OpenStreetMap (Overpass API) i dati di Mergellina e del lungomare fino a Castel dell'Ovo e Borgo Marinari.
// Si esegue UNA volta (o quando si vuole aggiornare): il gioco non scarica nulla durante la partita, usa il file salvato nel progetto.
//   node scripts/osm-scarica.mjs                   → data/osm/napoli-esteso.osm
//   node scripts/osm-napoli.mjs data/osm/napoli-esteso.osm client/assets/world/napoli/map/mergellina.json   → importazione
// Dati © OpenStreetMap contributors, licenza ODbL (https://www.openstreetmap.org/copyright). L'attribuzione è anche nella schermata Crediti e in docs/ATTRIBUZIONI.md.
import {writeFile,mkdir} from 'node:fs/promises';
const BBOX={s:40.8195,w:14.2090,n:40.8345,e:14.2535}; // Mergellina (ovest) → Castel dell'Ovo e Borgo Marinari (est), con le strade alle spalle
const q=`[out:xml][timeout:240];(
 way["building"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
 way["highway"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
 way["natural"~"coastline|beach|water|bay"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
 way["man_made"~"pier|breakwater|groyne|quay|lighthouse"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
 way["leisure"~"park|garden|marina|pitch|playground|swimming_pool|slipway"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
 way["landuse"~"grass|recreation_ground|forest|retail|residential|harbour"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
 way["amenity"~"parking|fountain|marketplace"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
 way["place"~"square"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
 way["historic"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
 way["tourism"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
 relation["building"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
 relation["natural"~"water|bay"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
 relation["leisure"~"park|garden"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
 node["amenity"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
 node["shop"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
 node["tourism"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
 node["historic"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
 node["leisure"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
 node["natural"~"tree|rock|beach"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
 node["highway"~"bus_stop|crossing|traffic_signals"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
 node["place"~"square|locality"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
);(._;>;);out meta;`;
const SERVERS=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
let xml=null,err=null;
for(const url of SERVERS){try{console.log('Scarico da',url);const r=await fetch(url,{method:'POST',headers:{'User-Agent':'HUMANA-NapoliLife/1.0 (importazione una tantum)','Content-Type':'application/x-www-form-urlencoded'},body:'data='+encodeURIComponent(q)});if(!r.ok){err=url+' → '+r.status;continue;}xml=await r.text();if(xml.includes('<osm')&&!xml.includes('<remark>runtime error'))break;err=url+' → risposta non valida';xml=null;}catch(e){err=url+' → '+e.message;}}
if(!xml){console.error('Download non riuscito:',err);process.exit(1);}
await mkdir('data/osm',{recursive:true});await writeFile('data/osm/napoli-esteso.osm',xml);
await writeFile('data/osm/napoli-esteso.bbox.json',JSON.stringify({...BBOX,scaricato:new Date().toISOString(),fonte:'OpenStreetMap via Overpass API',licenza:'ODbL'}));
console.log('Salvato data/osm/napoli-esteso.osm',(xml.length/1e6).toFixed(1),'MB; elementi:',(xml.match(/<(node|way|relation) /g)||[]).length);
