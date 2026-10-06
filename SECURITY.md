# Sicurezza MVP
Hash password scrypt, sessioni opache a scadenza di 7 giorni, logout con revoca, validazione input, autorità server per movimento/porte/sedie, limiti REST e WebSocket, controllo Origin, query parametrizzate e rendering testo tramite textContent. Nessun segreto negli asset. Microfono opzionale, nessuna webcam o posizione reale.

Limiti: sessioni connesse rivalidate ogni 10 secondi; logout chiude subito il socket. Heartbeat rileva connessioni interrotte. Assenza di pannello moderazione, ban, eliminazione account, recupero password, retention automatica e audit operativo. I report si salvano nel database e richiedono un operatore. WebRTC P2P può rivelare informazioni di rete ai peer; per isolamento richiedere TURN relay-only. TLS, TURN temporaneo, backup, gestione abusi e revisione di sicurezza sono prerequisiti di lancio. Le chat testuali sono persistenti; le voci non lo sono.

## Controlli V2

Acquisti: catalogo e prezzi server-side, transazione atomica, saldo SQL non negativo, idempotenza per utente/requestId, vincolo stanza. Premio legato a distanza accumulata dalla simulazione autorevole. Home: proprietà, amicizia, privacy, inviti temporanei, blocco bidirezionale e verifica layout/inventario. DM limitati a 500 caratteri, rate minimo 800 ms, history solo fra richiedente e destinatario. Eventi: max 3 futuri per account, durata max 4 h, luoghi consentiti.

La UI inserisce testo utenti con textContent. Il service worker non intercetta /api o /ws. Segnalazioni salvate; non è ancora presente un pannello operativo con ban e ruoli. Prima di un'apertura pubblica occorrono collaudo, moderazione, gestione privacy/cancellazione, backup e monitoraggio.
