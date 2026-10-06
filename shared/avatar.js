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
