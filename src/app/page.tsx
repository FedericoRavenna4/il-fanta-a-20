import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { getPalmares } from "@/lib/palmares";
import { getRanking } from "@/lib/ranking";
import { getActiveSocietaCatalog } from "@/lib/societa/catalog.server";
import type { CurrentSocieta } from "@/lib/societa/current.server";
import { getCatalogoEmblemi } from "@/lib/emblemi";
import { isEmblemaNascosto } from "@/lib/emblemi-ui";
import HomeEmblemShowcase from "./components/HomeEmblemShowcase";
import { loadHomeLiveData } from "@/lib/home/data.server";
import HomeLiveSections from "./HomeLiveSections";

const HOME_CARD_CTA_CLASS = "inline-flex min-h-11 items-center justify-center rounded-full border border-blue-800 bg-blue-950 px-5 text-center text-[9px] font-black uppercase tracking-[0.13em] text-white shadow-[0_9px_22px_rgba(15,23,42,.18)] transition duration-300 hover:-translate-y-0.5 hover:border-blue-700 hover:bg-blue-800 hover:text-white hover:shadow-[0_12px_28px_rgba(30,64,175,.24)]";

function emblemOrder(id: number) {
  let value = Math.imul(id ^ 0x45d9f3b, 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
}

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

type HomeTeam = {
  id: number;
  nome: string;
  slug: string | null;
  logo: string;
  legaAttuale: string | null;
  badgeTipo: string | null;
};

function toHomeTeam(team: CurrentSocieta): HomeTeam {
  return {
    id: team.id,
    nome: team.nome,
    slug: team.slug,
    logo: team.logo_path ?? "/logo.png",
    legaAttuale: team.girone ? `${team.categoria ?? ""} - Girone ${team.girone.replace(/^girone\s+/i, "")}` : team.categoria,
    badgeTipo: team.badge_tipo,
  };
}

function historicalHomeTeam(id: number, historicalName: string): HomeTeam {
  return { id, nome: historicalName || "Società storica", slug: null, logo: "/logo.png", legaAttuale: null, badgeTipo: null };
}

function homeTeamHref(team: HomeTeam) {
  return team.slug ? `/societa/${team.slug}` : "/societa";
}

function TeamLogo({ team, size = 88 }: { team: HomeTeam; size?: number }) {
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
  onderTitle = false,
}: {
  eyebrow: ReactNode;
  title: string;
  text: string;
  href?: string;
  linkLabel?: string;
  onderTitle?: boolean;
}) {
  const isProtagoniste = eyebrow === "Le protagoniste";

  return (
    <div className={`mb-6 flex flex-col gap-3 sm:mb-10 sm:gap-6 lg:flex-row lg:items-end lg:justify-between ${isProtagoniste ? "relative z-20 isolate opacity-100 [filter:none] [mask-image:none]" : ""}`}>
      <div className="max-w-3xl lg:max-w-none">
        <p className="section-eyebrow opacity-100">{eyebrow}</p>
        <h2 className={`mt-2 text-3xl font-black uppercase tracking-tight opacity-100 sm:mt-3 sm:text-5xl ${onderTitle ? "font-onder-title" : ""} ${isProtagoniste ? "bg-none text-blue-950 [background-clip:border-box] [background-image:none]" : "text-blue-950"}`}>{title}</h2>
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

export default async function Home() {
  const currentSocieta = await getActiveSocietaCatalog();
  const homeLiveData = await loadHomeLiveData(currentSocieta);
  const societa = currentSocieta.map(toHomeTeam);
  const societaById = new Map(societa.map((team) => [team.id, team]));
  const ranking = getRanking();
  const palmares = getPalmares();
  const catalogoEmblemi = getCatalogoEmblemi();

  const podioRanking = ranking.slice(0, 3).flatMap((item) => {
    const team = societaById.get(item.squadraId) ?? historicalHomeTeam(item.squadraId, item.nomeRanking);
    return [{ team, ranking: item }];
  });
  const piuTitolata = [...palmares].sort((a, b) => b.totaleTrofei - a.totaleTrofei)[0];
  const teamPiuTitolato = piuTitolata
    ? societaById.get(piuTitolata.squadraId) ?? historicalHomeTeam(piuTitolata.squadraId, piuTitolata.nomeSquadra)
    : null;
  const societaMarquee = [...societa].sort((a, b) => a.id - b.id);
  const emblemiVetrina = catalogoEmblemi
    .filter((emblema) => !isEmblemaNascosto(emblema))
    .sort((a, b) => emblemOrder(a.id) - emblemOrder(b.id));

  return (
    <div className="home-unified overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#eef5fb_36%,#f8fafc_100%)]">
      <section className="relative mx-auto max-w-7xl px-4 pb-4 pt-8 sm:px-6 sm:pb-10 sm:pt-14 lg:pb-12 lg:pt-20">
        <div className="pointer-events-none absolute left-1/2 top-0 hidden h-[34rem] w-[50rem] -translate-x-1/2 rounded-full bg-sky-200/35 blur-3xl sm:block" />
        <div className="relative grid grid-cols-1 items-center gap-y-4 sm:gap-12">
          <div className="contents sm:block">
            <p className="section-eyebrow order-1 col-span-2">Il portale ufficiale</p>
            <h1 className="font-onder-hero order-2 mt-0 flex w-fit max-w-full flex-col items-start gap-[0.3em] text-[1.05rem] text-blue-950 sm:mt-6 sm:text-[clamp(1.2rem,3.8vw,3rem)]">
              <span className="block whitespace-nowrap">NON E&apos; SOLO</span>
              <span className="block whitespace-nowrap">FANTACALCIO</span>
              <span className="block whitespace-nowrap text-blue-700">E&apos; IL FANTA A 20</span>
            </h1>
          </div>

        </div>

      </section>

      <HomeLiveSections data={homeLiveData} />

      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:pb-10 sm:pt-8 lg:pb-12 lg:pt-9">
        <SectionHeading eyebrow="Le protagoniste" title="Le societa'" text="Cento identità, cento storie: il cuore del Fanta a 20." onderTitle />
        <Link href="/societa" aria-label="Esplora tutte le società" className="group relative left-1/2 mb-5 -mt-2 block w-screen -translate-x-1/2 overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] sm:mb-8 sm:-mt-4 sm:py-7">
          <div className="home-club-marquee flex w-max items-center gap-6 pr-6 transition duration-300 group-hover:opacity-35 sm:gap-10 sm:pr-10">
            {[...societaMarquee, ...societaMarquee].map((team, index) => (
              <div key={`${team.id}-${index}`} aria-hidden={index >= societaMarquee.length} className="flex h-14 w-14 shrink-0 items-center justify-center sm:h-20 sm:w-20"><TeamLogo team={team} size={76} /></div>
            ))}
          </div>
          <span className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-950/10 bg-white/90 px-6 py-3 text-xs font-black uppercase tracking-[0.16em] text-blue-950 opacity-0 shadow-xl backdrop-blur transition duration-300 group-hover:opacity-100">Esplora tutte le società</span>
        </Link>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-12">
        <SectionHeading eyebrow="Mettiti alla prova" title="I giochi" text="Due esperienze, un solo mondo." onderTitle />
        <div className="grid grid-cols-2 gap-3 sm:gap-10">
          {[
            { href: "/fantabet", image: "/images/gioca/fantabet.png", cta: "Entra nel FantaBet" },
            { href: "/gioca", image: "/images/gioca/arcade.png", cta: "Gioca ora" },
          ].map((item) => <Link key={item.href} href={item.href} className="group flex min-w-0 flex-col items-center px-1 py-3 text-center text-blue-950 transition hover:-translate-y-1"><Image src={item.image} alt="" width={520} height={420} className="h-32 w-full object-contain drop-shadow-xl transition duration-500 group-hover:scale-105 sm:h-64" /><p className="mt-3 text-[8px] font-black uppercase tracking-[.1em] text-blue-950 sm:text-[10px] sm:tracking-[.14em]">{item.cta} →</p></Link>)}
        </div>
      </section>

      <div className="flex flex-col">
      <section className="bg-white/45 py-7 sm:py-12 lg:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading eyebrow="Storia e prestigio" title="I record" text="Ranking Storico e Hall of Fame raccontano chi ha lasciato il segno." onderTitle />
          <div className="grid gap-3 sm:gap-5 lg:grid-cols-[1.45fr_0.75fr]">
            <div className="relative flex flex-col overflow-hidden rounded-[2rem] bg-blue-950 p-4 text-white shadow-xl shadow-blue-950/15 sm:p-9">
              <div className="pointer-events-none absolute left-1/3 top-0 h-72 w-72 bg-sky-400/10 blur-[90px]" />
              <p className="relative text-[10px] font-black uppercase tracking-[0.2em] text-sky-300 sm:text-xs sm:tracking-[0.24em]">Il podio del ranking</p>
              <div className="relative mt-3 grid grid-cols-3 items-end gap-1.5 sm:mt-8 sm:gap-3">
                {podioRanking.map(({ team, ranking: rankingItem }, index) => (
                  <Link key={team.id} href={homeTeamHref(team)} className={`group flex flex-col items-center rounded-xl border px-1.5 py-2 text-center transition hover:-translate-y-1 sm:rounded-[1.5rem] sm:p-5 ${index === 0 ? "min-h-36 justify-center border-amber-300/55 bg-[linear-gradient(145deg,rgba(202,146,32,.34),rgba(255,255,255,.06))] shadow-[0_12px_30px_rgba(202,146,32,.14)] sm:min-h-64" : index === 1 ? "min-h-28 justify-center border-slate-300/40 bg-[linear-gradient(145deg,rgba(203,213,225,.2),rgba(255,255,255,.035))] sm:min-h-56" : "min-h-24 justify-center border-orange-400/35 bg-[linear-gradient(145deg,rgba(180,92,35,.2),rgba(255,255,255,.03))] sm:min-h-52"}`}>
                    <div className={`${index === 0 ? "h-12 w-12 sm:h-28 sm:w-28" : "h-10 w-10 sm:h-24 sm:w-24"} flex items-center justify-center p-0.5 sm:p-1`}><TeamLogo team={team} size={index === 0 ? 105 : 90} /></div>
                    <p className="mt-1 text-[8px] font-black uppercase tracking-[0.1em] text-white/45 sm:mt-4 sm:text-[10px] sm:tracking-[0.18em]">{rankingItem.posizione}° posto</p>
                    <h3 className="mt-1 line-clamp-2 text-[10px] font-black uppercase leading-tight sm:mt-2 sm:text-sm">{team.nome}</h3>
                    <p className={`mt-1 text-[9px] font-bold sm:mt-2 sm:text-xs ${index === 0 ? "text-amber-300" : index === 1 ? "text-slate-200" : "text-orange-300"}`}>{rankingItem.puntiRanking.toLocaleString("it-IT")} pt</p>
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

      <section className="w-full pb-6 pt-7 sm:pb-11 sm:pt-12 lg:pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="section-eyebrow">I simboli più prestigiosi</p>
          <h2 className="font-onder-title mt-2 text-3xl uppercase text-blue-950 sm:text-5xl">Gli Emblemi</h2>
        </div>
        <HomeEmblemShowcase emblems={emblemiVetrina} />
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-7 max-sm:py-5 sm:px-6 sm:py-12 lg:pb-14 lg:pt-9">
        <div className="mb-6 grid items-center gap-4 max-sm:mb-4 sm:mb-11 sm:gap-8 md:grid-cols-[1fr_290px] lg:grid-cols-[1fr_380px]">
            <div className="max-w-3xl lg:max-w-none">
              <p className="section-eyebrow">Come funziona</p>
              <h2 className="font-onder-title mt-2 text-3xl uppercase text-blue-950 sm:mt-3 sm:text-5xl">Il regolamento</h2>
              <p className="mt-3 text-sm font-semibold leading-5 text-slate-500 sm:mt-5 sm:text-lg sm:leading-7">Campionati, coppe e Scatto Promozione: entra rapidamente nelle regole del Fanta a 20.</p>
            </div>
            <div className="hidden h-36 md:block" aria-hidden="true" />
          </div>

        <div>
          <div className="grid gap-4 max-sm:gap-2 md:grid-cols-2">
            {competizioni.map((item) => (
              <Link key={item.nome} href={item.href} className="group relative min-h-0 overflow-hidden rounded-[2rem] border border-white/10 bg-blue-950 p-4 text-white shadow-xl shadow-blue-950/10 transition duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-blue-900 max-sm:rounded-[1.15rem] max-sm:p-3 sm:min-h-80 sm:p-7">
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
      </div>

      <section className="mx-auto w-full max-w-7xl px-4 pb-8 pt-2 sm:px-6 sm:pb-14 lg:pb-16">
        <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 sm:gap-4">
          {[
            { title: "Il Regolamento", description: "Porta con te il regolamento ufficiale completo del Fanta a 20.", href: "/documenti/regolamento-f20-3-0.pdf", cta: "Scarica il regolamento" },
            { title: "La Lista di Attesa", description: "Candidati per entrare nella prossima stagione del Fanta a 20.", href: "/lista-attesa", cta: "Entra nella lista di attesa" },
          ].map((item) => (
            <article key={item.href} className="relative flex min-h-[12.5rem] flex-col overflow-hidden rounded-[1.6rem] border border-sky-200/70 bg-[linear-gradient(145deg,rgba(255,255,255,.9),rgba(224,242,254,.76)_58%,rgba(219,234,254,.68))] p-5 text-blue-950 shadow-[0_16px_38px_rgba(30,64,175,.11),inset_0_1px_0_rgba(255,255,255,.9)] sm:min-h-[13rem] sm:p-6">
              <span className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-blue-400/20 blur-3xl" />
              <div className="relative flex h-full flex-col">
                <h2 className="text-xl font-black uppercase leading-tight tracking-tight text-blue-950 sm:text-2xl">{item.title}</h2>
                <p className="mt-3 min-h-10 line-clamp-2 text-sm font-semibold leading-5 text-slate-500">{item.description}</p>
                <Link href={item.href} className={`${HOME_CARD_CTA_CLASS} mt-auto w-full`}>{item.cta}</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-8 pt-1 sm:px-6 sm:pb-14">
        <Link href="/storia" className="group relative block overflow-hidden rounded-[1.8rem] bg-[linear-gradient(135deg,#071f45,#123b6a)] p-6 text-white shadow-xl sm:p-9">
          <span className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl" />
          <p className="relative text-[9px] font-black uppercase tracking-[.22em] text-amber-300">Dal 2023</p>
          <h2 className="font-onder-title relative mt-3 text-3xl uppercase sm:text-5xl">La storia</h2>
          <p className="relative mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/60">Da un gioco tra amici a cinque leghe e cento società. Il racconto del Fanta a 20 continua.</p>
          <p className="relative mt-5 text-[9px] font-black uppercase tracking-[.16em]">Scopri la storia <span className="inline-block transition group-hover:translate-x-1">→</span></p>
        </Link>
      </section>

    </div>
  );
}
