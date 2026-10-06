// L'outfit acquistato non è modificabile tramite il normale editor del profilo.
export function cleanAvatar(input={},previous={}){
 if(!input||typeof input!=='object'||Array.isArray(input))input={};
 const out={...previous};
 if(/^#[0-9a-f]{6}$/i.test(input.color||''))out.color=input.color;
 if(['none','cap','flower'].includes(input.accessory))out.accessory=input.accessory;
 if(['slim','regular','broad'].includes(input.body))out.body=input.body;
 if(typeof input.glasses==='boolean')out.glasses=input.glasses;
 return {color:'#41d9cf',accessory:'none',body:'regular',glasses:false,...out};
}

// Avatar dalla foto (solo 3D): della foto restano soltanto un modello realistico e due colori (pelle e capelli), mai l'immagine.
export const PHOTO_MODELS=['Male_Adult_02','Male_Adult_06','Male_Adult_11','Male_Adult_13','Male_Adult_16','Male_Adult_17','Female_Adult_01','Female_Adult_03','Female_Adult_05','Female_Adult_08','Female_Adult_14','Female_Adult_17'];
export function cleanPhoto(p){if(!p||typeof p!=='object'||!PHOTO_MODELS.includes(p.model))return null;const hex=/^#[0-9a-f]{6}$/i;return {model:p.model,skin:hex.test(p.skin||'')?p.skin.toLowerCase():null,hair:hex.test(p.hair||'')?p.hair.toLowerCase():null};}
