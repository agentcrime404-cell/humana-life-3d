---
name: sincronizza-napoli-life
description: Si lavora nella vecchia cartella ma a fine lavoro va aggiornata la copia Desktop\Napoli life
metadata:
  type: feedback
---

Dal 2026-10-08 l'utente continua a lavorare in questa sessione (cartella `Desktop\gioco humana\humana-isometrica`, bloccata dalla sessione) ma vuole che la cartella `Desktop\Napoli life` sia sempre aggiornata.

**Why:** troppe cartelle sul PC; la cartella unica deve contenere sempre l'ultima versione completa del progetto.
**How to apply:** dopo ogni gruppo di modifiche (commit/deploy) lancia `node scripts/sincronizza.mjs` (robocopy, copia solo i file cambiati) e dillo all'utente. Non cancellare la vecchia cartella mentre la sessione è aperta. Vedi [[procedi-senza-chiedere]].
