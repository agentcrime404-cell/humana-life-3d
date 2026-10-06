# Realtime
WebSocket /ws: primo messaggio auth con token, timeout 5 secondi. Una connessione per utente, massimo 32. Messaggi: input, interact, chat, emote, voice, signal. Risposte: welcome, state, chat, signal, error.

Il server simula il movimento 20 volte al secondo, pubblica snapshot 10 volte al secondo. Input senza aggiornamenti per 300 ms viene azzerato. Chat limitata a stanza e 300 caratteri con intervallo minimo 600 ms. Blocco bidirezionale esclude presenza, chat e signaling. Entrare richiede distanza dalla porta verificata dal server. Le sedie hanno occupazione esclusiva.

Trasporto vocale diretto peer-to-peer WebRTC, signaling solo tra utenti nella stessa stanza, consenzienti e distanti al massimo 15 metri. La ricezione effettiva audio e l'attenuazione sono client-side: un client modificato può ignorare il proprio guadagno. Per controllo più forte serve un media server. Non usare questo MVP per conversazioni sensibili.

## V2

Auto-reconnect fino a otto tentativi (1–15 s). Stessa sessione: nuovo socket sostituisce il vecchio; diversa sessione concorrente respinta. Posizione ripristinata dal DB. Snapshot solo entro 55 metri e nella stessa stanza; case inviano anche roomDefinition ai presenti. Stato animazione SIT/WALK/RUN/WAVE/DANCE/LAUGH/CLAP/IDLE nel pacchetto. Economia, inventario e preferenze non sono informazioni pubbliche del giocatore.

La riconnessione interrompe la voce, da riattivare. Non sono mantenuti peer audio sospesi. Il salvataggio non conserva l'occupazione della sedia dopo disconnect: il posto torna disponibile.
