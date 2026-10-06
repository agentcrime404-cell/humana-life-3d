# Verifica eseguita
`npm test`: 10 test passati, 0 falliti (incluso contenitore test integrazione). Database in memoria, due connessioni ws autentiche. Copre hash/auth/profilo, collisioni/limiti/velocità, presenza/input, richieste amicizia e autorizzazione, chat/report, blocco e signaling, porta/interno/seduta esclusiva, logout/disconnessione. Le fixture server avvicinano gli utenti alle porte; il client non ha teletrasporto.

Aggiunto test di raggiungibilità dei quattro ingressi e blocco del bordo marino; corretta una fioriera davanti alla pizzeria. Verificata la scena generata dal renderer con Canvas Node; PNG incluso.

Non verificati: rendering in browser (localhost bloccato dal browser dell'ambiente), vere chiamate audio, multitouch su Android, autonomia/temperatura/memoria, prestazioni con 32 utenti. L'indicatore FPS è una misura locale della frequenza dei frame, non un benchmark garantito.

Prova manuale: crea due account, muovi contemporaneamente, entra nel bar con entrambi, siediti e prova lo stesso posto dal secondo account, invia chat, aggiungi amico e accetta, blocca/sblocca, prova gli altri locali, cambia zoom/accessorio, trascina joystick tenendo premuta corsa e interrompi con cambio app. Controlla assenza di input bloccati, piedi allineati al terreno, copertura corretta dietro edifici e leggibilità HUD in portrait/landscape. Per voce segui VOICE.md. Misura sul modello di telefono scelto FPS e memoria per 10 minuti e registra dispositivo, risoluzione e temperatura iniziale/finale.
