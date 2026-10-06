import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanPhoto,PHOTO_MODELS} from '../shared/avatar.js';
import {readFileSync} from 'node:fs';

test('Avatar dalla foto: si salvano solo modello e due colori validi, mai altro',()=>{
 assert.deepEqual(cleanPhoto({model:'Male_Adult_02',skin:'#AABBCC',hair:'#112233',foto:'data:image/png;base64,AAAA',x:1}),{model:'Male_Adult_02',skin:'#aabbcc',hair:'#112233'});
 assert.equal(cleanPhoto({model:'../../etc/passwd',skin:'#aabbcc'}),null);assert.equal(cleanPhoto(null),null);assert.equal(cleanPhoto('x'),null);
 assert.deepEqual(cleanPhoto({model:'Female_Adult_01',skin:'rosso',hair:'<script>'}),{model:'Female_Adult_01',skin:null,hair:null});
});

test('Avatar dalla foto: ogni modello ha i suoi colori medi calcolati',()=>{
 const meta=JSON.parse(readFileSync(new URL('../client/assets/world/napoli/characters/persone-vere/_colori.json',import.meta.url),'utf8'));
 for(const n of PHOTO_MODELS){assert.ok(meta[n]?.skin?.length===3,'manca la pelle di '+n);}
});
