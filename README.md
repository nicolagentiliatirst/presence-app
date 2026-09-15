# Ci siamo? — app presenza/assenza in tempo reale

App minimale pensata per un corso online:

- ogni partecipante apre la stessa pagina;
- inserisce **codice stanza + nickname**;
- cambia stato con un click: **Presente / Assente**;
- il docente vede il conteggio e l'elenco aggiornarsi in tempo reale;
- nessun account necessario per i partecipanti.

## Architettura

- **Frontend:** GitHub Pages
- **Sincronizzazione realtime:** Firebase Realtime Database
- **Auth:** nessuna, per la versione demo

## Setup rapido

1. Crea un progetto su Firebase Console.
2. Aggiungi una **Web App**.
3. Crea una **Realtime Database**.
4. Copia la configurazione web Firebase e incollala nel blocco `firebaseConfig` in `index.html`.
5. Per una demo privata/temporanea, imposta regole semplici come queste:

```json
{
  "rules": {
    "rooms": {
      "$room": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

> Queste regole sono volutamente permissive e **non sono adatte a un servizio pubblico permanente**. Per il corso vanno bene solo se usi un codice stanza non ovvio e cancelli/resetti la stanza a fine sessione.

6. Crea un repository GitHub, carica `index.html`, abilita **Settings → Pages → Deploy from branch**.
7. Condividi ai partecipanti un link tipo:

```text
https://TUO-UTENTE.github.io/NOME-REPO/?room=AI2409
```

## Uso in aula

- All'inizio: tutti inseriscono nickname e cliccano **Sono presente**.
- Prima della pausa: cliccano **Mi assento**.
- Al rientro: cliccano **Sono presente**.
- Il docente tiene aperta la dashboard con lo stesso codice stanza.

## Miglioramenti possibili

- modalità docente separata;
- PIN docente;
- timer integrato 15:00;
- QR code della stanza;
- suono/flash al termine pausa;
- storico dei rientri;
- pulsante “ci sono ma ho problemi audio/video”.
