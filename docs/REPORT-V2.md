# Report HUMANA V2 · 2.0.0-mvp.1

## IMPLEMENTATO

- Migrazione SQLite 2 compatibile con il database esistente: stato persistente, inventario, acquisti idempotenti, appartamenti, inviti, messaggi diretti ed eventi.
- Autosalvataggio della posizione, ripristino accesso, preferenze e progressi server-side.
- Riconnessione automatica (otto tentativi, backoff 1–15 s) e sostituzione sicura del socket al refresh con la stessa sessione.
- Monete virtuali: 100 iniziali, acquisti nel negozio, premio giornaliero dopo 100 m misurati dal server. Transazioni atomiche e controllo proprietà/saldo.
- Ordini nel bar e in pizzeria, inventario ed equipaggiamento cosmetico.
- Una casa per account, PUBLIC/FRIENDS/PRIVATE, inviti temporanei, arredi posseduti, validazione disposizione, salvataggio e sincronizzazione interno.
- Messaggi privati persistenti, inbox e notifiche per DM/inviti; blocco bidirezionale.
- Creazione eventi della community e iscrizione persistente, controllo dell'accesso agli eventi domestici.
- Manifest, icone e service worker PWA. Cache solo dei file pubblici; il mondo richiede il server online.
- Audio sintetizzato originale: passi, ambiente variabile con posizione e musica ritmica della discoteca; quattro volumi separati salvabili.

## MIGLIORATO

- Mappa 64×64 → 80×80, mantenendo piazza, locali e palazzi precedenti. 21 residenze esterne, sei percorsi, sette zone tematiche, nuovi arredi e fontana.
- Renderer con sprite indipendenti di barche/nuvole mobili, vegetazione oscillante, oscuramento notturno graduale e luci animate della discoteca. Fondale originale mantenuto: non ogni dettaglio del fondale è animato.
- Avatar: corporatura e occhiali, palette, nuovi sprite di seduta/saluto/applauso/ballo. Idle/cammino/corsa conservati. Risata semplificata, pose sociali a una direzione.
- Minimappa adattata ai nuovi confini; HUD mobile con barra sociale scorrevole.
- Snapshot limitati alla stanza e a 55 metri dal destinatario.

## BUG CORRETTI

- Un salvataggio del profilo non cancella più l'outfit acquistato.
- La chiusura del vecchio socket non elimina il nuovo giocatore dopo refresh.
- Rientro e permanenza nelle case verificano permessi, blocchi e scadenza degli inviti. Il controllo periodico avviene ogni dieci secondi; un cambio privacy espelle subito gli ospiti non autorizzati.
- Acquisto ritrasmesso con lo stesso requestId non addebita due volte. Prezzi e saldo dichiarati dal client sono ignorati.
- Arredi sconosciuti, non posseduti, sovrapposti o collocati nella fascia ingresso sono respinti.
- Corpo JSON non valido respinto; struttura di un arredo nullo restituisce errore di input.
- Preferenze e informazioni economiche non vengono trasmesse nei dati pubblici degli avatar.

## TEST

**32 passati, 0 falliti, 0 saltati**, inclusi tutti i 20 test della versione precedente. Il numero include i contenitori della suite come riportato da Node. Log in `docs/test-results-v2.txt`.

Verificati: autenticazione e logout, password hash, scadenza sessioni, due client WebSocket contemporanei, movimento autorizzato, collisioni e raggiungibilità di tutti i landmark, isolamento stanze, chat, amicizie, blocco, report, posti esclusivi, signalling voce, refresh/riconnessione, persistenza SQLite dopo riapertura, acquisti/idempotenza/saldo, equipaggiamento, arredi/privacy/inviti, DM, eventi, risorse PWA, renderer ad alta densità e cache limitata. Ciclo microfono verificato con mock, non microfoni fisici.

Non sono test end-to-end dell'interfaccia DOM. Non sono stati verificati UI su Android, installazione PWA e audio reale. L'anteprima browser disponibile ha bloccato localhost; non viene dichiarata una console browser priva di errori sulla base dei soli test Node.

## MULTIPLAYER

Operativo nei test con socket reali. Tick 20 Hz, snapshot 10 Hz, collisioni server-side e interpolazione client conservati. Capacità configurata: 32 connessioni in un processo. Non è un test di carico a 32 giocatori. I client lontani non ricevono i rispettivi avatar, ma il server continua a simulare i giocatori connessi.

## VOICE

Implementazione WebRTC esistente conservata: attenuazione con distanza, microfono/mute individuale, indicatore parlato e filtraggio server-side per stanza/distanza/blocco. Testati signalling e lifecycle simulato. Mancano test audio tra due dispositivi reali e TURN sulle reti di destinazione. Microfono spento al cambio stanza e dopo riconnessione.

## MOBILE

Joystick, corsa multitouch e annullamento input testati con eventi simulati. CSS responsive e PWA aggiunti. Nessun APK generato. L'installazione PWA richiede HTTPS e una verifica sul telefono; il pacchetto include tutte le risorse necessarie, ma non una certificazione di installabilità Android.

## PERFORMANCE

Conservati culling, chunk 8×8, cache di 24 chunk, DPR massimo 2, terreno ad alta densità e minimappa aggiornata meno frequentemente del mondo. Interest management a 55 metri; asset nuovi condivisi in due atlanti. Non misurati FPS, memoria, temperatura o latenza audio su Android.

## FILE MODIFICATI / AGGIUNTI

- `server/database.js`, `server/storage.js`, `server/living.js`, `server/game.js`, `server/index.js`
- `shared/catalog.js`, `shared/avatar.js`, `shared/world.js`, `shared/district.js`
- `client/app.js`, `client/index.html`, `client/networking/api.js`, `client/player/controls.js`
- `client/ui/living.js`, `client/ui/style.css`, `client/audio/ambient.js`, `client/world/renderer.js`
- `client/manifest.webmanifest`, `client/sw.js`
- `client/assets/living.png`, `client/assets/social-poses.png`, `client/assets/icon-192.png`, `client/assets/icon-512.png`
- `scripts/migrate.mjs`, `scripts/icons.mjs`, `scripts/render-fixture.mjs`
- `tests/living.test.js`, `tests/reconnection.test.js`, `tests/persistence.test.js`, `tests/render.test.js`
- `package.json`, `package-lock.json` e documentazione aggiornata.

Nessun repository Git presente nella cartella: non sono stati creati commit.

## ANCORA DA FARE

- Collaudo reale dell'intera UI su browser/Android e delle chiamate WebRTC; test PWA, carico e prestazioni.
- Editor avatar completo con carnagione/capelli/occhi/capi separati e animazioni sociali multidirezionali; la risata attuale è una variante semplificata.
- Interni con allestimenti architettonici specifici: i quattro locali condividono ancora lo schema di base, pur avendo azioni e musica diverse.
- Finitura artistica delle nuove zone, porto autentico, terreno/acqua animata completa, finestre e insegne con stati giorno/notte dedicati. La planimetria resta originale, non fedele alla geografia reale di Napoli.
- Case collegate a portoni del mondo, editor arredi con spostamento/rotazione e sedute sui divani (attualmente ci si siede sulle sedie).
- Inbox con stato letto/non letto, notifiche di amicizia e aggiornamento in tempo reale della conversazione aperta; minimappa con distinzione amici/altri utenti.
- Moderazione operativa con pannello, ban/mute di servizio e ruoli, recupero account, gestione privacy/cancellazione account; report attualmente salvati per consultazione database.
- Hosting HTTPS persistente, TURN con credenziali temporanee, backup monitorati e gestione segreti. Eventuale scalabilità oltre singolo processo/SQLite.
- Confezionamento Android: questa consegna è il progetto web/PWA, non un APK.

## ISTRUZIONI AVVIO

```sh
npm ci
# copia .env.example in .env
npm run db:migrate
npm run dev
# oppure:
npm run start:production
npm test
```

Database: nessun servizio esterno per questo MVP. Non avviare più processi di gioco sullo stesso database. Conservare il database su volume persistente. Per LAN usare l'IP del server; per voce/PWA configurare HTTPS e ICE_SERVERS_JSON. Vedere README, SETUP e VOICE.
