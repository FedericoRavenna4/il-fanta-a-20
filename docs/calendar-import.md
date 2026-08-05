# Import calendario Leghe Fantacalcio 2026/27

## Struttura verificata del file di prova

Il file `Calendario_prova.xlsx` del 5 agosto 2026 contiene un solo foglio, `Calendario`, con intervallo utilizzato `A1:K231`.

- `A1:K1`: titolo `Calendario prova` (celle unite).
- `A2:K2`: URL della lega (celle unite).
- Le 38 giornate sono disposte a coppie in 19 blocchi verticali.
- Ogni blocco occupa 12 righe: una riga d'intestazione e 11 righe partita.
- Le giornate dispari usano `A:E`; le giornate pari usano `G:K`; `F` è sempre un separatore vuoto.
- Blocco sinistro: `A` squadra casa, `B` fantapunti casa, `C` fantapunti trasferta, `D` squadra ospite, `E` risultato in gol.
- Blocco destro: `G` squadra casa, `H` fantapunti casa, `I` fantapunti trasferta, `J` squadra ospite, `K` risultato in gol.
- La riga d'intestazione contiene il numero della giornata di lega in `A` o `G` e l'eventuale giornata Serie A in `C` o `I`.
- Le intestazioni ricorrono alle righe 4, 16, 28, ..., 220. Non sono presenti intestazioni di colonna testuali separate.

Nel file di prova tutte le 38 giornate hanno giornata Serie A valorizzata con lo stesso numero della giornata di lega. Tutte le partite sono future: i due fantapunteggi sono il valore numerico `0` e il risultato è il testo `-`. Il parser tratta questa combinazione come segnaposto e produce campi fantapunti/gol `null`, con stato `programmata`; non produce falsi risultati `0-0`.

Anomalia verificata: ognuna delle 38 giornate contiene 11 righe, ma una riga ha una squadra mancante. Restano quindi 10 partite complete per giornata (380 totali) e 38 righe incomplete. Il parser non inventa la squadra mancante, esclude la riga dalla struttura normalizzata e segnala sia la riga sia la giornata incompleta rispetto alle 11 partite esportate.

## Comandi locali

```text
npm run test:calendar-import -- C:\percorso\Calendario_prova.xlsx
npm run test:calendar-parser
```

Entrambi i comandi sono locali e non inizializzano un client Supabase. La funzione `buildUpsertPayload` genera soltanto oggetti pronti per un futuro upsert e blocca dati ambigui, duplicati, società irrisolte o righe incomplete.

La futura chiave logica è `(edizione_competizione_id, giornata_lega, societa_casa_id, societa_trasferta_id)`. `classifyUpsertChanges` divide un confronto locale in `insert`, `update` e `unchanged`; non genera mai cancellazioni.

## Formato Europa League

`Calendario_Europa-League.xlsx` contiene il foglio `Calendario`, intervallo `A1:M27`. Le giornate sono ancora affiancate, ma i blocchi sono `A:F` e `H:M`: la prima colonna contiene il raggruppamento, poi squadra casa, fantapunti casa, fantapunti ospite, squadra ospite e risultato. La giornata Serie A è distinta dalla giornata di lega (`1/21`, `2/23`, ..., `9/35`).

Il file dichiara tre fasi: `Fase a Gironi`, `Semifinali` e `Finale`. Nella fase a gironi sono presenti i gironi `A` e `B`; semifinali e finale non espongono un girone. Le righe che iniziano esattamente con `Riposa ` sono eventi di riposo validi: non generano partite e non sono righe incomplete.

Un raggruppamento alfabetico di una sola lettera viene esposto anche come `girone`. Qualsiasi altro identificatore viene conservato in `raggruppamento` senza attribuirgli automaticamente il significato di girone. In particolare il valore `44` non è presente tra le celle visibili del file di prova analizzato e, se incontrato, resta un identificatore non interpretato: il solo file non permette di determinarne il significato.

## Tracciamento delle importazioni future

Ogni operazione dell'area admin dovrà essere rappresentata da un record in `public.importazioni`. Il ciclo previsto è:

1. caricamento del file sul backend;
2. creazione del record con stato `anteprima`, metadati del file e relativo hash;
3. parsing locale/server-side;
4. validazione e registrazione di errori e warning;
5. visualizzazione dell'anteprima senza scritture nei dati sportivi;
6. conferma esplicita dell'admin;
7. upsert senza cancellazioni automatiche;
8. collegamento di partite e riposi tramite `import_batch_id`;
9. chiusura atomica del record con stato, data, conteggi e diagnostica finali;
10. conservazione del record per garantire la tracciabilità.

Un hash non è un vincolo di unicità: lo stesso file può essere analizzato più volte in anteprima. Gli errori bloccanti impediscono la pubblicazione; i warning possono essere accettati esplicitamente dall'admin e producono lo stato `pubblicata_con_warning`. Nessuna anteprima viene pubblicata automaticamente.

La struttura consigliata di `riepilogo`, non imposta tramite vincoli SQL rigidi, è:

```json
{
  "giornate_trovate": 38,
  "partite_trovate": 380,
  "riposi_trovati": 0,
  "societa_riconosciute": 20,
  "societa_non_riconosciute": [],
  "duplicati": [],
  "righe_incomplete": [],
  "fasi": [],
  "gironi": []
}
```

Gli elementi di `errori` e `warning` condividono la forma `{ "codice": "SOCIETA_NON_RICONOSCIUTA", "messaggio": "...", "riga": 15, "valore": "..." }`.

La chiusura deve avvenire dal backend in una singola transazione o singola istruzione `update public.importazioni`, valorizzando insieme `stato`, `completata_il`, tutti i conteggi, `riepilogo`, `errori` e `warning`. Non viene introdotta una funzione `SECURITY DEFINER`: finché non esisterà il sistema di ruoli admin, la tabella non ha policy client e resta accessibile soltanto dal backend privilegiato. La service role non deve mai essere esposta al browser.
