// Benzina e distributori di HUMANA life 3D. Il serbatoio si consuma con i metri fatti dai mezzi a motore; a zero il mezzo non si muove più (shared/world.js).
// Al distributore si paga la benzina mancante e il benzinaio fa il pieno in pochi secondi (il mezzo resta fermo).
import {FUEL,GAS,gasGeom,VEHICLE} from '../shared/catalog.js';import {napoliServices} from '../shared/napoli.js';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const baseOf=id=>VEHICLE[id]?.base||id,isMotor=id=>!!id&&FUEL.motor.includes(baseOf(id));
export class Fuel{
 constructor(game){this.game=game;}
  station(p){if(p.room==='mergellina')return napoliServices().fuel.find(f=>Math.hypot(p.x-f.x,p.y-f.y)<FUEL.zone);return GAS.find(g=>{const I=gasGeom(g).island;return Math.hypot(p.x-I.x,p.y-I.y)<FUEL.zone;});}
 // Prima di tutto: ogni giocatore con un mezzo a motore ha un serbatoio per mezzo (cambiare mezzo non regala il pieno).
 sync(p){if(!p.vehicle||!isMotor(p.vehicle)){return;}p.tanks=p.tanks||{};if(p.fuelFor!==p.vehicle){if(p.fuelFor&&p.fuel!==undefined)p.tanks[p.fuelFor]=p.fuel;p.fuelFor=p.vehicle;p.fuel=p.tanks[p.vehicle]??FUEL.tank;}}
 tick(p,moved){const now=Date.now();
  if(p.fueling){p.input={x:0,y:0};p.vel=0;if(now>=p.fueling.until){p.fuel=FUEL.tank;if(p.fuelFor){p.tanks=p.tanks||{};p.tanks[p.fuelFor]=FUEL.tank;}p.fueling=null;p.lowFuel=false;this.game.send(p.ws,{type:'notification',message:'⛽ Pieno fatto! Buon viaggio.'});}}
  this.sync(p);if(!p.vehicle||!isMotor(p.vehicle)||p.fuel===undefined)return;
  if(moved>0&&!p.fueling)p.fuel=Math.max(0,p.fuel-moved*FUEL.perMeter);
  if(p.fuel<=0&&!p.emptyWarned){p.emptyWarned=true;this.game.send(p.ws,{type:'notification',message:'⛽ Benzina finita! Scendi e raggiungi un distributore a piedi.'});}
  else if(p.fuel>0)p.emptyWarned=false;
  if(p.fuel<=FUEL.low&&p.fuel>0&&!p.lowFuel){p.lowFuel=true;this.game.send(p.ws,{type:'notification',message:'⛽ Poca benzina: cerca un distributore.'});}else if(p.fuel>FUEL.low)p.lowFuel=false;}
 // Quanto costa il pieno (e controlli): serve un mezzo a motore (anche se ora si è a piedi: il serbatoio è quello dell'ultimo mezzo guidato).
 quote(p){if(!p||(p.room!=='lungomare'&&p.room!=='mergellina'))fail('Vai a un distributore',403);const g=this.station(p);if(!g)fail('Avvicinati alle pompe del distributore',403);if(p.fueling)fail('Il benzinaio sta già lavorando');
  const id=p.vehicle||p.fuelFor;if(!isMotor(id))fail('Non hai un mezzo a motore da rifornire');this.sync(p);const level=p.vehicle?p.fuel:(p.tanks?.[id]??p.fuel??FUEL.tank);
  if(level>=95)fail('Il serbatoio è già pieno');return {station:g,level,vehicle:id,cost:Math.max(1,Math.ceil((FUEL.tank-level)*FUEL.price))};}
 start(p,q){p.input={x:0,y:0};p.vel=0;p.fueling={station:q.station.id,t0:Date.now(),until:Date.now()+FUEL.seconds*1000};}
}
