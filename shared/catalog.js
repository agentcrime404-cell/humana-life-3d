// Prezzi e categorie sono definiti dal server, mai dal carrello inviato dal client.
export const CATALOG=[
 {id:'palette-jade',name:'Palette giada',type:'cosmetic',slot:'outfit',value:'jade',color:'#65d6a6',price:3,currency:'gems'},
 {id:'cap-gold',name:'Cappello dorato',type:'cosmetic',slot:'accessory',value:'cap',color:'#dfbd65',price:25},
 {id:'flower-red',name:'Fiore rosso',type:'cosmetic',slot:'accessory',value:'flower',price:20},
 {id:'jacket-sea',name:'Palette avatar mare',type:'cosmetic',slot:'outfit',value:'sea',color:'#52b4c8',price:35},
 {id:'plant',name:'Pianta mediterranea',type:'furniture',kind:'plant',price:15},
 {id:'chair',name:'Sedia',type:'furniture',kind:'seat',price:10},
 {id:'table',name:'Tavolo',type:'furniture',kind:'table',price:20},
 {id:'lamp',name:'Lampada',type:'furniture',kind:'lamp',price:15},
 {id:'sofa',name:'Divano',type:'furniture',kind:'sofa',price:30},
 {id:'bed',name:'Letto',type:'furniture',kind:'bed',price:30},
 {id:'picture',name:'Quadro del golfo',type:'furniture',kind:'picture',price:15},
 {id:'coffee',name:'Caffè virtuale',type:'food',room:'bar',price:2},
 {id:'pizza',name:'Margherita virtuale',type:'food',room:'pizzeria',price:5},
 {id:'pasta',name:'Spaghetti alle vongole virtuali',type:'food',room:'osteria',price:8},
 {id:'frittura',name:'Frittura di mare virtuale',type:'food',room:'vesuvio',price:9},
 {id:'genovese',name:'Pasta alla genovese virtuale',type:'food',room:'trattoria',price:7},
 {id:'baba',name:'Babà virtuale',type:'food',room:'panorama',price:4},
 {id:'burger',name:'Burger virtuale',type:'food',room:'burger',price:6},
 {id:'fries',name:'Patatine virtuali',type:'food',room:'burger',price:3},
 {id:'cap-red',name:'Cappellino rosso',type:'cosmetic',slot:'accessory',value:'cap',color:'#e5484d',price:15},
 {id:'palette-sunset',name:'Palette tramonto',type:'cosmetic',slot:'outfit',value:'sunset',color:'#ff8a5b',price:40},
 {id:'palette-night',name:'Palette notte',type:'cosmetic',slot:'outfit',value:'night',color:'#5b6cff',price:2,currency:'gems'}
];
// Moda: articoli generati da modelli × colori (oltre mille). Ogni articolo imposta uno slot dell'avatar.
export const COLORS=[['nero','#1f2226'],['bianco','#f2f2f2'],['grigio','#8a9099'],['blu navy','#1f3a6b'],['azzurro','#5fb6ff'],['rosso','#d93a3a'],['bordeaux','#7a1f2b'],['rosa','#ff7ab6'],['verde','#2f9e5b'],['oliva','#6b7a3a'],['giallo','#ffc928'],['arancio','#ff8a3d'],['beige','#d8c3a0'],['marrone','#7a5236'],['viola','#8a5cff'],['turchese','#2ec4c4'],['corallo','#ff6f61'],['cammello','#c19a6b'],['jeans','#3d5f8f'],['oro','#d4a73a']];
export const WEAR={
 top:{label:'Giacche e felpe',models:['Felpa','Giacca','Bomber','Cappotto','Giubbotto','Cardigan','Blazer','Piumino','Gilet','Trench','Giacca di pelle','Maglione'],base:30},
 pants:{label:'Pantaloni',models:['Jeans','Chino','Cargo','Tuta','Elegante','Shorts','Palazzo'],base:25},
 shoes:{label:'Scarpe',models:['Sneakers','Mocassini','Stivaletti','Running','Sandali','Décolleté','Anfibi','Slip-on'],base:28},
 hat:{label:'Cappelli',models:['Cappellino','Berretto','Borsalino','Pescatore','Coppola','Cowboy','Bandana','Fascia','Visiera'],base:18},
 bag:{label:'Borse',models:['Zaino','Tracolla','Marsupio','Shopper','Pochette','Bauletto','Borsone'],base:35},
 glasses:{label:'Occhiali',models:['Da sole','Tondi','Aviator','Vista','Sportivi','Cat-eye'],base:22},
 neck:{label:'Collane',models:['Catena','Perle','Pendente','Sciarpa','Foulard'],base:40},
 watch:{label:'Orologi',models:['Sportivo','Classico','Smart','Cronografo','Bracciale'],base:45}
};
export const WEAR_ITEMS=[];
for(const [slot,w] of Object.entries(WEAR))w.models.forEach((model,m)=>COLORS.forEach(([cname,hex],c)=>WEAR_ITEMS.push({id:`${slot}-${m}-${c}`,name:`${model} ${cname}`,type:'wear',slot,style:m,color:hex,price:w.base+m*5+(c%5)*3})));
// Barbiere: 18 tagli e 12 barbe (30 stili) più 12 colori di capelli.
export const HAIR_STYLES=['Originale','Rasato','Corto','Ciuffo','Cresta','Mohicano','Afro','Ricci','Lunghi','Coda','Chignon','Trecce','Caschetto','Undercut','Pompadour','Mullet','Codini','Calvo'];
export const BEARD_STYLES=['Nessuna','Barba corta','Barba lunga','Pizzetto','Baffi','Baffi a manubrio','Basette','Barba hipster','Mosca','Barba squadrata','Ancoraggio','Barbetta'];
export const HAIR_COLORS=[['Nero','#1c1a1a'],['Castano scuro','#3d2618'],['Castano','#6b4226'],['Biondo','#d9b46a'],['Biondo platino','#efe2b8'],['Rosso','#a5361f'],['Rame','#c26a2e'],['Grigio','#9a9a9a'],['Bianco','#e8e8e8'],['Blu','#2a6fd6'],['Rosa','#ff7ab6'],['Verde','#2f9e5b']];
export const BARBER_PRICE=15;
// Rooms dove si comprano cosmetici e arredi.
export const SHOP_ROOMS=['shop','mall','mall2'];
// Pacchetti a pagamento reale (Stripe). Importi in centesimi di euro, decisi solo dal server.
export const PACKS=[
 {id:'gems-10',name:'10 gemme',gems:10,coins:0,amount:99},
 {id:'coins-500',name:'500 monete',gems:0,coins:500,amount:199},
 {id:'gems-60',name:'60 gemme + 300 monete',gems:60,coins:300,amount:499}
];
export const ATM_RATE=40;
// Ville: acquisto definitivo o affitto settimanale, solo con monete di gioco.
export const VILLA_PRICE=5000,VILLA_RENT=400,VILLA_RENT_DAYS=7;
// Sala slot: fiches gratuite giornaliere, non acquistabili né convertibili (nessun gioco con denaro reale).
export const DAILY_FICHES=100,SLOT_BETS=[1,5,10];
export const SLOT_SYMBOLS=[{s:'🍋',w:30,x:3},{s:'🍒',w:25,x:5},{s:'🔔',w:18,x:10},{s:'⭐',w:12,x:15},{s:'7️⃣',w:8,x:30},{s:'💎',w:4,x:60}];
export function cleanSettings(s={}){const out={};for(const key of ['master','music','ambient','voice'])out[key]=Number.isFinite(s[key])?Math.max(0,Math.min(1,s[key])):.6;out.zoom=Number.isFinite(s.zoom)?Math.max(.65,Math.min(1.4,s.zoom)):1;return out;}
// Mobilità: monopattino e bici si sbloccano per sempre con le monete, gli altri mezzi si noleggiano a tempo.
export const VEHICLES=[
 {id:'monopattino',name:'Monopattino elettrico',emoji:'🛴',buy:250,speed:1.8,color:'#1f2937'},
 {id:'bici',name:'Bici da città',emoji:'🚲',buy:400,speed:1.7,color:'#0e7490'},
 {id:'scooter',name:'Scooter 125',emoji:'🛵',rent:60,minutes:15,speed:2.3,color:'#e11d48'},
 {id:'auto',name:'Utilitaria',emoji:'🚗',rent:120,minutes:15,speed:2.8,color:'#2563eb'},
 {id:'furgone',name:'Furgoncino',emoji:'🚐',rent:150,minutes:20,speed:2.5,color:'#f5f5f4'},
 {id:'cabrio',name:'Cabrio di lusso',emoji:'🏎️',rent:400,minutes:15,speed:3.2,color:'#facc15'}];
export const VEHICLE=Object.fromEntries(VEHICLES.map(v=>[v.id,v]));

// Distributori di bevande (HUMANA life 3D): nomi generici, niente marchi.
export const DRINKS=[{id:'acqua',name:'Acqua fresca',icon:'💧',price:1},{id:'aranciata',name:'Aranciata',icon:'🍊',price:2},{id:'gassosa',name:'Gassosa al limone',icon:'🍋',price:2},{id:'te',name:'Tè freddo alla pesca',icon:'🍑',price:2},{id:'chinotto',name:'Chinotto',icon:'🥤',price:2},{id:'energia',name:'Bibita energetica',icon:'⚡',price:3},{id:'caffe',name:'Caffè freddo',icon:'☕',price:2}];

// Jukebox nei locali (HUMANA life 3D): posizione nella sala, prezzo in monete, durata massima di un brano.
export const JUKEBOX_PRICE=5,JUKEBOX_MINUTES=6;const JB={x:14,y:2.6};
export const JUKEBOX={bar:JB,pizzeria:JB,osteria:JB,vesuvio:JB,trattoria:JB,panorama:JB,burger:JB,club:{x:2.2,y:2.6}};

// Negozi di mezzi (HUMANA life 3D): autosalone, moto e bici. I modelli somigliano a mezzi veri ma hanno nomi generici (niente marchi).
// "base" è il mezzo di partenza per guida e regole (auto, cabrio, scooter, bici); "model" è la forma disegnata nel 3D.
export const DEALERS=[
 {id:'auto',name:'Autosalone del Golfo',icon:'🚘',x:136,y:96,w:11,h:8,color:'#b3261e'},
 {id:'moto',name:'Moto e Scooter Vesuvio',icon:'🏍️',x:102,y:68,w:11,h:8,color:'#1d4e89'},
 {id:'bici',name:'Ciclofficina Partenope',icon:'🚲',x:36,y:104,w:11,h:8,color:'#1f6f50'}];
export const VEHICLES_3D=[
 {id:'a-city',shop:'auto',base:'auto',model:'city',name:'Citycar tre porte',emoji:'🚗',buy:900,speed:2.7,color:'#f4f4ef'},
 {id:'a-berlina',shop:'auto',base:'auto',model:'sedan',name:'Berlina sportiva',emoji:'🚘',buy:1800,speed:3,color:'#1f3a6b'},
 {id:'a-suv',shop:'auto',base:'auto',model:'suv',name:'Fuoristrada 4x4',emoji:'🚙',buy:2600,speed:2.9,color:'#2b2f36'},
 {id:'a-gt',shop:'auto',base:'auto',model:'gt',name:'Granturismo a motore anteriore',emoji:'🏎️',buy:4200,speed:3.5,color:'#0b0b0f'},
 {id:'a-spider',shop:'auto',base:'cabrio',model:'super',name:'Spider scoperta',emoji:'🏎️',buy:3800,speed:3.4,color:'#c9ccd3'},
 {id:'a-coupe',shop:'auto',base:'auto',model:'coupe',name:'Berlinetta rossa da corsa',emoji:'🏎️',buy:6000,speed:3.9,color:'#c1121f'},
 {id:'a-wedge',shop:'auto',base:'auto',model:'wedge',name:'Supercar a cuneo',emoji:'🏎️',buy:7500,speed:4.1,color:'#f2c400'},
 {id:'m-50',shop:'moto',base:'scooter',model:'scooter',name:'Scooter 50',emoji:'🛵',buy:350,speed:2.2,color:'#2ec4c4'},
 {id:'m-epoca',shop:'moto',base:'scooter',model:'scooter',name:'Scooter d’epoca',emoji:'🛵',buy:700,speed:2.3,color:'#e9e1d2'},
 {id:'m-naked',shop:'moto',base:'scooter',model:'naked',name:'Moto naked',emoji:'🏍️',buy:1500,speed:3,color:'#2b2f36'},
 {id:'m-enduro',shop:'moto',base:'scooter',model:'enduro',name:'Maxi enduro',emoji:'🏍️',buy:2200,speed:3.2,color:'#f4f4ef'},
 {id:'m-cruiser',shop:'moto',base:'scooter',model:'cruiser',name:'Custom da viaggio',emoji:'🏍️',buy:2600,speed:2.9,color:'#7a1f2b'},
 {id:'m-sport',shop:'moto',base:'scooter',model:'sport',name:'Sportiva carenata',emoji:'🏍️',buy:3400,speed:3.7,color:'#c1121f'},
 {id:'b-bmx',shop:'bici',base:'bici',model:'bmx',name:'BMX',emoji:'🚲',buy:300,speed:1.8,color:'#e5484d'},
 {id:'b-mtb',shop:'bici',base:'bici',model:'mtb',name:'Mountain bike',emoji:'🚵',buy:450,speed:1.9,color:'#2f9e5b'},
 {id:'b-corsa',shop:'bici',base:'bici',model:'corsa',name:'Bici da corsa',emoji:'🚴',buy:700,speed:2.2,color:'#ffc928'},
 {id:'b-cargo',shop:'bici',base:'bici',model:'cargo',name:'Bici da passeggio con cestino',emoji:'🚲',buy:380,speed:1.7,color:'#ff7ab6'},
 {id:'b-ebike',shop:'bici',base:'bici',model:'ebike',name:'Bici elettrica',emoji:'🚲',buy:950,speed:2.4,color:'#3b4250'}];
for(const v of VEHICLES_3D)VEHICLE[v.id]=v;

// Banca digitale del telefono (HUMANA life 3D).
export const BANK_NAME='NPL Bank';

// Negozi dentro il centro commerciale (HUMANA life 3D): stanno ai banconi della sala. kind: fashion = abiti, shop = accessori e arredi, sim = scelta del numero di telefono.
export const MALL_SHOPS=[{id:'abiti',name:'Abbigliamento',icon:'👗',kind:'fashion',slots:['top','pants','hat'],x:8,y:3},{id:'sim',name:'Negozio SIM',icon:'📱',kind:'sim',x:3,y:7},{id:'accessori',name:'Accessori e arredi',icon:'🕶️',kind:'shop',x:13,y:7},
 {id:'scarpe',room:'mall2',name:'Scarpe e borse',icon:'👟',kind:'fashion',slots:['shoes','bag'],x:8,y:3},{id:'gioielli',room:'mall2',name:'Orologi e gioielli',icon:'⌚',kind:'fashion',slots:['watch','neck','glasses'],x:3,y:7},{id:'casa',room:'mall2',name:'Casa e arredo',icon:'🛋️',kind:'shop',x:13,y:6}];
export const SIM_PRICE=50;
// Noleggio barche: un giro guidato nel golfo. dock = dove si sale (a terra), route = punti in mare (andata; il ritorno è lo stesso percorso al contrario).
export const BOAT_PRICE=40,BOAT_SPEED=9;
export const BOATS={lungomare:{name:'Noleggio barche del Golfo',dock:{x:19,y:17},route:[[13,11],[2,2],[-34,-12],[-70,14],[-52,46],[-14,30]]},
 mergellina:{name:'Noleggio barche Mergellina',dock:{x:281,y:311},speed:22,route:[[292,312],[364,348],[452,364],[720,336],[728,336],[744,356],[756,556],[1500,520],[2350,620],[3150,720]]}};

// Luna park di HUMANA life 3D (il 2D non lo usa): biglietteria con il giostraio e le giostre su cui si sale. Prezzi in monete.
// Misure e percorsi stanno qui perché li usano sia il server (dove si siede chi sale) sia il disegno 3D delle giostre.
export const FUNFAIR={booth:{x:153,y:54},rides:{
 'ruota-panoramica':{name:'Ruota panoramica',emoji:'🎡',price:8,x:162,y:40,w:9,seconds:40,laps:2,note:'Cabina chiusa e vista sul golfo dall’alto'},
 'giostra-cavalli':{name:'Giostra dei cavalli',emoji:'🎠',price:5,x:162,y:54,w:7,seconds:28,laps:5,note:'Cavalli che salgono e scendono'},
 'calcinculo':{name:'Calcinculo (seggiolini volanti)',emoji:'🎪',price:6,x:162,y:68,w:8,seconds:30,laps:6,note:'Seggiolini che volano in tondo'},
 'tazze':{name:'Tazze che girano',emoji:'☕',price:5,x:176,y:68,w:7,seconds:26,laps:4,note:'Una tazza tutta per te'}}};
export const rideGeom=art=>{const R=FUNFAIR.rides[art];if(!R)return null;const S=Math.max(8,R.w);
 if(art==='ruota-panoramica'){const r=S*.48;return {S,r,cy:r+1.4,rho:r};}
 if(art==='giostra-cavalli')return {S,rho:S*.46*.72};
 if(art==='calcinculo'){const top=S*.42*.9;return {S,rho:top+3.4*Math.sin(.3),top,chain:3.4,tilt:.3};}
 return {S,rho:S*.46*.66};};
// Percorso di chi sale: lo stesso numero di punti per ogni giro; il server li percorre in modo uniforme nel tempo (ride.uniform).
export function ridePlan(art){const R=FUNFAIR.rides[art],G=rideGeom(art);if(!R)return null;const N=40,pts=[],wheel=art==='ruota-panoramica',a0=wheel?Math.PI:0,da=Math.PI*2*R.laps;
 for(let k=0;k<=N*R.laps;k++){const a=a0+Math.PI*2*k/N;pts.push(wheel?{x:R.x+G.rho*Math.sin(a),y:R.y}:{x:R.x+G.rho*Math.cos(a),y:R.y+G.rho*Math.sin(a)});}
 return {pts,a0,da,to:{x:R.x-G.S/2-1.8,y:R.y+(wheel?3.5:0),name:R.name}};}
