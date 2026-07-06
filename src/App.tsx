import { useCallback, useEffect, useState } from "react";
import { SetupForm } from "./components/SetupForm";
import { RunScreen } from "./components/RunScreen";
import { FinishedScreen } from "./components/FinishedScreen";
import { initAudio } from "./lib/audio";
import type { PlanConfig } from "./lib/schedule";
import {
  completeWork,
  nextWork,
  pauseRun,
  redistributedPerWorkSec,
  resumeRun,
  startRun,
  type RunState,
} from "./lib/run";

const STORAGE_KEY = "review-clock:v1";

interface Persisted {
  config: PlanConfig | null;
  run: RunState | null;
}

function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Persisted;
  } catch {
    // 壊れた保存データは捨てて初期状態から
  }
  return { config: null, run: null };
}

export default function App() {
  const [persisted] = useState(loadPersisted);
  const [config, setConfig] = useState<PlanConfig | null>(persisted.config);
  const [run, setRun] = useState<RunState | null>(persisted.run);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ config, run }));
  }, [config, run]);

  const handleStart = (cfg: PlanConfig) => {
    initAudio(); // クリック起点で音を有効化しておく
    setConfig(cfg);
    setRun(startRun(cfg, Date.now()));
  };

  const handleComplete = useCallback(() => {
    setRun((r) =>
      r && config ? completeWork(r, config, Date.now()) : r,
    );
  }, [config]);

  const handleSkipBreak = useCallback(() => {
    setRun((r) => (r && config ? nextWork(r, config, Date.now()) : r));
  }, [config]);

  const handlePause = useCallback(
    () => setRun((r) => (r ? pauseRun(r, Date.now()) : r)),
    [],
  );
  const handleResume = useCallback(
    () => setRun((r) => (r ? resumeRun(r, Date.now()) : r)),
    [],
  );

  const handleRedistribute = useCallback(() => {
    if (!run || !config) return;
    const now = Date.now();
    const sec = redistributedPerWorkSec(run, config, now);
    if (sec === null) {
      alert("再配分できません（目標終了日時まで時間が足りません）。");
      return;
    }
    setConfig({ ...config, perWorkSec: Math.round(sec) });
    setRun({
      ...run,
      status: "running",
      phaseEndsAt: now + sec * 1000,
      phaseDurationSec: sec,
      pausedRemainingMs: null,
      workStartedAt: now,
    });
  }, [run, config]);

  const handleReset = useCallback(() => {
    if (window.confirm("セッションをリセットして設定に戻りますか？")) {
      setRun(null);
    }
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <h1>
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="16" cy="16" r="14" fill="var(--accent)" />
            <path
              d="M16 8v8l6 4"
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          Review Clock
          <span className="topbar-sub">レビュータイマー</span>
        </h1>
      </header>

      <main>
        {run === null || config === null ? (
          <SetupForm initial={config} onStart={handleStart} />
        ) : run.status === "finished" ? (
          <FinishedScreen
            config={config}
            run={run}
            onNewSession={() => setRun(null)}
          />
        ) : (
          <RunScreen
            config={config}
            run={run}
            onComplete={handleComplete}
            onPause={handlePause}
            onResume={handleResume}
            onSkipBreak={handleSkipBreak}
            onBreakTimeUp={handleSkipBreak}
            onRedistribute={handleRedistribute}
            onReset={handleReset}
          />
        )}
      </main>

      <footer className="footer">
        休憩は時間が来ると自動で次のレビューに進みます・進捗はこの端末に自動保存されます
      </footer>
    </div>
  );
}
