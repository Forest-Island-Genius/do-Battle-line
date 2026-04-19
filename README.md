# Nine Banners (ナインバナーズ)

> 9 本の軍旗を巡る、紋章と陣形のオンライン対戦カードゲーム。
> "Battle Line" の原案から独自にリブランドされた、数学的証明エンジン内蔵版です。

## ✨ 特徴

- **九旗の対戦**: 9 本の旗を挟んで両軍が陣形(Wedge / Phalanx / Battalion / Skirmisher / Host)を競う
- **数学的自動獲得**: 場に出ているカードから「いかなる残り山札を引いても相手が上回れない」瞬間に旗が自動獲得される
- **紋章デザイン**: 深紺 × 鮮紅 × 黄金 × 羊皮紙を基調としたヘラルドリーなビジュアル
- **リアルタイム通信対戦**: Firebase Realtime Database。未設定時は同一ブラウザ内で BroadcastChannel フォールバック
- **自動視点切替**: P1 / P2 どちら側で参加しても、自分の手札は常に下側
- **戦術カード**: 天候(Fog / Mud)と士気(Alexander / Darius / Shield / Companion) 計 6 種を実装
- **無料デプロイ対応**: Vercel + Firebase 無料枠

## 🚀 セットアップ

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 本番ビルド
```

オンライン対戦には Firebase が必要です。`.env.example` を `.env.local` にコピーし、Realtime Database の資格情報を入れてください。

## 🎨 ビジュアル生成 (Gemini / Nano Banana)

ロビーのヒーロー画像、羊皮紙テクスチャ、ワードマークを AI で生成 / 差し替え:

```bash
# 1. https://aistudio.google.com/apikey から Gemini API キーを取得
export GEMINI_API_KEY=your_key

# 2. 全部まとめて生成 (hero / parchment / wordmark)
npm run gen:hero

# 3. 個別生成
npm run gen:hero hero
npm run gen:hero parchment
```

`scripts/gen-hero.mjs` が Google 公式 `@google/genai` SDK で `gemini-2.5-flash-image` (通称 Nano Banana) を直接叩いて `src/assets/` に PNG を出力します。MCP 不要・ゼロ中間レイヤー・**本番アプリやサーバ関数からもそのまま同じ SDK を流用可能**です。

## 🛠 技術スタック

- **Frontend**: React 19 + Vite 8 + CSS Modules
- **Backend**: Firebase Realtime Database (オプション)
- **Utilities**: nanoid, react-router-dom

## 📜 ゲームの骨子

| 陣形 | 内容 |
|------|------|
| Wedge | 同色ストレート (最強) |
| Phalanx | 同値 3 枚 |
| Battalion | 同色 3 枚 |
| Skirmisher | 連続する 3 枚 |
| Host | ハイカード |

**勝利条件**: 旗を 5 本奪取、または 3 本連続で奪取。

## ⚖️ ライセンス

MIT License. "Battle Line" は Reiner Knizia 氏のオリジナル作品で本プロジェクトとは無関係です。
