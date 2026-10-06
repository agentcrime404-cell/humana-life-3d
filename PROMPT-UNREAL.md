# Messaggio da incollare a chi lavora su Unreal

Copia tutto il testo qui sotto e incollalo così com'è.

---

Devi ricreare in Unreal Engine il gioco HUMANA life 3D che esiste già in versione web. Finora hai fatto solo la mappa e il personaggio: manca quasi tutto. Non inventare: copia quello che c'è già nel gioco web.

**Dove guardare prima di iniziare**
- Cartella del gioco web: `C:\Users\joker\Desktop\gioco humana\humana-isometrica`
- Leggi per intero `CONTINUA.md`: è il diario di tutto quello che è stato fatto e deciso.
- Mappa e posizioni: `shared/world.js` (Lungomare) e `shared/napoli.js` (Mergellina, presa dalle mappe vere).
- Prezzi, mezzi, vestiti, negozi, barche: `shared/catalog.js`.
- Aspetto 3D di ogni cosa: `client/world/world3d.js`.
- Telefono e le sue app: `client/ui/phone.js` e `client/ui/hud.js`.
- Regole del gioco lato server: cartella `server/`.
- Immagini e modelli già pronti e liberi da usare: `client/assets/world/napoli` (fonti in `LICENZE.md`).
- Per vedere il gioco web com'è: avvia il server 3D e apri `http://localhost:3079/`.

**Lavora a tappe. Finita una tappa avvia il gioco, provala, correggi, poi passa alla successiva senza aspettare che te lo dica. Non fermarti.**

## 1. Mappa
- Due zone: Lungomare e Mergellina, con le stesse strade, piazze, mare, spiaggia con ombrelloni, moli, parco giochi con giostre, Villa Comunale.
- Castel dell'Ovo sull'isolotto e Vesuvio sullo sfondo.
- Viaggio tra le due zone con un bottone.

## 2. Palazzi napoletani
- Facciate con profondità vera: finestre incassate, balconi con ringhiera di ferro, persiane, portoni, cornicioni, negozi con vetrina, tenda e insegna.
- Colori napoletani: rosa salmone, ocra, giallo, bianco.
- Panni stesi, asciugamani sulle ringhiere, gerani sui balconi.
- Palazzi moderni a vetrate: centro commerciale, Moda Market, discoteca, sala slot, barbiere, burger.
- Ville con tetto di tegole e giardino.

## 3. Locali dove si entra
- Bar, pizzeria, bottega, discoteca, sala slot, banca, barbiere, Moda Market, burger.
- Quattro ristoranti, ognuno con colori suoi.
- Centro commerciale su due piani con scala mobile.
- Ville e appartamenti: si comprano o si affittano, si entra in casa propria, si invitano amici.

## 4. Personaggio
- Terza persona, prima persona e vista dall'alto.
- Clic per andare, tenere premuto per correre, trascinare per girare la visuale; su telefono joystick e due dita per girare.
- Scelta del personaggio all'ingresso, ingresso anche da ospite.
- Vestiti, scarpe, cappelli, accessori e capelli comprati si vedono addosso.
- Si siede sulle sedie e ai tavolini. Saluto e ballo.

## 5. Mezzi
- 7 auto, 6 moto, 5 bici, scooter, monopattino, furgone. Nomi generici, nessun marchio vero.
- Concessionarie di auto, moto e bici con i mezzi esposti; noleggio a tempo.
- Salendo in auto si apre la portiera, il personaggio entra e si siede al posto di guida con la testa sotto il tetto. Scendendo esce e si alza.
- Retromarcia, fari di sera, vista da dentro l'abitacolo con volante e cruscotto.
- Passeggeri: un amico può salire in auto con te.
- Autoradio: si sceglie una canzone da YouTube e la sentono anche i passeggeri.
- Il mezzo lasciato resta parcheggiato.

## 6. Barche e autobus
- Noleggio barche dai due moli con giro in mare; a Mergellina il giro arriva sotto il Vesuvio.
- Il personaggio sale dal molo e si siede in barca. Scia dietro la barca.
- Autobus con fermate: si sale e si scende a destinazione.

## 7. Città viva
- Traffico che frena davanti alle persone, passanti che camminano.
- Lampioni, panchine, palme, alberi, aiuole, fontane, statue.
- Paracarri, cassonetti, edicole dei giornali, fioriere, motorini parcheggiati.
- Tombini, caditoie, macchie sull'asfalto, strisce pedonali, cartelli con i nomi delle vie.

## 8. Cose da fare
- Jukebox a pagamento nei bar: si sceglie la musica e la sentono tutti nel locale.
- 5 distributori di bevande.
- Negozi: vestiti, scarpe e borse, orologi e gioielli, accessori, casa e arredo.
- Negozio SIM: si sceglie il proprio numero di telefono.
- Barbiere: taglio, barba, colore dei capelli.
- Sala slot con fiches gratuite ogni giorno (mai soldi veri).
- Lavori per guadagnare monete, eventi a cui partecipare, premi giornalieri, livelli.
- Bancomat: si cambiano gemme in monete.

## 9. Telefono nel gioco, uguale a un iPhone
- Aspetto da iPhone: cornice, isola in alto, ora, tacche del segnale, batteria, griglia di icone, barra in basso con le app fisse, barretta per chiudere.
- Le app si aprono dentro lo schermo del telefono e si resta nel telefono finché non lo si chiude.
- App: Telefono (chiamate vocali tra giocatori con numero e tastierino), Messaggi, Amici, Mappa, Rubrica, YouTube (si incolla un link o si cerca un video e lo si guarda nel telefono), Musica, NPL Bank, Banca, Lavoro, Mobilità (i propri mezzi), Eventi, Casa, Shop, Mondo, Profilo, Impostazioni.
- NPL Bank: accesso con PIN di 4 cifre, saldo, acquisto crediti, acquisti online, elenco movimenti.

## 10. Giorno e notte
- Sole, tramonto, notte con luna e stelle.
- Di sera si accendono lampioni, finestre, vetrine e insegne al neon.

## 11. Multigiocatore
- Più giocatori insieme nella stessa città, nomi sopra la testa.
- Chat scritta, chat vocale, messaggi privati, amici, profilo.
- Account con registrazione e ingresso da ospite.

## 12. Mappa e schermo
- Minimappa in alto e mappa grande a tutto schermo con nomi dei luoghi, icone e destinazione da raggiungere.
- Pannelli leggeri e trasparenti: la città deve occupare lo schermo.

## 13. Grafica e fluidità
- Materiali realistici per asfalto, pietra, intonaco, vetro, metallo, legno.
- Luce mediterranea, ombre, riflessi sui vetri, mare con onde.
- Quattro livelli di grafica: Bassa, Media, Alta, Ultra.
- Deve restare fluido, senza scatti.

**Regole**
- Nessun marchio reale. Pagamenti solo in modalità di prova.
- Non toccare il gioco 2D (porta 3077): lo usano dei bambini.
- A fine di ogni tappa dimmi in parole semplici cosa funziona e cosa no, senza gergo. Se una cosa non l'hai provata, dillo.

**Attenzione al computer**: questo PC ha un processore Celeron con grafica integrata. Una scena vuota di Unreal 5.5 qui girava a meno di 5 immagini al secondo. Usa la qualità minima (niente Lumen, niente Nanite, ombre basse) oppure dimmi subito se serve un PC più potente.
