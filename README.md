# Presence App v2 — “Ci siamo?”

App statica per GitHub Pages con Firebase Authentication + Realtime Database.

## Cosa aggiunge la v2

- partecipanti con autenticazione anonima invisibile;
- area docente con email/password Firebase;
- stanza aperta/chiusa;
- roster visibile solo al docente;
- ogni partecipante puo' modificare solo il proprio stato;
- timer pausa sincronizzato tramite Realtime Database;
- all'avvio della pausa tutti vengono marcati `away`;
- contatore rientri in tempo reale;
- reset partecipanti riservato al docente;
- link stanza copiabile e condivisibile.

## 1. Configura Firebase Authentication

Firebase Console -> Authentication -> Sign-in method:

- abilita **Anonymous**;
- abilita **Email/Password**.

Poi vai in Authentication -> Users e crea un utente docente con email e password.

Copia il suo **UID**: servira' nelle Security Rules. L'UID non e' una password e puo' comparire nelle rules.

## 2. Configura `index.html`

Sostituisci il blocco `firebaseConfig` con quello della tua Web App Firebase.

Il `databaseURL` deve essere l'URL esatto del Realtime Database, ad esempio:

`https://nome-progetto-default-rtdb.europe-west1.firebasedatabase.app`

La Firebase Web API key e' pubblica per design: NON mettere nel repository service account key o altre chiavi private.

## 3. Pubblica le Security Rules

Apri `database.rules.json`, sostituisci tutte le occorrenze di:

`INCOLLA_TEACHER_UID`

con l'UID dell'utente docente Firebase.

Poi copia il contenuto in:

Firebase Console -> Realtime Database -> Rules -> Publish

## 4. Deploy su GitHub Pages

Metti `index.html` nella root del repository e fai push.

In GitHub:

Settings -> Pages -> Deploy from a branch -> `main` / root.

## 5. Uso

### Docente

1. apri l'app;
2. scegli **Docente**;
3. accedi con email/password Firebase;
4. inserisci codice stanza (es. `AI2409`);
5. clicca **Apri / crea stanza**;
6. copia il link partecipanti;
7. quando inizia la pausa, scegli i minuti e clicca **Avvia pausa**.

All'avvio della pausa tutti i partecipanti gia' registrati passano automaticamente ad `away`. Al rientro ognuno preme **Sono presente**.

### Partecipante

1. apre il link;
2. inserisce un nickname;
3. entra nella stanza;
4. al rientro preme **Sono presente**.

Nessun account o password e' visibile al partecipante.

## Sicurezza

- Il roster completo e' leggibile solo dal docente autenticato.
- Il partecipante puo' leggere e modificare solo il proprio record.
- Le operazioni amministrative sono consentite solo all'UID docente indicato nelle rules.
- Il codice stanza non e' considerato una credenziale di sicurezza.
- Usa nickname; non usare questa app per presenze ufficiali, dati sanitari o altri dati sensibili.

## Opzionale: App Check

Dopo che Auth + Rules funzionano, puoi aggiungere Firebase App Check per ridurre richieste provenienti da client non autorizzati. Non e' necessario per il primo test.
