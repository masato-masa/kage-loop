# かげループ（kage-loop）

**ユーザーの仕様ではなく、Claude が 0 から考えて作ったゲーム**（2026-11-08、「新しいゲームを 0 から考えて作ってみて」の依頼）。
過去の自分の動き（かげ）に協力させて、出口へ着くパズル。

- 公開: https://masato-masa.github.io/kage-loop/ （`npm run deploy`）。ゲーム棚（all-game）にも載せてある。
- 規則（`src/game/engine.ts` の冒頭コメントが正本）: 1 ループ = T 手。動きが次のループで「かげ」になり、終わった場所に立ち続ける。
  スイッチ（a b c）に誰かが乗っている間だけ同じ名前の扉（A B C）が開く。**逆の扉（1 2 3）は、同じスイッチが空いている間だけ開く**
  → かげを置きっぱなしにすると詰む。いつ降ろすかの時間の駆け引きが核。かげは自分にぶつからず、記録どおり歩く（扉は自分だけをふさぐ）。
- **面は必ずソルバーで検証する**: `npm run audit`（全面の最少ループ数 = par を照合）。`npm test` も同じ検証を含む。面を足したら両方走らせる。
  ソルバーは「かげの組み合わせ = スイッチ占有の列（時刻ごとのビット）」で状態を畳み、通常の扉だけのスイッチは下位互換を捨てる（`prune`）。
- 面の探索: `npx tsx scripts/gen-levels.ts <幅> <高さ> <T> <目標ループ> <秒> [逆の扉の数]`。全扉・全スイッチが必要な盤だけを出す。
  逆の扉入りは状態が多く遅い（T=10 で数秒〜）。1 度に 1〜2 本まで（メモリ）。
- 確認用 URL: `?mute`（消音）、`?all`（全面を開く）、`?lv=3-2`（その面から）。
- 素材は ChatGPT 製: `refs/gen/{props,chars}.png`（git 管理外・元データは game-assets）→ `node scripts/slice-gen.mjs` → `src/assets/gen/`。
  かげの色違いは CSS の hue-rotate。逆の扉の縞は CSS（`.inv-mark`）。
- 効果音は WebAudio で合成（`src/ui/sound.ts`）。
- **こたえ**: `npm run solutions`（`scripts/make-solutions.ts`）が各面の最少ループの動きを `src/game/solutions.json` に書く。面を足したら audit → solutions の順に走らせる。
  テストが答えを実際の操作で再生して出口に着くか確かめる（面を直して答えが古くなると落ちる）。
- **重い面（逆の扉が 2 組以上）は witness**: 全探索が TooBig で落ちる面は、`Level.witness`（ループごとの動き `u d l r w`）を手で書く。
  `verify` が「下限 = 逆の扉を床にした緩い版の厳密解」と「上限 = witness の再生」で挟んで par を証明する。こたえ（solutions.json）にも witness を使う。
