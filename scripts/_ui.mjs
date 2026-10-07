import fs from 'node:fs';
const rep=(s,x,y)=>{if(!s.includes(x))throw new Error('manca: '+x.slice(0,80));return s.replace(x,()=>y);};
let f='client/ui/phone.js',s=fs.readFileSync(f,'utf8');
s=rep(s,"root.querySelector('.ph-x').onclick=e=>{e.stopPropagation();close();};","{const x=root.querySelector('.ph-x');let tapped=0;const go=e=>{e.stopPropagation();e.preventDefault?.();if(Date.now()-tapped<350)return;tapped=Date.now();if(view!=='home'&&calls.state==='idle')home();else close();};x.onclick=go;x.addEventListener('pointerup',go);x.addEventListener('touchend',go,{passive:false});}");
fs.writeFileSync(f,s);
f='client/ui/drive-hud.js';s=fs.readFileSync(f,'utf8');
s=rep(s,"const sb=$('#steal-btn'),","const sb=$('#steal-btn');{const soc=document.querySelector('.social');if(soc)soc.append(sb);}const ");
s=rep(s,"const ,wh=","const wh=");
fs.writeFileSync(f,s);
f='client/ui/hud-layout.js';s=fs.readFileSync(f,'utf8');s=rep(s,",['#steal-btn','Tasto Ruba']]","]");fs.writeFileSync(f,s);
f='client/ui/hud.css';s=fs.readFileSync(f,'utf8').replace(/\s*$/,'\n')+`/* Tasto Ruba dentro il menu di sinistra; X del telefono sempre raggiungibile (2026-10-07) */
.social #steal-btn{position:static;display:block;width:100%;min-height:44px;margin-top:6px;padding:6px 4px;font-size:11px;line-height:1.15;text-align:center;border-radius:14px}
#iphone .ph-x{position:fixed!important;right:calc(12px + env(safe-area-inset-right));top:calc(12px + env(safe-area-inset-top));width:44px;height:44px;transform:none!important;z-index:20;font-size:21px;background:rgba(0,0,0,.6)!important;touch-action:manipulation}
`;fs.writeFileSync(f,s);
console.log('ok');
