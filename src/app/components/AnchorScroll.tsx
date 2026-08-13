"use client";

import { useEffect } from "react";

export default function AnchorScroll() {
  useEffect(() => {
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    let frame = 0;
    let cancelled = false;

    const scrollToHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      const expectedTop = Number.parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0;
      if (Math.abs(target.getBoundingClientRect().top - expectedTop) < 4) return;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    };

    frame = window.requestAnimationFrame(() => {
      scrollToHash();
      for (const delay of [100, 300, 700]) timers.push(setTimeout(scrollToHash, delay));
    });
    void document.fonts?.ready.then(() => { if (!cancelled) scrollToHash(); });
    window.addEventListener("hashchange", scrollToHash);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      for (const timer of timers) clearTimeout(timer);
      window.removeEventListener("hashchange", scrollToHash);
    };
  }, []);

  return null;
}
