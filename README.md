# Battle Line Online (バトルライン オンライン)

プレミアムな美しさと数学的な確定証明ロジックを備えた、対戦型カードゲーム『バトルライン』のWEB版です。

![Game Preview](https://via.placeholder.com/800x450?text=Battle+Line+Online)

## ✨ 特徴
- **リアルタイム通信対戦**: Firebase を利用し、世界中のプレイヤーと対戦可能。
- **フル日本語化 & プレミアムデザイン**: ダークモードを基調とした、視認性の高いモダンなUI。
- **高度な自動獲得ロジック**: 場に出ているカードから「数学的に勝利が確定」した時点で、自動的にフラッグを獲得。
- **自動視点切り替え**: P1、P2どちら側で参加しても、常に自分の手札が手前（下側）に表示されます。
- **無料デプロイ対応**: Vercel と Firebase の無料枠で運用可能。

## 🚀 デプロイ方法
1. GitHub リポジトリを作成し、このコードをプッシュします。
2. Vercel を GitHub リポジトリと連携させます。
3. `firebaseConfig` を環境変数として Vercel に登録します。

## 🛠 テクノロジー
- **Frontend**: React, Vite, CSS Modules
- **Backend**: Firebase Realtime Database
- **Utilities**: nanoid, Lucide Icons

## ⚖️ ライセンス
MIT License
