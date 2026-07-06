import { useEffect, useRef } from "react";
import { useNow } from "../hooks/useNow";
import { beep } from "../lib/audio";
import {
  fmtClockWithDay,
  fmtCountdown,
  fmtDur,
  type PlanConfig,
} from "../lib/schedule";
import {
  projectedEnd,
  remainingMs,
  type RunState,
} from "../lib/run";
import { ClockFace } from "./ClockFace";

interface RunScreenProps {
  config: PlanConfig;
  run: RunState;
  onComplete: () => void;
  onPause: () => void;
  onResume: () => void;
  onSkipBreak: () => void;
  onBreakTimeUp: () => void;
  onRedistribute: () => void;
  onReset: () => void;
}

export function RunScreen({
  config,
  run,
  onComplete,
  onPause,
  onResume,
  onSkipBreak,
  onBreakTimeUp,
  onRedistribute,
  onReset,
}: RunScreenProps) {
  const paused = run.status === "paused";
  const now = useNow(paused ? 1000 : 100);
  const remain = remainingMs(run, now);
  const fraction = 1 - remain / (run.phaseDurationSec * 1000);

  // レビューの持ち時間切れ: 0 をまたいだ瞬間に 2 回ビープ（超過カウントは続く）
  const prevRemain = useRef(remain);
  useEffect(() => {
    if (
      run.status === "running" &&
      run.phase === "work" &&
      prevRemain.current > 0 &&
      remain <= 0
    ) {
      beep([0, 0.4]);
    }
    prevRemain.current = remain;
  }, [remain, run.status, run.phase]);

  // 休憩は時間が来たら自動で次のレビューへ
  useEffect(() => {
    if (run.status === "running" && run.phase === "break" && remain <= 0) {
      beep([0]);
      onBreakTimeUp();
    }
  }, [remain, run.status, run.phase, onBreakTimeUp]);

  // タブのタイトルにも残り時間を出す
  useEffect(() => {
    const label =
      run.phase === "break" ? "休憩" : `${run.completed + 1}/${config.totalWorks}`;
    document.title = `${fmtCountdown(remain)} ▸ ${label} | Review Clock`;
    return () => {
      document.title = "Review Clock | レビュータイマー";
    };
  }, [remain, run.phase, run.completed, config.totalWorks]);

  const projected = projectedEnd(run, config, now);
  const deltaMin = Math.round((projected - config.targetEnd) / 60000);
  const pace =
    deltaMin > 0
      ? `予定より約 ${deltaMin} 分遅れ`
      : deltaMin < 0
        ? `予定より約 ${-deltaMin} 分の余裕`
        : "ぴったりのペース";

  const currentNo = Math.min(run.completed + 1, config.totalWorks);
  const label =
    run.phase === "break" ? "休憩" : `レビュー ${currentNo} / ${config.totalWorks}`;

  const untilBreak =
    config.breakEvery > 0 && run.phase === "work"
      ? config.breakEvery - (run.completed % config.breakEvery)
      : 0;

  return (
    <section className="run">
      <ClockFace
        fraction={fraction}
        remainingMs={remain}
        phase={run.phase}
        paused={paused}
        label={label}
        subLabel={`終了予定 ${fmtClockWithDay(projected, now)}`}
        works={{ total: config.totalWorks, completed: run.completed }}
      />

      <div className={`pace${deltaMin > 0 ? " behind" : ""}`}>
        <span>
          目標 {fmtClockWithDay(config.targetEnd, now)}・{pace}
        </span>
        {run.phase === "work" && untilBreak > 0 && config.breakEvery > 0 && (
          <span className="pace-sub">
            {untilBreak === 1
              ? "このレビューが終わったら休憩"
              : `休憩まであと ${untilBreak} 件`}
          </span>
        )}
      </div>

      <div className="controls">
        {run.phase === "work" ? (
          <button className="btn primary big" onClick={onComplete}>
            ✓ このレビューを完了して次へ
          </button>
        ) : (
          <button className="btn break big" onClick={onSkipBreak}>
            休憩を切り上げて次へ
          </button>
        )}
        <div className="controls-row">
          {paused ? (
            <button className="btn" onClick={onResume}>
              ▶ 再開
            </button>
          ) : (
            <button className="btn" onClick={onPause}>
              ⏸ 一時停止
            </button>
          )}
          {run.phase === "work" && (
            <button
              className="btn"
              title="目標終了日時はそのままに、残りのレビュー数で持ち時間を割り直します"
              onClick={onRedistribute}
            >
              残り時間を再配分
            </button>
          )}
          <button className="btn subtle" onClick={onReset}>
            リセット
          </button>
        </div>
      </div>

      {run.history.length > 0 && (
        <p className="stats-line">
          ここまで {run.completed} 件・平均{" "}
          {fmtDur(
            run.history.reduce((a, b) => a + b, 0) / run.history.length / 1000,
          )}
          /件
        </p>
      )}
    </section>
  );
}
