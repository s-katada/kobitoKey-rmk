# KobitoKey Web Editor

KobitoKey 用の Web キーマップエディタ。`kobu/web` をベースに、KobitoKey の VID/PID 等に置き換えたもの。

WebHID で動作するため Chrome / Edge / Brave / Opera など Chromium 系ブラウザでのみ動作します (Safari / Firefox は WebHID 未対応)。

## 主要機能

- **WebHID 接続** — セントラル (左半身) を USB-C で繋いで認可するだけ。再アクセス時は自動再接続。
- **キーマップ編集** — 全レイヤーをグリッド表示し、キーをクリックするとピッカーから割当変更。
- **コンボ編集** — 出力キーと最大 16 個のコンボを編集。
- **マクロ編集** — Down/Up/Tap/Delay 操作で任意のシーケンスを定義。
- **Morse (TapDance / HoldTap) 編集** — tap / hold / double_tap などを編集。
- **トラックボール CPI** — 左右の PMW3610 CPI スライダー (200..3200, 200 ステップ)。
- **PWA** — オフライン動作。インストールしてデスクトップアプリのように使える。

⚠ **CPI の永続化は firmware 側の追加実装が必要です**。現状はスライダー操作で wire 上の書き込みは走りますが、RMK 0.8 のスタブハンドラが ACK するだけで保存されません。恒久的に変更したい場合は `../keyboard.toml` の `cpi` を編集して再フラッシュしてください。

## 開発環境

```sh
cd web
direnv allow             # Node 22 + pnpm の devshell を有効化
pnpm install
pnpm dev                 # http://localhost:5173
```

または手動で:

```sh
nix develop "path:..#web"
pnpm install
pnpm dev
```

## スクリプト

```sh
pnpm dev          # 開発サーバ起動
pnpm build        # 本番ビルド (dist/ に出力)
pnpm preview      # build 結果をローカルでプレビュー
pnpm typecheck    # TypeScript 型チェックのみ
pnpm test         # vitest をワンショット実行
pnpm test:watch   # vitest watch モード
pnpm test:ui      # vitest UI
pnpm coverage     # カバレッジ計測
pnpm lint         # Biome lint
pnpm format       # Biome format
```

## 構成

```
web/
├── src/
│   ├── App.tsx                       — ルート構成
│   ├── main.tsx                      — エントリ
│   ├── components/                   — UI コンポーネント
│   │   ├── KeymapView.tsx            — レイヤーグリッド
│   │   ├── KeycodePicker.tsx         — キー割当ピッカー
│   │   ├── ComboEditor.tsx
│   │   ├── MacroEditor.tsx
│   │   ├── MorseEditor.tsx
│   │   ├── KobitokeySettingsPanel.tsx — CPI などの custom value
│   │   ├── BluetoothPanel.tsx
│   │   └── ...
│   ├── protocol/                     — Vial wire プロトコル
│   │   ├── commands.ts               — Via/Vial コマンドビルダー
│   │   ├── handshake.ts              — プロトコル版/レイアウト取得
│   │   ├── keymap.ts                 — キーマップ get/set
│   │   ├── combos.ts                 — コンボ get/set
│   │   ├── morses.ts                 — Morse get/set
│   │   ├── macros.ts                 — マクロ get/set
│   │   ├── customValue.ts            — CPI 等 Custom Value (0xC0 ch)
│   │   └── ...
│   ├── state/                        — Zustand ストア
│   ├── transport/                    — WebHID 接続
│   ├── install/                      — UF2 のブラウザ経由フラッシュ
│   └── test/setup.ts
├── index.html
├── vite.config.ts
├── package.json
└── ...
```

## firmware 側の要対応事項

| 機能 | 状態 |
|------|------|
| キーマップ get/set | ✅ RMK 0.8 標準 Vial に対応済 |
| コンボ get/set | ✅ |
| マクロ get/set | ✅ |
| Morse get/set | ✅ |
| BLE プロファイル | ✅ |
| **CPI Custom Value** | ❌ firmware 側未実装。`keyboard.toml` 経由のみ |

## 接続できないとき

1. **Chromium 系ブラウザを使う**: Safari / Firefox は WebHID 未対応
2. **HTTPS または localhost で開く**: WebHID は安全コンテキスト必須
3. **USB-C ケーブルでセントラル (左半身) を繋ぐ**: ペリフェラル単独では話せない
4. **権限を許可する**: 1 回目は `chrome://settings/content/hid` の許可リストに追加
5. **デバイスが KobitoKey として認識されている**: VID 0x4B4B / PID 0x0001 を確認

## ライセンス

GPLv2 (ベースの `kobu/web` のライセンスを継承)。
