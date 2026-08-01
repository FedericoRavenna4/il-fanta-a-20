export const WAITLIST_HONEYPOT_FIELD = "sito_web" as const;
export const WAITLIST_STATUS = "in_attesa" as const;

export type WaitlistField =
  | "nome"
  | "cognome"
  | "instagram"
  | "motivazione"
  | "maggiorenne_dichiarato"
  | "privacy_accettata";

export type WaitlistApplicationInput = {
  nome: string;
  cognome: string;
  instagram: string;
  motivazione: string;
  maggiorenneDichiarato: boolean;
  privacyAccettata: boolean;
  honeypot?: string;
};

export type WaitlistActionResult =
  | {
      ok: true;
      message: string;
      position: number;
    }
  | {
      ok: false;
      message: string;
      fieldErrors?: Partial<Record<WaitlistField, string>>;
    };
