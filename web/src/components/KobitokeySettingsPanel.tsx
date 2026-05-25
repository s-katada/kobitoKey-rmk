/**
 * KobitoKey 固有の設定パネル。
 *
 * 現状はトラックボール CPI (左右) のみ。
 * Via "Custom Value" チャネル (0xC0) を経由するが、firmware 側の
 * ハンドラ未実装のためスライダー操作は wire 上は走るものの
 * 永続化されない。下のバナーで明示する。
 */

import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { KOBITOKEY_VALUES, type KobitokeySettingKey } from '../protocol/customValue';
import { TRACKBALL_KEYS, useKobitokeySettingsStore } from '../state/kobitokeySettings';

export function KobitokeySettingsPanel() {
  const phase = useKobitokeySettingsStore((s) => s.phase);
  const local = useKobitokeySettingsStore(useShallow((s) => s.local));
  const setValue = useKobitokeySettingsStore((s) => s.setValue);
  const resetCategory = useKobitokeySettingsStore((s) => s.resetCategory);
  const resetAll = useKobitokeySettingsStore((s) => s.resetAll);
  const reload = useKobitokeySettingsStore((s) => s.reloadFromDevice);

  const [bannerDismissed, setBannerDismissed] = useState(false);

  if (phase.kind === 'empty' || phase.kind === 'loading') {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">KobitoKey 設定を読み込み中…</p>;
  }

  const error = phase.kind === 'error' ? phase.message : null;

  return (
    <section
      aria-labelledby="kobitokey-settings-heading"
      className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden"
    >
      <header className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
        <h3 id="kobitokey-settings-heading" className="text-sm font-medium">
          KobitoKey 設定
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          トラックボールの CPI (感度)。スライダーをドラッグで即時反映。
        </p>
      </header>

      {!bannerDismissed && (
        <div className="px-4 py-2 border-b border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 flex items-start gap-3 text-xs">
          <div className="flex-1">
            <p className="font-medium">⚠ 開発中の機能です</p>
            <p className="text-zinc-700 dark:text-zinc-300 mt-0.5">
              CPI 永続化には firmware 側で QMK Via Custom Value (channel 0xC0) を
              実装する必要があります。現状の RMK スタブは ACK のみで保存はされません。
              恒久的に変更したい場合は <code>keyboard.toml</code> の
              <code>cpi</code> を編集して再フラッシュしてください。
            </p>
          </div>
          <button
            type="button"
            aria-label="非表示"
            onClick={() => setBannerDismissed(true)}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            ×
          </button>
        </div>
      )}

      <Category
        title="トラックボール"
        keys={TRACKBALL_KEYS}
        local={local}
        setValue={setValue}
        onReset={() => resetCategory(TRACKBALL_KEYS)}
      />

      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 flex flex-wrap items-center justify-end gap-2 bg-zinc-50 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => {
            void reload();
          }}
          className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          デバイスから再読込
        </button>
        <button
          type="button"
          onClick={resetAll}
          className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          既定値に戻す
        </button>
        {error && <div className="w-full text-sm text-rose-700 dark:text-rose-400">{error}</div>}
      </footer>
    </section>
  );
}

interface CategoryProps {
  title: string;
  keys: readonly KobitokeySettingKey[];
  local: Record<KobitokeySettingKey, number>;
  setValue: (key: KobitokeySettingKey, value: number) => void;
  onReset: () => void;
}

function Category({ title, keys, local, setValue, onReset }: CategoryProps) {
  return (
    <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 last:border-b-0">
      <div className="flex items-center mb-2">
        <h4 className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {title}
        </h4>
        <button
          type="button"
          onClick={onReset}
          className="ml-auto rounded px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          このカテゴリを初期化
        </button>
      </div>
      <div className="space-y-3">
        {keys.map((key) => (
          <SettingRow
            key={key}
            keyName={key}
            value={local[key]}
            onChange={(v) => setValue(key, v)}
          />
        ))}
      </div>
    </div>
  );
}

interface SettingRowProps {
  keyName: KobitokeySettingKey;
  value: number;
  onChange: (next: number) => void;
}

function SettingRow({ keyName, value, onChange }: SettingRowProps) {
  const def = KOBITOKEY_VALUES.find((v) => v.key === keyName);
  if (!def) return null;
  const label = LABELS[keyName];

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-sm">
        <span>
          <span className="block">{label.title}</span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
            {label.description}
          </span>
        </span>
        <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
          {value}
          {label.unit ?? ''}
        </span>
      </div>
      <input
        type="range"
        min={def.min}
        max={def.max}
        step={label.step ?? 1}
        value={value}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
        aria-label={label.title}
        className="w-full"
      />
    </div>
  );
}

interface SettingLabel {
  title: string;
  description: string;
  unit?: string;
  step?: number;
}

const LABELS: Record<KobitokeySettingKey, SettingLabel> = {
  trackball_cpi_left: {
    title: '左トラックボール CPI',
    description: 'PMW3610 の感度 (200..3200, 200 ステップ)。値が大きいほど少ない動きでカーソルが大きく動く。',
    step: 200,
  },
  trackball_cpi_right: {
    title: '右トラックボール CPI',
    description: 'PMW3610 の感度 (200..3200, 200 ステップ)。',
    step: 200,
  },
};
