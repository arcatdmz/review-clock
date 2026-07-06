import { fmtClock, fmtDur, type PlanConfig } from "../lib/schedule";
import type { RunState } from "../lib/run";

interface FinishedScreenProps {
  config: PlanConfig;
  run: RunState;
  onNewSession: () => void;
}

export function FinishedScreen({ config, run, onNewSession }: FinishedScreenProps) {
  const finishedAt = run.startedAt + run.history.reduce((a, b) => a + b, 0);
  const totalMs = run.history.reduce((a, b) => a + b, 0);
  const avgSec = run.history.length > 0 ? totalMs / run.history.length / 1000 : 0;
  const early = config.targetEnd - Date.now();

  return (
    <section className="card finished">
      <div className="finished-mark">✓</div>
      <h2>おつかれさまでした！</h2>
      <p>
        {config.totalWorks} 件のレビューが終わりました（
        {fmtClock(run.startedAt)} 開始 → {fmtClock(finishedAt)} ごろ完了）。
      </p>
      <p>
        レビューにかけた時間は合計 <strong>{fmtDur(totalMs / 1000)}</strong>、平均{" "}
        <strong>{fmtDur(avgSec)}</strong>/件でした。
        {early > 60000 && (
          <>
            <br />
            目標より約 {Math.round(early / 60000)} 分早い完了です。
          </>
        )}
      </p>
      <button className="btn primary big" onClick={onNewSession}>
        新しいセッションを始める
      </button>
    </section>
  );
}
