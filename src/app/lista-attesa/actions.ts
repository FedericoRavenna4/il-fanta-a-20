"use server";

import { revalidatePath } from "next/cache";
import {
  submitWaitlistApplication,
  getWaitlistCount,
} from "@/lib/waitlist/server";
import {
  WAITLIST_HONEYPOT_FIELD,
  type WaitlistActionResult,
} from "@/lib/waitlist/types";

export async function submitWaitlistForm(
  _previousState: WaitlistActionResult | null,
  formData: FormData
): Promise<WaitlistActionResult> {
  const result = await submitWaitlistApplication({
    nome: formValue(formData, "nome"),
    cognome: formValue(formData, "cognome"),
    dataNascita: formValue(formData, "data_nascita"),
    instagram: formValue(formData, "instagram"),
    motivazione: formValue(formData, "motivazione"),
    privacyAccettata: parseCheckbox(formData.get("privacy_accettata")),
    honeypot: formValue(formData, WAITLIST_HONEYPOT_FIELD),
  });

  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/lista-attesa");
  }

  return result;
}

export async function getCurrentWaitlistCount() {
  return getWaitlistCount();
}

function formValue(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

function parseCheckbox(value: FormDataEntryValue | null) {
  return value === "true" || value === "1" || value === "on";
}
