// Percorsi dei veicoli: rete invisibile di corsie sopra le strade.
// Un percorso è una spezzata con gli angoli arrotondati da curve di Bézier quadratiche, campionata a passo fisso:
// la posizione è point_on_path(s) e la rotazione è l'angolo della tangente nello stesso punto.
const STEP=.25;
// points: vertici (in metri); closed: anello; radius: raggio delle curve.
export function makePath(points,{closed=true,radius=4}={}){
 const n=points.length,pts=[];
 const at=i=>points[(i+n)%n];
 const corner=i=>{const p=at(i),a=at(i-1),b=at(i+1),la=Math.hypot(p.x-a.x,p.y-a.y),lb=Math.hypot(b.x-p.x,b.y-p.y),r=Math.min(radius,la/2,lb/2);
  return {p,in:{x:p.x+(a.x-p.x)/la*r,y:p.y+(a.y-p.y)/la*r},out:{x:p.x+(b.x-p.x)/lb*r,y:p.y+(b.y-p.y)/lb*r}};};
 const line=(A,B)=>{const l=Math.hypot(B.x-A.x,B.y-A.y),k=Math.max(1,Math.ceil(l/STEP));for(let j=0;j<k;j++)pts.push({x:A.x+(B.x-A.x)*j/k,y:A.y+(B.y-A.y)*j/k});};
 const bez=(A,P,B)=>{const l=Math.hypot(P.x-A.x,P.y-A.y)+Math.hypot(B.x-P.x,B.y-P.y),k=Math.max(2,Math.ceil(l/STEP));for(let j=0;j<k;j++){const t=j/k,u=1-t;pts.push({x:u*u*A.x+2*u*t*P.x+t*t*B.x,y:u*u*A.y+2*u*t*P.y+t*t*B.y});}};
 if(closed){const cs=points.map((_,i)=>corner(i));for(let i=0;i<n;i++){bez(cs[i].in,cs[i].p,cs[i].out);line(cs[i].out,cs[(i+1)%n].in);}}
 else{let prev=points[0];for(let i=1;i<n-1;i++){const c=corner(i);line(prev,c.in);bez(c.in,c.p,c.out);prev=c.out;}line(prev,points[n-1]);pts.push({...points[n-1]});}
 // Lunghezza cumulata, tangente e curvatura per ogni campione.
 let s=0;const m=pts.length;
 for(let i=0;i<m;i++){const p=pts[i];if(i)s+=Math.hypot(p.x-pts[i-1].x,p.y-pts[i-1].y);p.s=s;}
 const length=closed?s+Math.hypot(pts[0].x-pts[m-1].x,pts[0].y-pts[m-1].y):s;
 for(let i=0;i<m;i++){const a=pts[closed?(i-1+m)%m:Math.max(0,i-1)],b=pts[closed?(i+1)%m:Math.min(m-1,i+1)];pts[i].angle=Math.atan2(b.y-a.y,b.x-a.x);}
 for(let i=0;i<m;i++){const a=pts[closed?(i-2+m)%m:Math.max(0,i-2)].angle,b=pts[closed?(i+2)%m:Math.min(m-1,i+2)].angle;pts[i].curv=Math.abs(Math.atan2(Math.sin(b-a),Math.cos(b-a)))/(STEP*4);}
 const wrap=v=>closed?((v%length)+length)%length:Math.max(0,Math.min(length,v));
 const index=v=>{let lo=0,hi=m-1;while(lo<hi){const mid=(lo+hi+1)>>1;if(pts[mid].s<=v)lo=mid;else hi=mid-1;}return lo;};
 // Punto e tangente alla distanza s (interpolati tra due campioni).
 function pointAt(v){v=wrap(v);const i=index(v),a=pts[i],b=pts[closed?(i+1)%m:Math.min(m-1,i+1)],seg=(b.s>a.s?b.s:length)-a.s,t=seg>0?(v-a.s)/seg:0;
  let d=b.angle-a.angle;d=Math.atan2(Math.sin(d),Math.cos(d));return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,direction:a.angle+d*t,curv:a.curv};}
 // Distanza lungo il percorso del punto più vicino a (x, y).
 function nearest(x,y){let best=0,bd=Infinity;for(const p of pts){const d=(p.x-x)**2+(p.y-y)**2;if(d<bd){bd=d;best=p.s;}}return best;}
 // Profilo di velocità: rallenta prima delle curve e riaccelera dolcemente dopo (finestra in avanti e indietro).
 function speedProfile(vmax,{brake=7,slow=.45}={}){const k=pts.map(p=>Math.min(1,p.curv*radius)),w=Math.round(brake/STEP),out=new Float32Array(m);
  for(let i=0;i<m;i++){let c=0;for(let j=-Math.round(w/2);j<=w;j++){const q=closed?(i+j+m)%m:Math.min(m-1,Math.max(0,i+j));if(k[q]>c)c=k[q];}out[i]=vmax*(1-slow*c);}
  return v=>out[index(wrap(v))];}
 return {closed,length,points:pts,pointAt,nearest,speedProfile,wrap};
}
// Corsia a destra di un anello percorso in senso orario (x verso destra, y verso il basso): basta rientrare del mezzo-corsia.
export function laneLoop(x0,y0,x1,y1,off=1){return [{x:x0+off,y:y0+off},{x:x1-off,y:y0+off},{x:x1-off,y:y1-off},{x:x0+off,y:y1-off}];}
// Allinea un angolo a quello verso cui ruotare, al massimo di "rate" radianti.
export function turnToward(a,b,rate){let d=b-a;d=Math.atan2(Math.sin(d),Math.cos(d));return a+Math.max(-rate,Math.min(rate,d));}
