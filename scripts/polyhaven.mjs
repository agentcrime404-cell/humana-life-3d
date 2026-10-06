// Scarica da Poly Haven (licenza CC0, gratuita) cielo HDR, materiali realistici (1k: colore, rilievo, ruvidità) e arredi 3D
// per HUMANA life 3D. Uso: node scripts/polyhaven.mjs
import {mkdir,writeFile,access} from 'node:fs/promises';import {dirname} from 'node:path';import {fileURLToPath} from 'node:url';
const out=fileURLToPath(new URL('../client/assets/world/napoli/_download/',import.meta.url));
const TEXTURES=['yellow_plaster','red_plaster_weathered','painted_plaster_wall','white_plaster_rough_01','worn_plaster_wall','square_cobblestone','clean_asphalt','pavement_02','granite_tile','coast_sand_01','large_sandstone_blocks','volcanic_rock_tiles','marble_tiles'];
const MODELS=['street_lamp_01','street_lamp_02','outdoor_table_chair_set_01','round_wooden_table_01','bar_chair_round_01','potted_plant_01','potted_plant_02','planter_pot_clay','planter_box_01','modular_street_seating','CoffeeCart_01','wine_barrel_01'];
const SKY='kloofendal_48d_partly_cloudy_puresky';
const exists=p=>access(p).then(()=>true,()=>false);
async function get(url,file){if(await exists(file))return;await mkdir(dirname(file),{recursive:true});const r=await fetch(url);if(!r.ok)throw new Error(url+' '+r.status);await writeFile(file,Buffer.from(await r.arrayBuffer()));}
const files=id=>fetch('https://api.polyhaven.com/files/'+id).then(r=>r.json());
for(const id of TEXTURES){const f=await files(id);for(const [k,name] of [['Diffuse','diff'],['nor_gl','nor'],['Rough','rough']]){const u=f[k]?.['1k']?.jpg?.url;if(u)await get(u,`${out}tex/${id}/${name}.jpg`);}console.log('materiale',id);}
for(const id of MODELS){const f=await files(id),g=f.gltf?.['1k']?.gltf;if(!g){console.log('saltato',id);continue;}await get(g.url,`${out}ph/${id}/${id}.gltf`);for(const [p,inc] of Object.entries(g.include||{}))await get(inc.url,`${out}ph/${id}/${p}`);console.log('modello',id);}
{const f=await files(SKY);await get(f.hdri['2k'].hdr.url,`${out}sky/${SKY}.hdr`);console.log('cielo',SKY);}
