"use client";

import { type CSSProperties, useLayoutEffect, useRef, useState } from "react";

export default function SmoothOverflowText({ children, className = "" }: { children: string; className?: string }) {
  const viewportRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(0);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const measureText = measureRef.current;
    if (!viewport || !measureText) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const measure = () => setDistance(motion.matches ? 0 : Math.max(0, Math.ceil(measureText.scrollWidth - viewport.clientWidth)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(measureText);
    motion.addEventListener("change", measure);
    return () => { observer.disconnect(); motion.removeEventListener("change", measure); };
  }, [children]);

  const style = distance > 0 ? ({
    "--verification-marquee-distance": `${distance}px`,
    "--verification-marquee-duration": `${Math.min(32, Math.max(12, 10 + distance / 9))}s`,
  } as CSSProperties) : undefined;

  return <span ref={viewportRef} title={children} aria-label={children} className={`relative block min-w-0 overflow-hidden whitespace-nowrap ${className}`}>
    <span ref={measureRef} aria-hidden="true" className="pointer-events-none absolute invisible min-w-max whitespace-nowrap">{children}</span>
    <span aria-hidden="true" style={style} className={distance > 0 ? "verification-smooth-marquee block min-w-max whitespace-nowrap" : "block max-w-full truncate"}>{children}</span>
    <style jsx>{`
      @keyframes verification-smooth-marquee {
        0%, 14% { transform: translateX(0); }
        43%, 57% { transform: translateX(calc(-1 * var(--verification-marquee-distance))); }
        86%, 100% { transform: translateX(0); }
      }
      .verification-smooth-marquee {
        animation: verification-smooth-marquee var(--verification-marquee-duration) ease-in-out infinite;
        will-change: transform;
      }
      @media (prefers-reduced-motion: reduce) {
        .verification-smooth-marquee {
          animation: none;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          transform: none;
        }
      }
    `}</style>
  </span>;
}
