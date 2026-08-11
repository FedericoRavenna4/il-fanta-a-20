import "server-only";
import type { Database } from "@/lib/supabase/database.types";

export type CurrentSocietaRow = Pick<
  Database["public"]["Tables"]["societa"]["Row"],
  | "id"
  | "nome_ufficiale"
  | "nome_personalizzato"
  | "nome_normalizzato"
  | "slug"
  | "fantallenatore"
  | "nickname_instagram"
  | "squadra_associata"
  | "stagione_ingresso"
  | "categoria"
  | "girone"
  | "logo_path"
  | "storia"
  | "storia_tifo"
  | "badge_tipo"
  | "attiva"
>;

export type CurrentSocieta = {
  id: number;
  nome: string;
  nome_ufficiale: string;
  nome_personalizzato: string | null;
  nome_normalizzato: string;
  slug: string;
  fantallenatore: string | null;
  nickname_instagram: string | null;
  squadra_associata: string | null;
  stagione_ingresso: string | null;
  categoria: string | null;
  girone: string | null;
  logo_path: string | null;
  storia: string | null;
  storia_tifo: string | null;
  badge_tipo: string | null;
  attiva: boolean;
};

export type CurrentSocietaIdentity = {
  id: number;
  name: string;
  normalizedName: string;
  slug: string;
};

export function getCurrentSocietaName(
  row: Pick<CurrentSocietaRow, "nome_ufficiale" | "nome_personalizzato">
) {
  return row.nome_personalizzato ?? row.nome_ufficiale;
}

export function mapCurrentSocietaIdentity(row: CurrentSocietaRow): CurrentSocietaIdentity {
  return {
    id: row.id,
    name: getCurrentSocietaName(row),
    normalizedName: row.nome_normalizzato,
    slug: row.slug,
  };
}

export function mapCurrentSocieta(row: CurrentSocietaRow): CurrentSocieta {
  return {
    id: row.id,
    nome: getCurrentSocietaName(row),
    nome_ufficiale: row.nome_ufficiale,
    nome_personalizzato: row.nome_personalizzato,
    nome_normalizzato: row.nome_normalizzato,
    slug: row.slug,
    fantallenatore: row.fantallenatore,
    nickname_instagram: row.nickname_instagram,
    squadra_associata: row.squadra_associata,
    stagione_ingresso: row.stagione_ingresso,
    categoria: row.categoria,
    girone: row.girone,
    logo_path: row.logo_path,
    storia: row.storia,
    storia_tifo: row.storia_tifo,
    badge_tipo: row.badge_tipo,
    attiva: row.attiva,
  };
}
