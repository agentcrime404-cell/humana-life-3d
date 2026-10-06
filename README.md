# HUMANA V2 · Napoli Living World

Versione `2.1.0-mvp.1`, evoluzione del repository isometrico esistente. Canvas 2D/2.5D, Node.js 24, WebSocket, SQLite e WebRTC. Gli asset del Lungomare sono conservati. Non è un nuovo progetto 3D e non è una ricostruzione topografica di Napoli.

**È un MVP eseguibile, non una release certificata per il lancio pubblico.** Il report preciso è in `docs/REPORT-V2.md`; le prove automatiche non sostituiscono il collaudo Android/audio reale.

## Installazione e avvio

Prerequisiti: Node.js 24 con npm, browser moderno. Per giocare da telefono: server raggiungibile sulla stessa rete; HTTPS valido per voce e installazione PWA.

```sh
npm ci
```

Copia `.env.example` in `.env` e modifica solo le variabili necessarie. Su Linux/macOS: `cp .env.example .env`; su Windows: `copy .env.example .env`.

```sh
npm run db:migrate
npm start
```

Apri http://localhost:3000. Scegli **CREA ACCOUNT**, imposta un nome di 3–20 lettere/numeri/underscore e una password di almeno 8 caratteri. Personalizza avatar e bio, salva, cammina. Non sono inclusi account, password o dati di utenti reali.

Il database è `data/humana.sqlite`; le migrazioni si applicano anche automaticamente all'avvio. Il vecchio database può essere mantenuto: esegui un backup a server arrestato prima dell'aggiornamento. Non cancellarlo per installare V2.

```sh
npm run dev                # sviluppo con riavvio automatico
npm run start:production   # processo server, da proteggere con HTTPS
npm test                   # suite automatica
npm run preview:render     # PNG dal renderer; non screenshot browser
```

Gli avviatori Windows e Mac/Linux sono mantenuti. Installano solo le dipendenze runtime; `npm ci` installa anche quelle necessarie al collaudo.

## App Android (APK)

`npm run apk` crea `dist/HUMANA.apk` (servono JDK 21 in `JAVA_HOME` e Android SDK in `android/local.properties`). L'app contiene grafica e interfaccia; il mondo resta sul server: avvia `npm start` sul PC, installa l'APK sul telefono connesso alla stessa Wi-Fi e al login inserisci l'indirizzo mostrato dal terminale (es. `http://192.168.1.10:3000`). Per giocare fuori casa serve un server online raggiungibile. L'app è in orizzontale; la voce chiede il permesso microfono di Android.

## Giocare

- WASD o frecce; Shift per correre. Sul telefono usa joystick e pulsante Corri insieme.
- E o mano: entra/esci da un locale, siediti/alzati vicino a una sedia libera.
- Sorriso: emote/azioni sociali. Tocca un giocatore per profilo, messaggio, amicizia, invito a casa, mute, blocco e segnalazione.
- Minimappa in alto a destra: toccala per aprire la mappa grande.
- **Mondo**: inventario, ordini, appartamento, messaggi privati, eventi e audio.
- Entra nella Bottega Marina per comprare arredi e cosmetici. Parti con 100 monete virtuali. Il premio giornaliero assegna 30 monete dopo 100 metri di cammino convalidato dal server: riscuotilo da Mondo.
- Ordina caffè nel bar o pizza nella pizzeria. L'ordine scala il saldo e aggiorna il contatore ordini; non simula un cameriere o un oggetto consumabile in mano.
- Mondo → appartamento: stanza personale gratuita, privacy, disposizione arredi acquistati. Il menu è un trasferimento diretto alla stanza, non una porta residenziale sulla mappa. Inviti di un'ora dal profilo degli amici.
- Audio ambientale e musica sintetica originale: attivali da Mondo → Audio e preferenze. Il microfono si attiva separatamente. I volumi salvati sono in quel pannello; il cursore voce del menu rapido è una regolazione temporanea.

Posizione, profilo, avatar, amicizie, blocchi, inventario, saldo, casa, arredi, progressi e preferenze vengono salvati sul server. La posizione viene salvata ogni circa cinque secondi, alla disconnessione e all'arresto ordinato. Un crash può perdere gli ultimi secondi di movimento; gli acquisti sono transazioni immediate.

## Due giocatori e voce

Apri due browser/profili privati con **due account diversi**. I due giocatori condividono la stanza e i suoi posti a sedere. Il refresh con la stessa sessione sostituisce il vecchio socket; una diversa sessione simultanea dello stesso account è respinta. Un'interruzione di rete causa fino a otto tentativi di riconnessione con backoff.

Sul telefono apri l'indirizzo LAN stampato da `npm start`. Per il microfono e la PWA usa HTTPS: vedi `VOICE.md` e `SETUP.md`. Su reti diverse serve un servizio TURN correttamente configurato. Nessuna conversazione è registrata. Il cambio stanza e la riconnessione disattivano il microfono: riattivalo esplicitamente.

## Portata attuale

Mappa 80×80 unità logiche con 21 palazzi residenziali esterni, quattro locali accessibili, percorsi e sette zone tematiche. Le residenze non sono tutte visitabili. Case multiplayer separate, arredamento persistente, economia virtuale, eventi della community, messaggi privati, chat locale, amici, blocco e report. Nessun NPC finge di essere online.

Nuovi sprite per arredi e pose sociali, barche/nuvole mobili sovrapposte al panorama, vegetazione oscillante, tinta notturna/luci e luci della discoteca. Il panorama conserva anche dettagli dipinti statici, comprese alcune barche e nuvole. Le nuove zone sono originali e riusano l'atlante mediterraneo; il porto è una zona di belvedere, non un porto navigabile.

Avatar: corporatura, colore personale, accessori, occhiali e palette acquistabile. Le pose sociali hanno una direzione; la risata riusa una posa sorridente con oscillazione. Non c'è ancora un editor completo di carnagione, capelli, occhi e capi separati.

## Limiti e prove ancora necessarie

33 test automatici passati, 0 falliti. Test con due socket reali, SQLite, renderer di produzione in Canvas nativo e API audio simulate. Non effettuati: collaudo dell'interfaccia in browser/Android, chiamata vocale fra microfoni reali, installazione PWA su telefono e benchmark FPS/temperatura/memoria. L'anteprima browser dell'ambiente ha bloccato localhost.

Un processo, una città, massimo 32 utenti; nessuno sharding o cluster. WebRTC a mesh limitata agli otto peer più vicini. HTTPS/TURN/hosting, backup e moderazione operativa devono essere predisposti prima del lancio. Recupero password, pannello moderatori, editor avatar completo, arredi con rotazione e APK non sono inclusi. Nessuna prestazione Android è garantita senza misurazione.

## Upgrade visuale e HUD 2.1

Camera ravvicinata, avatar più leggibili, ombre di contatto e nuovi arredi. HUD con ritratto, livello/XP, monete e gemme reali. Il titolo community VIP è gratuito a 500 XP: non è un abbonamento e non dà vantaggi. Gli XP crescono solo con il cammino misurato dal server; il premio giornaliero assegna anche una gemma. La palette giada costa 3 gemme nel negozio.

Inventario e telefono hanno pulsanti dedicati. Nel telefono trovi profilo, amici, inbox, eventi, casa, inventario, mappa e impostazioni. La chat ha microfono, emoji e invio; i messaggi compaiono temporaneamente sopra gli avatar. La minimappa ha zoom +/− centrato sul giocatore e amici dorati (aggiornamento periodico). Nuovo CSS safe-area/portrait/landscape e icone SVG originali.

Non sono stati aggiunti NPC o utenti simulati per riempire i locali. Non sono ancora presenti automobili, animali, meteo, tutte le personalizzazioni avatar né un'animazione dedicata all'uso del telefono. Il collaudo browser resta bloccato su localhost; HUD responsive implementato ma da verificare su dispositivi reali.
