import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Twinkling stars + slowly expanding hypnotic rings, used behind hero sections. */
export function HypnoBackdrop({ className, rings = 4 }: { className?: string; rings?: number }) {
  const stars = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        left: `${(i * 37.7) % 100}%`,
        top: `${(i * 61.3) % 100}%`,
        delay: `${(i % 9) * 0.45}s`,
        scale: 0.6 + ((i * 13) % 10) / 10,
      })),
    [],
  );

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {Array.from({ length: rings }, (_, i) => (
        <span key={i} className="hypno-ring" style={{ animationDelay: `${(i * 9) / rings}s` }} />
      ))}
      {stars.map((s, i) => (
        <span
          key={i}
          className="star"
          style={{ left: s.left, top: s.top, animationDelay: s.delay, transform: `scale(${s.scale})` }}
        />
      ))}
    </div>
  );
}

/** Fades content up the first time it scrolls into view. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("reveal", shown && "reveal-in", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/** Re-renders every second; offset keeps the countdown in sync with the server clock. */
export function useNow(offsetMs = 0) {
  const [now, setNow] = useState(() => Date.now() + offsetMs);
  useEffect(() => {
    setNow(Date.now() + offsetMs);
    const t = window.setInterval(() => setNow(Date.now() + offsetMs), 1000);
    return () => window.clearInterval(t);
  }, [offsetMs]);
  return now;
}

/** Golden particle burst shown when a class is marked as done. */
export function Burst() {
  const dots = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const angle = (i / 22) * Math.PI * 2;
        const dist = 70 + ((i * 17) % 60);
        return { dx: `${Math.cos(angle) * dist}px`, dy: `${Math.sin(angle) * dist}px` };
      }),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {dots.map((d, i) => (
        <span key={i} className="burst-dot" style={{ ["--dx" as string]: d.dx, ["--dy" as string]: d.dy }} />
      ))}
    </div>
  );
}
