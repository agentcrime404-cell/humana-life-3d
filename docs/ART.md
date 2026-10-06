# Direzione artistica
Reference utente: città isometrica mediterranea vivace, mare blu, facciate ocra/corallo, balconi verdi, insegne luminose, piccoli avatar definiti e UI scura trasparente. Nessuna copia di asset di videogiochi commerciali.

client/assets/buildings.png: atlas trasparente 2×2 generato con imagegen dalla reference: bar ocra con tenda rossa, pizzeria mediterranea, negozio corallo, discoteca viola. Ogni edificio viene ritagliato e posizionato separatamente con footprint, porta e interno. Dettagli di facciata sono parte dello sprite, non singoli oggetti interattivi.
client/assets/avatar.png: atlas trasparente 4×4 generato con imagegen: quattro direzioni diagonali, quattro fotogrammi di camminata, giacca scura, jeans e scarpe chiare. Idle usa il primo frame, corsa aumenta cadenza; accessori separati disegnati dal client.

Gli arredi, la pavimentazione e il fondale sono disegnati proceduralmente. Gli asset generati non sono presentati come CC0 o modelli scaricati da Google. La resa è un primo livello di sviluppo e non coincide con tutti i dettagli della reference; prima del lancio verificare bordi atlas, pose, sovrapposizioni e direzione artistica su dispositivi reali.

## Revisione 0.2 — golfo e piazza
Asset creati con lo strumento imagegen integrato, poi copiati nel progetto:
- client/assets/gulf.png: panorama non percorribile con Vesuvio, costa, Castel dell’Ovo e mare. Il castello è parte del fondale e non è visitabile in questa versione.
- client/assets/props.png: nove arredi separati in atlas trasparente; rettangoli di ritaglio espliciti nel renderer. Gli oggetti hanno entità e collisioni individuali.
- client/assets/paving.png: pietra mediterranea ripetuta e proiettata sulla griglia isometrica, memorizzata nella cache chunk.

Prompt di produzione: panorama del golfo coerente con la reference, senza piazza, personaggi o UI, Vesuvio e costa, Castel dell’Ovo a sinistra, mare nella parte bassa; atlas trasparente 3×3 con palma, lampione, fioriera, tavolo senza sedie, sedia, panchina, scooter, statua e aiuola nello stile illustrato della reference; texture top-down ripetibile di piccole lastre calcaree mediterranee con fughe e usura, senza prospettiva o oggetti.

Composizione modificata: fronte mare orizzontale, bar centrale-destra, pizzeria in basso a sinistra, disco a destra, negozio in primo piano a destra, statua e arredi nella piazza. Nessun falso utente online. Non è una copia pixel-per-pixel: prospettiva degli sprite, sagome degli edifici e proporzioni restano differenti; la UI è quella funzionale del progetto, non l’HUD dipinto della reference.

## Asset 0.3
client/assets/residences.png generato con imagegen integrato: atlas trasparente 2×2 di quattro residenze mediterranee isometriche illustrate: ocra a quattro piani con persiane verdi e panni stesi; corallo con balconi fioriti; avorio con archi e persiane blu; giallo con pergolato. Nessuna persona, testo, strada o UI. Riutilizzato per 12 edifici con altezze e footprint variati.

## Asset aggiunti V2

`client/assets/living.png`: atlante originale generato con il tool imagegen integrato, sei oggetti separati (letto, divano, quadro, fontana, barca, nuvola), trasparenza conservata. Prompt: atlas 3×2 trasparente, oggetti isometrici mediterranei illustrati con contorni definiti, nessun testo/loghi/sfondo, luce da alto sinistra. I crop effettivi sono definiti nel renderer dopo ispezione dell'atlante.

`client/assets/social-poses.png`: atlante 4×4 generato con lo stesso tool, usando avatar.png come riferimento d'identità. Prompt: stesso avatar, quattro fotogrammi per seduta, saluto, applauso e ballo, vista frontale isometrica, fondo trasparente, celle separate. Il renderer usa questi sprite per le azioni sincronizzate. Le pose sociali non sono multidirezionali.

Le icone PWA derivano dal marchio H originale disegnato in Canvas. Nessun asset Google Maps o GTA importato. La mappa è originale, ispirata a Napoli.
