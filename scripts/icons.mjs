// Marchio originale disegnato in Canvas; nessun asset di terzi.
import {createCanvas} from '@napi-rs/canvas';
import {writeFile} from 'node:fs/promises';
for(const size of [192,512]){const c=createCanvas(size,size),g=c.getContext('2d');g.fillStyle='#10344b';g.fillRect(0,0,size,size);g.strokeStyle='#52dec9';g.lineWidth=size*.025;g.beginPath();g.arc(size/2,size/2,size*.31,0,Math.PI*2);g.stroke();g.font=`bold ${size*.42}px sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillStyle='#f4d597';g.fillText('H',size/2,size*.52);await writeFile(new URL('../client/assets/icon-'+size+'.png',import.meta.url),c.toBuffer('image/png'));}
