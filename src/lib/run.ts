/**
 * 実行中セッションの状態と遷移。
 * 時刻はすべて epoch ミリ秒の絶対値で持つので、リロードしても継続できる。
 */

import {
  breaksAfter,
  isBreakPoint,
  type PlanConfig,
} from "./schedule";

export type Phase = "work" | "break";

export interface RunState {
  status: "running" | "paused" | "finished";
  /** レビューし終えたレビュー数 */
  completed: number;
  phase: Phase;
  /** 現フェーズの持ち時間が尽きる時刻 */
  phaseEndsAt: number;
  /** 現フェーズの持ち時間（秒）。円グラフの分母 */
  phaseDurationSec: number;
  /** 一時停止中に凍結した残りミリ秒（超過中は負値） */
  pausedRemainingMs: number | null;
  startedAt: number;
  /** いまのレビューに取りかかった時刻（実績記録用） */
  workStartedAt: number;
  /** レビューごとの実所要ミリ秒 */
  history: number[];
}

export function startRun(config: PlanConfig, now: number): RunState {
  return {
    status: "running",
    completed: 0,
    phase: "work",
    phaseEndsAt: now + config.perWorkSec * 1000,
    phaseDurationSec: config.perWorkSec,
    pausedRemainingMs: null,
    startedAt: now,
    workStartedAt: now,
    history: [],
  };
}

export function remainingMs(run: RunState, now: number): number {
  if (run.pausedRemainingMs !== null) return run.pausedRemainingMs;
  return run.phaseEndsAt - now;
}

export function pauseRun(run: RunState, now: number): RunState {
  if (run.status !== "running") return run;
  return { ...run, status: "paused", pausedRemainingMs: run.phaseEndsAt - now };
}

export function resumeRun(run: RunState, now: number): RunState {
  if (run.status !== "paused" || run.pausedRemainingMs === null) return run;
  return {
    ...run,
    status: "running",
    phaseEndsAt: now + run.pausedRemainingMs,
    pausedRemainingMs: null,
  };
}

/** いまのレビューを完了して、休憩または次のレビューへ */
export function completeWork(
  run: RunState,
  config: PlanConfig,
  now: number,
): RunState {
  if (run.phase !== "work" || run.status === "finished") return run;
  const completed = run.completed + 1;
  const history = [...run.history, now - run.workStartedAt];
  if (completed >= config.totalWorks) {
    return { ...run, status: "finished", completed, history };
  }
  if (isBreakPoint(completed, config.totalWorks, config.breakEvery)) {
    return {
      ...run,
      status: "running",
      completed,
      history,
      phase: "break",
      phaseEndsAt: now + config.breakSec * 1000,
      phaseDurationSec: config.breakSec,
      pausedRemainingMs: null,
    };
  }
  return nextWork({ ...run, completed, history }, config, now);
}

/** 休憩を終えて（またはスキップして）次のレビューへ */
export function nextWork(
  run: RunState,
  config: PlanConfig,
  now: number,
): RunState {
  return {
    ...run,
    status: "running",
    phase: "work",
    phaseEndsAt: now + config.perWorkSec * 1000,
    phaseDurationSec: config.perWorkSec,
    pausedRemainingMs: null,
    workStartedAt: now,
  };
}

/**
 * 残り時間の再配分: 目標終了日時は動かさず、残りレビュー数で割り直して
 * 1 レビューあたりの持ち時間を計算し直す。いまのレビューは仕切り直しになる。
 * 戻り値は新しい perWorkSec（不可能なら null）。
 */
export function redistributedPerWorkSec(
  run: RunState,
  config: PlanConfig,
  now: number,
): number | null {
  if (run.phase !== "work") return null;
  const remainingWorks = config.totalWorks - run.completed;
  if (remainingWorks <= 0) return null;
  const remainingBreakSec =
    breaksAfter(run.completed + 1, config.totalWorks, config.breakEvery) *
    config.breakSec;
  const sec = ((config.targetEnd - now) / 1000 - remainingBreakSec) / remainingWorks;
  return sec >= 5 ? sec : null;
}

/** このままのペースで進んだ場合の終了予定時刻（超過中のレビューは「いま終わる」とみなす） */
export function projectedEnd(
  run: RunState,
  config: PlanConfig,
  now: number,
): number {
  const remainCurrent = Math.max(0, remainingMs(run, now));
  if (run.phase === "work") {
    const worksAfterCurrent = config.totalWorks - run.completed - 1;
    const breaks = breaksAfter(
      run.completed + 1,
      config.totalWorks,
      config.breakEvery,
    );
    return (
      now +
      remainCurrent +
      (worksAfterCurrent * config.perWorkSec + breaks * config.breakSec) * 1000
    );
  }
  const remainingWorks = config.totalWorks - run.completed;
  const breaks = breaksAfter(run.completed, config.totalWorks, config.breakEvery);
  return (
    now +
    remainCurrent +
    (remainingWorks * config.perWorkSec + breaks * config.breakSec) * 1000
  );
}
