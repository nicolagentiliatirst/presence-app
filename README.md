# Presence App v2.1 — “Ci siamo?”

Applicazione web minimale per gestire lo stato **Presente / Assente** dei partecipanti durante una lezione o un evento formativo.

È pensata per essere pubblicata gratuitamente su **GitHub Pages** e usa:

- **Firebase Authentication**
  - accesso anonimo per i partecipanti;
  - email/password per il docente;
- **Firebase Realtime Database**
  - aggiornamento degli stati in tempo reale;
  - timer pausa;
  - conteggio presenti / registrati;
- **GitHub Pages**
  - hosting statico dell’app.

---

## 1. Funzionalità principali

### Partecipante

Il partecipante:

- apre il link della stanza;
- inserisce solo un nickname;
- non deve creare alcun account;
- viene autenticato automaticamente tramite Firebase Anonymous Authentication;
- può impostarsi come **Presente** o **Assente**;
- vede un solo pulsante coerente con il proprio stato:
  - se è assente vede **Sono presente**;
  - se è presente vede **Mi assento**;
- se perde la connessione, Firebase può marcarlo automaticamente come **Assente** tramite `onDisconnect`;
- se apre un link con stanza preimpostata (`?room=...`), non vede il pulsante/modalità **Docente**.

### Docente

Il docente:

- accede tramite email/password Firebase;
- crea/apre una stanza;
- vede in tempo reale:
  - numero presenti;
  - numero totale registrati;
  - elenco nickname e stato;
- può avviare una pausa con timer;
- quando la pausa parte, tutti i partecipanti vengono impostati su **Assente**;
- vede progressivamente quanti partecipanti sono rientrati;
- può chiudere la stanza;
- può resettare i partecipanti della stanza.

---

## 2. Struttura del progetto

Il progetto contiene principalmente:

```text
index.html
database.rules.json
README.md
```

`index.html` contiene tutta l’interfaccia e la logica client.

`database.rules.json` contiene le Security Rules per Firebase Realtime Database.

---

# CONFIGURAZIONE

## 3. Crea il progetto Firebase

Vai su:

https://console.firebase.google.com/

Crea un nuovo progetto Firebase.

Non è necessario attivare Firebase Hosting, perché l’app verrà pubblicata su GitHub Pages.

---

## 4. Registra una Web App Firebase

Nel progetto Firebase:

1. apri **Project settings**;
2. vai in **General**;
3. scorri fino a **Your apps**;
4. clicca l’icona **Web `</>`**;
5. assegna un nome all’app;
6. completa la registrazione.

Firebase mostrerà un blocco simile a:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "nome-progetto.firebaseapp.com",
  projectId: "nome-progetto",
  storageBucket: "nome-progetto.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef..."
};
```

Questi valori andranno inseriti in `index.html`.

La `apiKey` di una Web App Firebase **non è una password**: è normalmente visibile nel codice client.  
La sicurezza vera dipende da **Authentication + Security Rules**.

Non pubblicare mai invece:

- file `serviceAccountKey.json`;
- chiavi private;
- password docente hardcoded nel codice;
- credenziali di service account.

---

## 5. Crea il Realtime Database

Nel progetto Firebase:

1. apri **Realtime Database**;
2. clicca **Create database**;
3. scegli la regione;
4. scegli inizialmente **Locked mode**;
5. completa la creazione.

Recupera l’URL del database.

Può avere una forma simile a:

```text
https://nome-progetto-default-rtdb.firebaseio.com
```

oppure:

```text
https://nome-progetto-default-rtdb.europe-west1.firebasedatabase.app
```

Inseriscilo nel campo `databaseURL` del `firebaseConfig`.

---

## 6. Attiva Firebase Authentication

Vai su:

**Authentication → Sign-in method**

Abilita:

### Anonymous

Serve per i partecipanti.

Il partecipante non vedrà nessun login: Firebase assegnerà automaticamente un UID anonimo al browser.

### Email/Password

Serve per il docente.

Abilita il provider **Email/Password**.

---

## 7. Crea l’utente docente

Vai su:

**Authentication → Users**

Crea manualmente un utente docente con:

- email;
- password.

Dopo averlo creato, copia il valore:

```text
User UID
```

Esempio:

```text
Vt7sQfA1xPb3X9abc123...
```

Questo UID servirà nelle Security Rules.

---

## 8. Configura `database.rules.json`

Apri:

```text
database.rules.json
```

Cerca tutte le occorrenze di:

```text
INCOLLA_TEACHER_UID
```

e sostituiscile con il vero UID dell’utente docente.

Esempio:

```json
auth.uid === 'Vt7sQfA1xPb3X9abc123'
```

L’UID docente non è una password e può stare nelle Rules.

Le Rules sono pensate per garantire che:

- i partecipanti possano scrivere solo il proprio record;
- il partecipante non possa modificare lo stato di altri partecipanti;
- il docente possa leggere il roster completo;
- il docente possa amministrare la stanza;
- i partecipanti possano scrivere solo quando la stanza è aperta.

---

## 9. Pubblica le Security Rules

Vai su:

**Firebase → Realtime Database → Rules**

Sostituisci le eventuali regole temporanee pubbliche, ad esempio:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

con il contenuto completo del file:

```text
database.rules.json
```

Poi clicca:

**Publish**

Prima di pubblicare, verifica che non sia rimasta alcuna stringa:

```text
INCOLLA_TEACHER_UID
```

---

## 10. Configura `index.html`

Nel file `index.html` trova:

```js
const firebaseConfig = {
  apiKey: "INCOLLA_API_KEY",
  authDomain: "INCOLLA_AUTH_DOMAIN",
  databaseURL: "INCOLLA_DATABASE_URL",
  projectId: "INCOLLA_PROJECT_ID",
  storageBucket: "INCOLLA_STORAGE_BUCKET",
  messagingSenderId: "INCOLLA_MESSAGING_SENDER_ID",
  appId: "INCOLLA_APP_ID"
};
```

Sostituiscilo con il vero blocco Firebase.

Esempio:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "presence-app.firebaseapp.com",
  databaseURL: "https://presence-app-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "presence-app",
  storageBucket: "presence-app.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

Non inserire nel codice:

- UID docente;
- password docente;
- service account key.

---

# PUBBLICAZIONE SU GITHUB PAGES

## 11. Repository GitHub

Crea un repository, ad esempio:

```text
presence-app
```

Metti almeno:

```text
index.html
database.rules.json
README.md
```

Poi:

```bash
git add .
git commit -m "Deploy presence app"
git push
```

---

## 12. Attiva GitHub Pages

Nel repository:

**Settings → Pages**

Imposta:

```text
Source: Deploy from a branch
Branch: main
Folder: / (root)
```

Salva.

GitHub genererà un URL simile a:

```text
https://USERNAME.github.io/presence-app/
```

---

# UTILIZZO

## 13. Accesso docente

Apri la homepage senza parametri:

```text
https://USERNAME.github.io/presence-app/
```

Seleziona modalità **Docente**.

Accedi con:

- email docente;
- password docente.

Poi crea/apri una stanza, ad esempio:

```text
AI2409
```

---

## 14. Link partecipanti

L’app genera un link simile a:

```text
https://USERNAME.github.io/presence-app/?room=AI2409
```

Quando il partecipante apre questo link:

- la stanza è già preimpostata;
- la modalità docente non viene mostrata;
- deve inserire solo un nickname.

---

## 15. Stato partecipante

All’ingresso, il partecipante viene registrato come:

```text
Assente
```

e vede solo:

```text
Sono presente
```

Dopo aver cliccato:

```text
Sono presente
```

lo stato diventa:

```text
Presente
```

e il pulsante disponibile diventa:

```text
Mi assento
```

Se clicca **Mi assento**, torna allo stato Assente e ricompare solo il pulsante **Sono presente**.

---

## 16. Struttura dati

Il database avrà una struttura simile a:

```text
rooms
  AI2409
    meta
      isOpen: true
      title: "Corso AI"
      breakEndsAt: ...
      createdBy: UID_DOCENTE
      updatedAt: ...

    participants
      UID_PARTECIPANTE_1
        nick: "Radiohead42"
        status: "present"
        updatedAt: ...

      UID_PARTECIPANTE_2
        nick: "HouseMD"
        status: "away"
        updatedAt: ...
```

I partecipanti sono identificati tecnicamente tramite Firebase UID, non tramite nickname.

---

# TIMER E PAUSE

## 17. Avvio pausa

Il docente può impostare una durata e avviare la pausa.

Quando la pausa parte:

1. tutti i partecipanti vengono impostati su `away`;
2. il conteggio torna a:

```text
0 / N
```

3. parte il timer;
4. ogni partecipante, rientrando, clicca **Sono presente**;
5. il docente vede il conteggio aggiornarsi in tempo reale.

Esempio:

```text
0 / 24
7 / 24
18 / 24
24 / 24
```

---

# CONNESSIONE, SESSIONE E TIMEOUT

## 18. Una lezione di 3 ore crea problemi?

No.

Firebase Authentication mantiene la sessione del browser e gestisce automaticamente il rinnovo del token.

Realtime Database mantiene una connessione persistente e prova a riconnettersi automaticamente in caso di perdita temporanea di rete.

Non c’è quindi un normale timeout di pochi minuti che espelle il partecipante.

---

## 19. Cosa succede se il browser perde la connessione?

L’app usa:

```text
onDisconnect()
```

insieme a:

```text
.info/connected
```

Quando Firebase rileva che il client si è disconnesso, il partecipante viene marcato come:

```text
away
```

Alla riconnessione, il listener viene riattivato.

Questo comportamento è intenzionale: per questa app è preferibile avere un partecipante temporaneamente marcato assente piuttosto che mantenerlo erroneamente tra i presenti dopo che ha chiuso il browser o perso la connessione.

---

## 20. Browser in background e sospensione del computer

Possibili eventi:

- Wi-Fi perso;
- PC in sospensione;
- laptop chiuso;
- browser che sospende una scheda;
- rete aziendale che interrompe momentaneamente WebSocket.

Firebase tenta di riconnettersi quando possibile.

Se viene rilevata una disconnessione, il partecipante può risultare Assente e, una volta rientrato, deve semplicemente cliccare nuovamente:

```text
Sono presente
```

---

# SICUREZZA

## 21. Firebase config pubblico

Questo blocco può essere visibile nel repository:

```js
const firebaseConfig = {
  apiKey: "...",
  ...
};
```

Per le Web App Firebase è normale.

La sicurezza dell’app dipende da:

- Firebase Authentication;
- Realtime Database Security Rules.

Non dal fatto che `firebaseConfig` sia nascosto.

---

## 22. GitHub Secret Scanning

GitHub può segnalare la Firebase Web API key come:

```text
Google API Key
```

Nel caso della Firebase Web API key usata nel client, l’alert può essere valutato come **false positive / expected public client configuration**, purché:

- sia effettivamente una chiave web Firebase;
- non sia una service-account key;
- le Security Rules siano configurate correttamente;
- non siano presenti credenziali private nel repository.

---

## 23. Dati da non raccogliere

Questa applicazione è pensata come strumento informale di check-in.

È consigliato usare:

```text
nickname
```

e non:

- nome e cognome;
- matricola;
- email;
- informazioni sanitarie;
- dati sensibili;
- registri ufficiali di presenza.

Lo stato indica semplicemente:

```text
“in questo momento sono rientrato / disponibile”
```

e non costituisce una certificazione ufficiale della presenza al corso.

---

# TEST CONSIGLIATO

## 24. Test prima della lezione

Usa tre browser/sessioni:

### Browser 1

Docente.

### Browser 2

Partecipante A.

### Browser 3 / Incognito

Partecipante B.

Testa questa sequenza:

```text
crea stanza
↓
A entra
↓
B entra
↓
A e B cliccano "Sono presente"
↓
dashboard = 2 / 2
↓
avvia pausa da 1 minuto
↓
dashboard = 0 / 2
↓
A rientra
↓
dashboard = 1 / 2
↓
B rientra
↓
dashboard = 2 / 2
↓
chiudi stanza
```

Verifica che, a stanza chiusa, i partecipanti non possano più modificare il proprio stato.

---

# RISOLUZIONE PROBLEMI

## 25. `PERMISSION_DENIED`

Significa normalmente che le Security Rules stanno bloccando l’operazione.

Controlla:

- Anonymous Authentication attiva;
- Email/Password attiva;
- UID docente corretto nelle Rules;
- Rules pubblicate;
- stanza aperta;
- il partecipante stia scrivendo sul proprio UID.

---

## 26. `Cannot parse Firebase url`

Controlla:

```js
databaseURL
```

Deve essere il vero URL del Realtime Database, ad esempio:

```text
https://nome-progetto-default-rtdb.europe-west1.firebasedatabase.app
```

---

## 27. Login docente non riuscito

Controlla:

- provider Email/Password attivo;
- utente presente in Authentication → Users;
- email corretta;
- password corretta.

---

## 28. Il partecipante non compare nella dashboard

Controlla:

- stesso codice stanza;
- stanza aperta;
- autenticazione anonima riuscita;
- Security Rules corrette;
- console JavaScript del browser;
- connessione Firebase.

---

# VERSIONE

```text
Presence App v2.1
```

Caratteristiche principali introdotte rispetto alla v2:

- modalità Docente nascosta nei link partecipante `?room=...`;
- un solo pulsante Presente/Assente coerente con lo stato;
- gestione più robusta della disconnessione;
- uso di `.info/connected`;
- riattivazione di `onDisconnect` dopo riconnessione.
