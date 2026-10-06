// Personaggi pronti di HUMANA life 3D, scelti all'ingresso (anche da ospite) o dal profilo.
// "spec" è la scheda dell'avatar 3D modulare (client/world/avatar3d.js): pelle, occhi, capelli, vestiti, scarpe e accessori,
// scelti per somigliare al ritratto in client/assets/personaggi/<numero>.webp.
// Ciò che il giocatore cambia poi nel gioco (barbiere, negozio di moda) ha la precedenza su questa scheda.
export const LOOKS=[
 {name:'Ciro',female:false,h:1.78,spec:{skin:'#e3a983',eyes:'#4a2f1c',hair:{kind:'quiff',color:'#1a1310'},top:{kind:'puffer',color:'#1c1c20',inner:'#f2f2f0'},bottom:{kind:'cargo',color:'#202024',ripped:true},shoes:{kind:'sneakers',color:'#f4f4f4'},neck:{kind:'chain',color:'#c9ccd3'},earrings:{color:'#c9ccd3'}}},
 {name:'Giulia',female:true,h:1.66,spec:{skin:'#f3cdb0',eyes:'#6a4a2a',hair:{kind:'bun',color:'#ecd093'},top:{kind:'crop',color:'#ffffff'},bottom:{kind:'wide',color:'#f0a3c4'},shoes:{kind:'sneakers',color:'#f7c6d9'},earrings:{color:'#e9d27a'}}},
 {name:'Enzo',female:false,h:1.8,spec:{skin:'#d9a27c',eyes:'#4a2f1c',hair:{kind:'quiff',color:'#1c1410'},beard:1,top:{kind:'shirt',color:'#f4f0e6'},bottom:{kind:'chino',color:'#cdbfa5'},shoes:{kind:'sneakers',color:'#f4f4f4'},watch:{color:'#2b2f36'},neck:{kind:'chain',color:'#d4a73a'}}},
 {name:'Sofia',female:true,h:1.68,spec:{skin:'#dba57f',eyes:'#4a2f1c',hair:{kind:'long',color:'#1d1410'},top:{kind:'dress',color:'#b5222c'},bottom:{kind:'none',color:'#b5222c'},shoes:{kind:'heels',color:'#8a1c22'},bag:{kind:'shoulder',color:'#17171a'},earrings:{color:'#d4a73a'}}},
 {name:'Luca',female:false,h:1.74,spec:{skin:'#e3a983',eyes:'#3f2a1a',hair:{kind:'curly',color:'#16110e'},top:{kind:'hoodie',color:'#2346c8',inner:'#f4f4f4'},bottom:{kind:'cargo',color:'#202024'},shoes:{kind:'sneakers',color:'#2a4fc0'},neck:{kind:'chain',color:'#d4a73a'}}},
 {name:'Marta',female:true,h:1.66,spec:{skin:'#dba57f',eyes:'#4a2f1c',hair:{kind:'bun',color:'#1c1512'},top:{kind:'cropjacket',color:'#1b1b1f',inner:'#1b1b1f'},bottom:{kind:'jeans',color:'#26262b',ripped:true},shoes:{kind:'sneakers',color:'#f4f4f4'},neck:{kind:'chain',color:'#c9ccd3'},earrings:{color:'#c9ccd3'}}},
 {name:'Diego',female:false,h:1.8,spec:{skin:'#d9a27c',eyes:'#4a2f1c',hair:{kind:'undercut',color:'#ece2c0'},top:{kind:'tee',color:'#1b1b1d'},bottom:{kind:'cargo',color:'#e9e9ee'},shoes:{kind:'sneakers',color:'#1b1b1d'},neck:{kind:'chain',color:'#c9ccd3'},earrings:{color:'#c9ccd3'},watch:{color:'#c9ccd3'}}},
 {name:'Aurora',female:true,h:1.68,spec:{skin:'#f3cdb0',eyes:'#5a6a3a',hair:{kind:'long',color:'#b5522a'},top:{kind:'crop',color:'#ffffff'},bottom:{kind:'skirt',color:'#6f93bd'},shoes:{kind:'sneakers',color:'#f4f4f4'},earrings:{color:'#d4a73a'}}}
];
