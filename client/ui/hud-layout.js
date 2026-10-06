// Posizione dei comandi sullo schermo (solo HUMANA life 3D): da Impostazioni → «Sposta i comandi» si trascinano joystick, azioni, bottoni della telecamera,
// menu di sinistra e bottoni dell'arena dove si vuole. Le posizioni (spostamenti dal punto di partenza) restano sul telefono, una serie per schermo
// verticale e una per orizzontale, e si possono azzerare.
const KEY='humana-hud-v1';
const ITEMS=[['#joystick','Joystick'],['.actions','Azioni e telefono'],['#cam3d','Telecamera / mappa / grafica'],['.social','Menu di sinistra'],['#ar-fire','Spara (arena)'],['#ar-reload','Ricarica (arena)'],['#chat','Chat']];
const mode=()=>innerWidth>innerHeight?'land':'port';
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}');}catch{return {};}};
const save=d=>{try{localStorage.setItem(KEY,JSON.stringify(d));}catch{}};
// Tiene l'elemento dentro lo schermo (con un margine) anche se lo spostamento salvato era per un altro schermo.
function clamp(el,dx,dy){el.style.translate='0 0';const r=el.getBoundingClientRect();if(!r.width)return [dx,dy];const m=4;let x=dx,y=dy;if(r.left+x<m)x=m-r.left;if(r.right+x>innerWidth-m)x=innerWidth-m-r.right;if(r.top+y<m)y=m-r.top;if(r.bottom+y>innerHeight-m)y=innerHeight-m-r.bottom;return [Math.round(x),Math.round(y)];}
function apply(){const d=load()[mode()]||{};for(const [sel] of ITEMS){const el=document.querySelector(sel);if(!el)continue;const p=d[sel];if(!p){el.style.translate='';continue;}const [x,y]=clamp(el,p[0],p[1]);el.style.translate=x+'px '+y+'px';}}
export function installHudLayout({notify}){
 let editing=false,bar=null,drag=null;
 const style=document.createElement('style');style.textContent='body.hud-edit #hud,body.hud-edit #arena-hud{pointer-events:none}body.hud-edit .hud-mv{outline:2px dashed #f5b81c;outline-offset:3px;background-color:rgba(245,184,28,.12)!important;cursor:grab;pointer-events:auto!important;visibility:visible!important;touch-action:none}body.hud-edit .hud-mv *{pointer-events:none!important}body.hud-edit #chat{pointer-events:auto}#hud-edit-bar{position:fixed;left:50%;top:calc(8px + env(safe-area-inset-top));transform:translateX(-50%);z-index:80;background:rgba(8,16,28,.92);border:1px solid #f5b81c;border-radius:14px;padding:8px 10px;color:#fff;font:13px system-ui;display:flex;gap:8px;align-items:center;flex-wrap:wrap;max-width:94vw;justify-content:center}#hud-edit-bar button{min-height:0;padding:7px 12px;border-radius:10px;border:1px solid #ffffff44;background:#1d3550;color:#fff;font-size:13px}#hud-edit-bar button.ok{background:#f5b81c;color:#1a1205;border-color:transparent;font-weight:700}';document.head.append(style);
 const items=()=>ITEMS.map(([s,n])=>[s,n,document.querySelector(s)]).filter(x=>x[2]);
 const onDown=e=>{if(!editing||e.target.closest('#hud-edit-bar'))return;const hit=items().find(([s,n,el])=>el.contains(e.target));if(!hit){return;}e.preventDefault();e.stopPropagation();const [sel,,el]=hit,cur=(load()[mode()]||{})[sel]||[0,0];drag={sel,el,x0:e.clientX,y0:e.clientY,base:cur,id:e.pointerId};try{el.setPointerCapture(e.pointerId);}catch{}};
 const onMove=e=>{if(!drag||e.pointerId!==drag.id)return;e.preventDefault();const [x,y]=clamp(drag.el,drag.base[0]+e.clientX-drag.x0,drag.base[1]+e.clientY-drag.y0);drag.el.style.translate=x+'px '+y+'px';drag.now=[x,y];};
 const onUp=e=>{if(!drag||e.pointerId!==drag.id)return;if(drag.now){const d=load(),m=mode();(d[m]??={})[drag.sel]=drag.now;save(d);}drag=null;};
 const swallow=e=>{if(editing&&!e.target.closest('#hud-edit-bar')&&items().some(([,,el])=>el.contains(e.target))){e.preventDefault();e.stopPropagation();}};
 for(const ev of ['pointerdown'])document.addEventListener(ev,onDown,true);document.addEventListener('pointermove',onMove,true);for(const ev of ['pointerup','pointercancel'])document.addEventListener(ev,onUp,true);for(const ev of ['click','touchstart'])document.addEventListener(ev,swallow,true);
 function start(){if(editing)return;editing=true;document.body.classList.add('hud-edit');for(const [,,el] of items())el.classList.add('hud-mv');
  // i bottoni dell'arena esistono solo in partita: in modifica si mostrano comunque
  const ah=document.getElementById('arena-hud');if(ah&&ah.hidden){ah.dataset.wasHidden='1';ah.hidden=false;}
  bar=document.createElement('div');bar.id='hud-edit-bar';bar.innerHTML='<span>Trascina i comandi dove vuoi</span>';
  const ok=document.createElement('button');ok.className='ok';ok.textContent='✔ Fatto';ok.onclick=stop;const rs=document.createElement('button');rs.textContent='↺ Ripristina questo schermo';rs.onclick=()=>{const d=load();delete d[mode()];save(d);apply();notify?.('Comandi rimessi come all’inizio');};bar.append(ok,rs);document.body.append(bar);}
 function stop(){editing=false;document.body.classList.remove('hud-edit');for(const [,,el] of items())el.classList.remove('hud-mv');const ah=document.getElementById('arena-hud');if(ah?.dataset.wasHidden){ah.hidden=true;delete ah.dataset.wasHidden;}bar?.remove();bar=null;apply();notify?.('Posizione dei comandi salvata');}
 setInterval(()=>{if(!editing&&!drag)apply();},1200);addEventListener('resize',()=>{if(!editing)apply();});addEventListener('orientationchange',()=>setTimeout(apply,300));apply();
 return {start,stop,reset(){const d=load();delete d[mode()];save(d);apply();}};
}
