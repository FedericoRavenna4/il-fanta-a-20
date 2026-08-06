"use client";

import { useMemo, useState, useTransition } from "react";
import { createImportPreviewAction, publishImportAction } from "./actions";
import type { AdminCatalog, ImportHistoryItem, ImportPreview, ImportType } from "@/lib/admin-import/types";

const field = "mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-blue-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200";

export default function ImportazioniClient({ catalog, history }: { catalog: AdminCatalog; history: ImportHistoryItem[] }) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [message, setMessage] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [pending, startTransition] = useTransition();
  const [importType, setImportType] = useState<ImportType>("calendario_campionato");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [seasonId, setSeasonId] = useState(catalog.seasons[0]?.id ?? "");
  const competitions = useMemo(
    () => catalog.competitions.filter((item) => item.importType === importType && item.seasonId === seasonId),
    [catalog.competitions, importType, seasonId],
  );

  function submitPreview(formData: FormData) {
    setMessage("");
    const file = formData.get("file");
    if (file instanceof File) setSelectedFile(file);
    const season = catalog.seasons.find((item) => item.id === formData.get("seasonId"));
    const competition = catalog.competitions.find((item) => item.editionId === formData.get("editionId"));
    formData.set("seasonLabel", season?.label ?? "");
    formData.set("competitionLabel", competition?.label ?? "");
    formData.set("competitionId", competition?.competitionId ?? "");
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
      setMessage(result.message);
    });
  }

  return <div className="space-y-7">
    <form action={submitPreview} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-black text-blue-950">Stagione<select name="seasonId" required className={field} value={seasonId} onChange={(event) => setSeasonId(event.target.value)}>{catalog.seasons.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label className="text-sm font-black text-blue-950">Tipo importazione<select name="importType" className={field} value={importType} onChange={(event) => setImportType(event.target.value as ImportType)}><option value="calendario_campionato">Calendario campionato</option><option value="calendario_coppa">Calendario coppa</option><option disabled>Rose — non ancora disponibili</option><option disabled>Mercato — non ancora disponibile</option></select></label>
        <label className="text-sm font-black text-blue-950">Competizione<select name="editionId" required className={field} key={`${seasonId}-${importType}`}>{competitions.map((item) => <option key={item.editionId} value={item.editionId}>{item.label}</option>)}</select></label>
        <label className="text-sm font-black text-blue-950">File Excel<input name="file" type="file" required onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className={`${field} py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-100 file:px-3 file:py-1.5 file:font-black file:text-sky-800`} /></label>
      </div>
      <button disabled={pending} className="mt-5 min-h-12 w-full rounded-xl bg-blue-950 px-5 py-3 text-sm font-black text-white transition hover:bg-sky-700 disabled:opacity-50 sm:w-auto">{pending ? "Elaborazione…" : "Crea anteprima"}</button>
    </form>
    {message && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">{message}</div>}
    {preview && <section className="space-y-4" aria-labelledby="preview-title">
      <div><p className="section-eyebrow">Controllo</p><h2 id="preview-title" className="mt-1 text-2xl font-black uppercase text-blue-950">Anteprima</h2></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="font-black text-blue-950">{preview.fileName}</p><p className="mt-1 break-all text-xs font-bold text-slate-500">SHA-256 {preview.fileHash.slice(0, 16)}… · {preview.seasonLabel} · {preview.competitionLabel}</p></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{Object.entries({ Giornate: preview.summary.giornate, Partite: preview.summary.partite, Riposi: preview.summary.riposi, Riconosciute: preview.summary.societaRiconosciute, "Non riconosciute": preview.summary.societaNonRiconosciute.length, Inserimenti: preview.summary.insert, Aggiornamenti: preview.summary.update, Invariate: preview.summary.unchanged, Warning: preview.summary.warning, Errori: preview.summary.error }).map(([label,value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xl font-black text-blue-950">{value}</p></div>)}</div>
      {preview.errors.length > 0 && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4"><p className="font-black text-rose-900">Errori bloccanti</p>{preview.errors.map((issue,index) => <p key={`${issue.codice}-${index}`} className="mt-2 text-sm font-bold text-rose-800">{issue.messaggio}{issue.riga ? ` · riga ${issue.riga}` : ""}</p>)}</div>}
      {preview.warnings.length > 0 && <details className="rounded-xl border border-amber-200 bg-amber-50 p-4"><summary className="cursor-pointer font-black text-amber-900">Warning ({preview.warnings.length})</summary>{preview.warnings.map((issue,index) => <p key={`${issue.codice}-${index}`} className="mt-2 text-sm font-bold text-amber-800">{issue.messaggio}</p>)}</details>}
      <div className="space-y-2">{preview.changes.slice(0, showAll ? undefined : 12).map((change,index) => <article key={`${change.entity}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-black uppercase text-sky-700">Giornata {change.giornata}</p><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">{change.kind}</span></div><h3 className="mt-1 break-words text-sm font-black text-blue-950">{change.title}</h3>{change.detail.map((line) => <p key={line} className="mt-0.5 break-words text-xs font-bold text-slate-500">{line}</p>)}</article>)}</div>
      {preview.changes.length > 12 && <button type="button" onClick={() => setShowAll((value) => !value)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-blue-950">{showAll ? "Mostra meno" : `Mostra tutte (${preview.changes.length})`}</button>}
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><button type="button" disabled={!preview.publishEnabled || preview.errors.length > 0 || pending} onClick={publish} className="min-h-12 w-full rounded-xl bg-emerald-700 px-5 font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">Pubblica</button>{!preview.publishEnabled && <p className="mt-2 text-center text-xs font-bold text-slate-500">Correggi gli errori bloccanti prima di pubblicare.</p>}</div>
    </section>}
    <section><p className="section-eyebrow">Audit</p><h2 className="mt-1 text-2xl font-black uppercase text-blue-950">Ultime importazioni</h2><div className="mt-3 space-y-2">{history.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-500">Nessuna importazione registrata.</div> : history.map((item) => <details key={item.id} className="rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer break-words font-black text-blue-950">{item.fileName} · {item.status}</summary><p className="mt-2 text-xs font-bold text-slate-500">{new Date(item.createdAt).toLocaleString("it-IT")} · {item.type} · {item.competition}</p><p className="mt-1 text-xs font-bold text-slate-500">Inserite {item.inserted} · aggiornate {item.updated} · warning {item.warnings} · errori {item.errors}</p><pre className="mt-3 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-600">{JSON.stringify({ riepilogo: item.summary, warning: item.warningItems, errori: item.errorItems }, null, 2)}</pre></details>)}</div></section>
  </div>;
}
