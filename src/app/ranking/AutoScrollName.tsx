"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

export default function AutoScrollName({ name, index = 0 }: { name: string; index?: number }) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const text = textRef.current;
      if (!container || !text) return;
      setDistance(Math.max(0, text.scrollWidth - container.clientWidth));
    };

    measure();
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    if (textRef.current) observer.observe(textRef.current);
    return () => observer.disconnect();
  }, [name]);

  const style = {
    "--name-distance": `-${distance}px`,
    "--name-delay": `${(index % 7) * 1.35}s`,
  } as CSSProperties;

  return (
    <span ref={containerRef} className="block min-w-0 overflow-hidden whitespace-nowrap" title={name}>
      <span ref={textRef} style={style} className={distance > 2 ? "mobile-ranking-name inline-block" : "block truncate"}>
        {name}
      </span>
      <style jsx>{`
        @media (max-width: 639px) and (prefers-reduced-motion: no-preference) {
          .mobile-ranking-name {
            animation: mobile-ranking-name 11s ease-in-out var(--name-delay) infinite;
          }
        }
        @media (min-width: 640px) {
          .mobile-ranking-name {
            display: block;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
        @keyframes mobile-ranking-name {
          0%, 18% { transform: translateX(0); }
          72%, 88% { transform: translateX(var(--name-distance)); }
          100% { transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .mobile-ranking-name {
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
      `}</style>
    </span>
  );
}
