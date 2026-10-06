# 0.3 — Quartiere esplorabile
- shared/district.js: percorsi, superfici e 12 residenze modulari.
- shared/world.js: area 64×64, nuovi arredi e collisioni; residenze non accessibili, quattro locali accessibili.
- client/world/renderer.js: terreno HD con cache limitata, minimappa e nomi delle zone, strade/marciapiedi e nuove facciate. Corretto il culling dei chunk che lasciava buchi visibili ai bordi dell’inquadratura.
- client/app.js e client/ui/style.css: apertura mappa ampia e correzione movimento indipendente dal framerate.
- tests/world.test.js: percorso dallo spawn a tutti i punti d’interesse e ingressi; limite marino.

10 test passati. Vista renderizzata dal codice Canvas a 1536×960, con minimappa dello stesso renderer sovrapposta nella posizione dell’HUD; non è una cattura Android né una verifica dell’interfaccia HTML. FPS, touch e audio restano da provare su dispositivi reali. Prossimo controllo: due telefoni, attraversamento del quartiere e sedute, memoria dopo 10 minuti.
