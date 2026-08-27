import type { FantaBetBetView, FantaBetLeaderboardRow, FantaBetPageData, FantaBetRoundLeaderboardRow, FantaBetStats, FantaBetTeam } from "./server";

const names = ["IlProfeta", "Marcolino92", "MisterX", "Fantapazzo", "AleBoss", "Tattico_88", "PippoGol", "KingFanta", "Nico10", "BomberLife", "AndreF20", "FantaMago", "Luca_93", "GigiCoach", "PatataFC", "testfanta20", "FantaManager2026", "LeleBet", "Riccardino", "UltraLongUsername_24"];
const totals = [147, 139, 136, 128, 124, 119, 117, 111, 108, 105, 102, 98, 96, 91, 87, 84, 79, 74, 69, 61];

function globalLeaderboard(): FantaBetLeaderboardRow[] {
  return names.map((username, index) => { const bonus = [20, 10, 20, 0, 10][index % 5]; const team = teams[index % teams.length] ?? null; return { profile_id: `demo-${index + 1}`, username, societa_id: index % 4 === 0 ? team?.id ?? null : null, team_id: team?.id ?? null, team_name: team?.name ?? null, team_logo: team?.logo ?? null, punti_pronostici: totals[index] - bonus, punti_bonus_costanza: bonus, punti_tifo: 0, punti_bonus_tifo: 0, punti_totali: totals[index], giornate_giocate: 18 - Math.floor(index / 4), pronostici_corretti: 53 - index, schedine_perfette: index % 5, streak_attuale: index % 13, posizione: index + 1 }; });
}

function dailyLeaderboard(roundNumber: number): FantaBetRoundLeaderboardRow[] {
  const points = [48, 16, 14, 11, 10, 9, 8, 7, 7, 6, 5, 5, 4, 3, 3, 2, 2, 1, 0, 0];
  return names.map((username, index) => { const viewerPerfect = roundNumber === 36 && index === 19; const predictionPoints = viewerPerfect ? 38 : index === 0 ? 38 : points[index]; const bonus = viewerPerfect || index === 0 ? 10 : 0; return { profile_id: `demo-${index + 1}`, username, societa_id: index % 4 === 0 ? index + 1 : null, punti_pronostici: predictionPoints, punti_bonus_costanza: bonus, punti_totali: predictionPoints + bonus, pronostici_corretti: viewerPerfect || index === 0 ? 5 : Math.max(0, 4 - Math.floor(index / 5)), schedina_perfetta: viewerPerfect || index === 0, posizione: index + 1 }; });
}

const teamNames = ["Palermavaimavienimachisono", "Hellas Tronza", "Juventrap", "IRoman", "Fel-Lazio", "I Leccendari", "Napolizia", "Coolinese", "Viva La Pisa", "Analanta"];
const teamLogos = ["/societa/007_Interstellar.png", "/societa/014_Hellastronza.png", "/societa/021_Juventrap.png", "/societa/005_Iroman.png", "/societa/022_Fellazio.png", "/societa/006_Ileccendari.png", "/societa/017_Napolizia.png", "/societa/002_Coolinese.png", "/societa/008_Vivalapisa.png", "/societa/003_Analanta.png"];
const teams: FantaBetTeam[] = teamNames.map((name, index) => ({ id: 900 + index, name, logo: teamLogos[index] ?? "/logos/logo.png", slug: `demo-${index}` }));
const forms = [["V", "V", "V", "S", "P"], ["P", "V", "S", "V", "S"], ["V", "P", "V", "V", "S"], ["S", "V", "P", "S", "V"]] as Array<Array<"V" | "P" | "S">>;

function stats(index: number): FantaBetStats {
  const form = forms[index % forms.length];
  const details = form.map((value, matchday) => ({ matchday: 37 - matchday, opponentId: 990 + matchday, home: matchday % 2 === 0, goalsFor: value === "V" ? 3 - matchday % 2 : value === "P" ? 1 : matchday % 2, goalsAgainst: value === "S" ? 2 + matchday % 2 : value === "P" ? 1 : matchday % 2, fantasyPoints: Number((74.5 - index * 0.7 - matchday * 1.5).toFixed(1)) }));
  return { position: index + 3, points: 56 - index * 2, played: 5, wins: form.filter((v) => v === "V").length, draws: form.filter((v) => v === "P").length, losses: form.filter((v) => v === "S").length, goalsFor: 42 - index, goalsAgainst: 28 + index, fantasyPointsTotal: Number((1280.5 - index * 17.5).toFixed(1)), averageFantasy: Number((72.4 - index * 0.42).toFixed(1)), form, details };
}

function roundBets(roundNumber: number, historical: boolean): FantaBetBetView[] {
  const types = ["1X2", "1X2", "UNDER_OVER_2_5", "RISULTATO_ESATTO", "FANTAPUNTEGGIO_1X2"] as const;
  return types.map((type, index) => ({ id: roundNumber * 100 + index, type, points: type === "RISULTATO_ESATTO" ? 10 : type === "FANTAPUNTEGGIO_1X2" ? 2 : type === "1X2" ? 3 : 1, order: index + 1, home: teams[index * 2], away: teams[index * 2 + 1], homeStats: stats(index * 2), awayStats: stats(index * 2 + 1), homeRoster: [], awayRoster: [], homeLineup: null, awayLineup: null, result: historical ? index === 4 && roundNumber === 37 ? { status: "rinviata", homeGoals: null, awayGoals: null, homeFantasyPoints: null, awayFantasyPoints: null } : { status: "calcolata", homeGoals: [2, 1, 3, 1, 0][index], awayGoals: [1, 1, 0, 1, 2][index], homeFantasyPoints: [72, 68, 74, 69, 66][index], awayFantasyPoints: [67, 68, 65, 69, 71][index] } : { status: "programmata", homeGoals: null, awayGoals: null, homeFantasyPoints: null, awayFantasyPoints: null } }));
}

function pastPredictions(roundNumber: number, bets: FantaBetBetView[]) {
  const choices = roundNumber === 36 ? ["1", "X", "OVER", "ESATTO", "2"] : roundNumber === 35 ? ["1", "2", "OVER", "ESATTO", "2"] : ["1", "X", "UNDER", "ESATTO", "1"];
  return bets.map((bet, index) => ({ id: bet.id, bet_id: bet.id, scelta: choices[index], exact_home: index === 3 ? roundNumber === 36 ? 1 : 2 : null, exact_away: index === 3 ? 1 : null }));
}

export function createFantaBetDemoData(real: FantaBetPageData, requestedRoundId?: number): FantaBetPageData {
  const now = new Date(real.serverNow);
  const availableRounds = Array.from({ length: 38 }, (_, index) => index + 1).map((number) => ({ id: 8000 + number, number, status: number === 38 ? "pubblicata" : "valutata", opensAt: new Date(now.getTime() + (number === 38 ? -1 : number - 39) * 86_400_000).toISOString(), deadlineAt: new Date(now.getTime() + (number === 38 ? 2 : number - 38) * 86_400_000).toISOString() }));
  const selected = availableRounds.find((round) => round.id === requestedRoundId) ?? availableRounds.at(-1)!;
  const historical = selected.number < 38;
  const bets = roundBets(selected.number, historical);
  const played = selected.number !== 37;
  return { ...real, serverNow: now.toISOString(), viewerId: "demo-20", round: { id: selected.id, number: selected.number, status: selected.status, opensAt: new Date(now.getTime() - 3_600_000).toISOString(), deadlineAt: selected.deadlineAt, requiredPredictions: 5, fullyEvaluable: historical && selected.number !== 37 }, bets, predictions: played ? pastPredictions(selected.number, bets) : [], submission: played ? { submittedAt: new Date(now.getTime() - 86_400_000).toISOString() } : null, leaderboard: globalLeaderboard(), roundLeaderboard: played ? dailyLeaderboard(selected.number) : [], availableRounds };
}
