import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  WAITLIST_STATUS,
  type WaitlistActionResult,
  type WaitlistApplicationInput,
  type WaitlistField,
} from "./types";

const NAME_MAX_LENGTH = 80;
const MOTIVATION_MAX_LENGTH = 1500;
const INSTAGRAM_PATTERN = /^[a-z0-9._]{1,30}$/;

type ValidatedApplication = {
  nome: string;
  cognome: string;
  dataNascita: string;
  instagram: string;
  motivazione: string;
  privacyAccettata: true;
};

export async function submitWaitlistApplication(
  input: WaitlistApplicationInput
): Promise<WaitlistActionResult> {
  if (input.honeypot?.trim()) {
    return { ok: false, message: "Invio non valido. Riprova." };
  }

  const validation = validateWaitlistApplication(input);
  if (!validation.ok) return validation.result;

  try {
    const supabase = getSupabaseAdminClient();
    const instagram = validation.data.instagram;

    const [duplicateResult, initialCountResult] = await Promise.all([
      supabase
        .from("lista_attesa")
        .select("id")
        .or(`instagram.ilike.${instagram},instagram.ilike.@${instagram}`)
        .limit(1),
      supabase
        .from("lista_attesa")
        .select("id", { count: "exact", head: true })
        .eq("stato", WAITLIST_STATUS),
    ]);

    if (duplicateResult.error || initialCountResult.error) {
      return serviceUnavailableResult();
    }
    if (duplicateResult.data.length > 0) {
      return duplicateInstagramResult();
    }

    const { data: insertedApplication, error: insertError } = await supabase
      .from("lista_attesa")
      .insert({
        nome: validation.data.nome,
        cognome: validation.data.cognome,
        data_nascita: validation.data.dataNascita,
        instagram,
        motivazione: validation.data.motivazione,
        stato: WAITLIST_STATUS,
        privacy_accettata: validation.data.privacyAccettata,
      })
      .select("created_at")
      .single();

    if (insertError?.code === "23505") return duplicateInstagramResult();
    if (insertError || !insertedApplication) return serviceUnavailableResult();

    const { count: position, error: positionError } = await supabase
      .from("lista_attesa")
      .select("id", { count: "exact", head: true })
      .eq("stato", WAITLIST_STATUS)
      .lte("created_at", insertedApplication.created_at);

    if (positionError || position === null) {
      return {
        ok: true,
        message: "Candidatura inviata correttamente.",
        position: (initialCountResult.count ?? 0) + 1,
      };
    }

    return {
      ok: true,
      message: "Candidatura inviata correttamente.",
      position,
    };
  } catch {
    return serviceUnavailableResult();
  }
}

export async function getWaitlistCount(): Promise<number> {
  try {
    const { count, error } = await getSupabaseAdminClient()
      .from("lista_attesa")
      .select("id", { count: "exact", head: true })
      .eq("stato", WAITLIST_STATUS);

    if (error) throw new Error("Conteggio lista d'attesa non disponibile.");
    return count ?? 0;
  } catch {
    throw new Error("Impossibile recuperare il numero di candidature in attesa.");
  }
}

export function normalizeInstagramNickname(value: string) {
  return normalizeText(value).replace(/^@+/, "").toLocaleLowerCase("en-US");
}

function validateWaitlistApplication(input: WaitlistApplicationInput):
  | { ok: true; data: ValidatedApplication }
  | { ok: false; result: WaitlistActionResult } {
  const nome = normalizeText(input.nome);
  const cognome = normalizeText(input.cognome);
  const dataNascita = normalizeText(input.dataNascita);
  const instagram = normalizeInstagramNickname(input.instagram);
  const motivazione = normalizeText(input.motivazione);
  const fieldErrors: Partial<Record<WaitlistField, string>> = {};

  if (!nome) fieldErrors.nome = "Inserisci il nome.";
  else if (nome.length > NAME_MAX_LENGTH) fieldErrors.nome = "Il nome è troppo lungo.";

  if (!cognome) fieldErrors.cognome = "Inserisci il cognome.";
  else if (cognome.length > NAME_MAX_LENGTH) fieldErrors.cognome = "Il cognome è troppo lungo.";

  if (!dataNascita) fieldErrors.data_nascita = "Inserisci la data di nascita.";
  else if (!isValidBirthDate(dataNascita)) {
    fieldErrors.data_nascita = "Inserisci una data di nascita valida.";
  }

  if (!instagram) fieldErrors.instagram = "Inserisci il nickname Instagram.";
  else if (!INSTAGRAM_PATTERN.test(instagram)) {
    fieldErrors.instagram = "Il nickname Instagram può contenere solo lettere, numeri, punti e underscore.";
  }

  if (motivazione.length > MOTIVATION_MAX_LENGTH) {
    fieldErrors.motivazione = `La motivazione non può superare ${MOTIVATION_MAX_LENGTH} caratteri.`;
  }

  if (input.privacyAccettata !== true) {
    fieldErrors.privacy_accettata = "Devi accettare l'informativa privacy.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      result: {
        ok: false,
        message: "Controlla i dati inseriti.",
        fieldErrors,
      },
    };
  }

  return {
    ok: true,
    data: {
      nome,
      cognome,
      dataNascita,
      instagram,
      motivazione,
      privacyAccettata: true,
    },
  };
}

function normalizeText(value: string) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function isValidBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );
  return year >= 1900 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getTime() <= todayUtc;
}

function duplicateInstagramResult(): WaitlistActionResult {
  return {
    ok: false,
    message: "Esiste già una candidatura con questo nickname Instagram.",
    fieldErrors: {
      instagram: "Questo nickname Instagram è già presente nella lista d'attesa.",
    },
  };
}

function serviceUnavailableResult(): WaitlistActionResult {
  return {
    ok: false,
    message: "Il servizio non è momentaneamente disponibile. Riprova più tardi.",
  };
}
