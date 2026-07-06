import type { Phase } from "../lib/run";
import { fmtCountdown } from "../lib/schedule";

interface ClockFaceProps {
  /** 現フェーズの経過割合 0..1 */
  fraction: number;
  /** 残りミリ秒（超過中は負値） */
  remainingMs: number;
  phase: Phase;
  paused: boolean;
  /** 中央上段のラベル（例: レビュー 3 / 12） */
  label: string;
  /** 中央下段のラベル（例: 終了予定 18:30） */
  subLabel: string;
  works: { total: number; completed: number };
}

const CX = 200;
const CY = 200;

function polar(r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}

/** 12 時位置を 0° として時計回りに start° → end° の円弧パス */
function arcPath(r: number, start: number, end: number): string {
  const [sx, sy] = polar(r, start);
  const [ex, ey] = polar(r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}

/**
 * 2D のアナログ調タイマー盤面。
 * 外周にレビューごとのドット、盤面に目盛り、太い円弧が現フェーズの経過を示し、
 * 針が円弧の先端（現在位置)を指す。
 */
export function ClockFace({
  fraction,
  remainingMs,
  phase,
  paused,
  label,
  subLabel,
  works,
}: ClockFaceProps) {
  const overtime = remainingMs < 0;
  const f = Math.min(Math.max(fraction, 0), 1);
  const angle = f * 360;
  const arcColor = overtime
    ? "var(--danger)"
    : phase === "break"
      ? "var(--break)"
      : "var(--accent)";

  const minorTicks = Array.from({ length: 60 }, (_, i) => i * 6);
  const majorTicks = Array.from({ length: 12 }, (_, i) => i * 30);

  const dotRadius = works.total <= 24 ? 6 : works.total <= 48 ? 4.5 : 3;
  const dots = Array.from({ length: works.total }, (_, i) => {
    const [x, y] = polar(190, (i * 360) / works.total);
    const state =
      i < works.completed
        ? "done"
        : i === works.completed && phase === "work"
          ? "current"
          : "todo";
    return { x, y, state, key: i };
  });

  return (
    <svg
      className={`clock-face${overtime ? " overtime" : ""}${paused ? " paused" : ""}`}
      viewBox="0 0 400 400"
      role="timer"
      aria-label={`${label} 残り ${fmtCountdown(remainingMs)}`}
    >
      {/* レビュードット（外周） */}
      {dots.map((d) => (
        <circle
          key={d.key}
          className={`work-dot ${d.state}`}
          cx={d.x}
          cy={d.y}
          r={dotRadius}
        />
      ))}

      {/* 盤面 */}
      <circle cx={CX} cy={CY} r={172} className="face" />
      {minorTicks.map((deg) => {
        const [x1, y1] = polar(160, deg);
        const [x2, y2] = polar(166, deg);
        return (
          <line key={`m${deg}`} className="tick minor" x1={x1} y1={y1} x2={x2} y2={y2} />
        );
      })}
      {majorTicks.map((deg) => {
        const [x1, y1] = polar(154, deg);
        const [x2, y2] = polar(166, deg);
        return (
          <line key={`M${deg}`} className="tick major" x1={x1} y1={y1} x2={x2} y2={y2} />
        );
      })}

      {/* 経過円弧: 薄いトラックの上に経過分を重ねる */}
      <circle cx={CX} cy={CY} r={140} className="arc-track" />
      {overtime ? (
        <circle cx={CX} cy={CY} r={140} className="arc-progress full" style={{ stroke: arcColor }} />
      ) : (
        angle > 0.5 && (
          <path
            className="arc-progress"
            d={arcPath(140, 0, Math.min(angle, 359.9))}
            style={{ stroke: arcColor }}
          />
        )
      )}

      {/* 針: 円弧の先端を指す短いポインタ（中央の数字を邪魔しないようリム寄りに） */}
      {!overtime && (
        <g
          className="hand"
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: "200px 200px",
          }}
        >
          <line x1={CX} y1={CY - 118} x2={CX} y2={CY - 158} style={{ stroke: arcColor }} />
        </g>
      )}

      {/* 中央表示 */}
      <text x={CX} y={140} className="clock-label">
        {label}
      </text>
      <text x={CX} y={228} className={`clock-time${overtime ? " over" : ""}`}>
        {fmtCountdown(remainingMs)}
      </text>
      <text x={CX} y={262} className="clock-sub">
        {paused ? "一時停止中" : subLabel}
      </text>
    </svg>
  );
}
