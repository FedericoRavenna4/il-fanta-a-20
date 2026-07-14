"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { GameTeam } from "@/lib/game/types";

export default function TeamSelector({
  teams,
  initialTeamSlug,
  onSelect,
}: {
  teams: GameTeam[];
  initialTeamSlug?: string;
  onSelect: (team: GameTeam) => void;
}) {
  const initialTeam = teams.find((team) => team.slug === initialTeamSlug) ?? null;
  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<GameTeam | null>(
    initialTeam ?? teams[0] ?? null
  );
  const [confirmationTeam, setConfirmationTeam] = useState<GameTeam | null>(initialTeam);
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());
  const ribbonRef = useRef<HTMLDivElement>(null);
  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const scrollThumbRef = useRef<HTMLSpanElement>(null);
  const thumbRatioRef = useRef(0.12);
  const scrollBarDragRef = useRef({ active: false, pointerId: -1 });
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startScroll: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
    frame: 0,
    pendingTeamId: 0,
    pendingReplica: 1,
  });

  const filteredTeams = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("it");
    if (!query) return teams;
    return teams.filter((team) =>
      `${team.nome} ${team.lega}`.toLocaleLowerCase("it").includes(query)
    );
  }, [search, teams]);

  const activeTeam =
    filteredTeams.find((team) => team.id === selectedTeam?.id) ??
    filteredTeams[0] ??
    null;

  const isInfinite = search.trim().length === 0 && filteredTeams.length > 1;

  const carouselTeams = useMemo(
    () => (isInfinite ? [0, 1, 2] : [1]).flatMap((replica) =>
      filteredTeams.map((team) => ({ team, replica }))
    ),
    [filteredTeams, isInfinite]
  );

  const getCarouselSegmentWidth = useCallback(() => {
    if (!isInfinite) return 0;
    const firstTeam = filteredTeams[0];
    if (!firstTeam) return 0;
    const firstCopy = buttonRefs.current.get(`0-${firstTeam.id}`);
    const middleCopy = buttonRefs.current.get(`1-${firstTeam.id}`);
    if (!firstCopy || !middleCopy) return ribbonRef.current?.scrollWidth
      ? ribbonRef.current.scrollWidth / 3
      : 0;
    return middleCopy.offsetLeft - firstCopy.offsetLeft;
  }, [filteredTeams, isInfinite]);

  const updateScrollIndicator = useCallback(() => {
    const ribbon = ribbonRef.current;
    const segmentWidth = getCarouselSegmentWidth();
    if (!ribbon) return;
    if (!segmentWidth) {
      if (scrollThumbRef.current) {
        scrollThumbRef.current.style.width = "100%";
        scrollThumbRef.current.style.left = "0";
      }
      return;
    }
    const localOffset = ((ribbon.scrollLeft % segmentWidth) + segmentWidth) % segmentWidth;
    const progress = localOffset / segmentWidth;
    const ratio = Math.max(0.1, Math.min(0.28, ribbon.clientWidth / segmentWidth));
    thumbRatioRef.current = ratio;
    if (scrollThumbRef.current) {
      scrollThumbRef.current.style.width = `${ratio * 100}%`;
      scrollThumbRef.current.style.left = `${progress * (1 - ratio) * 100}%`;
    }
    scrollTrackRef.current?.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
  }, [getCarouselSegmentWidth]);

  useLayoutEffect(() => {
    const ribbon = ribbonRef.current;
    if (!ribbon || !filteredTeams.length) return;
    const frame = requestAnimationFrame(() => {
      ribbon.scrollLeft = isInfinite ? getCarouselSegmentWidth() : 0;
      updateScrollIndicator();
    });
    const observer = new ResizeObserver(updateScrollIndicator);
    observer.observe(ribbon);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [filteredTeams, getCarouselSegmentWidth, isInfinite, updateScrollIndicator]);

  useEffect(() => {
    if (!confirmationTeam) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => confirmButtonRef.current?.focus());

    function handleDialogKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setConfirmationTeam(null);
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = confirmButtonRef.current?.closest<HTMLElement>("[role='dialog']");
      const focusable = Array.from(
        dialog?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? []
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleDialogKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleDialogKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [confirmationTeam]);

  function selectAndCenter(team: GameTeam, replica = 1) {
    setSelectedTeam(team);
    requestAnimationFrame(() => {
      buttonRefs.current.get(`${replica}-${team.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    });
  }

  function chooseTeam(team: GameTeam, replica = 1) {
    selectAndCenter(team, replica);
    setConfirmationTeam(team);
  }

  function beginDrag(event: React.PointerEvent<HTMLDivElement>) {
    const ribbon = ribbonRef.current;
    if (!ribbon) return;
    cancelAnimationFrame(dragRef.current.frame);
    const teamButton = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "[data-team-id]"
    );
    dragRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startScroll: ribbon.scrollLeft,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
      frame: 0,
      pendingTeamId: Number(teamButton?.dataset.teamId ?? 0),
      pendingReplica: Number(teamButton?.dataset.replica ?? 1),
    };
    ribbon.setPointerCapture(event.pointerId);
  }

  function dragRibbon(event: React.PointerEvent<HTMLDivElement>) {
    const ribbon = ribbonRef.current;
    const drag = dragRef.current;
    if (!ribbon || !drag.active) return;
    const delta = event.clientX - drag.startX;
    if (Math.abs(delta) > 8) {
      drag.moved = true;
    }
    ribbon.scrollLeft = drag.startScroll - delta * 1.28;
    const now = event.timeStamp;
    const elapsed = Math.max(8, now - drag.lastTime);
    drag.velocity = (drag.lastX - event.clientX) / elapsed;
    drag.lastX = event.clientX;
    drag.lastTime = now;
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    const ribbon = ribbonRef.current;
    const drag = dragRef.current;
    if (!ribbon || !drag.active) return;
    drag.active = false;
    if (ribbon.hasPointerCapture(event.pointerId)) ribbon.releasePointerCapture(event.pointerId);

    if (!drag.moved && drag.pendingTeamId) {
      const team = teams.find((candidate) => candidate.id === drag.pendingTeamId);
      if (team) chooseTeam(team, drag.pendingReplica);
    }

    let velocity = drag.moved ? drag.velocity * 18 : 0;
    const glide = () => {
      if (Math.abs(velocity) < 0.18) {
        if (drag.moved) selectClosestLogo();
        return;
      }
      ribbon.scrollLeft += velocity;
      velocity *= 0.9;
      drag.frame = requestAnimationFrame(glide);
    };
    drag.frame = requestAnimationFrame(glide);
    window.setTimeout(() => {
      drag.moved = false;
    }, 0);
  }

  function cancelDrag(event: React.PointerEvent<HTMLDivElement>) {
    const ribbon = ribbonRef.current;
    cancelAnimationFrame(dragRef.current.frame);
    dragRef.current.active = false;
    dragRef.current.moved = false;
    if (ribbon?.hasPointerCapture(event.pointerId)) {
      ribbon.releasePointerCapture(event.pointerId);
    }
  }

  function selectClosestLogo() {
    const ribbon = ribbonRef.current;
    if (!ribbon) return;
    const ribbonCenter = ribbon.getBoundingClientRect().left + ribbon.clientWidth / 2;
    let closest: { teamId: number; distance: number } | null = null;

    for (const button of buttonRefs.current.values()) {
      const rect = button.getBoundingClientRect();
      const distance = Math.abs(rect.left + rect.width / 2 - ribbonCenter);
      if (!closest || distance < closest.distance) {
        closest = { teamId: Number(button.dataset.teamId), distance };
      }
    }

    if (!closest) return;
    const team = teams.find((candidate) => candidate.id === closest.teamId);
    if (team) setSelectedTeam(team);
  }

  function preserveInfiniteLoop() {
    const ribbon = ribbonRef.current;
    if (!ribbon || !filteredTeams.length || !isInfinite) return;
    const segmentWidth = getCarouselSegmentWidth();
    if (!segmentWidth) return;

    let adjustment = 0;
    if (ribbon.scrollLeft < segmentWidth * 0.7) adjustment = segmentWidth;
    if (ribbon.scrollLeft > segmentWidth * 2.3) adjustment = -segmentWidth;
    if (adjustment) {
      ribbon.scrollLeft += adjustment;
      if (dragRef.current.active) dragRef.current.startScroll += adjustment;
    }
    updateScrollIndicator();
  }

  function setCarouselFromTrack(clientX: number) {
    const track = scrollTrackRef.current;
    const ribbon = ribbonRef.current;
    const segmentWidth = getCarouselSegmentWidth();
    if (!track || !ribbon || !segmentWidth) return;
    const rect = track.getBoundingClientRect();
    const thumbWidth = rect.width * thumbRatioRef.current;
    const travel = Math.max(1, rect.width - thumbWidth);
    const position = Math.max(
      0,
      Math.min(0.999, (clientX - rect.left - thumbWidth / 2) / travel)
    );
    ribbon.scrollLeft = segmentWidth + position * segmentWidth;
    updateScrollIndicator();
  }

  function beginScrollBarDrag(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    scrollBarDragRef.current = { active: true, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
    setCarouselFromTrack(event.clientX);
  }

  function moveScrollBar(event: React.PointerEvent<HTMLDivElement>) {
    if (!scrollBarDragRef.current.active) return;
    event.preventDefault();
    setCarouselFromTrack(event.clientX);
  }

  function endScrollBarDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!scrollBarDragRef.current.active) return;
    scrollBarDragRef.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function moveSelection(direction: -1 | 1) {
    if (!filteredTeams.length) return;
    const currentIndex = Math.max(
      0,
      filteredTeams.findIndex((team) => team.id === activeTeam?.id)
    );
    const nextIndex =
      (currentIndex + direction + filteredTeams.length) % filteredTeams.length;
    selectAndCenter(
      filteredTeams[nextIndex],
      getDirectionalReplica(filteredTeams[nextIndex], direction)
    );
  }

  function getDirectionalReplica(team: GameTeam, direction: -1 | 1) {
    const ribbon = ribbonRef.current;
    if (!ribbon) return 1;
    const ribbonCenter = ribbon.getBoundingClientRect().left + ribbon.clientWidth / 2;
    const candidates = [0, 1, 2]
      .map((replica) => {
        const button = buttonRefs.current.get(`${replica}-${team.id}`);
        if (!button) return null;
        const rect = button.getBoundingClientRect();
        return { replica, distance: rect.left + rect.width / 2 - ribbonCenter };
      })
      .filter((candidate): candidate is { replica: number; distance: number } => candidate !== null)
      .filter((candidate) => direction > 0 ? candidate.distance > 0 : candidate.distance < 0)
      .sort((first, second) => Math.abs(first.distance) - Math.abs(second.distance));
    return candidates[0]?.replica ?? 1;
  }

  return (
    <section className="relative overflow-hidden rounded-[1.5rem] border border-white/90 bg-[linear-gradient(145deg,rgba(255,255,255,0.97),rgba(241,245,249,0.91))] shadow-[0_30px_90px_rgba(15,23,42,0.13),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl sm:rounded-[2rem]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_50%_0%,rgba(125,211,252,0.2),transparent_68%)]" />
      <div className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/70 to-transparent" />

      <div className="relative grid items-end gap-3 border-b border-slate-200/80 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(280px,0.55fr)] sm:px-7 sm:py-4">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-600">
            La tua corsa
          </p>
          <h2 className="mt-1 text-xl font-black uppercase tracking-[-0.03em] text-blue-950 sm:text-2xl">
            Scegli la società
          </h2>
          <p className="mt-1 max-w-xl text-xs font-semibold leading-4 text-slate-500 sm:text-sm">
            Scorri, scegli lo stemma e conferma la tua corsa.
          </p>
        </div>
        <label className="block min-w-0">
          <span className="sr-only">Cerca una società</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cerca società o lega..."
            className="min-h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3.5 text-sm font-semibold text-blue-950 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100/70 sm:min-h-11"
          />
        </label>
      </div>

      <div className="relative px-3 py-4 sm:px-5 sm:py-5">
        <div className="mb-1.5 flex items-center justify-end px-1">
          <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Scorri per esplorare
          </p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => moveSelection(-1)}
            disabled={filteredTeams.length <= 1}
            aria-label="Società precedente"
            className="absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-lg font-black text-blue-950 shadow-lg transition hover:bg-blue-50 disabled:hidden"
          >
            ‹
          </button>
          <div
            id="team-carousel"
            ref={ribbonRef}
            onPointerDown={beginDrag}
            onPointerMove={dragRibbon}
            onPointerUp={endDrag}
            onPointerCancel={cancelDrag}
            onScroll={preserveInfiniteLoop}
            className={`flex items-center gap-3 overflow-x-auto px-12 py-6 overscroll-x-contain touch-pan-y select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 sm:px-14 sm:py-7 ${isInfinite ? "cursor-grab active:cursor-grabbing" : filteredTeams.length === 1 ? "justify-center" : "cursor-grab active:cursor-grabbing"}`}
          >
            {carouselTeams.map(({ team, replica }) => {
              const selected = activeTeam?.id === team.id;
              return (
                <button
                  key={`${replica}-${team.id}`}
                  ref={(node) => {
                    const key = `${replica}-${team.id}`;
                    if (node) buttonRefs.current.set(key, node);
                    else buttonRefs.current.delete(key);
                  }}
                  data-team-id={team.id}
                  data-replica={replica}
                  type="button"
                  tabIndex={replica === 1 ? 0 : -1}
                  title={team.nome}
                  onClick={(event) => {
                    if (event.detail === 0) chooseTeam(team, replica);
                  }}
                  aria-pressed={selected}
                  aria-label={`Seleziona ${team.nome}`}
                  className={`group relative flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent opacity-100 outline-none transition-transform duration-300 sm:h-[100px] sm:w-[100px] ${
                    selected
                      ? "z-[2] -translate-y-1 scale-[1.16]"
                      : "scale-[0.94] hover:scale-100"
                  } focus-visible:ring-2 focus-visible:ring-blue-500`}
                >
                  {selected && (
                    <span className="pointer-events-none absolute inset-[-18px] -z-10 rounded-full bg-[radial-gradient(circle,rgba(125,211,252,0.32)_0%,rgba(147,197,253,0.12)_42%,transparent_72%)] blur-sm" />
                  )}
                  {selected && (
                    <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-blue-950 text-[8px] font-black text-white shadow-md">
                      ✓
                    </span>
                  )}
                  <Image
                    src={team.logo}
                    alt=""
                    width={72}
                    height={72}
                    className={`h-[80%] w-[80%] object-contain transition duration-300 ${selected ? "drop-shadow-[0_16px_22px_rgba(15,23,42,0.3)]" : "drop-shadow-[0_8px_12px_rgba(15,23,42,0.16)]"}`}
                  />
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => moveSelection(1)}
            disabled={filteredTeams.length <= 1}
            aria-label="Società successiva"
            className="absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-lg font-black text-blue-950 shadow-lg transition hover:bg-blue-50 disabled:hidden"
          >
            ›
          </button>
        </div>

        {isInfinite && (
        <div className="mx-auto mt-1.5 max-w-3xl px-8 sm:mt-2">
          <div
            ref={scrollTrackRef}
            role="scrollbar"
            aria-label="Posizione nel carousel delle società"
            aria-controls="team-carousel"
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
            tabIndex={0}
            onPointerDown={beginScrollBarDrag}
            onPointerMove={moveScrollBar}
            onPointerUp={endScrollBarDrag}
            onPointerCancel={endScrollBarDrag}
            className="relative h-3 touch-none cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
          >
            <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-slate-300/75 shadow-[inset_0_1px_2px_rgba(15,23,42,0.12)]" />
            <span
              ref={scrollThumbRef}
              className="absolute top-1/2 h-[7px] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,#1e3a8a,#38bdf8,#1e3a8a)] shadow-[0_3px_10px_rgba(30,64,175,0.28),inset_0_1px_0_rgba(255,255,255,0.55)] transition-[left] duration-75"
              style={{ width: "12%", left: 0 }}
            />
          </div>
        </div>
        )}

        {!filteredTeams.length && (
          <div className="mx-auto my-5 max-w-md rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-7 text-center">
            <p className="font-black uppercase text-blue-950">Nessuna società trovata</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Prova una ricerca differente.</p>
          </div>
        )}
      </div>

      {confirmationTeam && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm motion-safe:animate-[team-confirmation-backdrop_180ms_ease-out]"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setConfirmationTeam(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-confirmation-title"
            className="relative w-full max-w-sm overflow-hidden rounded-[1.6rem] border border-white/80 bg-[linear-gradient(145deg,#ffffff,#eef5fb)] p-5 text-center shadow-[0_34px_100px_rgba(2,8,23,0.35)] motion-safe:animate-[team-confirmation-panel_220ms_cubic-bezier(0.22,1,0.36,1)] sm:p-6"
          >
            <span className="pointer-events-none absolute left-1/2 top-0 h-32 w-48 -translate-x-1/2 rounded-full bg-sky-200/45 blur-3xl" />
            <button
              type="button"
              onClick={() => setConfirmationTeam(null)}
              aria-label="Chiudi conferma"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-lg font-black text-slate-500 transition hover:bg-white hover:text-blue-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200"
            >
              ×
            </button>
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center sm:h-28 sm:w-28">
              <Image
                src={confirmationTeam.logo}
                alt={`Stemma ${confirmationTeam.nome}`}
                width={112}
                height={112}
                priority
                className="max-h-full max-w-full object-contain drop-shadow-[0_16px_24px_rgba(15,23,42,0.24)]"
              />
            </div>
            <p className="relative mt-2 text-[8px] font-black uppercase tracking-[0.2em] text-amber-600">
              Società scelta
            </p>
            <h3 id="team-confirmation-title" className="relative mt-1 text-xl font-black uppercase leading-tight tracking-tight text-blue-950">
              Hai scelto {confirmationTeam.nome}. Sei pronto?
            </h3>
            <p className="relative mt-2 text-xs font-semibold text-slate-500">
              {confirmationTeam.lega} · Il tuo stemma è pronto a correre.
            </p>
            <div className="relative mt-5 grid gap-2">
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={() => onSelect(confirmationTeam)}
                className="min-h-11 rounded-full bg-blue-950 px-6 text-[9px] font-black uppercase tracking-[0.15em] text-white shadow-[0_12px_28px_rgba(23,37,84,0.22)] transition hover:-translate-y-0.5 hover:bg-blue-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200"
              >
                Scendi in campo
              </button>
              <button
                type="button"
                onClick={() => setConfirmationTeam(null)}
                className="min-h-10 rounded-full text-[9px] font-black uppercase tracking-[0.13em] text-slate-500 transition hover:bg-white/70 hover:text-blue-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100"
              >
                Cambia società
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        @keyframes team-confirmation-backdrop {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes team-confirmation-panel {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </section>
  );
}
