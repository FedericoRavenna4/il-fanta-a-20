"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createImportPreviewAction, deleteImportAction, deletePublishedCalendarAction, deletePublishedRoseAction, inspectCalendarDeletionAction, inspectRoseDeletionAction, publishImportAction } from "./actions";
import type { AdminCatalog, ImportHistoryItem, ImportPreview, ImportType } from "@/lib/admin-import/types";
import { getCompetitionImportConfig } from "@/lib/admin-import/competition-config";

const field = "mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-blue-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200";

export default function ImportazioniClient({ catalog, history }: { catalog: AdminCatalog; history: ImportHistoryItem[] }) {
  const router = useRouter();
  const [historyItems, setHistoryItems] = useState(history);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [message, setMessage] = useState("");
  const [successToast, setSuccessToast] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ item: ImportHistoryItem; matches: number; calculated: number; rests: number; fantabetDependencies: number } | null>(null);
  const [roseDeleteTarget, setRoseDeleteTarget] = useState<{ item: ImportHistoryItem; season: string; players: number } | null>(null);
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [pending, startTransition] = useTransition();
  const [importType, setImportType] = useState<ImportType>("calendario_campionato");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [seasonId, setSeasonId] = useState(catalog.seasons[0]?.id ?? "");
  const [editionCompetitionId, setEditionCompetitionId] = useState("");
  const competitions = useMemo(
    () => catalog.competitions.filter((item) => item.importType === importType && item.seasonId === seasonId),
    [catalog.competitions, importType, seasonId],
  );
  const selectedCompetition = competitions.find((item) => item.edizioneCompetizioneId === editionCompetitionId);
  const selectedCompetitionConfig = getCompetitionImportConfig(selectedCompetition?.code);
  useEffect(() => {
    if (!successToast) return;
    const timeout = window.setTimeout(() => setSuccessToast(""), 4200);
    return () => window.clearTimeout(timeout);
  }, [successToast]);

  function resetCompetitionSelection() {
    setEditionCompetitionId("");
    setPreview(null);
    setMessage("");
  }

  function submitPreview(formData: FormData) {
    setMessage("");
    const file = formData.get("file");
    if (file instanceof File) setSelectedFile(file);
    const season = catalog.seasons.find((item) => item.id === formData.get("seasonId"));
    const competition = catalog.competitions.find((item) => item.edizioneCompetizioneId === formData.get("editionCompetitionId"));
    formData.set("seasonLabel", season?.label ?? "");
    formData.set("competitionLabel", importType === "rose" ? "Rose" : competition?.label ?? "");
    startTransition(async () => {
      const result = await createImportPreviewAction(formData);
      if (result.ok) { setPreview(result.preview); setShowAll(false); }
      else { setPreview(null); setMessage(result.message); }
    });
  }

  function publish() {
    if (!preview || !selectedFile || !window.confirm("Confermi i dati mostrati nell'anteprima?")) return;
    if (!window.confirm("La pubblicazione scriverà i dati nel database. Procedere?")) return;
    const formData = new FormData();
    formData.set("importId", preview.importId);
    formData.set("file", selectedFile);
    startTransition(async () => {
      const result = await publishImportAction(formData);
      if (result.ok) {
        setMessage("");
        setSuccessToast("Importazione avvenuta con successo");
        setPreview(null);
        setSelectedFile(null);
        router.refresh();
      } else setMessage(result.message);
    });
  }

  function requestPublishedDeletion(item: ImportHistoryItem) {
    setMessage("");
    startTransition(async () => {
      const result = await inspectCalendarDeletionAction(item.id);
      if (!result.ok) { setMessage(result.message); return; }
      setDeleteAcknowledged(false);
      setDeleteTarget({ item, matches: result.matches, calculated: result.calculated, rests: result.rests, fantabetDependencies: result.fantabetDependencies });
    });
  }

  function confirmPublishedDeletion() {
    if (!deleteTarget || (deleteTarget.calculated > 0 && !deleteAcknowledged)) return;
    startTransition(async () => {
      const result = await deletePublishedCalendarAction(deleteTarget.item.id, deleteAcknowledged);
      if (!result.ok) { setMessage(result.message); return; }
      setHistoryItems((items) => items.map((item) => item.competition === deleteTarget.item.competition && item.season === deleteTarget.item.season && ["pubblicata", "pubblicata_con_warning"].includes(item.status) ? { ...item, status: "eliminata" } : item));
      setDeleteTarget(null);
      setSuccessToast("Calendario eliminato con successo");
      router.refresh();
    });
  }

  function requestRoseDeletion(item: ImportHistoryItem) {
    setMessage("");
    startTransition(async () => {
      const result = await inspectRoseDeletionAction(item.id);
      if (!result.ok) { setMessage(result.message); return; }
      setRoseDeleteTarget({ item, season: result.season, players: result.players });
    });
  }

  function confirmRoseDeletion() {
    if (!roseDeleteTarget) return;
    startTransition(async () => {
      const result = await deletePublishedRoseAction(roseDeleteTarget.item.id);
      if (!result.ok) { setMessage(result.message); return; }
      setHistoryItems((items) => items.map((item) => item.id === roseDeleteTarget.item.id ? { ...item, status: "eliminata" } : item));
      setRoseDeleteTarget(null);
      setSuccessToast("Fotografia Rose eliminata con successo");
      router.refresh();
    });
  }

  function removeImport(item: ImportHistoryItem) {
    if (!window.confirm("Eliminare questa importazione? Verrà rimosso soltanto il record non pubblicato.")) return;
    startTransition(async () => {
      const result = await deleteImportAction(item.id);
      setMessage(result.message);
      if (result.ok) { setHistoryItems((items) => items.filter((entry) => entry.id !== item.id)); router.refresh(); }
    });
  }

  return <div className="space-y-7">
    <form action={submitPreview} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-black text-blue-950">Stagione<select name="seasonId" required className={field} value={seasonId} onChange={(event) => { setSeasonId(event.target.value); resetCompetitionSelection(); }}>{catalog.seasons.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label className="text-sm font-black text-blue-950">Tipo importazione<select name="importType" className={field} value={importType} onChange={(event) => { setImportType(event.target.value as ImportType); resetCompetitionSelection(); }}><option value="calendario_campionato">Calendario campionato</option><option value="calendario_coppa">Coppe</option><option value="rose">Rose</option><option disabled>Mercato — non ancora disponibile</option></select></label>
        {importType !== "rose" && <label className="text-sm font-black text-blue-950">Competizione<select name="editionCompetitionId" required className={field} value={editionCompetitionId} onChange={(event) => setEditionCompetitionId(event.target.value)}><option value="" disabled>Seleziona una competizione</option>{competitions.map((item) => <option key={item.edizioneCompetizioneId} value={item.edizioneCompetizioneId}>{item.label}</option>)}</select></label>}
        <label className="text-sm font-black text-blue-950">File {importType === "rose" ? "CSV o Excel" : "Excel"}<input name="file" type="file" required onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} accept={importType === "rose" ? ".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" : ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"} className={`${field} py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-100 file:px-3 file:py-1.5 file:font-black file:text-sky-800`} /></label>
      </div>
      {selectedCompetitionConfig?.expectedStructure && <p className="mt-3 text-xs font-bold text-slate-500">{selectedCompetitionConfig.expectedStructure.label}</p>}
      <button disabled={pending} className="mt-5 min-h-12 w-full rounded-xl bg-blue-950 px-5 py-3 text-sm font-black text-white transition hover:bg-sky-700 disabled:opacity-50 sm:w-auto">{pending ? "Elaborazione…" : "Crea anteprima"}</button>
    </form>
    {successToast && <div role="status" aria-live="polite" className="fixed bottom-4 left-1/2 z-[70] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-emerald-200 bg-emerald-950 px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-emerald-50 shadow-[0_18px_45px_rgba(6,78,59,.28)] motion-safe:animate-[admin-import-toast-in_.28s_ease-out] sm:bottom-6">{successToast}</div>}
    {message && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">{message}</div>}
    {preview && <section className="space-y-4" aria-labelledby="preview-title">
      <div><p className="section-eyebrow">Controllo</p><h2 id="preview-title" className="mt-1 text-2xl font-black uppercase text-blue-950">{preview.importType === "rose" ? "Rose" : "Anteprima"}</h2></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="font-black text-blue-950">{preview.fileName}</p><p className="mt-1 break-all text-xs font-bold text-slate-500">SHA-256 {preview.fileHash.slice(0, 16)}… · {preview.seasonLabel} · {preview.competitionLabel}</p></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{Object.entries(preview.importType === "rose" ? { Società: preview.summary.societaRiconosciute, Calciatori: preview.summary.calciatori, Valide: preview.summary.calciatori, Aggiunti: preview.summary.insert, Aggiornati: preview.summary.update, Trasferiti: preview.summary.trasferimenti, Rimossi: preview.summary.rimossi, Warning: preview.summary.warning, Errori: preview.summary.error } : { Giornate: preview.summary.giornate, Partite: preview.summary.partite, Riposi: preview.summary.riposi, Riconosciute: preview.summary.societaRiconosciute, "Non riconosciute": preview.summary.societaNonRiconosciute.length, Inserimenti: preview.summary.insert, Aggiornamenti: preview.summary.update, Invariate: preview.summary.unchanged, Warning: preview.summary.warning, Errori: preview.summary.error }).map(([label,value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xl font-black text-blue-950">{value}</p></div>)}</div>
      {preview.importType === "rose" && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-950">Questa importazione aggiornerà le Rose della stagione selezionata in base al file caricato.</div>}
      {preview.competitionCode === "coppa-fanta-20" && preview.publishEnabled && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black uppercase text-emerald-800">Coppa Fanta a 20 · pronto per l’importazione</div>}
      {preview.summary.existing > 0 && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-black uppercase">Attenzione</p><p className="mt-2 font-bold">Esiste già un calendario per {preview.competitionLabel}. La pubblicazione sincronizzerà il calendario esistente con il nuovo file.</p><ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-bold"><li>Le partite corrispondenti verranno aggiornate.</li><li>I risultati già calcolati verranno preservati.</li><li>{preview.summary.replace} partite future modificate verranno sostituite.</li><li>Non verranno creati duplicati.</li></ul></div>}
      {preview.errors.length > 0 && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4"><p className="font-black text-rose-900">Errori bloccanti</p>{preview.errors.map((issue,index) => <p key={`${issue.codice}-${index}`} className="mt-2 text-sm font-bold text-rose-800">{issue.messaggio}{issue.riga ? ` · riga ${issue.riga}` : ""}</p>)}</div>}
      {preview.warnings.length > 0 && <details className="rounded-xl border border-amber-200 bg-amber-50 p-4"><summary className="cursor-pointer font-black text-amber-900">Warning ({preview.warnings.length})</summary>{preview.warnings.map((issue,index) => <p key={`${issue.codice}-${index}`} className="mt-2 text-sm font-bold text-amber-800">{issue.messaggio}</p>)}</details>}
      <div className="space-y-2">{preview.changes.slice(0, showAll ? undefined : 12).map((change,index) => <article key={`${change.entity}-${index}`} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center justify-between gap-3">{change.giornata !== undefined && <p className="text-xs font-black uppercase text-sky-700">Giornata {change.giornata}</p>}<span className="ml-auto rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">{change.kind}</span></div><h3 className="mt-1 break-words text-sm font-black text-blue-950">{change.title}</h3>{change.detail.map((line) => <p key={line} className="mt-0.5 break-words text-xs font-bold text-slate-500">{line}</p>)}</article>)}</div>
      {preview.changes.length > 12 && <button type="button" onClick={() => setShowAll((value) => !value)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-blue-950">{showAll ? "Mostra meno" : `Mostra tutte (${preview.changes.length})`}</button>}
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setPreview(null)} className="min-h-12 rounded-xl border border-slate-300 px-5 font-black text-blue-950">Annulla</button><button type="button" disabled={!preview.publishEnabled || preview.errors.length > 0 || pending} onClick={publish} className="min-h-12 rounded-xl bg-emerald-700 px-5 font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">{preview.importType === "rose" ? "Pubblica Rose" : preview.summary.existing > 0 ? "Sincronizza calendario" : "Pubblica"}</button></div>{!preview.publishEnabled && <p className="mt-2 text-center text-xs font-bold text-slate-500">Correggi gli errori bloccanti prima di pubblicare.</p>}</div>
    </section>}
    <section><p className="section-eyebrow">Audit</p><h2 className="mt-1 text-2xl font-black uppercase text-blue-950">Ultime importazioni</h2><div className="mt-3 space-y-2">{historyItems.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-500">Nessuna importazione registrata.</div> : historyItems.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-black uppercase text-blue-950">{item.competition}</p><p className="mt-1 text-xs font-bold text-slate-500">{item.season} · {item.total} {item.type === "rose" ? "calciatori" : "partite"} · {item.status} · {new Date(item.createdAt).toLocaleDateString("it-IT")}</p><p className="mt-1 truncate text-[11px] font-semibold text-slate-400">{item.fileName}</p></div>{item.type === "rose" && ["pubblicata", "pubblicata_con_warning"].includes(item.status) ? <button type="button" disabled={pending} onClick={() => requestRoseDeletion(item)} className="min-h-10 shrink-0 rounded-lg border border-rose-300 px-3 text-xs font-black text-rose-700 disabled:opacity-40">ELIMINA IMPORT</button> : item.type !== "rose" && ["pubblicata", "pubblicata_con_warning"].includes(item.status) ? <button type="button" disabled={pending} onClick={() => requestPublishedDeletion(item)} className="min-h-10 shrink-0 rounded-lg border border-rose-300 px-3 text-xs font-black text-rose-700 disabled:opacity-40">ELIMINA</button> : ["anteprima", "errore", "annullata"].includes(item.status) ? <button type="button" disabled={pending} onClick={() => removeImport(item)} className="min-h-10 shrink-0 rounded-lg border border-slate-300 px-3 text-xs font-black text-slate-600 disabled:opacity-40">RIMUOVI</button> : null}</div></article>)}</div></section>
    {deleteTarget && <div role="dialog" aria-modal="true" aria-labelledby="delete-import-title" className="fixed inset-0 z-[80] grid place-items-center bg-blue-950/70 p-3"><div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"><h2 id="delete-import-title" className="text-xl font-black uppercase text-blue-950">Elimina importazione</h2><p className="mt-3 text-sm font-bold text-slate-700">Stai per eliminare il calendario {deleteTarget.item.competition} {deleteTarget.item.season}.</p><p className="mt-2 text-sm text-slate-600">Verranno rimossi dal database il calendario corrente e i dati derivati eliminabili associati all’edizione. L’audit dell’importazione verrà conservato come eliminato.</p><div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-900"><p>{deleteTarget.matches} partite totali · {deleteTarget.calculated} già calcolate · {deleteTarget.rests} riposi.</p>{deleteTarget.fantabetDependencies > 0 && <p className="mt-2">Eliminazione bloccata: {deleteTarget.fantabetDependencies} collegamenti FantaBet dipendono da queste partite.</p>}<p className="mt-2">Questa operazione non può essere annullata.</p></div>{deleteTarget.calculated > 0 && <label className="mt-4 flex items-start gap-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={deleteAcknowledged} onChange={(event) => setDeleteAcknowledged(event.target.checked)} className="mt-1 h-4 w-4" />Ho capito che risultati e fantapunteggi verranno eliminati definitivamente.</label>}<div className="mt-5 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setDeleteTarget(null)} className="min-h-12 rounded-xl border border-slate-300 font-black text-blue-950">Annulla</button><button type="button" disabled={pending || deleteTarget.fantabetDependencies > 0 || (deleteTarget.calculated > 0 && !deleteAcknowledged)} onClick={confirmPublishedDeletion} className="min-h-12 rounded-xl bg-rose-800 px-4 font-black text-white disabled:bg-slate-300">Elimina definitivamente</button></div></div></div>}
    {roseDeleteTarget && <div role="dialog" aria-modal="true" aria-labelledby="delete-rose-title" className="fixed inset-0 z-[80] grid place-items-center bg-blue-950/70 p-3"><div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"><h2 id="delete-rose-title" className="text-xl font-black uppercase text-blue-950">Elimina import Rose</h2><p className="mt-3 text-sm font-bold text-slate-700">Stai per rimuovere la fotografia Rose corrente della stagione {roseDeleteTarget.season}.</p><div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-900"><p>{roseDeleteTarget.players} calciatori verranno rimossi dalla sola stagione {roseDeleteTarget.season}.</p><p className="mt-2">Le altre stagioni non verranno toccate. Potrai caricare subito dopo il file corretto.</p><p className="mt-2">Questa operazione non ripristina una fotografia precedente.</p></div><div className="mt-5 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setRoseDeleteTarget(null)} className="min-h-12 rounded-xl border border-slate-300 font-black text-blue-950">Annulla</button><button type="button" disabled={pending} onClick={confirmRoseDeletion} className="min-h-12 rounded-xl bg-rose-800 px-4 font-black text-white disabled:bg-slate-300">Elimina definitivamente</button></div></div></div>}
  </div>;
}
