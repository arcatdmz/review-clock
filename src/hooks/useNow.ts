import { useEffect, useState } from "react";

/**
 * 現在時刻（epoch ミリ秒）を intervalMs ごとに更新して返す。
 * active = false のあいだは固定値のまま。
 */
export function useNow(intervalMs: number, active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, active]);
  return now;
}
