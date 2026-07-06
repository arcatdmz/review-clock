# Review Clock — レビュータイマー

決まった時間までに一定数のレビューを行うための、ポモドーロ風タイマーです。

## 使い方

```sh
npm install
npm run dev      # 開発サーバ (http://localhost:5173)
npm run build    # 型チェック + 本番ビルド (dist/)
npm run preview  # ビルド結果の確認
```

要件: Node.js v24 以降。

## 機能

- **双方向のスケジュール計算** — 「1 レビューあたりの時間」を決めると終了日時が自動計算され、逆に「目標終了日時」を入れると 1 レビューあたりの持ち時間が逆算されます。最後に編集した側が基準（フォームでティール色の枠）になります。
- **休憩** — 「n 件ごとに m 分」を指定。休憩は時間が来ると自動で次のレビューに進みます（切り上げも可）。最後のレビューのあとには休憩は入りません。
- **2D のアナログ調タイマー盤面** — 円弧と針が現フェーズの経過を、外周のドットがレビューごとの進捗を示します。持ち時間を超過すると赤くなり、超過時間をカウントアップします。
- **ペース表示** — このままのペースで進んだ場合の終了予定と、目標との差（余裕 / 遅れ）を常時表示します。
- **残り時間の再配分** — 押した瞬間の残り時間を残りのレビュー数で割り直します。遅れ気味のときの仕切り直しに。
- **自動保存** — 設定と進捗は localStorage に保存されるので、リロードやブラウザの再起動をまたいで継続できます。
- 時間切れ・休憩明けはビープ音とタブタイトルで通知します。

## 構成

| パス | 役割 |
| --- | --- |
| [src/lib/schedule.ts](src/lib/schedule.ts) | スケジュール計算の純関数（順算・逆算・フォーマッタ） |
| [src/lib/run.ts](src/lib/run.ts) | 実行中セッションの状態遷移（開始・完了・休憩・一時停止・再配分） |
| [src/lib/audio.ts](src/lib/audio.ts) | WebAudio によるビープ音 |
| [src/components/SetupForm.tsx](src/components/SetupForm.tsx) | 設定フォーム（双方向計算の UI） |
| [src/components/ClockFace.tsx](src/components/ClockFace.tsx) | SVG のタイマー盤面 |
| [src/components/RunScreen.tsx](src/components/RunScreen.tsx) | 実行画面（通知・ペース表示・操作） |
| [src/App.tsx](src/App.tsx) | 画面遷移と localStorage への永続化 |

時刻はすべて epoch ミリ秒の絶対値で持っているため、タブが非アクティブでもタイマーはずれません。

技術スタック: Node.js v24 / TypeScript (strict) / React 19 / Vite。UI ライブラリは使わず、CSS + SVG のみです。
