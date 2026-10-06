# HUMANA 2.1 · upgrade visuale e interfaccia

Modificato il repository HUMANA isometrico esistente. Nessuna conversione 3D, nessuna cancellazione della piazza, nessun reset database.

## Implementato

- Camera ravvicinata e inquadratura più alta; scala avatar aumentata con hit-test coerente.
- Arredi aggiunti, collisioni condivise e percorsi verificati; ombre di contatto morbide. Panorama riposizionato per mantenere il castello sopra la linea della piazza.
- HUD ritratto/nome/stato, livello, XP, monete, gemme e titolo community VIP. Dati restituiti dal server, nessun saldo inventato.
- XP da movimento autorevole; livello ogni 100 XP, VIP gratuito a 500 XP. Premio giornaliero 30 monete + 1 gemma; palette giada acquistabile per 3 gemme, con transazione e idempotenza.
- Icone SVG originali, touch feedback, stato selezionato e badge richieste amicizia.
- Inventario e telefono con accesso a funzioni effettive, joystick multitouch conservato.
- Barra chat con microfono, emoji, invio, cooldown e fumetto sopra gli avatar per 5,5 s. Le emoji possono essere inserite nel messaggio o eseguite come gesto.
- Zoom minimappa +/− centrato sul giocatore, apertura grande, orologio del ciclo visivo; amici dorati e indicatori dei landmark. L'orologio è del gioco, non l'ora reale.
- Layout safe-area/portrait/landscape; comandi nascosti durante digitazione sugli schermi piccoli.

## Test e limiti

33 test passati, 0 falliti. Inclusi quelli precedenti e una verifica aggiuntiva di XP, VIP, gemme, acquisto in gemme e tentativi di falsificare i contatori tramite profilo. Il renderer è provato in Canvas nativo, non in un browser. Test dei percorsi includono gli arredi aggiunti.

Il browser cloud ha restituito ERR_BLOCKED_BY_CLIENT su http://localhost:3077. Non dichiariamo verificati layout DOM, tastiera mobile, installazione PWA, audio fisico o FPS su Android/iPhone. Nessuna garanzia di 60/30 FPS senza misurazione.

La richiesta artistica completa resta più ampia di questo upgrade: mancano varianti avatar complete, auto/animali/NPC ambientali, meteo, locali architettonicamente distinti, animazione use-phone, marker casa/eventi completi. I locali non appaiono affollati senza utenti connessi. Lo stile e gli asset originali sono mantenuti, ma non si dichiara identità pixel-per-pixel con la reference.

## File principali

client/ui/hud.js, client/ui/hud.css, client/index.html, client/app.js, client/ui/living.js, client/world/renderer.js, client/sw.js, shared/world.js, shared/catalog.js, server/storage.js, server/living.js, tests/living.test.js, tests/render.test.js, README.md, package.json/package-lock.json.

## Avvio e prova

Node.js 24. `npm ci`, copia `.env.example` in `.env`, `npm run db:migrate`, `npm start`. Apri http://localhost:3000 e accedi. Non eliminare data aggiornando una versione precedente.

Dopo login controlla HUD; apri telefono e inventario; prova chat/emoji da due account; tocca +/− sulla minimappa; cammina e verifica che gli XP aumentino dopo il salvataggio/aggiornamento (5–15 s). Acquisti solo nel negozio. Da telefono HTTPS per voce/PWA. Per sviluppo `npm run dev`; per server `npm run start:production`.
