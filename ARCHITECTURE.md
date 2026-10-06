# Architettura V2

Client ES modules, Canvas 2D isometrico e DOM per HUD/modal. Il mondo mantiene asset separati e ordinamento per profondità; il panorama del golfo è decorativo, non attraversabile. Fisica condivisa in shared/world.js, dati mappa in shared/district.js, prezzi in shared/catalog.js e validazione avatar in shared/avatar.js.

Node.js HTTP/HTTPS serve client e API; ws gestisce input/stati/signalling. server/game.js è l'autorità per posizione, collisioni, interazioni, sedie e presenza. server/living.js gestisce economia, case, eventi e DM. server/storage.js gestisce stato persistente e salvataggi. SQLite è mantenuto per compatibilità, in un unico processo.

Client: world/renderer.js rendering/chunk/minimappa; player/controls.js input; networking/api.js REST e riconnessione; audio/voice.js WebRTC; audio/ambient.js sintesi; ui/living.js pannelli del mondo persistente; app.js integrazione HUD esistente.

Gli appartamenti sono MAPS dinamiche server-side trasferite solo agli ospiti presenti. Accesso controllato su ingresso, ripristino, cambio privacy e ogni 10 s; gli inviti scadono dopo un'ora. Arredi limitati a 24, verificati contro l'inventario.

Il gioco non usa NPC per simulare presenza. Snapshot e nomi rappresentano utenti realmente connessi. PWA in manifest.webmanifest/sw.js: nessuna API privata in cache. Il wrapper Android futuro può riusare il client web, ma richiederà configurazione permessi e collaudo dedicato.
