# KobitoKey RMK

KobitoKey 用の [RMK](https://github.com/HaoboGu/rmk) (Rust Mechanical Keyboard) ファームウェア。40キー無線分割キーボード + デュアルトラックボール。

## スペック

- **MCU**: Seeeduino XIAO BLE (nRF52840)
- **レイアウト**: BLE無線分割 (左=central, 右=peripheral)
- **キー数**: 片側20 (メイン17 + 親指3)、合計40
- **マトリクス**: 4行 x 5列/片側、col2row
- **トラックボール**: PMW3610 x 2 (SPI半二重)
- **機能**: Vial対応、7レイヤー、コンボ、Fork (mod-morph)

## キーマップ

![KobitoKey Keymap](images/keymap.svg)

**凡例**:
- 青キー = ホールドタップ (上段: タップ、下段: ホールド)
- 破線枠 = 透過 (下レイヤーを継承)
- 薄灰色 = 無効

### レイヤー一覧

| # | 名前 | 有効化方法 |
|---|------|-----------|
| 0 | デフォルト (Mac) | ベースレイヤー |
| 1 | Win/Linux | TG(1) トグル |
| 2 | 数字 & 記号 | Space 長押し |
| 3 | 設定 & メディア | Enter 長押し |
| 4 | マウス | 手動切替 |
| 5 | Emacs | LGui 長押し (レイヤー1時) |
| 6 | Neovim | S+D コンボ トグル (Ctrl長押し時のみCtrlに変更) |

### コンボ

2キー同時押しで記号やアクションを入力。

| キー | 出力 | Shift時 | 備考 |
|------|------|---------|------|
| Q + W | `` ` `` | `~` | |
| A + S | Tab | | |
| Y + U | Backspace | | |
| U + I | `\|` | `\` | Fork で反転 |
| I + O | `-` | `_` | |
| O + P | `=` | `+` | |
| J + K | `[` | `{` | |
| K + L | `]` | `}` | |
| L + ; | `'` | `"` | |
| N + M | Backspace | | |
| , + . | `/` | `?` | |
| D + F | Cmd+Alt | | Mac (L0) |
| D + F | Ctrl+Alt | | Win (L1) |
| S + D | TG(6) | | Neovim トグル |

### Fork (mod-morph)

Shift 押下時に出力を反転。Shift は自動的に抑制される。

| キー | 通常 | Shift時 |
|------|------|---------|
| `;` キー | `:` | `;` |
| `\` (U+I コンボ) | `\|` | `\` |

### ホールドタップ (親指キー)

| キー位置 | タップ | ホールド | レイヤー |
|----------|--------|---------|---------|
| 左親指1 | Backspace | Cmd (Mac) / Alt (Win) | 0 / 1 |
| 左親指2 | Ctrl | - | 0 |
| 左親指2 | Gui | Layer 5 | 1 |
| 左親指3 | 無変換 | Shift | 0 |
| 右親指1 | Escape | Alt (Mac) / Gui (Win) | 0 / 1 |
| 右親指2 | Space | Layer 2 | 0 |
| 右親指3 | Enter | Layer 3 | 0 |

右小指のキーにもホールドタップあり:

| キー位置 | タップ | ホールド | レイヤー |
|----------|--------|---------|---------|
| `/` キー | `/` | Cmd+Ctrl (Mac) / Ctrl+Alt (Win) | 0 / 1 |

## ビルド

```sh
# 開発環境に入る
nix develop
# または direnv: プロジェクトディレクトリに移動するだけ

# ビルド
cargo build --release --bin central
cargo build --release --bin peripheral

# UF2 ファイル生成
cargo make uf2
```

## フラッシュ

1. XIAO BLE のリセットボタンを素早く2回タップしてブートローダーモードに入る
2. USB ドライブが表示される
3. `rmk-central.uf2` を左半分にドラッグ & ドロップ
4. `rmk-peripheral.uf2` を右半分にも同様に行う

## ZMK からの移植状況

| 機能 | 状態 | 備考 |
|------|------|------|
| キーマトリクス | 移植済 | 4x10 (5x4 x 2) |
| BLE 分割 | 移植済 | |
| PMW3610 トラックボール | 移植済 | 左右両側 |
| 7レイヤーキーマップ | 移植済 | |
| コンボ (14個) | 移植済 | |
| mod-morph (Fork) | 一部移植 | colon_semi, pipe_bslash のみ (反転動作が必要な2つ) |
| ホールドタップ (MT/LT) | 移植済 | `;`キーのみ Fork と MT 併用不可のため MT 省略 |
| Vial | 対応済 | |
| オートマウスレイヤー | 未移植 | RMK 未対応 |
| トラックボール回転角度 | 未移植 | RMK は invert/swap のみ対応 |
| tap-dance | 未移植 | RMK の morse で対応可能 |
