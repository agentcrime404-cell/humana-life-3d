# NAPOLI LIFE — LEGGI QUESTO FILE PER PRIMO (passaggio di consegne, 2026-10-07)

Se sei un Claude nuovo che apre questa cartella: **qui c'è tutto quello che serve**. Non ricordi nulla delle sessioni precedenti, quindi leggi questo file, poi `CONTINUA.md` (storia dettagliata del lavoro), poi `docs/memoria-claude/` (appunti di lavoro e preferenze dell'utente).
Le **password e le chiavi** NON sono in questo file: stanno in `SEGRETI-PRIVATI.md` e in `.env` (entrambi ignorati da git, non vanno mai pubblicati).

## L'utente e come lavorare con lui
- Scrive in **italiano**, vuole risposte **semplici, senza gergo**. Non conosce il codice.
- Vuole che tu **vada avanti da solo** fino a gioco finito: non chiudere le risposte con "vado avanti?". Fai una sola domanda vera solo se la scelta cambia il gioco in modo non reversibile, e intanto continua col resto.
- Vuole gli **aggiornamenti in tempo reale su Telegram** (bot `@Napolilife_bot`, vedi sotto): a ogni traguardo manda un messaggio breve con cosa è fatto e cosa manca.
- Il PC è debole (Intel Celeron N5095, grafica Intel UHD): il gioco deve restare leggero, obiettivo ≥ 30 FPS anche su telefono.
- Stile grafico: **non cambiarlo** (3D "cartone" realistico leggero attuale, telecamera, comandi, HUD). Migliora, non rifare.
- Regole di sicurezza: non creare account, non inserire password/carte al posto suo, non cambiare firewall/impostazioni di sistema (si danno script da eseguire a lui).

## Cos'è il progetto
**Napoli life** (nome interno storico: HUMANA life 3D): gioco sociale multiplayer 3D ambientato a Napoli (Lungomare di fantasia "Napoli Centro" + zona **Mergellina reale** da OpenStreetMap). Chat, voce, telefono, banca, locali con interni, veicoli, benzina, polizia/furti/prigione, città viva (pedoni, traffico, ESI rifiuti, eventi), mappa GPS con cluster.
- Stack: **Node 24** (`node:sqlite`, nessun database esterno), `ws` (WebSocket), client senza build: **three.js r170** in `client/vendor/three`, moduli ES nel browser. Il client è lo stesso su PC e telefono; l'APK Android è solo un "guscio" che apre il gioco da internet.
- **Il vecchio gioco 2D è stato tolto** (2026-10-07, su richiesta dell'utente). Tutto il 2D (APK, database dei bambini, pagine) è nella cartella `Desktop/HUMANA-2D-archivio/` fuori dal progetto, e nella storia git (tag `archivio-2D-prima-della-pulizia`). Attenzione: il motore 3D usa ancora internamente il vecchio disegnatore 2D come **calcolatore** (`client/world/renderer.js`, nel codice `this.r2d`: ora del giorno, traffico, stato ville). NON è un modo di gioco: non cancellarlo senza riscrivere quelle parti.

## Come si avvia (PC Windows)
1. Node.js 24 (nodejs.org). Nella cartella: `npm ci` (la prima volta).
2. `npm start` oppure doppio clic su `AVVIA-NAPOLI-LIFE.bat` → gioco su **http://localhost:3079/** (archivio giocatori `data/humana-3d.sqlite`). Mac: `AVVIA-NAPOLI-LIFE-MAC.command`.
3. Ingresso: pulsante **GIOCA SUBITO** (ospite, sceglie un personaggio) oppure account.
4. Test: `npm test` (65 test; se un test fallisce solo quando si lancia tutto insieme ed esce da solo, è la lentezza del PC: rilanciarlo da solo).
5. Variabili in `.env` (modello in `.env.example`): `PORT_3D`, `DATABASE_PATH_3D`, `ICE_SERVERS_JSON` (server TURN per la voce), `TELEGRAM_BOT_TOKEN`, ecc. Nota: una variabile di sistema con lo stesso nome vince su `.env` (è successo con `TELEGRAM_BOT_TOKEN`: lo script legge `.env` apposta).

## Online (Render) — per far provare il gioco da fuori casa
- Servizio: **humana-life-3d** su Render, piano **free**, regione Francoforte. Indirizzo: **https://humana-life-3d.onrender.com/**. ID servizio `srv-db2ffdrbc2fs738er3ag`, blueprint `exs-db2fdebtqb8s73d7cg3g`. File: `render.yaml` (build `npm ci --omit=dev`, avvio `node scripts/play-3d.mjs`, `autoDeploy: false`).
- Codice su GitHub: **agentcrime404-cell/humana-life-3d** (**pubblico**: Render può leggere solo archivi pubblici con questo account; non metterci mai segreti). Sul PC la credenziale GitHub è già salvata, quindi `git push` funziona.
- **Come aggiornare online**: 1) `npm test`; 2) alza `CACHE` in `client/sw.js` (`humana-life-NN`) a ogni modifica del client; 3) `git add -A && git commit && git push`; 4) su dashboard.render.com → servizio humana-life-3d → **Manual Deploy → Deploy latest commit** (si può fare dal riquadro del browser di Claude; l'utente accede con Google); 5) verifica: `curl https://humana-life-3d.onrender.com/sw.js` deve mostrare il nuovo numero `humana-life-NN` (il deploy dura ~1-2 minuti).
- Variabili impostate su Render (Environment): `NODE_VERSION=24`, `ICE_SERVERS_JSON` (TURN di Metered, vedi `SEGRETI-PRIVATI.md`). Attenzione: incollare il JSON con `form_input` lo rovina ("[object Object]"): scriverlo con la tastiera.
- **Limiti del piano free**: si addormenta dopo ~15 min (primo accesso lento), **non ha disco: account e monete si cancellano a ogni riavvio/deploy**. Per tenerli serve piano a pagamento + disco (blocco `disk` in `render.yaml`, `DATABASE_PATH_3D=/var/data/humana-3d.sqlite`): lo decide e lo paga l'utente (carta).
- Pagamenti: nessuna chiave Stripe = ricariche spente (solo demo, `TEST_PAYMENTS`). Banca in modalità demo.
- Gli altri progetti dell'utente su Render (`kouverte-*`) e `lumix.best` NON vanno toccati.

## Telegram (aggiornamenti e mappa)
- Bot **@Napolilife_bot**; token in `.env` (`TELEGRAM_BOT_TOKEN`); chat dell'utente salvata in `data/telegram-chat.json` (utente LumiX, `@LumixTg`).
- Messaggi: `node --env-file-if-exists=.env scripts/telegram.mjs "testo"`; `... --qr` invia il QR di download; `... --apk` invia il file APK.
- Bot interattivo (deve restare acceso sul PC): `npm run bot` (`scripts/telegram-bot.mjs`). Comando **/mappa**: manda la mappa di Napoli Centro con luoghi numerati, griglia ogni 20 m e legenda; ogni altro messaggio dell'utente viene salvato in `data/telegram-inbox.jsonl` → **leggi quel file all'inizio di ogni sessione**: sono richieste di modifiche che vuole fare.

## Voce tra reti diverse (TURN)
- Account Metered (metered.ca): app `humana-life`, piano di prova 500 MB, credenziale TURN `humana-life-render`. I dati (utente/password TURN, account) sono in `SEGRETI-PRIVATI.md`. Se la quota finisce, la voce tra reti diverse non passa (sulla stessa rete sì): creare nuova credenziale e rifare `ICE_SERVERS_JSON` su Render (e in `.env`).

## APK Android (e QR)
- Un solo progetto Android: `android-3d/` (non è in git: sta solo in questa cartella). `npm run apk -- https://humana-life-3d.onrender.com/` compila con Gradle e scrive `dist/HUMANA-3D.apk` + `dist/qr-scarica-3d.png`. Serve **Java 21** (portatile in `tools/jdk-21*`, il Java di sistema rompe Gradle) e l'Android SDK (`C:\Users\joker\AppData\Local\Android\Sdk`, in `android-3d/local.properties`).
- L'APK è solo un guscio: carica il gioco dall'indirizzo, quindi gli aggiornamenti del gioco arrivano senza reinstallare. Va rifatto solo per cambiare nome/icona/indirizzo. Nome app: "Napoli life", id `it.humana.life3d`.
- Pagina di download del gioco: `/scarica-3d`; il file: `/scarica/HUMANA-life-3D.apk` (sul server Render serve l'APK incluso nel repo). QR: `npm run qr`.

## Dati geografici (Mergellina reale) — ripetibile, niente download in partita
- `node scripts/osm-scarica.mjs` scarica da OpenStreetMap (Overpass API) il riquadro **lat 40.8195–40.8345, lon 14.2090–14.2535** (Mergellina → Castel dell'Ovo e Borgo Marinari) in `data/osm/napoli-esteso.osm` (8 MB, scaricato davvero il 2026-10-07; la cartella `data/` non è in git: rifare il download se manca).
- `node scripts/osm-napoli.mjs` converte in **metri 1:1** (origine fissa lat 40.83025, lon 14.2175; x = est, y = sud) e scrive `client/assets/world/napoli/map/mergellina.json` (1,6 MB): 1574 palazzi (solo 78 con piani/altezza in OSM: gli altri sono **stime**), 1641 strade, costa, 60 moli/pontili, 25 piazze, 126 parchi, 6 spiagge, 161 alberi, 610 attività (414 con nome vero), punti di riferimento, e la **griglia di calpestabilità** (3749×1659 celle da 1 m).
- Attribuzione obbligatoria: © OpenStreetMap contributors, licenza ODbL (nel JSON, in `client/assets/world/napoli/LICENZE.md`; **da mostrare nella schermata Crediti del gioco: DA FARE**).
- Punti di riferimento verificati nei dati (x, y in metri): Fontana del Sebeto (146, 777); Largo Sermoneta (2, 781); Piazza Sannazaro (249, 150); Via Francesco Caracciolo (centro ~540, 234); Via Partenope (~2339, −45); Castel dell'Ovo (2568, 268; pianta 145×189 m); Borgo Marinari (2610, 209); Pontile di Castel dell'Ovo (2540, 151); Villa Comunale (1295, −269). Il tragitto Mergellina → Castel dell'Ovo è lungo circa 2,5 km.

## Stato della ricostruzione di Mergellina (primo tratto fatto, il resto da fare)
FATTO:
- Dati OSM scaricati e importati su tutta l'area estesa; griglia, edifici, strade, moli, costa.
- Terreno a **piastrelle da 512 m** caricate solo vicino al giocatore (`groundTiles` in `client/world/world3d.js`): la zona è quasi 4 km.
- Castel dell'Ovo: il modello 3D (`castel()`) è adattato alla **pianta vera** (posizione, orientamento, lunghezza).
- Fontana del Sebeto sulla posizione vera (forma STILIZZATA, orientamento stimato) con vasca non attraversabile (anche sul server); cartelli con i nomi dei luoghi; piazze e spiagge dalle forme vere; ombrelloni nelle spiagge; barche solo sui pontili veri (max 60 telefono / 150 PC).
- Attività della mappa vera: nome vero da OSM con `real:true`, altrimenti nome di fantasia `real:false` (`shared/napoli.js`, `napoliPlaces()`).
DA FARE (in ordine consigliato):
1. **Vita nelle strade di Mergellina** (oggi la "città viva" funziona solo nel Lungomare di fantasia: `client/world/citylife.js`, `ambient.js`, traffico in `shared/traffic.js`). Serve una rete stradale da OSM: pedoni sui marciapiedi (offset dalla strada), attraversamenti, pescatori sui pontili, tavolini occupati, consegne, camion ESI, traffico e scooter su corsie, comparsa/sparizione in base alla distanza e agli orari. Idea: sottoclasse di `CityLife` che riusa il pooling dei modelli.
2. **Le 31 attività della legenda** (le 31 voci che l'utente vede con `/mappa`: locali, benzina, polizia, ospedale, ESI, giostre, concessionari…) da rimappare nella nuova geografia: bar/ristoranti/negozi su spazi compatibili; distinguere reali (OSM) da inventate; le strutture senza corrispondenza reale in interni compatibili o in un'area di fantasia (il Lungomare "Napoli Centro" può diventare l'area di fantasia). Risolvere la sovrapposizione fra **Sala Slot Vesuvio** e **Moto e Scooter Vesuvio** (in Napoli Centro: casinò a (108,76) e concessionario moto a (102,68), `DEALERS` in `shared/catalog.js`).
3. **Vista di confronto** mappa vera ↔ mappa del gioco (pagina HTML o immagine) con fonti, dati importati, elementi ricostruiti e parti approssimate.
4. Ricostruire con più fedeltà: porto di Mergellina (moli, barche), Largo Sermoneta (piazza), Via Caracciolo e Via Partenope (alberi, lampioni), Borgo Marinari. Palazzi: usare piani/altezze quando OSM li ha, **stimare** il resto e dirlo; cercare foto di riferimento (facciate, balconi, colori) senza dichiarare "verificato" ciò che non lo è.
5. **Prestazioni su telefono**: la costruzione di Mergellina oggi impiega ~10 s su questo PC (misura `[napoli]` nella console del browser): per i telefoni servono caricamento per zone anche di palazzi/strade, livelli di dettaglio e meno elementi.
6. Schermata Crediti con l'attribuzione OSM e le licenze degli asset.
Avvertenza: nel gioco il test del browser è lentissimo su questo PC: dopo il viaggio a Mergellina la pagina può restare ferma 1-2 minuti. Aspettare, poi usare `window.__w3` (solo su localhost) per ispezionare.

## Mappa del codice
- `server/` — `index.js` (HTTP, API, statici, carica la mappa di Mergellina), `game.js` (WebSocket, movimento autoritativo, tick), `living.js` (negozi, veicoli, banca, furti `take()`, auto parcheggiate `parkCar`), `police.js` (ricercato/cella/rilascio, salvati nel progress), `fuel.js`, `service.js` (bar/alcol), `arena.js` (paintball), `jobs.js`, `phone.js`, `storage.js`.
- `shared/` — `world.js` (mappe, collisioni `canStand`, `step`), `catalog.js` (tutto il catalogo: veicoli, locali, distributori, caserme, ESI, ospedale, residenze moderne, giostre, prigione…), `traffic.js` (traffico), `napoli.js` (Mergellina vera, locali), `lanes.js`, `district.js`, `looks.js`, `avatar.js`.
- `client/` — `3d.html` (pagina del gioco, servita come `/`), `app.js` (avvio, HUD, ciclo), `world/world3d.js` (**tutto il 3D**: righe lunghissime, si modifica con script Node di sostituzione esatta), `world/citylife.js`, `world/ambient.js` (suoni sintetizzati, eventi, meteo), `world/avatar3d.js`, `ui/*` (mappa `bigmap.js`, telefono, città, HUD, drive-hud), `sw.js` (service worker: alza `CACHE` a ogni modifica e aggiungi i nuovi moduli a `SHELL`).
- `scripts/` — avvio (`play-3d.mjs`), OSM (`osm-scarica.mjs`, `osm-napoli.mjs`), Telegram, APK (`apk-3d.mjs`), QR (`qr-3d.mjs`), strumenti per asset/modelli.
- `tests/` — 65 test (`npm test`). `tools/` — Java portatile e strumenti modelli. `docs/` — analisi e appunti tecnici. `docs/memoria-claude/` — appunti salvati dal Claude precedente.
- Gli asset 3D stanno in `client/assets/world/napoli/<categoria>/` (Kenney, Poly Haven, Quaternius CC0; personaggi Rocketbox con licenza propria: `characters/persone-vere/LICENSE-Rocketbox.txt`; mappa © OpenStreetMap ODbL).

## Trucchi tecnici che fanno risparmiare ore
- `world3d.js` ha righe enormi e finali di riga misti: non usare editor a riga; scrivi uno script Node con `rep(testo_vecchio, testo_nuovo)` esatto (e scrivilo con uno strumento di scrittura file, non con heredoc: i backslash si perdono).
- Verifica nel browser incorporato: `window.__w3` (mondo 3D), `window.__city`; per inquadrare un punto: sostituire `renderer.render` con una funzione che imposta `camera.position/lookAt`. Per spostare il giocatore di prova modifica `player_state.position` nel database **solo a server fermo**.
- Ora del giorno per i test: `w.r2d.seconds=()=>10.5/24*2400;w.skyK=null;w.daylight(0,true)` (un giorno = 40 minuti di gioco).
- Dopo ogni modifica lato server riavvia `npm start` (porta 3079: trova il processo con `netstat -ano | findstr :3079` e `taskkill /PID <n> /F`).
- Commit: autore `HUMANA <humana@users.noreply.github.com>`; la riga finale `Co-Authored-By` va quella indicata dalla sessione.
