---
name: telegram-aggiornamenti
description: "Bot Telegram @Napolilife_bot dove mandare in tempo reale gli aggiornamenti del lavoro (con QR e APK), come usarlo"
metadata:
  node_type: memory
  type: reference
  originSessionId: 5324acb2-fe8f-4417-a6b7-3a9788b7db7f
  modified: 2026-10-07T09:53:45.891Z
---

L'utente (richiesta del 2026-10-07) vuole ricevere su Telegram gli aggiornamenti di cosa si fa e cosa manca, in tempo reale, con opzione QR e APK.
Bot: @Napolilife_bot. Il token è in `.env` (TELEGRAM_BOT_TOKEN, non nel repository, non copiarlo in chat o memoria). L'id chat si salva in `data/telegram-chat.json` quando l'utente preme Start sul bot.

**How to apply:** a ogni traguardo (fine di un blocco di lavoro, deploy, bug trovato) inviare un messaggio breve in italiano semplice:
`node --env-file-if-exists=.env scripts/telegram.mjs "testo"`; `--qr` invia il QR di scarico, `--apk` invia il file APK. Se esce "Apri Telegram… premi AVVIA" l'utente non ha ancora premuto Start.

Collegato a [[procedi-senza-chiedere]] e [[humana-3d-online-render]].
