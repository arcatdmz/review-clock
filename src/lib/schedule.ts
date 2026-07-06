/**
 * スケジュール計算まわりの純関数。
 *
 * モデル:
 *   - レビューを totalWorks 個、1 レビューあたり perWorkSec 秒でレビューする
 *   - breakEvery 個レビューするごとに breakSec 秒の休憩を挟む
 *     （最後のレビューのあとには休憩を入れない。breakEvery = 0 で休憩なし）
 */

export interface PlanConfig {
  /** レビューするレビュー数 */
  totalWorks: number;
  /** 1 レビューあたりの持ち時間（秒） */
  perWorkSec: number;
  /** 何レビューごとに休憩を挟むか（0 = 休憩なし） */
  breakEvery: number;
  /** 休憩の長さ（秒） */
  breakSec: number;
  /** 目標終了日時（epoch ミリ秒） */
  targetEnd: number;
}

/** 全体に挟まる休憩の回数（最後のレビューのあとは数えない） */
export function totalBreaks(totalWorks: number, breakEvery: number): number {
  if (breakEvery <= 0 || totalWorks <= 1) return 0;
  return Math.floor((totalWorks - 1) / breakEvery);
}

/** completed 個レビューし終えた時点から先に残っている休憩の回数（進行中の休憩は含まない） */
export function breaksAfter(
  completed: number,
  totalWorks: number,
  breakEvery: number,
): number {
  if (breakEvery <= 0) return 0;
  return totalBreaks(totalWorks, breakEvery) - Math.floor(completed / breakEvery);
}

/** completed 個目を終えた直後に休憩に入るか */
export function isBreakPoint(
  completed: number,
  totalWorks: number,
  breakEvery: number,
): boolean {
  return (
    breakEvery > 0 && completed < totalWorks && completed % breakEvery === 0
  );
}

/** セッション全体の所要秒数（レビュー + 休憩） */
export function totalPlanSec(
  totalWorks: number,
  perWorkSec: number,
  breakEvery: number,
  breakSec: number,
): number {
  return (
    totalWorks * perWorkSec + totalBreaks(totalWorks, breakEvery) * breakSec
  );
}

/** 順算: いま始めた場合の終了日時（epoch ミリ秒） */
export function endFromNow(
  now: number,
  totalWorks: number,
  perWorkSec: number,
  breakEvery: number,
  breakSec: number,
): number {
  return now + totalPlanSec(totalWorks, perWorkSec, breakEvery, breakSec) * 1000;
}

/** 逆算: 目標終了日時から 1 レビューあたりの持ち時間（秒）を求める */
export function perWorkSecFromEnd(
  now: number,
  targetEnd: number,
  totalWorks: number,
  breakEvery: number,
  breakSec: number,
): number {
  if (totalWorks <= 0) return 0;
  const available =
    (targetEnd - now) / 1000 - totalBreaks(totalWorks, breakEvery) * breakSec;
  return Math.max(0, available / totalWorks);
}

/* ---------- 表示用フォーマッタ ---------- */

const pad2 = (n: number) => String(n).padStart(2, "0");

/** "18:30" 形式の時刻 */
export function fmtClock(ms: number): string {
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** 今日でなければ "7/8 " を前置した時刻 */
export function fmtClockWithDay(ms: number, now: number): string {
  const d = new Date(ms);
  const n = new Date(now);
  const sameDay =
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate();
  return sameDay
    ? fmtClock(ms)
    : `${d.getMonth() + 1}/${d.getDate()} ${fmtClock(ms)}`;
}

/** 所要時間を "2時間5分" "12分30秒" のように */
export function fmtDur(sec: number): string {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}時間`);
  if (m > 0) parts.push(`${m}分`);
  if (r > 0 || parts.length === 0) parts.push(`${r}秒`);
  // 1 時間以上のときは秒を省いてすっきり見せる
  if (h > 0) return parts.filter((p) => !p.endsWith("秒")).join("") || `${h}時間`;
  return parts.join("");
}

/** カウントダウン表示 "12:34" / "1:02:03"。負値（超過）は "+02:15" */
export function fmtCountdown(ms: number): string {
  const over = ms < 0;
  const s = Math.max(0, Math.floor(Math.abs(ms) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const body = h > 0 ? `${h}:${pad2(m)}:${pad2(r)}` : `${m}:${pad2(r)}`;
  return over ? `+${body}` : body;
}

/** <input type="datetime-local"> 用の "YYYY-MM-DDTHH:mm"（ローカル時刻） */
export function toLocalInputValue(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** datetime-local の値をローカル時刻として epoch ミリ秒へ（不正なら null） */
export function fromLocalInputValue(value: string): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}
