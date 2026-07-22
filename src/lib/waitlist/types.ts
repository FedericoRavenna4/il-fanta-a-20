export const WAITLIST_HONEYPOT_FIELD = "sito_web" as const;
export const WAITLIST_STATUS = "in_attesa" as const;

export type WaitlistField =
  | "nome"
  | "cognome"
  | "data_nascita"
  | "instagram"
  | "motivazione"
  | "privacy_accettata";

export type WaitlistApplicationInput = {
  nome: string;
  cognome: string;
  dataNascita: string;
  instagram: string;
  motivazione: string;
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
