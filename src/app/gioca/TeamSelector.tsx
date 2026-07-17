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
  const [isMobileFlow, setIsMobileFlow] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<GameTeam | null>(
    initialTeam ?? teams[0] ?? null
  );
  const [confirmationTeam, setConfirmationTeam] = useState<GameTeam | null>(null);
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());
  const ribbonRef = useRef<HTMLDivElement>(null);
  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const scrollThumbRef = useRef<HTMLSpanElement>(null);
  const thumbRatioRef = useRef(0.12);
  const scrollBarDragRef = useRef({ active: false, pointerId: -1 });
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const confirmationLogoRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const randomTimerRef = useRef(0);
  const launchTimerRef = useRef(0);
  const handledPointerSelectionRef = useRef(0);
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
    const query = normalizeTeamName(search);
    if (!query) return teams;
    return teams.filter((team) => normalizeTeamName(team.nome).includes(query));
  }, [search, teams]);

  const activeTeam =
    filteredTeams.find((team) => team.id === selectedTeam?.id) ??
    (isMobileFlow ? null : filteredTeams[0]) ??
    null;

  const isInfinite = search.trim().length === 0 && filteredTeams.length > 1;

  useEffect(() => () => {
    window.clearTimeout(randomTimerRef.current);
    window.clearTimeout(launchTimerRef.current);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const syncFlow = () => {
      const mobile = media.matches;
      setIsMobileFlow(mobile);
      if (mobile) {
        setConfirmationTeam(null);
        setSelectedTeam(initialTeam);
      } else {
        setSelectedTeam((current) => current ?? initialTeam ?? teams[0] ?? null);
        if (initialTeam) setConfirmationTeam(initialTeam);
      }
    };
    syncFlow();
    media.addEventListener?.("change", syncFlow);
    return () => media.removeEventListener?.("change", syncFlow);
  }, [initialTeam, teams]);

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
    if (!isMobileFlow) setConfirmationTeam(team);
  }

  function chooseRandomTeam() {
    if (!teams.length || isRandomizing) return;
    const alternatives = teams.length > 1
      ? teams.filter((candidate) => candidate.id !== selectedTeam?.id)
      : teams;
    const randomTeam = alternatives[Math.floor(Math.random() * alternatives.length)];
    setIsRandomizing(true);
    setConfirmationTeam(null);
    setSearch("");
    setSelectedTeam(randomTeam);
    window.clearTimeout(randomTimerRef.current);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        buttonRefs.current.get(`1-${randomTeam.id}`)?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      });
    });
    randomTimerRef.current = window.setTimeout(() => {
      setIsRandomizing(false);
      if (!isMobileFlow) setConfirmationTeam(randomTeam);
    }, 620);
  }

  function launchTeam(team: GameTeam) {
    if (isLaunching) return;
    setIsLaunching(true);
    window.clearTimeout(launchTimerRef.current);
    launchTimerRef.current = window.setTimeout(() => onSelect(team), 260);
  }

  function launchSelectedTeam() {
    if (!confirmationTeam || isLaunching) return;
    launchTeam(confirmationTeam);
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
    if (Math.abs(delta) > 6) {
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
      if (team) {
        handledPointerSelectionRef.current = event.timeStamp;
        chooseTeam(team, drag.pendingReplica);
      }
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
    <section className="relative flex min-h-[390px] flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(145deg,#010611_0%,#08213f_42%,#0b3158_67%,#020918_100%)] text-white shadow-[0_36px_100px_rgba(2,8,23,0.32),inset_0_1px_0_rgba(255,255,255,0.1)] sm:min-h-[540px] sm:rounded-[2rem] lg:min-h-[660px]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(108deg,transparent_9%,rgba(125,211,252,0.075)_43%,transparent_68%),linear-gradient(180deg,rgba(255,255,255,0.025),transparent_48%)]" />
      <div className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/55 to-transparent" />

      <div className={`relative border-b border-white/[0.07] px-3 py-2 transition duration-300 sm:px-7 sm:py-5 ${confirmationTeam ? "scale-[0.99] opacity-30" : "opacity-100"}`}>
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-300">
            La tua corsa
          </p>
          <h2 className="mt-0.5 text-lg font-black uppercase tracking-[-0.03em] text-white sm:mt-1 sm:text-2xl">
            Scegli la società
          </h2>
          <p className="mt-0.5 max-w-xl text-[11px] font-semibold leading-4 text-white/45 sm:mt-1 sm:text-sm">
            Scorri, scegli lo stemma e conferma la tua corsa.
          </p>
        </div>
      </div>

      <div className={`relative flex flex-1 flex-col justify-center px-3 py-2.5 transition duration-300 sm:px-5 sm:py-5 ${confirmationTeam ? "scale-[0.985] opacity-20" : "opacity-100"}`}>
        <div className="mx-auto mb-2 w-full max-w-2xl px-2 text-center sm:mb-5">
          <label className="block min-w-0">
            <span className="sr-only">Cerca una società</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cerca una società o una lega..."
              className="min-h-10 w-full rounded-2xl border border-sky-200/20 bg-slate-950/55 px-5 text-center text-xs font-bold text-white shadow-[0_12px_35px_rgba(2,8,23,0.25),inset_0_1px_0_rgba(255,255,255,0.08)] outline-none transition placeholder:text-white/35 focus:border-sky-200/50 focus:bg-slate-900/75 focus:ring-4 focus:ring-sky-400/10 sm:min-h-14 sm:text-base"
            />
          </label>
          <button type="button" onClick={chooseRandomTeam} disabled={isRandomizing || !teams.length} className="group mt-2 min-h-10 rounded-full border border-amber-100/35 bg-[linear-gradient(135deg,rgba(251,191,36,0.2),rgba(245,158,11,0.09))] px-7 text-[8px] font-black uppercase tracking-[0.17em] text-amber-100 shadow-[0_12px_32px_rgba(180,83,9,0.14),inset_0_1px_0_rgba(255,255,255,0.12)] transition duration-300 hover:-translate-y-0.5 hover:border-amber-100/55 hover:bg-amber-300/[0.22] disabled:cursor-wait disabled:opacity-50 sm:mt-3 sm:min-h-13 sm:px-10 sm:text-[9px]">
            <span className="mr-2 inline-block text-amber-300 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-125">✦</span>
            {isRandomizing ? "Estrazione…" : "Sorprendimi"}
          </button>
          <button
            type="button"
            onClick={() => activeTeam && launchTeam(activeTeam)}
            disabled={!activeTeam || isLaunching || isRandomizing}
            className="mx-auto mt-2 hidden min-h-11 w-full max-w-xs items-center justify-center rounded-full bg-amber-300 px-5 text-[9px] font-black uppercase tracking-[0.14em] text-blue-950 shadow-[0_12px_30px_rgba(251,191,36,0.2)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35 disabled:shadow-none max-sm:flex"
          >
            {isLaunching ? "Preparazione…" : activeTeam ? `Gioca con ${activeTeam.nome}` : "Seleziona una società"}
          </button>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => moveSelection(-1)}
            disabled={filteredTeams.length <= 1}
            aria-label="Società precedente"
            className="absolute left-0 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-sky-100/20 bg-[linear-gradient(145deg,rgba(18,61,103,0.96),rgba(4,18,39,0.94))] text-2xl font-light text-sky-50 shadow-[0_14px_34px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.12)] transition duration-300 hover:scale-105 hover:border-sky-100/40 hover:text-white disabled:hidden"
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
            className={`flex items-center gap-2 overflow-x-auto px-12 py-5 overscroll-x-contain touch-pan-y select-none [perspective:900px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4 sm:px-14 sm:py-12 ${isInfinite ? "cursor-grab active:cursor-grabbing" : filteredTeams.length === 1 ? "justify-center" : "cursor-grab active:cursor-grabbing"}`}
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
                    const handledByPointerUp = event.timeStamp - handledPointerSelectionRef.current < 180;
                    if (event.detail === 0 || (!dragRef.current.moved && !handledByPointerUp)) {
                      chooseTeam(team, replica);
                    }
                  }}
                  aria-pressed={selected}
                  aria-label={`Seleziona ${team.nome}`}
                  className={`group relative flex shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent opacity-100 outline-none transition-[transform,width,height,filter] duration-500 [transform-style:preserve-3d] ${
                    selected
                      ? "z-[2] h-[136px] w-[136px] -translate-y-2 sm:h-[200px] sm:w-[200px] sm:-translate-y-3"
                      : "h-[94px] w-[94px] translate-y-2 hover:-translate-y-0 sm:h-[136px] sm:w-[136px] sm:translate-y-3"
                  } focus-visible:ring-2 focus-visible:ring-blue-500`}
                >
                  {selected && (
                    <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-blue-950 text-[8px] font-black text-white shadow-md">
                      ✓
                    </span>
                  )}
                  <Image
                    src={team.logo}
                    alt=""
                    width={320}
                    height={320}
                    sizes="(max-width: 639px) 136px, 200px"
                    unoptimized
                    className={`h-[86%] w-[86%] object-contain [image-rendering:auto] transition-[filter] duration-500 ${selected ? "drop-shadow-[0_24px_30px_rgba(0,0,0,0.5)]" : "drop-shadow-[0_10px_16px_rgba(0,0,0,0.38)]"}`}
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
            className="absolute right-0 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-sky-100/20 bg-[linear-gradient(145deg,rgba(18,61,103,0.96),rgba(4,18,39,0.94))] text-2xl font-light text-sky-50 shadow-[0_14px_34px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.12)] transition duration-300 hover:scale-105 hover:border-sky-100/40 hover:text-white disabled:hidden"
          >
            ›
          </button>
        </div>

        {activeTeam && !confirmationTeam && (
          <div className="pointer-events-none -mt-4 text-center sm:-mt-6">
            <p className="text-[8px] font-black uppercase tracking-[0.22em] text-amber-300/80">Società selezionata</p>
            <p className="mt-1 truncate text-base font-black uppercase tracking-[-0.02em] text-white sm:text-xl">{activeTeam.nome}</p>
          </div>
        )}

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
            <span className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-white/10" />
            <span
              ref={scrollThumbRef}
              className="absolute top-1/2 h-[5px] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,#2563eb,#7dd3fc,#2563eb)] shadow-[0_2px_12px_rgba(56,189,248,0.32)] transition-[left] duration-75"
              style={{ width: "12%", left: 0 }}
            />
          </div>
        </div>
        )}

        {!filteredTeams.length && (
          <div className="mx-auto my-5 max-w-md rounded-2xl border border-dashed border-white/15 bg-white/[0.04] px-5 py-7 text-center">
            <p className="font-black uppercase text-white">Nessuna società trovata</p>
            <p className="mt-1 text-xs font-semibold text-white/40">Prova una ricerca differente.</p>
          </div>
        )}
      </div>

      {confirmationTeam && (
        <div
          className={`absolute inset-0 z-20 flex items-center justify-center bg-[radial-gradient(circle_at_50%_34%,rgba(56,189,248,0.2),rgba(5,20,45,0.86)_52%,rgba(2,8,23,0.94)_100%)] p-4 transition-opacity duration-300 motion-safe:animate-[team-confirmation-backdrop_220ms_ease-out] sm:p-6 ${isLaunching ? "bg-[#020817]/95" : ""}`}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setConfirmationTeam(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-confirmation-title"
            className="relative w-full max-w-md text-center text-white motion-safe:animate-[team-confirmation-panel_320ms_cubic-bezier(0.22,1,0.36,1)]"
          >
            <span className={`pointer-events-none absolute left-1/2 top-8 h-28 w-52 -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(125,211,252,.2),transparent_68%)] transition-opacity duration-200 ${isLaunching ? "opacity-0" : "opacity-100"}`} />
            <button
              type="button"
              onClick={() => setConfirmationTeam(null)}
              aria-label="Chiudi conferma"
              disabled={isLaunching}
              className={`absolute right-0 top-0 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-lg font-black text-white/60 transition hover:bg-white/[0.12] hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/35 ${isLaunching ? "opacity-0" : "opacity-100"}`}
            >
              ×
            </button>
            <div ref={confirmationLogoRef} className="relative mx-auto flex h-28 w-28 items-center justify-center sm:h-32 sm:w-32">
              <Image
                src={confirmationTeam.logo}
                alt={`Stemma ${confirmationTeam.nome}`}
                width={220}
                height={220}
                sizes="(max-width: 639px) 112px, 128px"
                unoptimized
                priority
                className="max-h-full max-w-full object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.42)]"
              />
            </div>
            <div className={`transition-all duration-200 ${isLaunching ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"}`}>
            <p className="relative mt-1 text-[8px] font-black uppercase tracking-[0.2em] text-amber-300">
              Società scelta
            </p>
            <h3 id="team-confirmation-title" className="relative mt-1 text-xl font-black uppercase leading-tight tracking-tight text-white sm:text-2xl">
              {confirmationTeam.nome}
            </h3>
            <p className="relative mt-1 text-[10px] font-semibold text-white/52">La tua corsa comincia da qui.</p>
            <div className="relative mx-auto mt-4 grid max-w-xs gap-1.5">
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={launchSelectedTeam}
                disabled={isLaunching}
                className="min-h-11 rounded-full bg-amber-300 px-6 text-[9px] font-black uppercase tracking-[0.15em] text-blue-950 shadow-[0_12px_32px_rgba(251,191,36,0.18)] transition hover:-translate-y-0.5 hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/45"
              >
                Scendi in campo
              </button>
              <button
                type="button"
                onClick={() => setConfirmationTeam(null)}
                className="min-h-10 rounded-full text-[9px] font-black uppercase tracking-[0.13em] text-white/55 transition hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/30"
              >
                Cambia società
              </button>
            </div>
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

function normalizeTeamName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("it")
    .trim()
    .replace(/\s+/g, " ");
}
