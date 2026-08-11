# Il Fanta a 20

Sito ufficiale de **Il Fanta a 20**, disponibile su [https://ilfantaa20.it](https://ilfantaa20.it).

## Comandi

```bash
npm run dev
npm run lint
npm run build
npm run start
```

Il progetto utilizza Next.js, TypeScript e Supabase.

## Anagrafica società

Supabase è l'unica fonte autorevole dell'identità corrente delle società a runtime. I consumer applicativi devono usare il catalogo condiviso in `src/lib/societa/catalog.server.ts`.

`data/societa.csv` è uno snapshot legacy conservato esclusivamente per tooling, import, audit e test. Non deve essere usato dai consumer runtime. L'eventuale loader corrispondente è isolato esplicitamente in `src/lib/societa-legacy.ts`.
