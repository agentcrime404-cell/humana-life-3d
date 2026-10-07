// Servizio ai banconi dei locali (bar, pizzeria, osteria…) di HUMANA life 3D: il personale serve, il giocatore beve o mangia (animazione visibile agli altri)
// e le bevande alcoliche fanno salire il livello di alcol: da quel momento si resta «brilli» e il livello scende a zero in 50 secondi.
import {MENU,COUNTER,ALCOHOL_SECONDS} from '../shared/catalog.js';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export class Service{
 constructor(game){this.game=game;}
 quote(p,itemId){const menu=p&&MENU[p.room];if(!menu)fail('Qui non si ordina',403);if(Math.hypot(p.x-COUNTER.x,p.y-COUNTER.y)>4.2)fail('Avvicinati al bancone',403);if(p.consuming)fail('Finisci prima quello che hai in mano');if(p.seat||p.vehicle)fail('Scendi dal mezzo');
  const it=menu.find(i=>i.id===itemId);if(!it)fail('Non c’è sul menu');return it;}
 serve(p,it){const now=Date.now();p.input={x:0,y:0};p.consuming={item:it.id,icon:it.icon,kind:it.kind,t0:now,until:now+3600};
  if(it.alc>0){p.alcohol=Math.min(100,(p.alcohol||0)+it.alc);p.alcRate=p.alcohol/ALCOHOL_SECONDS;this.game.send(p.ws,{type:'notification',message:'🥴 Hai bevuto alcol: per circa '+ALCOHOL_SECONDS+' secondi sarai brillo.'});}
  else if(it.alc<0&&p.alcohol>0){p.alcohol=Math.max(0,p.alcohol+it.alc);p.alcRate=p.alcohol/ALCOHOL_SECONDS;}}
 tick(p,dt){const now=Date.now();if(p.consuming){p.input={x:0,y:0};if(now>=p.consuming.until)p.consuming=null;}
  if(p.alcohol>0){p.alcohol=Math.max(0,p.alcohol-(p.alcRate||100/ALCOHOL_SECONDS)*dt);if(p.alcohol<.4){p.alcohol=0;p.alcRate=0;this.game.send(p.ws,{type:'notification',message:'😌 Ti è passata la sbornia.'});}}}
}
