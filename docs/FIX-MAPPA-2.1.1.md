# Correzioni visibilità 2.1.1

HUD sopra il canvas con livelli CSS espliciti; controlli interattivi e click sul mondo conservati. HUD mostrato al primo snapshot valido. Minimappa disegnata immediatamente al ricevimento del giocatore. Mappa grande aggiornata mentre è aperta. Un errore nel caricamento preferenze non interrompe l’ingresso. Errori iniziali ora visibili con pulsante Riprova. Service worker versione nuova con avviso e pulsante per applicare l’aggiornamento senza cancellare dati/account.

33 test della suite passati, sintassi dei moduli modificati verificata. La segnalazione sul dispositivo dell’utente non è stata riprodotta e il browser remoto blocca localhost: serve ancora il controllo visivo su telefono. Queste sono correzioni di robustezza, non una certificazione del difetto specifico.

Estrarre questa versione e avviarla con npm ci, npm start. Conservare data e .env della propria installazione. Su una PWA già aperta, riaprire il sito e accettare Aggiorna e riapri quando proposto. La mappa e l’HUD sono visibili dopo login. Il file PNG dell’anteprima precedente mostra solo il mondo: non è un’applicazione interattiva e non contiene il livello DOM dell’interfaccia.
