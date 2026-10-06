// Converte un estratto OpenStreetMap (.osm) in una mappa compatta per HUMANA life 3D, in metri.
// x verso est, y verso sud (come il resto del gioco). Dati © OpenStreetMap contributors, licenza ODbL.
// Uso: node scripts/osm-napoli.mjs data/osm/mergellina.osm client/assets/world/napoli/map/mergellina.json
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {dirname} from 'node:path';
const [src,out]=process.argv.slice(2);const xml=await readFile(src,'utf8');
const attr=(s,k)=>{const m=s.match(new RegExp(' '+k+'="([^"]*)"'));return m?m[1]:undefined;};
const unesc=s=>s?.replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const tags=body=>{const t={};for(const m of body.matchAll(/<tag k="([^"]*)" v="([^"]*)"\/>/g))t[m[1]]=unesc(m[2]);return t;};
const nodes=new Map(),pois=[];
for(const m of xml.matchAll(/<node ([^>]*?)(\/>|>([\s\S]*?)<\/node>)/g)){const a=' '+m[1],id=attr(a,'id'),lat=+attr(a,'lat'),lon=+attr(a,'lon');nodes.set(id,[lat,lon]);if(m[3]){const t=tags(m[3]);if(t.amenity||t.shop)pois.push({lat,lon,t});}}
const b=' '+xml.match(/<bounds ([^>]*)\/>/)[1],lat0=(+attr(b,'minlat')+ +attr(b,'maxlat'))/2,lon0=(+attr(b,'minlon')+ +attr(b,'maxlon'))/2,kx=Math.cos(lat0*Math.PI/180)*111320,ky=110540;
const P=([lat,lon])=>[Math.round((lon-lon0)*kx*10)/10,Math.round(-(lat-lat0)*ky*10)/10];
const map={origin:{lat:lat0,lon:lon0},attribution:'© OpenStreetMap contributors (ODbL)',buildings:[],roads:[],coast:[],piers:[],parks:[],pois:[]};
for(const m of xml.matchAll(/<way [^>]*>([\s\S]*?)<\/way>/g)){const body=m[1],t=tags(body),pts=[...body.matchAll(/<nd ref="(\d+)"\/>/g)].map(r=>nodes.get(r[1])).filter(Boolean).map(P);if(pts.length<2)continue;
 if(t.building&&pts.length>=4){const lv=parseFloat(t['building:levels'])||(t.height?Math.round(parseFloat(t.height)/3.2):0);map.buildings.push({p:pts.slice(0,-1),lv:lv||undefined,name:t.name,kind:t.building!=='yes'?t.building:undefined,amenity:t.amenity,shop:t.shop});}
 else if(t.highway)map.roads.push({p:pts,k:t.highway,name:t.name,w:{primary:12,secondary:10,tertiary:8,residential:6,unclassified:6,service:4,living_street:5,pedestrian:6,footway:2.5,steps:2.5,path:2,cycleway:2.5}[t.highway]||5});
 else if(t.natural==='coastline')map.coast.push(pts);
 else if(t.man_made==='pier')map.piers.push({p:pts,area:pts.length>3&&pts[0][0]===pts.at(-1)[0]&&pts[0][1]===pts.at(-1)[1]});
 else if(t.leisure==='park'||t.leisure==='garden')map.parks.push(pts);}
for(const {lat,lon,t} of pois){const [x,y]=P([lat,lon]);map.pois.push({x,y,name:t.name,amenity:t.amenity,shop:t.shop});}
await mkdir(dirname(out),{recursive:true});await writeFile(out,JSON.stringify(map));
console.log('palazzi',map.buildings.length,'strade',map.roads.length,'costa',map.coast.length,'pontili',map.piers.length,'parchi',map.parks.length,'locali',map.pois.length,'kB',Math.round(JSON.stringify(map).length/1024));
// Niente marchi reali nel gioco: i locali tengono solo il tipo (il nome lo inventa il gioco); le strade tengono il nome.
for(const p of map.pois)delete p.name;for(const b of map.buildings)delete b.name;
// Griglia di calpestabilità (1 cella = 1 m): 0 = mare o palazzo, 1 = si cammina. Mare = a destra della linea di costa (convenzione OSM).
{const xs=map.buildings.flatMap(b=>b.p.map(q=>q[0])),ys=map.buildings.flatMap(b=>b.p.map(q=>q[1]));const x0=Math.floor(Math.min(...xs))-20,y0=Math.floor(Math.min(...ys))-20,W=Math.ceil(Math.max(...xs))+20-x0,H=Math.ceil(Math.max(...ys))+20-y0;
 const g=new Uint8Array(W*H).fill(1),segs=map.coast.flatMap(c=>c.slice(1).map((q,i)=>[c[i],q]));
 // Mare (veloce): la costa diventa una barriera di celle; ogni zona separata dalla costa è terra o mare
 // secondo il lato della costa più vicino a un suo punto (convenzione OSM: il mare sta a destra della linea).
 const side=(px,py)=>{let best=1e18,sd=0;for(const [a,b] of segs){const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((px-a[0])*dx+(py-a[1])*dy)/l)),qx=a[0]+dx*t-px,qy=a[1]+dy*t-py,d=qx*qx+qy*qy;if(d<best){best=d;sd=dx*(py-a[1])-dy*(px-a[0]);}}return sd;};
 const wall=new Uint8Array(W*H);for(const [a,b] of segs){const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*2)+1;for(let k=0;k<=n;k++){const cx=Math.floor(a[0]+(b[0]-a[0])*k/n)-x0,cy=Math.floor(a[1]+(b[1]-a[1])*k/n)-y0;if(cx>=0&&cy>=0&&cx<W&&cy<H)wall[cy*W+cx]=1;}}
 const zone=new Int32Array(W*H).fill(-1),stack=[];let zones=0;
 for(let i=0;i<W*H;i++){if(wall[i]||zone[i]>=0)continue;const z=zones++;zone[i]=z;stack.push(i);let count=0,sx=0,sy=0;
  while(stack.length){const q=stack.pop(),x=q%W,y=(q-x)/W;count++;if(count===1){sx=x;sy=y;}for(const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){if(nx<0||ny<0||nx>=W||ny>=H)continue;const j=ny*W+nx;if(!wall[j]&&zone[j]<0){zone[j]=z;stack.push(j);}}}
  if(segs.length&&side(sx+x0+.5,sy+y0+.5)>0)for(let j=0;j<W*H;j++)if(zone[j]===z)g[j]=0;}
 for(let i=0;i<W*H;i++)if(wall[i])g[i]=0;
 // Pontili calpestabili anche sul mare.
 for(const pr of map.piers)for(let i=1;i<pr.p.length;i++){const [a,b]=[pr.p[i-1],pr.p[i]],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));for(let k=0;k<=n;k++){const cx=Math.floor(a[0]+(b[0]-a[0])*k/n)-x0,cy=Math.floor(a[1]+(b[1]-a[1])*k/n)-y0;for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const q=(cy+oy)*W+cx+ox;if(q>=0&&q<g.length)g[q]=1;}}}
 // Palazzi pieni.
 for(const b of map.buildings){const P=b.p,bx0=Math.floor(Math.min(...P.map(q=>q[0]))),bx1=Math.ceil(Math.max(...P.map(q=>q[0]))),by0=Math.floor(Math.min(...P.map(q=>q[1]))),by1=Math.ceil(Math.max(...P.map(q=>q[1])));
  for(let y=by0;y<by1;y++)for(let x=bx0;x<bx1;x++){const px=x+.5,py=y+.5;let inside=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const [xi,yi]=P[i],[xj,yj]=P[j];if((yi>py)!==(yj>py)&&px<(xj-xi)*(py-yi)/(yj-yi)+xi)inside=!inside;}if(inside)g[(y-y0)*W+(x-x0)]=0;}}
 const bits=new Uint8Array(Math.ceil(W*H/8));for(let i=0;i<g.length;i++)if(g[i])bits[i>>3]|=1<<(i&7);
 map.grid={x0,y0,w:W,h:H,bits:Buffer.from(bits).toString('base64')};}
await writeFile(out,JSON.stringify(map));console.log('griglia',map.grid.w+'x'+map.grid.h,'kB totali',Math.round(JSON.stringify(map).length/1024));
