# Voce di prossimità
Il pulsante Voce richiede esplicitamente il microfono. Nessuna registrazione delle conversazioni. Un AudioContext applica un GainNode a ogni flusso remoto: volume pieno fino a 3 metri, curva quadratica decrescente fino a zero a 15 metri. Indicatore di parlato tramite analisi locale dell'ampiezza; mute microfono e volume nelle impostazioni. Cambio stanza spegne la voce: riattivarla nell'interno.

Sul PC localhost può usare il microfono. Su telefono l'indirizzo HTTP del PC non è un contesto sicuro: usa HTTPS con certificato valido. Configura STUN e, per reti mobili/NAT restrittivi, TURN nel JSON ICE. Il server restituisce questa configurazione solo agli autenticati. In produzione fornire credenziali TURN temporanee.

Prova con due dispositivi e cuffie: abilita voce su entrambi, consenti microfono, avvicinati, parla, allontanati, verifica attenuazione e silenzio oltre 15 metri; prova mute, blocco e cambio stanza. Ripeti su Wi-Fi e rete mobile. Il signaling è coperto da test, il media audio reale non è stato collaudato in questo ambiente.

Riferimenti: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia e https://webrtc.org/getting-started/remote-streams

Revisione 0.4: è possibile silenziare la voce di un singolo giocatore dal suo profilo. L’attivazione ripetuta è protetta e un flusso ottenuto dopo l’annullamento del permesso viene subito fermato. Due unit test verificano questi comportamenti con API audio simulate, non con microfoni reali.

## V2

Il controllo salvabile dei volumi è Mondo → Audio e preferenze (master/music/ambient/voice). Ambient e music riguardano la sintesi originale del gioco, voice moltiplica l'attenuazione della chat. Blocco utente esclude presenza e signalling. Cambiare stanza e riconnettersi spegne il microfono. I test presenti non dimostrano una chiamata audio reale fra telefoni.
