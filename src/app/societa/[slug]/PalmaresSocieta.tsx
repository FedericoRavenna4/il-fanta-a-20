"use client";

import Image from "next/image";
import { useState } from "react";

export type PalmaresCard = {
  label: string;
  image: string;
  value: number;
};

function trofeoAura(image: string) {
  if (image.includes("scudetto-b") || image.includes("conference")) return "group-hover:bg-emerald-300/30";
  if (image.includes("scudetto-c")) return "group-hover:bg-violet-300/35";
  if (image.includes("champions")) return "group-hover:bg-sky-300/35";
  if (image.includes("europa")) return "group-hover:bg-orange-300/35";
  return "group-hover:bg-amber-300/35";
}

export default function PalmaresSocieta({ items }: { items: PalmaresCard[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="grid grid-cols-3 gap-x-1 gap-y-2 sm:gap-y-4">
        {items.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className={`${index >= 3 && !expanded ? "hidden sm:flex" : "flex"} group relative h-24 min-w-0 items-center justify-center transition duration-300 hover:-translate-y-1 sm:h-32`}
          >
            <div className={`pointer-events-none absolute top-5 h-16 w-16 bg-transparent blur-3xl transition ${trofeoAura(item.image)} sm:top-7 sm:h-20 sm:w-20`} />
            <Image
              unoptimized
              src={item.image}
              alt={`Trofeo ${item.label}`}
              width={128}
              height={128}
              className="relative max-h-[80px] max-w-[80px] object-contain drop-shadow-[0_14px_20px_rgba(15,23,42,0.3)] transition duration-300 group-hover:scale-105 sm:max-h-[108px] sm:max-w-[108px]"
            />
            <p className="absolute right-0 top-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-black text-blue-950 shadow-md sm:px-2.5 sm:py-1 sm:text-xs">
              x{item.value}
            </p>
          </div>
        ))}
      </div>

      {items.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-3 min-h-11 w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-blue-950 shadow-sm sm:hidden"
        >
          {expanded ? "Mostra meno" : "Visualizza tutti"}
        </button>
      )}
    </>
  );
}
