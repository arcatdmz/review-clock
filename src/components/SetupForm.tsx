import { useState } from "react";
import { useNow } from "../hooks/useNow";
import {
  endFromNow,
  fmtClockWithDay,
  fmtDur,
  fromLocalInputValue,
  perWorkSecFromEnd,
  toLocalInputValue,
  totalBreaks,
  totalPlanSec,
  type PlanConfig,
} from "../lib/schedule";

/**
 * 「1 レビューあたりの時間」と「目標終了日時」は双方向:
 * 最後に編集した側を anchor として、もう一方を毎秒計算し直して表示する。
 */
type Anchor = "perWork" | "deadline";

interface SetupFormProps {
  initial: PlanConfig | null;
  onStart: (config: PlanConfig) => void;
}

const num = (s: string): number => {
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

export function SetupForm({ initial, onStart }: SetupFormProps) {
  const now = useNow(1000);

  const [works, setWorks] = useState(String(initial?.totalWorks ?? 10));
  const [perWorkMin, setPerWorkMin] = useState(
    initial ? String(Math.round((initial.perWorkSec / 60) * 10) / 10) : "15",
  );
  const [deadline, setDeadline] = useState("");
  const [breakEvery, setBreakEvery] = useState(String(initial?.breakEvery ?? 5));
  const [breakMin, setBreakMin] = useState(
    initial ? String(Math.round(initial.breakSec / 60)) : "10",
  );
  const [anchor, setAnchor] = useState<Anchor>("perWork");

  const totalWorks = Math.floor(num(works));
  const breakEveryN = Math.floor(num(breakEvery)) || 0;
  const breakSec = Math.max(0, num(breakMin)) * 60 || 0;

  // anchor でない側を導出する
  const deadlineMs = fromLocalInputValue(deadline);
  let perWorkSec: number;
  let targetEnd: number | null;
  if (anchor === "deadline" && deadlineMs !== null) {
    perWorkSec = perWorkSecFromEnd(now, deadlineMs, totalWorks, breakEveryN, breakSec);
    targetEnd = deadlineMs;
  } else {
    perWorkSec = Math.max(0, num(perWorkMin)) * 60;
    targetEnd =
      totalWorks > 0 && perWorkSec > 0
        ? endFromNow(now, totalWorks, perWorkSec, breakEveryN, breakSec)
        : null;
  }

  const breaks = totalBreaks(totalWorks, breakEveryN);
  const totalSec =
    totalWorks > 0 ? totalPlanSec(totalWorks, perWorkSec, breakEveryN, breakSec) : 0;

  const errors: string[] = [];
  if (!(totalWorks >= 1)) errors.push("レビュー数は 1 以上にしてください");
  if (anchor === "deadline" && deadlineMs === null)
    errors.push("目標終了日時を入力してください");
  if (totalWorks >= 1 && perWorkSec < 10)
    errors.push(
      anchor === "deadline"
        ? "目標までの時間が短すぎます（1 レビューあたり 10 秒未満になります）"
        : "1 レビューあたりの時間を入力してください",
    );
  const valid = errors.length === 0 && targetEnd !== null;

  const displayedDeadline =
    anchor === "deadline" ? deadline : targetEnd !== null ? toLocalInputValue(targetEnd) : "";
  const displayedPerWorkMin =
    anchor === "perWork"
      ? perWorkMin
      : perWorkSec > 0
        ? String(Math.round((perWorkSec / 60) * 10) / 10)
        : "";

  const start = () => {
    if (!valid || targetEnd === null) return;
    onStart({
      totalWorks,
      perWorkSec: Math.round(perWorkSec),
      breakEvery: breakEveryN,
      breakSec: Math.round(breakSec),
      targetEnd,
    });
  };

  return (
    <section className="card mt-card setup">
      <h2>セッション設定</h2>
      <div className="fields">
        <label className="field">
          <span className="field-label">レビュー数</span>
          <span className="field-input">
            <input
              className="mt-input"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={works}
              onChange={(e) => setWorks(e.target.value)}
            />
            <span className="unit">件</span>
          </span>
        </label>

        <label className={`field${anchor === "perWork" ? " anchored" : ""}`}>
          <span className="field-label">
            1 レビューあたり
            {anchor === "deadline" && <em className="derived-mark">（逆算）</em>}
          </span>
          <span className="field-input">
            <input
              className="mt-input"
              type="number"
              min={0}
              step={0.5}
              inputMode="decimal"
              value={displayedPerWorkMin}
              onChange={(e) => {
                setAnchor("perWork");
                setPerWorkMin(e.target.value);
              }}
            />
            <span className="unit">分</span>
          </span>
          {perWorkSec >= 10 && (
            <span className="field-note">= {fmtDur(perWorkSec)}</span>
          )}
        </label>

        <label className={`field wide${anchor === "deadline" ? " anchored" : ""}`}>
          <span className="field-label">
            目標終了日時
            {anchor === "perWork" && <em className="derived-mark">（自動計算）</em>}
          </span>
          <span className="field-input">
            <input
              className="mt-input"
              type="datetime-local"
              value={displayedDeadline}
              onChange={(e) => {
                setAnchor("deadline");
                setDeadline(e.target.value);
              }}
            />
          </span>
        </label>

        <label className="field">
          <span className="field-label">休憩の間隔</span>
          <span className="field-input">
            <input
              className="mt-input"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={breakEvery}
              onChange={(e) => setBreakEvery(e.target.value)}
            />
            <span className="unit">件ごと</span>
          </span>
          <span className="field-note">0 で休憩なし</span>
        </label>

        <label className="field">
          <span className="field-label">休憩の長さ</span>
          <span className="field-input">
            <input
              className="mt-input"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={breakMin}
              disabled={breakEveryN <= 0}
              onChange={(e) => setBreakMin(e.target.value)}
            />
            <span className="unit">分</span>
          </span>
        </label>
      </div>

      {valid && targetEnd !== null ? (
        <p className="summary mt-summary">
          レビュー {totalWorks} 件 × {fmtDur(perWorkSec)}
          {breaks > 0 && ` ＋ 休憩 ${breaks} 回 × ${fmtDur(breakSec)}`} ＝ 合計{" "}
          <strong>{fmtDur(totalSec)}</strong>
          <br />
          いま始めると <strong>{fmtClockWithDay(now + totalSec * 1000, now)}</strong>{" "}
          に終わります
        </p>
      ) : (
        <p className="summary error">{errors[0]}</p>
      )}

      <button className="btn mt-button mt-button-primary primary big" disabled={!valid} onClick={start}>
        レビュー開始
      </button>
    </section>
  );
}
