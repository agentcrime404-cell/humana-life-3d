# Database V2

SQLite locale, Node 24 `node:sqlite`, WAL e foreign keys. Nessun PostgreSQL/Redis introdotto: mantenuta la compatibilità del progetto. DB predefinito `data/humana.sqlite`.

`npm run db:migrate` oppure avvio server applicano le migrazioni idempotenti. Migrazione 1: users, sessions, friendships, blocks, reports, messages. Migrazione 2: player_state, inventory, purchases, homes, home_invites, direct_messages, events, event_members. Versioni registrate in migrations.

`player_state` salva JSON di posizione/settings/progress, saldo intero non negativo, distanza autorizzata e ultimo premio. `purchases` rende requestId univoco per utente; aggiornamento saldo e inventario nella stessa transazione IMMEDIATE. `homes` conserva privacy e layout; proprietà di ciascun oggetto e validità della posizione sono controllate sul server. Nessun prezzo o saldo del client viene usato.

Le posizioni sono salvate ogni circa 5 s, al logout/disconnect e all'arresto ordinato. Transazioni commerciali immediate. Non esiste dipendenza da localStorage per questi dati.

Backup prima di aggiornare: arrestare il server e copiare l'intera cartella data. Per backup a caldo utilizzare il meccanismo di backup SQLite, non copiare solo il file principale mentre WAL è attivo. Non ci sono utenti seed né credenziali hardcoded. I test creano dati isolati temporanei.

Singolo processo autorevole: più processi sullo stesso file non sincronizzano presenza, sedie o stanze. Non usare cluster senza migrare anche l'autorità di gioco.
