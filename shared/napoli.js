// Zona "Mergellina" di HUMANA life 3D: mappa vera da OpenStreetMap (© OpenStreetMap contributors, ODbL).
// La griglia (1 cella = 1 m) dice dove si cammina: niente palazzi né mare; i pontili sono calpestabili.
export const NAPOLI={data:null,grid:null,x0:0,y0:0,w:0,h:0};
const decode=b64=>typeof Buffer!=='undefined'?new Uint8Array(Buffer.from(b64,'base64')):Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
export function setNapoli(data){const g=data.grid;Object.assign(NAPOLI,{data,grid:decode(g.bits),x0:g.x0,y0:g.y0,w:g.w,h:g.h,tunnels:[]});carveTunnels();}
// Gallerie vere (Galleria della Vittoria, delle Quattro Giornate, di Posillipo...): il corridoio si può percorrere a piedi e in auto,
// gli edifici sopra il tracciato non si disegnano (la collina è il tubo) e ogni carreggiata larga al massimo 7 m.
const NOT_CAR=new Set(['footway','steps','path','cycleway','pedestrian']);
function carveTunnels(){const D=NAPOLI.data,T=NAPOLI.tunnels;
 for(const r of D.roads||[]){if(!r.tn||NOT_CAR.has(r.k)||(r.w||5)<5)continue;let len=0;for(let i=1;i<r.p.length;i++)len+=Math.hypot(r.p[i][0]-r.p[i-1][0],r.p[i][1]-r.p[i-1][1]);if(len<60)continue;
  if(r.w>7)r.w=7;T.push({p:r.p,w:r.w,len,name:r.name||'Galleria',ow:r.ow});}
 const set=(x,y)=>{const cx=Math.floor(x)-NAPOLI.x0,cy=Math.floor(y)-NAPOLI.y0;if(cx<0||cy<0||cx>=NAPOLI.w||cy>=NAPOLI.h)return;const i=cy*NAPOLI.w+cx;NAPOLI.grid[i>>3]|=1<<(i&7);};
 const segD=(x,y,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/l));return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);};
 for(const t of T){const R=t.w/2+.4;for(let i=1;i<t.p.length;i++){const a=t.p[i-1],b=t.p[i],L=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let d=0;d<=L;d+=.75){const x=a[0]+(b[0]-a[0])*d/L,y=a[1]+(b[1]-a[1])*d/L;for(let ox=-Math.ceil(R);ox<=Math.ceil(R);ox++)for(let oy=-Math.ceil(R);oy<=Math.ceil(R);oy++)if(Math.hypot(ox,oy)<=R)set(x+ox,y+oy);}}}
 const inPoly=(x,y,P)=>{let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++)if((P[i][1]>y)!==(P[j][1]>y)&&x<(P[j][0]-P[i][0])*(y-P[i][1])/(P[j][1]-P[i][1])+P[i][0])c=!c;return c;};
 for(const b of D.buildings||[]){const P=b.p;if(!P||P.length<3)continue;let hit=false;
  for(const t of T){const R=t.w/2+1.8;for(let i=1;i<t.p.length&&!hit;i++){const a=t.p[i-1],c=t.p[i];if(P.some(q=>segD(q[0],q[1],a,c)<R))hit=true;else{const L=Math.hypot(c[0]-a[0],c[1]-a[1]);for(let d=0;d<=L&&!hit;d+=3)if(inPoly(a[0]+(c[0]-a[0])*d/L,a[1]+(c[1]-a[1])*d/L,P))hit=true;}}if(hit)break;}
  if(hit)b.tn=1;}}
export function napoliInTunnel(x,y,pad=.5){for(const t of NAPOLI.tunnels||[])for(let i=1;i<t.p.length;i++){const a=t.p[i-1],b=t.p[i],dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy||1,k=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/l));if(Math.hypot(x-a[0]-dx*k,y-a[1]-dy*k)<t.w/2+pad)return true;}return false;}
export function napoliCell(x,y){if(!NAPOLI.grid)return false;const cx=Math.floor(x)-NAPOLI.x0,cy=Math.floor(y)-NAPOLI.y0;if(cx<0||cy<0||cx>=NAPOLI.w||cy>=NAPOLI.h)return false;const i=cy*NAPOLI.w+cx;return !!(NAPOLI.grid[i>>3]&(1<<(i&7)));}
// Un giocatore (raggio r) sta in piedi se il centro e i quattro lati sono calpestabili.
export function napoliStand(x,y,r=.25){return napoliCell(x,y)&&napoliCell(x+r,y)&&napoliCell(x-r,y)&&napoliCell(x,y+r)&&napoliCell(x,y-r);}
// Punto di partenza: Piazza Sannazaro (o la cella libera più vicina).
export function napoliSpawn(){const want={x:253,y:306};if(!NAPOLI.grid)return want;for(let d=0;d<200;d++)for(let a=0;a<16;a++){const x=want.x+Math.cos(a/16*Math.PI*2)*d,y=want.y+Math.sin(a/16*Math.PI*2)*d;if(napoliStand(x,y,.4))return {x:Math.round(x*10)/10,y:Math.round(y*10)/10};}return want;}
// Locali di Mergellina: ogni bar, ristorante, banca… della mappa vera porta all'interno corrispondente del gioco
// (stessi interni del Lungomare). Se il locale esiste su OpenStreetMap ne tiene il nome (real:true), altrimenti ha un nome di fantasia (real:false).
const KIND={bar:'bar',cafe:'bar',ice_cream:'bar',pastry:'bar',restaurant:['trattoria','osteria','vesuvio','panorama'],fast_food:['pizzeria','pizzeria','burger'],pub:'club',bank:'bank',
 supermarket:'shop',convenience:'shop',greengrocer:'shop',deli:'shop',dairy:'shop',bakery:'shop',seafood:'shop',butcher:'shop',clothes:'fashion',tailor:'fashion',hairdresser:'barber',beauty:'barber',bookmaker:'casino'};
const NAMES={bar:['Bar Sirena','Caffè del Molo','Bar Partenope','Bar Posillipo','Caffè Sannazaro','Bar Marechiaro','Caffè Mergellina','Gelateria del Porto'],trattoria:['Trattoria Mergellina','Trattoria Sannazaro','Da Gennaro'],osteria:['Osteria del Porto','Osteria Lucia'],vesuvio:['Ristorante Vesuvio','Ristorante Lucia'],panorama:['Ristorante Panorama','Terrazza sul Golfo'],
 pizzeria:['Pizzeria Sannazaro','Pizza a Portafoglio','Pizzeria del Molo'],burger:['Friggitoria del Molo'],club:['Discoteca Luna'],bank:['Banca del Golfo'],shop:['Bottega Mergellina','Alimentari del Porto','Bottega Marina'],fashion:['Moda Mergellina','Sartoria del Golfo'],barber:['Barbiere Totò','Salone Sirena'],casino:['Sala Slot Vesuvio']};
const H=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))|0;return Math.abs(h);};
// Porta = cella libera più vicina al punto del locale (davanti all'ingresso).
const near=(x,y)=>{for(let d=0;d<12;d+=.5)for(let a=0;a<12;a++){const px=x+Math.cos(a/12*Math.PI*2)*d,py=y+Math.sin(a/12*Math.PI*2)*d;if(napoliStand(px,py,.35))return {x:px,y:py};}return null;};
// Distanza minima fra due porte: i locali troppo vicini si separano (restano solo i più importanti vicino al posto vero, gli altri vanno nelle zone vuote).
const MIN_GAP=20;
// Mix dei locali di fantasia aggiunti nelle zone senza attività: nome inventato (real:false), mai spacciati per veri.
const EXTRA_MIX=['bar','trattoria','shop','pizzeria','bar','fashion','osteria','shop','barber','vesuvio','bar','burger','panorama','trattoria','bank'];
const SKIP_KIND=new Set(['church','chapel','school','kindergarten','university','hospital','roof','garage','garages','shed','industrial','warehouse','service','carport','construction','ruins','public','government','civic','train_station','transportation']);
const polyArea=p=>{let a=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];a+=p[i][0]*q[1]-q[0]*p[i][1];}return a/2;};
// Un possibile ingresso per ogni palazzo: sul lato più lungo, un metro e venti fuori dal muro, dove si può camminare.
function frontages(){const out=[];for(const b of NAPOLI.data.buildings||[]){if(b.part||b.tn||SKIP_KIND.has(b.kind))continue;const P=b.p,ar=polyArea(P),A=Math.abs(ar);if(A<45||A>4000)continue;const sg=ar>0?1:-1;let best=null;
  for(let i=0;i<P.length;i++){const p=P[i],q=P[(i+1)%P.length],dx=q[0]-p[0],dy=q[1]-p[1],L=Math.hypot(dx,dy);if(L<4)continue;const nx=dy/L*sg,ny=-dx/L*sg;for(const t of [.5,.35,.65]){const mx=p[0]+dx*t,my=p[1]+dy*t,x=mx+nx*1.3,y=my+ny*1.3;if(napoliStand(x,y,.4)&&(!best||L>best.L)){best={x,y,L,nx,ny};break;}}}
  if(best)out.push({x:best.x,y:best.y,b});}return out;}
export function napoliPlaces(){if(NAPOLI.places)return NAPOLI.places;const out={doors:[],props:[]};if(!NAPOLI.data)return out;
 const raw=[];
 NAPOLI.data.pois.forEach((p,i)=>{const t=p.amenity||p.shop;if(t==='atm'){const q=near(p.x,p.y);if(q)out.props.push({id:'matm'+i,kind:'atm',x:q.x,y:q.y,r:.35});return;}
  if(t==='bench'){const q=near(p.x,p.y);if(q)out.props.push({id:'mbench'+i,kind:'bench',x:q.x,y:q.y,r:.5});return;}
  let to=KIND[t];if(!to)return;if(Array.isArray(to))to=to[H(p.x+','+p.y)%to.length];const q=near(p.x,p.y);if(!q)return;
  // Attività presente su OpenStreetMap (nome e posizione veri, non verificati sul posto) oppure inventata dal gioco (nome di fantasia).
  raw.push({i,p,q,to,t,real:!!(p.real&&p.name)});});
 // 1) separazione: prima le attività vere con nome, poi le altre; chi è troppo vicino a una già scelta va nel mucchio da rimettere altrove
 raw.sort((x,y)=>(y.real-x.real)||(x.i-y.i));const kept=[],pool=[],cell=new Map(),key=(x,y)=>Math.floor(x/MIN_GAP)+','+Math.floor(y/MIN_GAP);
 const tooClose=(x,y,gap)=>{const cx=Math.floor(x/MIN_GAP),cy=Math.floor(y/MIN_GAP),r=Math.ceil(gap/MIN_GAP);for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++)for(const d of cell.get((cx+a)+','+(cy+b))||[])if(Math.hypot(d.x-x,d.y-y)<gap)return true;return false;};
 const put=d=>{kept.push(d);const k=key(d.x,d.y);(cell.get(k)||cell.set(k,[]).get(k)).push(d);};
 for(const r of raw){if(tooClose(r.q.x,r.q.y,MIN_GAP))pool.push(r);else put({x:r.q.x,y:r.q.y,to:r.to,t:r.t,real:r.real,p:r.p,i:r.i});}
 // 2) zone vuote: nuovi ingressi sui palazzi lontani da ogni locale (scelta del punto più isolato, ripetuta), con i locali messi da parte e poi un mix di fantasia
 const cand=frontages().filter(c=>!tooClose(c.x,c.y,MIN_GAP*1.5)),MAX_EXTRA=150,GAP_STOP=75,extras=[];
 const nearest=(x,y)=>{let best=1e9;const cx=Math.floor(x/MIN_GAP),cy=Math.floor(y/MIN_GAP);for(let r=0;r<=6;r++){for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++){if(Math.max(Math.abs(a),Math.abs(b))!==r)continue;for(const d of cell.get((cx+a)+','+(cy+b))||[])best=Math.min(best,Math.hypot(d.x-x,d.y-y));}if(best<r*MIN_GAP)break;}return best;};
 const dist=cand.map(c=>nearest(c.x,c.y));
 while(extras.length<MAX_EXTRA){let bi=-1,bd=GAP_STOP;for(let i=0;i<cand.length;i++)if(dist[i]>bd){bd=dist[i];bi=i;}if(bi<0)break;const c=cand[bi];const k=extras.length,fromPool=pool[k];const to=fromPool?fromPool.to:EXTRA_MIX[H('extra'+k)%EXTRA_MIX.length];const d={x:c.x,y:c.y,to,t:fromPool?.t||to,real:false,i:100000+k,extra:true};extras.push(d);put(d);
  for(let i=0;i<cand.length;i++){const dd=Math.hypot(cand[i].x-c.x,cand[i].y-c.y);if(dd<dist[i])dist[i]=dd;}dist[bi]=-1;}
 // 3) porte definitive (id stabili: gli stessi sul server e sul client)
 kept.sort((x,y)=>x.i-y.i).forEach((d,n)=>{const names=NAMES[d.to];const id=d.extra?'mx'+(d.i-100000):'m'+d.i,nm=d.real?d.p.name:names[H(id+':'+d.t)%names.length];
  out.doors.push({id,name:nm,x:d.x,y:d.y,exitX:d.x,exitY:d.y,to:d.to,kind:d.t,real:!!d.real,osm:d.real?d.p.osm:undefined,fantasy:!d.real});
  if(d.t==='bank'){const a=near(d.x+1.4,d.y);if(a)out.props.push({id:'matmb'+n,kind:'atm',x:a.x,y:a.y,r:.35});}});
 return NAPOLI.places=out;}
