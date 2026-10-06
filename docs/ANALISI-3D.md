# HUMANA life 3D — analisi (Fase 1) e distanza dalla reference

## Com'è fatto oggi
| Parte | Stato |
|---|---|
| Rendering | HUMANA life: canvas 2D isometrico (`client/world/renderer.js`). HUMANA life 3D: three.js r170 WebGL (`client/world/world3d.js`), pagina `/3d`, aperta solo dal PC. |
| Mappa | Unica, condivisa (`shared/world.js`, `shared/district.js`): metri, edifici con impronta e porta, oggetti, superfici per cella. Il 3D la legge così com'è. |
| Camera | 3D: 2.5D bassa, terza persona, prima persona; in auto dietro, esterna, cofano, abitacolo (tasto C / 🎥), con collisione sui palazzi. |
| Personaggi | 3D: Kenney mini-characters (cartoon, animati). |
| Edifici | 3D: palazzi napoletani generati (intonaco fotografico, persiane, balconi, cornicione, piperno, vetrine, tende, insegne). |
| Strade | Materiali fotografici per cella (asfalto, sanpietrini, granito, marmo, sabbia). |
| Veicoli | Kenney car kit (stile giocattolo). Guida libera con sterzata/accelerazione nel server (`drive()` in `shared/world.js`); traffico su corsie con curve (`shared/lanes.js`, `shared/traffic.js`, oggi solo nel 2D). |
| Collisioni | Server autoritativo: `canStand()` su mappa, edifici, mare, staccionata. |
| Multiplayer | WebSocket (porta 3077): stato 20 Hz, chat, voce di prossimità WebRTC (pieno ≤3 m, zero a 15 m), chiamate, amici, stanze, interni. Invariato. |
| Mobile | three.js con ombre spente e risoluzione ridotta sui telefoni; nessuna misura FPS ancora fatta su telefono reale. |

## Cosa della reference si può ottenere e cosa no
| Elemento della reference | Fattibile con asset legali gratuiti? |
|---|---|
| Cielo, luce calda, mare con riflessi | Sì (fatto) |
| Lungomare, sanpietrini, lampioni in ghisa, tavolini dei bar | Sì (fatto) |
| Palazzi napoletani con balconi e negozi | Sì, generati (fatto; da rifinire: ringhiere, cornici delle finestre in rilievo) |
| Castel dell'Ovo e Vesuvio realistici | Parziale: modellati dal codice, non fotorealistici |
| Palme realistiche | Non trovate CC0 leggere (Poly Haven ha solo alberi da 60+ MB) |
| **Persone realistiche animate** | **Non CC0.** Soluzione: Mixamo (gratis con account Adobe, uso nel gioco consentito) — serve che l'utente crei l'account |
| **Auto e scooter realistici** | **Non CC0** di qualità. Sketchfab ha modelli CC-BY (citando l'autore): serve un account Sketchfab dell'utente |
| Interni dei locali come nella reference | Da costruire (mobili Poly Haven CC0 + muri generati) |
| Qualità identica all'immagine (AAA) | No in un browser su telefono: la reference è un'immagine pittorica di qualità da console |
