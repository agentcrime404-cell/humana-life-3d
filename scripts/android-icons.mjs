// Genera le icone Android dal marchio HUMANA (client/assets/icon-512.png).
import {createCanvas,loadImage} from '@napi-rs/canvas';import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),icon=await loadImage(await readFile(new URL('client/assets/icon-512.png',root)));
const res=new URL('android/app/src/main/res/',root);
for(const [dpi,size] of Object.entries({mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192})){
 const square=createCanvas(size,size),g=square.getContext('2d');g.drawImage(icon,0,0,size,size);
 const round=createCanvas(size,size),r=round.getContext('2d');r.beginPath();r.arc(size/2,size/2,size/2,0,Math.PI*2);r.clip();r.drawImage(icon,0,0,size,size);
 const fg=Math.round(size*108/48),fore=createCanvas(fg,fg),f=fore.getContext('2d'),inset=fg*18/108;f.drawImage(icon,inset,inset,fg-inset*2,fg-inset*2);
 await writeFile(new URL(`mipmap-${dpi}/ic_launcher.png`,res),square.toBuffer('image/png'));
 await writeFile(new URL(`mipmap-${dpi}/ic_launcher_round.png`,res),round.toBuffer('image/png'));
 await writeFile(new URL(`mipmap-${dpi}/ic_launcher_foreground.png`,res),fore.toBuffer('image/png'));
}
console.log('Icone Android aggiornate');
