---
name: humana-3d-online-render
description: "HUMANA life 3D è online su Render (piano free) da un archivio GitHub privato; cosa si può e non si può fare senza l'utente"
metadata:
  node_type: memory
  type: project
  originSessionId: 17341059-a5ef-43ae-af3d-765269f9fcc8
  modified: 2026-10-06T19:25:15.358Z
---

HUMANA life 3D è online su https://humana-life-3d.onrender.com/ (servizio Render `humana-life-3d`, piano free, workspace dell'utente bob2015.gc@gmail.com; accanto ci sono i suoi progetti kouverte-* e lumix.best: NON toccarli). Codice nell'archivio GitHub `agentcrime404-cell/humana-life-3d` (oggi PUBBLICO: Render lo legge solo se è pubblico; non metterci segreti). Il progetto si chiama ora Napoli life (solo 3D, il 2D è stato archiviato il 2026-10-07: vedi LEGGIMI-PRIMA.md nella cartella del progetto).

**Why:** l'utente voleva provare l'APK 3D da fuori casa. Render legge solo archivi pubblici senza l'app GitHub autorizzata (collegata all'altro account `Jokernpl`, non a questo), quindi con un archivio privato i nuovi deploy non partono finché l'utente non ricollega Render a GitHub (pop-up «Configure account», che solo lui può cliccare).

**How to apply:** per aggiornare online: commit + `git push` (credenziale salvata sul PC funziona) e poi su Render «Manual Deploy → Deploy latest commit» (il clic si può fare nel riquadro del browser). Se l'archivio è privato avvisare l'utente prima di promettere aggiornamenti. Limiti noti: piano free = si addormenta dopo 15 min e account/monete si cancellano a ogni riavvio (nessun disco); servono carta di pagamento (la mette lui) per Starter+disco e un account TURN (metered.ca) per la voce tra reti diverse, incollato da lui in Render → Environment come `ICE_SERVERS_JSON`. Non inserire mai password/carte/chiavi al suo posto e non cambiare la visibilità dell'archivio in pubblico (bloccato dalla sicurezza): vedi [[procedi-senza-chiedere]].
