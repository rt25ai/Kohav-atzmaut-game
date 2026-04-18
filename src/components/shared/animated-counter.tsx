"use client";

import { useEffect, useState } from "react";

type AnimatedCounterProps = {
  value: number;
  durationMs?: number;
};

export function AnimatedCounter({
  value,
  durationMs = 900,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      setDisplayValue(Math.round(value * progress));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [durationMs, value]);

  return <>{displayValue.toLocaleString("he-IL")}</>;
}
