# 3D Space Invaders

Three.js で作ったブラウザで遊べる 3D スペースインベーダーゲームです。
自機の背後上空から見下ろす視点で、クラシックなインベーダーのルールを 3D 空間で再現しています。

**▶ 今すぐ遊ぶ: https://qua2psy10-web.github.io/claude-game-spaceinvader/**

スマホ(iPhone/Android)でも上記 URL を開くだけで遊べます。画面下にタッチ操作ボタンが表示されます。
iPhone では Safari の共有メニューから「ホーム画面に追加」すると全画面のアプリ風に起動できます。

## 遊び方

| 操作 | キーボード | タッチ |
| --- | --- | --- |
| 左右移動 | ← → または A / D | ◀ ▶ ボタン |
| 発射 | スペース / ↑ / W | ● ボタン |
| ゲーム開始・リスタート | スペース | 画面タップ |
| サウンド ON/OFF | M | 🔊 ボタン(右上) |

### ルール

- 敵編隊を全滅させると次のウェーブへ進み、敵の移動と攻撃が速くなります(無限ウェーブ制)
- 敵は残り数が減るほど速く動きます(原作準拠)
- 敵の弾に当たると残機が 1 減ります(残機 3・被弾後は短い無敵時間あり)
- 敵編隊が自機のラインまで前進するとゲームオーバー
- 敵の点数: 最上段 30 点 / 中段 20 点 / 下段 10 点
- ハイスコアはブラウザ(localStorage)に保存されます

## 開発

```bash
npm install
npm run dev      # 開発サーバー起動 (http://localhost:5173)
npm run build    # 本番ビルド (dist/ に出力)
npm run preview  # ビルド結果のプレビュー
```

### デプロイ

デフォルトブランチに push すると GitHub Actions(`.github/workflows/deploy.yml`)が
自動でビルドして GitHub Pages に公開します。

## 技術構成

- [Three.js](https://threejs.org/) — 3D 描画
- [Vite](https://vitejs.dev/) — 開発サーバー・ビルド
- Web Audio API — 効果音と BGM をオシレーターでリアルタイム合成(外部音声ファイル不使用)
  - BGM はチップチューン風の 2 小節ループで、敵が減る・ウェーブが進むほどテンポアップ
- 3D モデルはすべて Three.js のプリミティブの組み合わせ(外部アセット不使用)

### ソース構成

```
src/
├── main.js         # エントリポイント
├── game.js         # ゲーム状態機械・スコア/残機/ウェーブ管理・衝突判定
├── constants.js    # フィールド寸法・難易度チューニング値
├── scene.js        # レンダラー・カメラ・ライト・星空背景
├── player.js       # 自機の生成・移動・無敵時間
├── invaders.js     # 敵編隊の生成・ステップ移動・攻撃
├── projectiles.js  # 自機弾/敵弾の管理
├── effects.js      # 爆発パーティクル・カメラシェイク
├── audio.js        # Web Audio 合成効果音・ミュート管理
├── music.js        # チップチューン BGM シーケンサー
├── input.js        # キーボード+タッチ入力
└── hud.js          # HTML オーバーレイ HUD
```
