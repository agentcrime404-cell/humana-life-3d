// Moto e scooter riconoscibili ma leggeri per il telefono: scooter a scocca tonda in stile Vespa, maxi-scooter angolare in stile X-ADV e
// maxi-enduro in stile Africa Twin (bicolore bianco-rosso-blu). Ogni mezzo guarda verso +z, è alto sull'asse y, largo sull'asse x.
// Profili laterali estrusi con smusso (pochi triangoli), ruote di toro, forcelle e scarichi di cilindri. Nomi dei modelli di fantasia nel gioco.
import * as THREE from '../vendor/three/three.module.min.js';
const UP=new THREE.Vector3(0,1,0),V=(x,y,z)=>new THREE.Vector3(x,y,z);
function kit(w,g){
 const tube=(p,q,r,m)=>{const dv=q.clone().sub(p),o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,dv.length(),8),m);o.position.copy(p).addScaledVector(dv,.5);o.quaternion.setFromUnitVectors(UP,dv.normalize());g.add(o);return o;};
 // profilo laterale (u = avanti, v = alto) estruso per larghezza W; i punti da 4 numeri sono curve [cx,cy,x,y]
 const ext=(pts,W,bev,m,x=0)=>{const sh=new THREE.Shape();pts.forEach((p,i)=>i?(p.length===4?sh.quadraticCurveTo(p[0],p[1],p[2],p[3]):sh.lineTo(p[0],p[1])):sh.moveTo(p[0],p[1]));
  const e=new THREE.ExtrudeGeometry(sh,{depth:Math.max(.01,W-bev*2),bevelEnabled:bev>0,bevelThickness:bev,bevelSize:bev,bevelSegments:2,curveSegments:6});e.translate(0,0,-(W-bev*2)/2);e.rotateY(-Math.PI/2);const o=new THREE.Mesh(e,m);o.position.x=x;g.add(o);return o;};
 const wheel=(z,R,tw,rim,spokes)=>{const t=new THREE.Mesh(new THREE.TorusGeometry(R-tw,tw,8,18).rotateY(Math.PI/2),w.sm('#15161a'));t.position.set(0,R,z);g.add(t);const h=new THREE.Mesh(new THREE.CylinderGeometry(R*.42,R*.42,tw*1.4,12).rotateZ(Math.PI/2),rim);h.position.set(0,R,z);g.add(h);
  if(spokes)for(let k=0;k<8;k++){const s=new THREE.Mesh(new THREE.BoxGeometry(.012,(R-tw)*1.9,.012),rim);s.position.set(0,R,z);s.rotation.x=k*Math.PI/8;g.add(s);}};
 const disc=(r,d,x,y,z,m)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d,14).rotateX(Math.PI/2),m);o.position.set(x,y,z);g.add(o);return o;};
 return {tube,ext,wheel,disc};}
// ---------- scooter a scocca tonda (stile Vespa) ----------
export function vespa(w,col,opt={}){const g=new THREE.Group(),{tube,ext,wheel,disc}=kit(w,g),paint=w.sm(col),dark=w.sm('#2a2d33'),chrome=w.sm('#d4d7dc'),seat=w.sm('#2b2118'),lamp=w.neonMat('#fff6c9');
 wheel(.62,.21,.065,chrome);wheel(-.6,.21,.075,chrome);
 ext([[-.58,.26],[-.74,.4,-.68,.62],[-.62,.84,-.3,.84],[.02,.84,.1,.62],[.1,.3],[-.58,.26]],.4,.05,paint);           // scocca posteriore a goccia
 for(const sx of [-1,1])ext([[-.1,.2],[.52,.2],[.55,.34],[-.1,.34],[-.1,.2]],.06,.02,paint,sx*.19);                      // pedana: bordi laterali
 const fl=new THREE.Mesh(new THREE.BoxGeometry(.32,.05,.62),dark);fl.position.set(0,.27,.27);g.add(fl);
 ext([[.34,.27],[.54,.27],[.68,1.0],[.52,1.08],[.34,.27]],.44,.045,paint);                                               // scudo anteriore
 ext([[.5,.98],[.76,.98],[.86,1.1,.78,1.24],[.52,1.26],[.5,.98]],.4,.04,paint);                                           // cupolino del manubrio
 disc(.095,.06,0,1.12,.86,lamp);disc(.125,.03,0,1.12,.835,chrome);                                                        // faro tondo con anello
 tube(V(-.3,1.28,.6),V(.3,1.28,.6),.016,dark);for(const sx of [-1,1]){tube(V(sx*.3,1.28,.6),V(sx*.36,1.28,.6),.024,w.sm('#17181c'));tube(V(sx*.24,1.29,.6),V(sx*.3,1.46,.58),.008,dark);const m=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),dark);m.scale.set(1,.7,.3);m.position.set(sx*.3,1.47,.58);g.add(m);}
 const fe=new THREE.Mesh(new THREE.TorusGeometry(.27,.035,6,12,Math.PI*.75).rotateY(Math.PI/2).rotateX(Math.PI*.18),paint);fe.scale.x=3.2;fe.position.set(0,.21,.62);g.add(fe);   // parafango
 tube(V(.1,.2,.62),V(.09,.82,.54),.022,chrome);                                                                           // forcella
 ext([[-.54,.86],[-.1,.88],[.14,.8],[.04,.74],[-.52,.76],[-.54,.86]],.3,.05,seat);                                        // sella
 tube(V(.2,.3,-.15),V(.21,.28,-.72),.045,chrome);tube(V(.18,.3,-.45),V(.16,.58,-.4),.014,dark);                           // marmitta e ammortizzatore
 const tl=w.bx(g,.16,.05,.04,0,.6,-.74,'#e11d2e');w.bx(g,.14,.07,.02,0,.5,-.76,'#f4f1ea');                                // fanale e targa
 if(opt.top){w.bx(g,.34,.3,.4,0,1.02,-.8,'#1d2025');w.bx(g,.3,.05,.34,0,1.18,-.8,'#2a2f36');}                              // bauletto
 return w.mergeGroup(g);}
// ---------- maxi-scooter angolare (stile X-ADV) ----------
export function xadv(w,col,opt={}){const g=new THREE.Group(),{tube,ext,wheel,disc}=kit(w,g),paint=w.sm(col),dark=w.sm('#1c1e23'),steel=w.sm('#b8bcc4'),gold=w.sm('#b8923c'),seat=w.sm('#14151a'),led=w.neonMat('#eaf6ff'),red=w.sm('#c4161c');
 wheel(.78,.3,.085,steel,true);wheel(-.8,.3,.095,steel,true);
 ext([[-.98,.5],[-.95,.86],[-.55,1.0],[-.1,.92],[.14,.62],[.1,.42],[-.5,.4],[-.98,.5]],.4,.04,paint);                      // fianchetto posteriore angolare
 const un=new THREE.Mesh(new THREE.BoxGeometry(.34,.14,.78),dark);un.position.set(0,.36,.06);g.add(un);                     // sottoscocca/motore
 ext([[.32,.4],[.62,.4],[.9,1.04],[.74,1.16],[.44,1.04],[.32,.4]],.5,.045,paint);                                           // scudo anteriore
 ext([[.66,.72],[1.06,.62],[1.08,.82],[.86,.98],[.66,.72]],.34,.04,paint);                                                  // becco con fari
 ext([[.5,.38],[.92,.52],[.9,.72],[.56,.66],[.5,.38]],.4,.04,dark);ext([[-.7,.46],[.1,.42],[.12,.64],[-.7,.7],[-.7,.46]],.44,.03,paint);for(const sx of [-1,1]){w.bx(g,.14,.045,.05,sx*.12,.92,1.04,'#eaf6ff').rotation.z=sx*.18;disc(.03,.04,sx*.12,.82,1.06,led);}   // fari a led
 const ws=new THREE.Mesh(new THREE.BoxGeometry(.4,.4,.025),new THREE.MeshStandardMaterial({color:'#3a5368',transparent:true,opacity:.45,roughness:.1}));ws.position.set(0,1.38,.68);ws.rotation.x=-.62;g.add(ws);   // cupolino
 tube(V(-.34,1.26,.5),V(.34,1.26,.5),.016,dark);for(const sx of [-1,1]){tube(V(sx*.34,1.26,.5),V(sx*.4,1.26,.5),.026,w.sm('#17181c'));w.bx(g,.04,.16,.12,sx*.4,1.3,.58,'#1c1e23');tube(V(sx*.26,1.27,.5),V(sx*.32,1.46,.48),.008,dark);}
 for(const sx of [-1,1]){tube(V(sx*.1,.32,.78),V(sx*.1,1.0,.56),.032,gold);tube(V(sx*.1,.32,.78),V(sx*.1,.9,.6),.022,steel);}   // forcelle rovesciate
 const fe=new THREE.Mesh(new THREE.TorusGeometry(.35,.03,6,12,Math.PI*.7).rotateY(Math.PI/2).rotateX(Math.PI*.15),dark);fe.scale.x=3.4;fe.position.set(0,.3,.78);g.add(fe);
 ext([[-.88,.98],[-.2,1.02],[.2,.94],[.1,.9],[-.84,.92],[-.88,.98]],.34,.05,seat);                                         // sella lunga
 for(const sx of [-1,1])tube(V(sx*.2,1.0,-.5),V(sx*.2,1.04,-.95),.014,steel);                                               // maniglione
 w.bx(g,.24,.04,.03,0,.82,-.98,'#e11d2e');
 tube(V(.2,.3,-.2),V(.22,.52,-.98),.06,dark);const tip=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.08,10),steel);tip.position.set(.22,.52,-1.0);tip.rotation.x=Math.PI/2;g.add(tip);   // scarico
 tube(V(.14,.32,-.8),V(.12,.4,-.2),.03,dark);tube(V(-.14,.32,-.8),V(-.12,.4,-.2),.03,dark);
 if(opt.top)w.bx(g,.36,.3,.42,0,1.18,-.82,'#1d2025');
 return w.mergeGroup(g);}
// ---------- maxi-enduro bicilindrica (stile Africa Twin: serbatoio bianco-rosso-blu) ----------
export function africa(w,col,opt={}){const g=new THREE.Group(),{tube,ext,wheel,disc}=kit(w,g),white=w.sm('#f4f1ea'),red=w.sm('#c4161c'),blue=w.sm('#1c3f8f'),dark=w.sm('#1a1b1f'),steel=w.sm('#c4c8d0'),gold=w.sm('#b8923c'),seat=w.sm('#14151a'),led=w.neonMat('#eaf6ff'),silver=w.sm('#8a8f99');
 wheel(.78,.34,.065,gold,true);wheel(-.77,.33,.075,gold,true);
 const eng=new THREE.Mesh(new THREE.BoxGeometry(.26,.3,.42),dark);eng.position.set(0,.5,.02);g.add(eng);const rad=new THREE.Mesh(new THREE.BoxGeometry(.24,.34,.05),silver);rad.position.set(0,.62,.34);g.add(rad);for(const sx of [-1,1]){tube(V(sx*.1,.98,.5),V(sx*.1,.5,-.34),.02,red);tube(V(sx*.1,.6,.3),V(sx*.1,.34,-.2),.018,red);tube(V(sx*.1,.9,-.1),V(sx*.1,.88,-.78),.018,red);}                      // motore bicilindrico
 for(const sz of [-.12,.14]){const c=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.32,10).rotateZ(Math.PI/2),silver);c.position.set(0,.72,sz);g.add(c);}
 const sk=new THREE.Mesh(new THREE.BoxGeometry(.28,.05,.56),silver);sk.position.set(0,.26,.04);g.add(sk);                       // paramotore
 const tankP=[[-.28,.92],[.12,1.04],[.46,.98],[.5,.88],[.14,.78],[-.28,.84],[-.28,.92]];
 ext(tankP,.34,.05,white);ext(tankP.map(p=>p.length===4?[p[0],p[1]+.012,p[2],p[3]+.012]:[p[0],p[1]+.012]),.1,.04,blue);for(const sx of [-1,1])ext(tankP,.03,.02,red,sx*.17);   // serbatoio tricolore
 ext([[-.96,.92],[-.5,.96],[-.2,.9],[-.2,.84],[-.9,.84],[-.96,.92]],.3,.04,red);                                              // codone
 ext([[-.9,.9],[-.3,.98],[.12,.92],[.04,.86],[-.2,.86],[-.9,.86],[-.9,.9]],.3,.045,seat);                                      // sella
 ext([[.52,.9],[.66,1.12],[.9,1.04],[1.0,.82],[.94,.72],[.68,.74],[.52,.9]],.3,.04,white);                                     // carena e becco
 ext([[.78,.84],[1.1,.74],[1.14,.66],[.86,.74],[.78,.84]],.18,.03,white);
 for(const sx of [-1,1]){w.bx(g,.1,.05,.05,sx*.1,1.0,.94,'#eaf6ff');disc(.03,.04,sx*.1,.9,.97,led);}
 const ws=new THREE.Mesh(new THREE.BoxGeometry(.34,.38,.02),new THREE.MeshStandardMaterial({color:'#2f4a60',transparent:true,opacity:.4,roughness:.1}));ws.position.set(0,1.38,.74);ws.rotation.x=-.7;g.add(ws);
 tube(V(-.36,1.22,.52),V(.36,1.22,.52),.017,dark);for(const sx of [-1,1]){tube(V(sx*.36,1.22,.52),V(sx*.43,1.22,.52),.027,w.sm('#17181c'));w.bx(g,.03,.2,.12,sx*.4,1.3,.6,'#1a1b1f');tube(V(sx*.28,1.23,.52),V(sx*.34,1.4,.5),.008,dark);}
 for(const sx of [-1,1]){tube(V(sx*.12,.34,.78),V(sx*.1,1.12,.56),.034,gold);tube(V(sx*.12,.34,.78),V(sx*.1,.84,.62),.024,steel);}
 const fe=new THREE.Mesh(new THREE.TorusGeometry(.38,.03,6,12,Math.PI*.6).rotateY(Math.PI/2).rotateX(Math.PI*.12),white);fe.scale.x=3.2;fe.position.set(0,.34,.78);g.add(fe);
 tube(V(.22,.36,-.2),V(.25,.7,-1.0),.07,steel);const tip=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.1,10),dark);tip.position.set(.25,.7,-1.02);tip.rotation.x=Math.PI/2;g.add(tip);   // scarico alto
 tube(V(.14,.34,-.77),V(.12,.5,-.1),.03,silver);tube(V(-.14,.34,-.77),V(-.12,.5,-.1),.03,silver);tube(V(.1,.4,-.6),V(.1,.82,-.4),.02,red);
 for(const sx of [-1,1])tube(V(sx*.2,.96,-.45),V(sx*.2,1.02,-.98),.014,steel);
 w.bx(g,.2,.05,.03,0,.9,-1.0,'#e11d2e');
 return w.mergeGroup(g);}
