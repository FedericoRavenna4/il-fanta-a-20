import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { getPalmares } from "@/lib/palmares";
import { getRanking } from "@/lib/ranking";
import { getSocieta, type Societa } from "@/lib/societa";

const competizioni = [
  {
    nome: "Campionati",
    descrizione: "Cinque leghe, cento società e una piramide costruita su promozioni e retrocessioni.",
    href: "/competizioni#campionati",
    immagini: ["/competizioni/serie-a-b-c.png"],
    nota: "Serie A · Serie B · Serie C",
  },
  {
    nome: "Coppa Fanta a 20",
    descrizione: "Il torneo assoluto: tutte le società, un tabellone finale e un solo vincitore.",
    href: "/competizioni#coppa-fanta-a-20",
    immagini: ["/trofei/coppa-fanta-a-20.png?v=20260713-1602"],
    nota: "100 società · 1 vincitore",
  },
  {
    nome: "Coppe europee",
    descrizione: "Champions, Europa e Conference League arricchiscono il girone di ritorno con tre trofei da conquistare.",
    href: "/competizioni#coppe-europee",
    immagini: ["/competizioni/champions-europa-conference.png"],
    nota: "Coppe interne",
  },
  {
    nome: "Lo Scatto Promozione",
    descrizione: "La corsa della Serie C ispirata alla Formula 1 che assegna l’ultima promozione.",
    href: "/competizioni#scatto-promozione",
    immagini: ["/scatto-promozione/background.png"],
    nota: "La corsa finale",
  },
];

function TeamLogo({ team, size = 88 }: { team: Societa; size?: number }) {
  return (
    <Image
      src={team.logo}
      alt={`Stemma ${team.nome}`}
      width={size}
      height={size}
      className="max-h-full max-w-full object-contain drop-shadow-[0_10px_18px_rgba(15,23,42,0.16)] transition duration-500 group-hover:scale-105"
    />
  );
}

function CompetitionArtwork({ nome, immagini }: { nome: string; immagini: string[] }) {
  if (immagini.length === 1) {
    const isComposizione = immagini[0].startsWith("/competizioni/");
    const mobileSize = nome === "Scatto Promozione" ? "max-h-10 max-w-14" : "max-h-12 max-w-20";
    return <Image unoptimized={immagini[0].includes("?v=")} src={immagini[0]} alt="" width={420} height={280} className={`${mobileSize} h-auto w-auto object-contain drop-shadow-[0_10px_15px_rgba(15,23,42,0.16)] transition duration-500 sm:max-w-full sm:drop-shadow-[0_16px_24px_rgba(15,23,42,0.18)] sm:group-hover:scale-[1.03] ${isComposizione ? "sm:max-h-56 sm:rounded-[1.2rem] sm:[mask-image:linear-gradient(to_right,transparent,black_7%,black_93%,transparent)]" : "sm:max-h-48"}`} />;
  }

  const altPrincipale = nome === "Campionati" ? "Logo Serie A" : "Trofeo Champions League";
  const altSecondari = nome === "Campionati" ? ["Logo Serie B", "Logo Serie C"] : ["Trofeo Europa League", "Trofeo Conference League"];

  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <Image src={immagini[0]} alt={altPrincipale} width={140} height={140} className="relative z-10 max-h-28 max-w-32 object-contain drop-shadow-[0_16px_22px_rgba(15,23,42,0.22)] transition duration-500 group-hover:-translate-y-1 group-hover:scale-105" />
      <div className="mt-3 flex items-center justify-center gap-6 border-t border-white/10 pt-3">
        {immagini.slice(1).map((immagine, index) => (
          <Image key={immagine} src={immagine} alt={altSecondari[index]} width={92} height={92} className="max-h-18 max-w-20 object-contain opacity-95 drop-shadow-[0_10px_14px_rgba(15,23,42,0.16)] transition duration-500 group-hover:scale-105" />
        ))}
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  text,
  href,
  linkLabel,
}: {
  eyebrow: ReactNode;
  title: string;
  text: string;
  href?: string;
  linkLabel?: string;
}) {
  const isProtagoniste = eyebrow === "Le protagoniste";

  return (
    <div className={`mb-6 flex flex-col gap-3 sm:mb-10 sm:gap-6 lg:flex-row lg:items-end lg:justify-between ${isProtagoniste ? "relative z-20 isolate opacity-100 [filter:none] [mask-image:none]" : ""}`}>
      <div className="max-w-3xl lg:max-w-none">
        <p className={`text-[10px] font-black uppercase tracking-[0.24em] opacity-100 sm:text-xs sm:tracking-[0.3em] ${isProtagoniste ? "text-amber-600 sm:text-amber-500" : "text-amber-500"}`}>{eyebrow}</p>
        <h2 className={`mt-2 text-3xl font-black uppercase tracking-tight opacity-100 sm:mt-3 sm:text-5xl ${isProtagoniste ? "bg-none text-blue-950 [background-clip:border-box] [background-image:none]" : "text-blue-950"}`}>{title}</h2>
        <p className={`mt-2 text-sm font-semibold leading-5 opacity-100 sm:mt-4 sm:text-lg sm:leading-7 ${isProtagoniste ? "text-slate-600 sm:text-slate-500" : "text-slate-500"}`}>{text}</p>
      </div>
      {href && linkLabel && (
        <Link href={href} className="group/link inline-flex w-fit items-center gap-3 text-sm font-black uppercase tracking-[0.14em] text-blue-950">
          {linkLabel}
          <span className="transition-transform group-hover/link:translate-x-1" aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}

export default function Home() {
  const societa = getSocieta();
  const ranking = getRanking();
  const palmares = getPalmares();

  const podioRanking = ranking.slice(0, 3).flatMap((item) => {
    const team = societa.find((societaItem) => societaItem.id === item.squadraId);
    return team ? [{ team, ranking: item }] : [];
  });
  const piuTitolata = [...palmares].sort((a, b) => b.totaleTrofei - a.totaleTrofei)[0];
  const teamPiuTitolato = societa.find((team) => team.id === piuTitolata?.squadraId);
  const societaCampioni = [
    { team: societa.find((item) => item.id === 1), label: "Leader del ranking", tone: "text-sky-300", storia: "Un solo anno per conquistare Campionato, Champions League e Coppa Fanta a 20: il primo Triplete della storia." },
    { team: societa.find((item) => item.id === 2), label: "Campione in carica Serie A", tone: "text-amber-300", storia: "Presente dal giorno zero, nel 2025/26 ha firmato la consacrazione vincendo Campionato e Champions League." },
    { team: societa.find((item) => item.id === 42), label: "Campione in carica Coppa Fanta a 20", tone: "text-emerald-300", storia: "Al debutto nel 2025/26 ha sovvertito ogni pronostico, conquistando il trofeo più prestigioso dell’ecosistema." },
  ].filter((item): item is { team: Societa; label: string; tone: string; storia: string } => Boolean(item.team));
  const societaMarquee = [...societa].sort((a, b) => a.id - b.id);

  return (
    <div className="overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#eef5fb_36%,#f8fafc_100%)]">
      <section className="relative mx-auto max-w-7xl px-4 pb-9 pt-8 sm:px-6 sm:pb-20 sm:pt-16 lg:pb-24 lg:pt-24">
        <div className="pointer-events-none absolute left-1/2 top-0 hidden h-[34rem] w-[50rem] -translate-x-1/2 rounded-full bg-sky-200/35 blur-3xl sm:block" />
        <div className="relative grid grid-cols-[minmax(0,1fr)_76px] items-center gap-x-3 gap-y-4 sm:grid-cols-1 sm:gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="contents sm:block">
            <p className="order-1 col-span-2 text-[10px] font-black uppercase tracking-[0.28em] text-amber-500 sm:text-xs sm:tracking-[0.36em]">Il portale ufficiale</p>
            <h1 className="order-2 mt-0 max-w-4xl text-3xl font-black uppercase leading-[0.96] tracking-[-0.035em] text-blue-950 sm:mt-6 sm:text-6xl sm:leading-[0.94] sm:tracking-[-0.045em] lg:text-[5.25rem] lg:leading-[0.91] lg:tracking-[-0.055em]">
              Non è solo<br />Fantacalcio.<span className="mt-3 block">È <span className="text-blue-700">il Fanta a 20.</span></span>
            </h1>
            <p className="order-4 col-span-2 mt-0 max-w-2xl border-l-2 border-amber-400 pl-3 text-sm font-semibold leading-6 text-slate-600 sm:mt-8 sm:pl-6 sm:text-lg sm:leading-8">
              Venti partecipanti per lega, nessun giocatore doppione: ogni rosa è davvero unica. Nato nel 2023 come un gioco tra amici, oggi è un ecosistema di cinque leghe e cento società, con promozioni, retrocessioni, coppe e una memoria che cresce stagione dopo stagione.
              <span className="mt-2 block text-blue-950 sm:mt-4">Alcuni giocano. Altri cambiano il gioco.</span>
            </p>
          </div>

          <div className="relative order-3 mx-auto flex min-h-0 w-full max-w-lg items-center justify-center sm:min-h-[330px]">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-52 w-20 -translate-x-1/2 -translate-y-1/2 rotate-12 bg-sky-300/30 blur-[48px]" />
            <div className="pointer-events-none absolute left-[24%] top-[26%] hidden h-px w-56 -rotate-12 bg-gradient-to-r from-transparent via-sky-300/70 to-transparent sm:block" />
            <div className="pointer-events-none absolute bottom-[26%] right-[18%] hidden h-px w-48 rotate-12 bg-gradient-to-r from-transparent via-amber-300/60 to-transparent sm:block" />
            <div className="relative z-10">
              <Image src="/logos/logo.png" alt="Logo Il Fanta a 20" width={310} height={310} priority className="h-auto w-16 drop-shadow-[0_18px_24px_rgba(15,23,42,0.22)] sm:w-72 sm:drop-shadow-[0_30px_38px_rgba(15,23,42,0.24)]" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-16 lg:py-20">
        <SectionHeading eyebrow="Le protagoniste" title="Le società" text="Cento identità, cento storie: il cuore del Fanta a 20." />
        <Link href="/societa" aria-label="Esplora tutte le società" className="group relative left-1/2 mb-7 block w-screen -translate-x-1/2 overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] sm:mb-12 sm:py-8">
          <div className="home-club-marquee flex w-max items-center gap-6 pr-6 transition duration-300 group-hover:opacity-35 sm:gap-10 sm:pr-10">
            {[...societaMarquee, ...societaMarquee].map((team, index) => (
              <div key={`${team.id}-${index}`} aria-hidden={index >= societaMarquee.length} className="flex h-14 w-14 shrink-0 items-center justify-center sm:h-20 sm:w-20"><TeamLogo team={team} size={76} /></div>
            ))}
          </div>
          <span className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-950/10 bg-white/90 px-6 py-3 text-xs font-black uppercase tracking-[0.16em] text-blue-950 opacity-0 shadow-xl backdrop-blur transition duration-300 group-hover:opacity-100">Esplora tutte le società</span>
        </Link>
        <div className="mb-6 flex items-center gap-4">
          <h3 className="text-xl font-black uppercase tracking-tight text-blue-950 sm:text-2xl">Società in evidenza</h3>
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <div className="grid gap-3 sm:gap-5 lg:grid-cols-3">
          {societaCampioni.map(({ team, label, tone, storia }) => (
            <Link key={team.id} href={`/societa/${team.slug}`} className="group relative grid h-full grid-rows-[auto_auto_1fr_auto] gap-y-3 overflow-hidden rounded-[2rem] bg-blue-950 p-4 text-white shadow-xl shadow-blue-950/10 transition duration-300 hover:-translate-y-1 hover:shadow-2xl sm:gap-y-4 sm:p-7 lg:grid-rows-[2.25rem_10rem_1fr_auto] lg:gap-y-0">
              <div className="pointer-events-none absolute right-0 top-0 h-52 w-52 bg-sky-400/10 blur-3xl" />
              <p className={`relative self-start text-[10px] font-black uppercase leading-5 tracking-[0.22em] ${tone}`}>{label}</p>
              <div className="relative flex min-w-0 flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
                <div className="min-w-0"><h3 className="break-words text-lg font-black uppercase leading-tight sm:max-w-48 sm:text-2xl">{team.nome}</h3><p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45 sm:mt-3 sm:text-xs">{team.legaAttuale}</p></div>
                <div className="flex h-20 w-20 shrink-0 self-center items-center justify-center p-1 sm:h-32 sm:w-32 sm:p-2"><TeamLogo team={team} size={118} /></div>
              </div>
              <p className="relative border-t border-white/10 pt-3 text-xs font-semibold leading-5 text-white/60 sm:pt-5 sm:text-sm sm:leading-6">{storia}</p>
              <p className="relative pt-3 text-[9px] font-black uppercase tracking-[0.14em] text-white/85 sm:pt-6 sm:text-[10px] sm:tracking-[0.17em]">Visualizza la scheda completa <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">→</span></p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200/80 bg-white/65 py-8 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading eyebrow={<><span className="sm:hidden">Numeri e storia</span><span className="hidden sm:inline">Numeri e storia</span></>} title="Le statistiche" text="Il valore delle società prende forma attraverso ranking, record e trofei conquistati nel tempo." />
          <div className="grid gap-3 sm:gap-5 lg:grid-cols-[1.45fr_0.75fr]">
            <div className="relative flex flex-col overflow-hidden rounded-[2rem] bg-blue-950 p-4 text-white shadow-xl shadow-blue-950/15 sm:p-9">
              <div className="pointer-events-none absolute left-1/3 top-0 h-72 w-72 bg-sky-400/10 blur-[90px]" />
              <p className="relative text-[10px] font-black uppercase tracking-[0.2em] text-sky-300 sm:text-xs sm:tracking-[0.24em]">Il podio del ranking</p>
              <div className="relative mt-3 grid grid-cols-3 items-end gap-1.5 sm:mt-8 sm:gap-3">
                {podioRanking.map(({ team, ranking: rankingItem }, index) => (
                  <Link key={team.id} href={`/societa/${team.slug}`} className={`group flex flex-col items-center rounded-xl border border-white/10 bg-white/[0.04] px-1.5 py-2 text-center transition hover:-translate-y-1 hover:bg-white/[0.08] sm:rounded-[1.5rem] sm:p-5 ${index === 0 ? "pb-3 sm:min-h-64 sm:justify-center" : "sm:min-h-56 sm:justify-center"}`}>
                    <div className={`${index === 0 ? "h-12 w-12 sm:h-28 sm:w-28" : "h-10 w-10 sm:h-24 sm:w-24"} flex items-center justify-center p-0.5 sm:p-1`}><TeamLogo team={team} size={index === 0 ? 105 : 90} /></div>
                    <p className="mt-1 text-[8px] font-black uppercase tracking-[0.1em] text-white/45 sm:mt-4 sm:text-[10px] sm:tracking-[0.18em]">{rankingItem.posizione}° posto</p>
                    <h3 className="mt-1 line-clamp-2 text-[10px] font-black uppercase leading-tight sm:mt-2 sm:text-sm">{team.nome}</h3>
                    <p className="mt-1 text-[9px] font-bold text-sky-300 sm:mt-2 sm:text-xs">{rankingItem.puntiRanking.toLocaleString("it-IT")} pt</p>
                  </Link>
                ))}
              </div>
              <Link href="/statistiche#ranking" className="group/ranking relative mt-auto flex items-center justify-between border-t border-white/10 pt-6 text-[10px] font-black uppercase tracking-[0.17em] text-white/80">
                <span>Visualizza il ranking completo</span>
                <span className="transition-transform group-hover/ranking:translate-x-1" aria-hidden="true">→</span>
              </Link>
            </div>
            {teamPiuTitolato && (
              <Link href="/statistiche#hall-of-fame" className="group relative grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,#10264f,#071f45)] p-4 text-white shadow-xl shadow-blue-950/10 transition hover:-translate-y-1 hover:shadow-2xl sm:flex sm:flex-col sm:p-9">
                <div className="pointer-events-none absolute -right-10 top-8 h-44 w-44 bg-amber-300/10 blur-[55px]" />
                <p className="relative col-span-3 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300 sm:text-xs sm:tracking-[0.24em]">Hall of Fame</p>
                <div className="relative flex h-12 w-12 items-center justify-center sm:mt-10 sm:h-28 sm:w-auto"><TeamLogo team={teamPiuTitolato} size={118} /></div>
                <div className="contents sm:relative sm:mt-4 sm:flex sm:w-full sm:items-center sm:justify-between sm:gap-4 sm:border-t sm:border-white/10 sm:pt-5">
                  <div className="min-w-0"><h3 className="line-clamp-2 text-sm font-black uppercase leading-tight sm:text-xl">{teamPiuTitolato.nome}</h3><p className="mt-1 text-[10px] font-semibold leading-4 text-white/50 sm:mt-2 sm:text-sm">La società più titolata della storia.</p></div>
                  <div className="text-right"><p className="text-3xl font-black text-amber-300 sm:text-5xl">{piuTitolata.totaleTrofei}</p><p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/40 sm:text-[9px] sm:tracking-[0.18em]">Trofei</p></div>
                </div>
                <p className="relative col-span-3 mt-1 border-t border-white/10 pt-3 text-[9px] font-black uppercase tracking-[0.14em] text-white/80 sm:mt-auto sm:w-full sm:pt-6 sm:text-[10px] sm:tracking-[0.17em]">Entra nella Hall of Fame <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">→</span></p>
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 max-sm:py-6 sm:px-6 sm:py-16 lg:py-20">
        <div className="mb-6 grid items-center gap-4 max-sm:mb-4 sm:mb-11 sm:gap-8 md:grid-cols-[1fr_290px] lg:grid-cols-[1fr_380px]">
            <div className="max-w-3xl lg:max-w-none">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-500">Il sistema sportivo</p>
              <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-blue-950 sm:mt-3 sm:text-5xl">Le competizioni</h2>
              <p className="mt-3 text-sm font-semibold leading-5 text-slate-500 sm:mt-5 sm:text-lg sm:leading-7">Campionati e coppe: strade diverse per conquistare un posto nella storia.</p>
            </div>
            <div className="hidden h-36 md:block" aria-hidden="true" />
          </div>

        <div className="relative overflow-hidden rounded-[2.5rem] bg-[linear-gradient(145deg,#071f45,#102f64)] p-4 text-white shadow-2xl shadow-blue-950/20 max-sm:rounded-[1.5rem] max-sm:p-3 sm:p-10 lg:p-12">
          <div className="pointer-events-none absolute -right-20 -top-28 h-96 w-96 bg-sky-400/10 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-32 left-1/4 h-80 w-80 bg-amber-300/10 blur-[110px]" />
          <div className="relative grid gap-4 max-sm:gap-2 md:grid-cols-2">
            {competizioni.map((item) => (
              <Link key={item.nome} href={item.href} className="group relative min-h-0 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.055] p-4 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.085] max-sm:rounded-[1.15rem] max-sm:p-3 sm:min-h-80 sm:p-7">
                <div className="grid h-full min-h-0 grid-cols-1 items-stretch gap-3 max-sm:block sm:min-h-64 sm:grid-cols-[1fr_230px] sm:gap-4">
                  <div className="relative z-10 grid h-full grid-rows-[auto_auto_auto_auto] sm:grid-rows-[1.5rem_4.5rem_1fr_auto]">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">{item.nota}</p>
                    <h3 className="pt-2 text-2xl font-black uppercase leading-tight max-sm:pt-1 max-sm:text-lg sm:text-3xl">{item.nome}</h3>
                    <p className="pt-4 text-sm font-semibold leading-6 text-white/50 max-sm:pt-1.5 max-sm:text-xs max-sm:leading-4">{item.descrizione}</p>
                    <p className="pt-6 text-[10px] font-black uppercase tracking-[0.17em] text-white/80 max-sm:pt-3 max-sm:text-[9px]">{item.nome === "Campionati" || item.nome === "Coppe europee" ? "Entra nelle competizioni" : "Entra nella competizione"} <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">→</span></p>
                  </div>
                  <div className={`flex items-center justify-center max-sm:hidden sm:h-full sm:min-h-52 ${item.nome === "Scatto Promozione" ? "h-12" : "h-14"}`}><CompetitionArtwork nome={item.nome} immagini={item.immagini} /></div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 pt-2 sm:px-6 sm:pb-20 sm:pt-4">
        <Link href="/regolamento" className="group relative block overflow-hidden rounded-[2rem] bg-blue-950 px-6 py-9 text-white shadow-2xl shadow-blue-950/20 sm:rounded-[2.25rem] sm:px-12 sm:py-14">
          <div className="absolute right-0 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-9 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl"><p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-300 sm:text-xs sm:tracking-[0.3em]">Le regole del gioco</p><h2 className="mt-2 text-3xl font-black uppercase tracking-tight sm:mt-3 sm:text-5xl">Il regolamento ufficiale</h2><p className="mt-3 text-sm font-semibold leading-5 text-white/65 sm:mt-5 sm:text-lg sm:leading-7">Ogni grande competizione vive di regole all’altezza delle sue ambizioni. Scopri il sistema che governa aste, rose, mercato e tornei e rende ogni scelta decisiva.</p></div>
            <span className="relative inline-flex w-fit shrink-0 items-center overflow-hidden rounded-full border border-white/20 bg-white/10 px-6 py-3 text-xs font-black uppercase tracking-[0.16em] transition duration-300 before:absolute before:inset-0 before:origin-left before:scale-x-0 before:bg-white before:transition-transform before:duration-300 group-hover:before:scale-x-100 group-hover:text-blue-950"><span className="relative">Consulta il regolamento</span></span>
          </div>
        </Link>
      </section>
    </div>
  );
}
