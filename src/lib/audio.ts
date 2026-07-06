/** 時間切れなどを知らせる控えめなビープ音（WebAudio） */

let ctx: AudioContext | null = null;

/** ユーザー操作のタイミングで呼んで AudioContext を確実に有効化する */
export function initAudio(): void {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
}

/** offsets 秒後に短いビープを鳴らす（例: beep([0, 0.35]) で 2 回） */
export function beep(offsets: number[] = [0]): void {
  try {
    initAudio();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    for (const offset of offsets) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, t0 + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + offset);
      osc.stop(t0 + offset + 0.35);
    }
  } catch {
    // 音が鳴らなくても本体機能には影響させない
  }
}
