"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getMyAvatarOriginalAction, uploadAvatarAction } from "@/app/account/actions";
import { ACCOUNT_AVATAR_MAX_BYTES, ACCOUNT_AVATAR_MIME_TYPES } from "@/lib/account/avatar";

type Point = { x: number; y: number };

export default function AvatarEditorModal({ avatarUrl, username }: { avatarUrl: string | null; username: string }) {
  const router = useRouter();
  const panelRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLImageElement>(null);
  const zoomInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<Point | null>(null);
  const offsetRef = useRef<Point>({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const frameRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => () => { if (source) URL.revokeObjectURL(source); if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); }, [source]);
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key !== "Tab") return;
      const nodes = [...(panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])];
      if (!nodes.length) return;
      const first = nodes[0]; const last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  });

  function updatePreviewTransform() {
    if (previewRef.current) previewRef.current.style.transform = `translate3d(${offsetRef.current.x}px, ${offsetRef.current.y}px, 0) scale(${zoomRef.current})`;
  }
  function resetCrop() { offsetRef.current = { x: 0, y: 0 }; zoomRef.current = 1; if (zoomInputRef.current) zoomInputRef.current.value = "1"; updatePreviewTransform(); }
  function releaseSource() { if (source) URL.revokeObjectURL(source); setSource(null); }
  function close() { releaseSource(); setOriginalFile(null); setCropMode(false); setOpen(false); setMessage(""); resetCrop(); }

  function chooseFile(file?: File) {
    if (!file) return;
    if (!ACCOUNT_AVATAR_MIME_TYPES.includes(file.type as (typeof ACCOUNT_AVATAR_MIME_TYPES)[number])) return setMessage("Usa un’immagine JPG, PNG o WebP.");
    if (file.size > ACCOUNT_AVATAR_MAX_BYTES) return setMessage("L’immagine non può superare 750 KB.");
    releaseSource(); setMessage(""); resetCrop(); setOriginalFile(file); setSource(URL.createObjectURL(file)); setCropMode(true);
  }

  async function openOriginalCrop() {
    if (!avatarUrl) return setMessage("Per ritagliare di nuovo questo avatar, scegli nuovamente l’immagine.");
    const result = await getMyAvatarOriginalAction();
    if (!result.url) return setMessage(result.message ?? "L'originale non è disponibile per questo avatar. Usa Cambia immagine.");
    const response = await fetch(result.url, { cache: "no-store" });
    if (!response.ok) return setMessage("Non è stato possibile aprire l'immagine originale.");
    releaseSource(); setOriginalFile(null); setSource(URL.createObjectURL(await response.blob())); setMessage(""); resetCrop(); setCropMode(true);
  }

  async function createCroppedFile() {
    if (!source) throw new Error("Scegli prima l’immagine originale.");
    const image = document.createElement("img");
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Immagine non leggibile.")); image.src = source; });
    const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 512;
    const context = canvas.getContext("2d"); if (!context) throw new Error("Ritaglio non disponibile.");
    const crop = Math.min(image.naturalWidth, image.naturalHeight) / zoomRef.current;
    const sx = Math.max(0, Math.min(image.naturalWidth - crop, (image.naturalWidth - crop) / 2 - offsetRef.current.x / 240 * crop));
    const sy = Math.max(0, Math.min(image.naturalHeight - crop, (image.naturalHeight - crop) / 2 - offsetRef.current.y / 240 * crop));
    context.drawImage(image, sx, sy, crop, crop, 0, 0, 512, 512);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.84));
    if (!blob || blob.size > ACCOUNT_AVATAR_MAX_BYTES) throw new Error("Il ritaglio supera 750 KB.");
    return new File([blob], "avatar.webp", { type: "image/webp" });
  }

  function save() { startTransition(async () => {
    try {
      const formData = new FormData(); formData.set("avatar", await createCroppedFile());
      if (originalFile) formData.set("original", originalFile);
      const result = await uploadAvatarAction({ message: "" }, formData);
      if (!result.success) return setMessage(result.message);
      close(); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Ritaglio non disponibile."); }
  }); }

  return <>
    <button type="button" onClick={() => setOpen(true)} className="text-[10px] font-black uppercase tracking-wider text-sky-200 hover:text-white">Immagine del profilo</button>
    {open && <div role="dialog" aria-modal="true" aria-label="Immagine del profilo" className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/65 p-3 backdrop-blur-sm"><section ref={panelRef} tabIndex={-1} className="max-h-[94dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl outline-none"><h2 className="text-lg font-black uppercase text-blue-950">Immagine del profilo</h2>
      {!cropMode ? <div className="mt-5 grid gap-2"><button type="button" onClick={openOriginalCrop} className="min-h-11 rounded-xl bg-blue-950 text-xs font-black uppercase text-white">Ritaglia</button><button type="button" onClick={() => inputRef.current?.click()} className="min-h-11 rounded-xl border border-sky-300 bg-sky-50 text-xs font-black uppercase text-blue-950">Cambia immagine</button><button type="button" onClick={close} className="min-h-11 rounded-xl border border-slate-300 text-xs font-black uppercase text-blue-950">Annulla</button></div> : <>
        <div data-avatar-crop-viewport className="mx-auto mt-5 h-60 w-60 touch-none overflow-hidden rounded-full bg-slate-100 ring-4 ring-sky-200" onPointerDown={(event) => { dragRef.current = { x: event.clientX - offsetRef.current.x, y: event.clientY - offsetRef.current.y }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (!dragRef.current) return; offsetRef.current = { x: event.clientX - dragRef.current.x, y: event.clientY - dragRef.current.y }; if (frameRef.current === null) frameRef.current = requestAnimationFrame(() => { frameRef.current = null; updatePreviewTransform(); }); }} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}><Image ref={previewRef} src={source!} alt={`Anteprima avatar di ${username}`} width={512} height={512} unoptimized draggable={false} className="h-full w-full select-none object-cover will-change-transform" style={{ transform: "translate3d(0, 0, 0) scale(1)" }} /></div>
        <label className="mt-4 block text-xs font-black uppercase text-slate-500">Zoom<input ref={zoomInputRef} aria-label="Zoom avatar" type="range" min="1" max="3" step="0.05" defaultValue="1" onInput={(event) => { zoomRef.current = Number(event.currentTarget.value); if (frameRef.current === null) frameRef.current = requestAnimationFrame(() => { frameRef.current = null; updatePreviewTransform(); }); }} className="mt-2 w-full" /></label><button type="button" onClick={resetCrop} className="mt-2 text-[10px] font-black uppercase text-sky-700">Reset</button><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" disabled={pending} onClick={close} className="min-h-11 rounded-xl border border-slate-300 text-xs font-black uppercase text-blue-950">Annulla</button><button type="button" disabled={pending} onClick={save} className="min-h-11 rounded-xl bg-blue-950 text-xs font-black uppercase text-white disabled:opacity-50">{pending ? "Salvataggio…" : "Salva"}</button></div>
      </>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { chooseFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />{message && <p role="alert" className="mt-3 text-sm font-bold text-rose-700">{message}</p>}
    </section></div>}
  </>;
}
