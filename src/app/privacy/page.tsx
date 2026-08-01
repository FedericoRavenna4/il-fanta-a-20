import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "../components/PageHeader";
import { PRIVACY_CONTACTS } from "@/lib/privacy";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Informativa Privacy",
  description: "Informativa sul trattamento dei dati raccolti attraverso la Lista di attesa del Fanta a 20.",
  path: "/privacy",
});

const sections = [
  {
    title: "1. Titolare del trattamento",
    content: <><p>Il titolare del trattamento è <strong>{PRIVACY_CONTACTS.titolare}</strong>, con sede operativa a {PRIVACY_CONTACTS.sede}.</p><p>Per richieste relative alla privacy puoi scrivere a <PrivacyEmail />.</p></>,
  },
  {
    title: "2. Dati raccolti",
    content: <><p>Attraverso il modulo della Lista di attesa vengono raccolti:</p><PrivacyList items={["nome", "cognome", "nickname Instagram", "presentazione o motivazione facoltativa", "dichiarazione di maggiore età", "data e ora di invio della candidatura"]} /><p>Non viene raccolta la data di nascita completa.</p></>,
  },
  {
    title: "3. Finalità del trattamento",
    content: <><p>I dati vengono utilizzati esclusivamente per:</p><PrivacyList items={["ricevere e valutare le candidature", "contattare i candidati selezionati", "organizzare eventuali ingressi futuri nel Fanta a 20", "prevenire invii duplicati o abusivi"]} /><p>I dati non vengono utilizzati per pubblicità, profilazione o cessione a terzi.</p></>,
  },
  {
    title: "4. Base giuridica",
    content: <p>Il trattamento si basa sul consenso espresso dall’interessato mediante l’accettazione dell’informativa prima dell’invio della candidatura.</p>,
  },
  {
    title: "5. Conferimento dei dati",
    content: <><p>Nome, cognome, nickname Instagram, conferma della maggiore età e accettazione dell’informativa sono necessari per inviare la candidatura.</p><p>La presentazione personale è facoltativa, ma può aiutare gli organizzatori nella valutazione.</p></>,
  },
  {
    title: "6. Destinatari",
    content: <><p>I dati possono essere consultati esclusivamente dagli organizzatori del Fanta a 20 incaricati della selezione.</p><p>Per il funzionamento tecnico del sito possono essere trattati dai fornitori di hosting e database utilizzati dal progetto, nei limiti necessari all’erogazione del servizio.</p></>,
  },
  {
    title: "7. Conservazione",
    content: <><p>I dati vengono conservati per un massimo di {PRIVACY_CONTACTS.conservazioneMesi} mesi dalla candidatura.</p><p>Alla scadenza devono essere cancellati o anonimizzati, salvo richiesta anticipata dell’interessato o necessità documentate compatibili con la finalità originaria.</p></>,
  },
  {
    title: "8. Diritti dell’interessato",
    content: <><p>L’interessato può richiedere:</p><PrivacyList items={["accesso ai propri dati", "rettifica", "cancellazione", "limitazione del trattamento", "revoca del consenso", "opposizione, quando applicabile", "portabilità, quando applicabile"]} /><p>Le richieste possono essere inviate a <PrivacyEmail />. È inoltre possibile proporre reclamo al Garante per la protezione dei dati personali.</p></>,
  },
  {
    title: "9. Sicurezza",
    content: <p>I dati sono conservati tramite servizi tecnici protetti e accessibili soltanto agli organizzatori autorizzati e ai fornitori necessari al funzionamento del sito.</p>,
  },
  {
    title: "10. Aggiornamenti",
    content: <p>L’informativa può essere aggiornata per riflettere cambiamenti normativi, organizzativi o tecnici.</p>,
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-5 sm:py-12 lg:px-6 lg:py-16">
      <PageHeader eyebrow="Tutela dei dati" title="Informativa Privacy" description="Come raccogliamo, utilizziamo e proteggiamo i dati inviati attraverso la Lista di attesa." />
      <div className="grid gap-3 sm:gap-4">
        {sections.map((section) => (
          <section key={section.title} className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-5 shadow-[0_14px_38px_rgba(15,23,42,.06)] sm:rounded-[1.75rem] sm:p-7">
            <h2 className="text-lg font-black uppercase leading-tight tracking-tight text-blue-950 sm:text-2xl">{section.title}</h2>
            <div className="mt-3 space-y-3 text-sm font-semibold leading-6 text-slate-600 sm:text-base sm:leading-7">{section.content}</div>
          </section>
        ))}
      </div>
      <p className="mt-6 text-xs font-black uppercase tracking-[.12em] text-slate-500">Ultimo aggiornamento: {PRIVACY_CONTACTS.ultimoAggiornamento}</p>
    </main>
  );
}

function PrivacyEmail() {
  return <Link href={`mailto:${PRIVACY_CONTACTS.email}`} className="font-black text-blue-800 underline decoration-blue-300 underline-offset-2">{PRIVACY_CONTACTS.email}</Link>;
}

function PrivacyList({ items }: { items: string[] }) {
  return <ul className="ml-5 list-disc space-y-1.5 marker:text-amber-500">{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}
