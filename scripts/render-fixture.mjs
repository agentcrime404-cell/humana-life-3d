// Collaudo Canvas fuori dal browser: usa il renderer di produzione senza ridisegnarlo.
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
export async function rendererFixture({x=18,y=19,width=1280,height=800,dpr=1}={}){
 let source=await readFile(new URL('client/world/renderer.js',root),'utf8');
 const shared=text=>{for(const path of ['world','district','traffic'])text=text.replace(`'/shared/${path}.js'`,JSON.stringify(new URL(`shared/${path}.js`,root).href));return text;};
 const crowd=shared(await readFile(new URL('client/world/crowd.js',root),'utf8'));
 source=shared(source).replace(`'./crowd.js'`,JSON.stringify('data:text/javascript;base64,'+Buffer.from(crowd).toString('base64')));
 const {Renderer,iso,ANCHOR}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 globalThis.document={createElement:()=>createCanvas(1,1)};
 const canvas=createCanvas(width*dpr,height*dpr),renderer=Object.create(Renderer.prototype),images={};
 for(const name of ['buildings','avatar','gulf','props','paving','residences','living','social-poses'])images[name]=await loadImage(await readFile(new URL(`client/assets/${name}.png`,root)));
 Object.assign(renderer,{canvas,ctx:canvas.getContext('2d'),w:width,h:height,dpr,chunks:new Map(),looks:new Map(),clockOffset:null,camera:iso(x,y),zoom:1,time:0,hitPlayers:[],images});
 const player={id:'fixture',username:'Collaudo',x,y,room:'lungomare',direction:1.57,avatar:{color:'#41d9cf',accessory:'none'},moving:false};
 return {renderer,canvas,player,iso,ANCHOR};
}
if(process.argv.includes('--save')){const {renderer,canvas,player}=await rendererFixture();renderer.draw([player],player,0);await writeFile(new URL('docs/collaudo-render.png',root),canvas.toBuffer('image/png'));console.log('Vista salvata in docs/collaudo-render.png (non screenshot del browser).');}
