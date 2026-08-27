import type { ConfirmLineupInput, LineupPreview, LineupPreviewTeam, MatchStatus, RecognitionOutput, RosterPlayer, TeamOption } from "./types";

export function normalizeRecognitionName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("it-IT").replace(/[’'`.]/g, " ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function tokens(value: string) { return normalizeRecognitionName(value).split(" ").filter(Boolean); }
function compatibleToken(read: string, actual: string) { return read === actual || (read.length >= 2 && actual.startsWith(read)) || (actual.length >= 2 && read.startsWith(actual)); }
function nameScore(read: string, actual: string) {
  const a = normalizeRecognitionName(read); const b = normalizeRecognitionName(actual);
  if (!a || !b) return 0; if (a === b) return 100;
  const at = tokens(a); const bt = tokens(b);
  if (at.every((token) => bt.some((candidate) => compatibleToken(token, candidate)))) return 80 + Math.min(at.length, 4);
  if (bt.every((token) => at.some((candidate) => compatibleToken(token, candidate)))) return 75 + Math.min(bt.length, 4);
  const compactA = a.replace(/ /g, ""); const compactB = b.replace(/ /g, "");
  return compactA.length >= 4 && (compactA.includes(compactB) || compactB.includes(compactA)) ? 70 : 0;
}

function bestMatches<T>(read: string, rows: T[], label: (row: T) => string, aliases: (row: T) => string[] = () => []) {
  const ranked = rows.map((row) => ({ row, score: Math.max(nameScore(read, label(row)), ...aliases(row).map((alias) => nameScore(read, alias))) })).filter((item) => item.score >= 70).sort((a, b) => b.score - a.score);
  if (!ranked.length) return { status: "unrecognized" as MatchStatus, matches: [] as T[] };
  const best = ranked[0].score; const matches = ranked.filter((item) => item.score === best).map((item) => item.row);
  return { status: matches.length === 1 ? "recognized" as MatchStatus : "ambiguous" as MatchStatus, matches };
}

export function matchPlayer(read: string, roster: RosterPlayer[]) {
  const match = bestMatches(read, roster, (player) => player.name);
  return { detectedName: read.trim(), playerId: match.status === "recognized" ? match.matches[0].id : null, status: match.status, candidates: match.matches.map((player) => player.id) };
}

export function buildLineupPreview(output: RecognitionOutput, matchId: number, seasonId: number, matchday: number, options: [TeamOption, TeamOption]): LineupPreview {
  const makeTeam = (raw: RecognitionOutput["teamA"]): LineupPreviewTeam => {
    const society = bestMatches(raw.detectedName, options, (team) => team.name, (team) => team.aliases);
    const selected = society.status === "recognized" ? society.matches[0] : null;
    return { detectedName: raw.detectedName.trim(), societyId: selected?.id ?? null, societyStatus: society.status, societyCandidates: society.matches.map((team) => team.id), formation: sanitizeFormation(raw.formation), players: raw.players.map((name) => matchPlayer(name, selected?.roster ?? [])) };
  };
  const detected = [makeTeam(output.teamA), makeTeam(output.teamB)] as [LineupPreviewTeam, LineupPreviewTeam];
  const forceTeam = (team: LineupPreviewTeam, raw: RecognitionOutput["teamA"], option: TeamOption): LineupPreviewTeam => ({ ...team, societyId: option.id, societyStatus: "recognized", societyCandidates: [option.id], players: raw.players.map((name) => matchPlayer(name, option.roster)) });
  let ordered: [LineupPreviewTeam, LineupPreviewTeam];
  if (detected[0].societyId && detected[1].societyId && detected[0].societyId !== detected[1].societyId) ordered = detected;
  else if (detected[0].societyId) { const other = options.find((option) => option.id !== detected[0].societyId)!; ordered = [detected[0], forceTeam(detected[1], output.teamB, other)]; }
  else if (detected[1].societyId) { const other = options.find((option) => option.id !== detected[1].societyId)!; ordered = [forceTeam(detected[0], output.teamA, other), detected[1]]; }
  else ordered = [forceTeam(detected[0], output.teamA, options[0]), forceTeam(detected[1], output.teamB, options[1])];
  return { matchId, seasonId, matchday, teams: ordered, options };
}

export function sanitizeFormation(value: string | null) { const clean = value?.trim() ?? ""; return /^\d(?:-\d){2,4}$/.test(clean) ? clean : null; }

export function validateConfirmation(input: ConfirmLineupInput, options: TeamOption[]) {
  if (!Number.isSafeInteger(input.matchId) || input.matchId <= 0) return "Partita FantaBet non valida.";
  if (!Number.isSafeInteger(input.seasonId) || input.seasonId <= 0 || !Number.isInteger(input.matchday) || input.matchday < 1 || input.matchday > 38) return "Stagione o giornata non valide.";
  if (!Array.isArray(input.teams) || input.teams.length !== 2) return "Servono esattamente due formazioni.";
  if (input.teams[0].societyId === input.teams[1].societyId) return "Seleziona due società diverse.";
  for (const team of input.teams) {
    const option = options.find((item) => item.id === team.societyId); if (!option) return "Società non valida.";
    if (team.playerIds.length !== 11) return "Ogni formazione deve avere esattamente 11 titolari.";
    if (new Set(team.playerIds).size !== 11) return "Lo stesso giocatore non può comparire due volte.";
    const rosterIds = new Set(option.roster.map((player) => player.id)); if (team.playerIds.some((id) => !rosterIds.has(id))) return "Un giocatore non appartiene alla rosa selezionata.";
    if (team.formation !== null && !sanitizeFormation(team.formation)) return "Modulo non valido.";
  }
  return null;
}

export function parseRecognitionOutput(value: unknown): RecognitionOutput {
  if (!value || typeof value !== "object") throw new Error("OUTPUT_AI_INVALIDO");
  const raw = value as Record<string, unknown>;
  const parseTeam = (candidate: unknown) => { const team = candidate as Record<string, unknown>; if (!team || typeof team.detectedName !== "string" || !(team.formation === null || typeof team.formation === "string") || !Array.isArray(team.players) || team.players.some((item) => typeof item !== "string") || team.players.length < 1 || team.players.length > 15) throw new Error("OUTPUT_AI_INVALIDO"); return { detectedName: team.detectedName.slice(0, 120), formation: team.formation?.slice(0, 30) ?? null, players: team.players.map((item) => (item as string).slice(0, 120)) }; };
  return { teamA: parseTeam(raw.teamA), teamB: parseTeam(raw.teamB) };
}
