import Image from "next/image";
import Link from "next/link";
import SmoothOverflowText from "@/app/admin/verifiche/SmoothOverflowText";
import type { SocietaSeasonSnapshot, TeamMatchSnapshot } from "@/lib/societa/season-snapshot";

const zone = "min-w-0 px-3 py-3 sm:px-4 sm:py-4";

function TeamIdentity({ team, right = false }: { team: TeamMatchSnapshot["match"]["home"]; right?: boolean }) {
  return <Link href={`/societa/${team.slug}`} className={`flex min-w-0 items-center gap-1.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${right ? "flex-row-reverse text-right" : ""}`}>
    <Image src={team.logo} alt="" width={32} height={32} className="h-7 w-7 shrink-0 object-contain sm:h-8 sm:w-8"/>
    <SmoothOverflowText className="min-w-0 flex-1 text-[10px] font-black uppercase text-blue-950 sm:text-[11px]">{team.name}</SmoothOverflowText>
  </Link>;
}

function MatchSummary({ snapshot, future = false }: { snapshot: TeamMatchSnapshot; future?: boolean }) {
  const { match } = snapshot;
  return <div className={zone} data-season-match={future ? "next" : "last"}>
    <p className="mb-2 text-[9px] font-black uppercase tracking-[.15em] text-slate-400">{future ? `Prossima partita · Giornata ${match.matchday}` : `Ultima partita · Giornata ${match.matchday}`}</p>
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
      <TeamIdentity team={match.home}/>
      {future ? <strong className="px-1 text-xs font-black text-sky-700">VS</strong> : <div className="text-center">
        <p className="whitespace-nowrap text-xl font-black tabular-nums leading-none text-blue-950">{match.homeGoals} - {match.awayGoals}</p>
        {match.homeScore !== null && match.awayScore !== null && <p className="mt-1 whitespace-nowrap text-[9px] font-bold tabular-nums text-slate-400">{match.homeScore.toFixed(1)} - {match.awayScore.toFixed(1)}</p>}
      </div>}
      <TeamIdentity team={match.away} right/>
    </div>
  </div>;
}

function FormSummary({ snapshot }: { snapshot: SocietaSeasonSnapshot }) {
  if (!snapshot.form.length) return <div className={zone} data-season-form><p className="text-[9px] font-black uppercase tracking-[.15em] text-slate-400">Andamento</p><p className="mt-1 text-[10px] font-semibold text-slate-500">Calendario non ancora disponibile.</p></div>;
  return <div className={zone} data-season-form>
    <p className="mb-2 text-[9px] font-black uppercase tracking-[.15em] text-slate-400">Andamento</p>
    <div className="grid grid-cols-5 gap-1" data-season-form-grid>
      {snapshot.form.map((result, index) => <div key={`${result.matchday}-${result.opponent.id}-${index}`} className="min-w-0 text-center">
        <span className="mb-1 flex h-3 items-center justify-center text-slate-400" aria-label={result.isHome ? "Casa" : "Trasferta"}>{result.isHome ? <HomeIcon/> : <PlaneIcon/>}</span>
        <Link href={`/societa/${result.opponent.slug}`} aria-label={`Apri la società ${result.opponent.name}`} className={`mx-auto grid h-9 w-9 place-items-center rounded-full border-2 bg-white shadow-sm outline-none transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 min-[390px]:h-10 min-[390px]:w-10 ${result.outcome === "V" ? "border-emerald-500 shadow-emerald-100" : result.outcome === "S" ? "border-rose-500 shadow-rose-100" : result.outcome === "P" ? "border-slate-400 shadow-slate-100" : "border-slate-100 shadow-slate-100"}`}>
          <Image src={result.opponent.logo} alt={`Logo ${result.opponent.name}`} title={result.opponent.name} width={30} height={30} className="h-6 w-6 object-contain min-[390px]:h-7 min-[390px]:w-7"/>
        </Link>
        <span className="mt-1 block whitespace-nowrap text-[9px] font-black tabular-nums text-slate-500">{result.score ?? "VS"}</span>
      </div>)}
    </div>
  </div>;
}

function HomeIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></svg>; }
function PlaneIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M22 2 9 15"/><path d="m22 2-7 20-4-9-9-4Z"/></svg>; }

function StandingSummary({ snapshot }: { snapshot: SocietaSeasonSnapshot }) {
  const content = <><p className="text-[9px] font-black uppercase tracking-[.15em] text-sky-700">Posizione in classifica</p>{snapshot.standing ? <div className="mt-1.5 flex items-end justify-between gap-3"><div className="flex items-end gap-2"><strong className="text-4xl font-black leading-none text-blue-950">{snapshot.standing.position}°</strong><div><span className={`text-[9px] font-black ${snapshot.standing.movement > 0 ? "text-emerald-600" : snapshot.standing.movement < 0 ? "text-rose-600" : "text-slate-400"}`}>{snapshot.standing.movement > 0 ? `↑${snapshot.standing.movement}` : snapshot.standing.movement < 0 ? `↓${Math.abs(snapshot.standing.movement)}` : "—"}</span><p className="text-[10px] font-black uppercase text-slate-500">{snapshot.leagueName}</p></div></div><div className="text-right text-[11px] font-black text-blue-950"><p>{snapshot.standing.points} PT</p><p>{snapshot.standing.fantasyPoints.toFixed(1)} PT TOT</p></div></div> : <p className="mt-2 text-[10px] font-black uppercase leading-4 text-blue-950">LA CLASSIFICA SARÀ DISPONIBILE<br/>AL TERMINE DELLA PRIMA GIORNATA</p>}</>;
  return snapshot.standing
    ? <Link href={snapshot.leagueHref} className={`${zone} block min-h-12 transition hover:bg-sky-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500`} data-season-standing>{content}</Link>
    : <div className={zone} data-season-standing-unavailable>{content}</div>;
}

export default function StagioneCorrenteSocieta({ snapshot }: { snapshot: SocietaSeasonSnapshot }) {
  const hasCompetitionData = snapshot.lastMatch || snapshot.nextMatch || snapshot.standing || snapshot.cups.length;
  return <section aria-labelledby="stagione-corrente-title" className="mt-7 overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 shadow-xl shadow-slate-200/60 sm:mt-10">
    <header className="border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4"><p className="text-[9px] font-black uppercase tracking-[.2em] text-amber-600">Il momento della società</p><h2 id="stagione-corrente-title" className="mt-0.5 text-xl font-black uppercase text-blue-950 sm:text-2xl">Stagione corrente</h2></header>
    {!hasCompetitionData ? <p className="px-4 py-4 text-sm font-semibold text-slate-500">La nuova stagione sta per cominciare.</p> : <div>
      <div className="divide-y divide-slate-100 lg:grid lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        <FormSummary snapshot={snapshot}/>
        {snapshot.lastMatch && <MatchSummary snapshot={snapshot.lastMatch}/>} 
        {snapshot.nextMatch && <MatchSummary snapshot={snapshot.nextMatch} future/>}
      </div>
      <div className={`grid border-t border-slate-100 divide-y divide-slate-100 ${snapshot.cups.length ? "sm:grid-cols-2 sm:divide-x sm:divide-y-0" : ""}`}>
        <StandingSummary snapshot={snapshot}/>
        {snapshot.cups.map((cup) => <Link key={cup.code} href={cup.href} className={`${zone} flex min-w-0 items-end justify-between gap-3 transition hover:bg-amber-50/60`} data-season-cup><div className="min-w-0"><p className="truncate text-[10px] font-black uppercase text-blue-950">{cup.name}</p><p className="mt-1 text-[9px] font-bold uppercase text-amber-800">{cup.phase}</p></div><div className="shrink-0 text-right"><p className="text-2xl font-black leading-none text-blue-950">{cup.position}°</p><p className="mt-1 text-[9px] font-black text-slate-500">{cup.points} PT · {cup.totalPoints.toFixed(1)} PT TOT</p></div></Link>)}
      </div>
    </div>}
  </section>;
}
