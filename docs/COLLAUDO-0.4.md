# Collaudo eseguito — 1 ottobre 2026

Esito: 20 test passati, 0 falliti. Output completo in test-results.txt.

- Due client WebSocket autentici: presenza, movimento autorevole, chat, amici, blocco, segnalazioni, interni e sedute esclusive.
- Account: hashing, permessi, logout, revoca della sessione scaduta su socket aperto.
- SQLite: migrazione ripetibile e persistenza dopo riapertura.
- Input: pointer ID indipendenti per joystick/corsa, cancel/lostcapture, blur e focus chat. Eventi simulati, non prova su schermo fisico.
- Rendering: produzione Canvas con asset veri, due densità di pixel, campionamento di pavimento in cinque zone, limite cache 24 chunk.
- Voce: signaling autorizzato; unit test di annullamento avvio microfono e mute individuale con mock delle API audio.
- Avvio: server in processo distinto, health HTTP 200, arresto e pulizia database isolato.

Correzioni: heartbeat per socket interrotti, verifica scadenza sessioni attive, timeout connessione, ping, antirimbalzo delle interazioni, esclusione login simultanei dal form, chiusura delle risorse vocali in caso di annullamento, mute individuale.

Limiti del collaudo: browser remoto blocca localhost con ERR_BLOCKED_BY_CLIENT; nessuna prova manuale UI completa, microfono reale, APK o misura Android. La suite non sostituisce queste prove. Barche e nuvole rimangono nel fondale statico; seduta semplificata; interni basilari; nessun pannello moderazione/recupero account. Questa release è un MVP locale da collaudare, non una certificazione di gioco finito per il pubblico.
