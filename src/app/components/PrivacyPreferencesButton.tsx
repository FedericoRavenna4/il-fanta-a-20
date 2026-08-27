"use client";

type GoogleFc = { callbackQueue?: Array<() => void>; showRevocationMessage?: () => void };

export default function PrivacyPreferencesButton({ className = "" }: { className?: string }) {
  function openPreferences() {
    const googlefc = (window as typeof window & { googlefc?: GoogleFc }).googlefc;
    if (googlefc?.callbackQueue && typeof googlefc.showRevocationMessage === "function") {
      googlefc.callbackQueue.push(googlefc.showRevocationMessage);
      return;
    }
    window.location.assign("/cookie-policy#preferenze-privacy");
  }
  return <button type="button" onClick={openPreferences} className={className}>Gestisci preferenze privacy</button>;
}
