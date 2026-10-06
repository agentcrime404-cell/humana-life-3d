# Installazione HUMANA V2

1. Node.js 24 e npm; estrarre lo ZIP.
2. `npm ci` nella cartella humana-isometrica.
3. Copiare `.env.example` in `.env`.
4. `npm run db:migrate`.
5. `npm start`; aprire http://localhost:3000.
6. Due browser con account diversi per provare multiplayer.

Sviluppo: `npm run dev`. Produzione: `npm run start:production` sotto un supervisore, un solo processo, volume persistente per data, reverse proxy HTTPS con supporto WebSocket `/ws` o TLS diretto. Non è stato effettuato un deploy pubblico.

Variabili: PORT (3000), HOST (0.0.0.0), DATABASE_PATH, PUBLIC_ORIGIN (origine HTTPS esatta per controllare i WebSocket), ICE_SERVERS_JSON (array di server ICE), TLS_CERT/TLS_KEY (file certificato/chiave se si termina TLS in Node). Non inserire segreti nel repository. TURN deve usare credenziali temporanee per la produzione; l'endpoint /api/config è autenticato ma le credenziali restituite sono necessariamente disponibili al browser dell'utente.

Per la PWA: HTTPS valido, aprire il sito e usare Installa/Aggiungi a schermata Home se il browser lo propone. Cache solo di file pubblici. Offline è disponibile la shell, non una copia simulata della città. Per aggiornare una pubblicazione, cambiare il nome CACHE in client/sw.js e chiudere le schede della versione precedente: non viene forzato skipWaiting durante una partita.

Gli avviatori installano dipendenze runtime; per i test usare `npm ci`. Il pacchetto non contiene node_modules, database, certificati o .env privato.
