import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KOBITOKEY_VALUES, type KobitokeySettingKey } from '../protocol/customValue';
import { useKobitokeySettingsStore } from '../state/kobitokeySettings';
import { KobitokeySettingsPanel } from './KobitokeySettingsPanel';

function defaultsMap(): Record<KobitokeySettingKey, number> {
  const out = {} as Record<KobitokeySettingKey, number>;
  for (const def of KOBITOKEY_VALUES) out[def.key] = def.default;
  return out;
}

function prime(overrides: Partial<Record<KobitokeySettingKey, number>>) {
  const merged = { ...defaultsMap(), ...overrides };
  useKobitokeySettingsStore.setState({
    phase: { kind: 'ready' },
    transport: null,
    baseline: merged,
    local: merged,
  });
}

beforeEach(() => {
  useKobitokeySettingsStore.getState().detach();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('KobitokeySettingsPanel — render', () => {
  it('shows a loading placeholder when phase is empty', () => {
    render(<KobitokeySettingsPanel />);
    expect(screen.getByText(/読み込み中/)).toBeTruthy();
  });

  it('renders trackball category with a slider per side', () => {
    prime({});
    render(<KobitokeySettingsPanel />);
    expect(screen.getByText('トラックボール')).toBeTruthy();
    expect(screen.getAllByRole('slider')).toHaveLength(2);
  });

  it('shows the firmware-deferred banner by default and dismisses on click', async () => {
    prime({});
    const user = userEvent.setup();
    render(<KobitokeySettingsPanel />);
    expect(screen.getByText(/開発中の機能/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '非表示' }));
    expect(screen.queryByText(/開発中の機能/)).toBeNull();
  });
});

describe('KobitokeySettingsPanel — interaction', () => {
  it('moving the left CPI slider updates local immediately', () => {
    prime({});
    render(<KobitokeySettingsPanel />);
    const cpi = screen.getByLabelText('左トラックボール CPI') as HTMLInputElement;
    fireEvent.change(cpi, { target: { value: '1800' } });
    expect(useKobitokeySettingsStore.getState().local.trackball_cpi_left).toBe(1800);
  });

  it('reset category restores defaults', () => {
    prime({ trackball_cpi_left: 2400, trackball_cpi_right: 1600 });
    render(<KobitokeySettingsPanel />);
    (screen.getByRole('button', { name: 'このカテゴリを初期化' }) as HTMLButtonElement).click();
    const s = useKobitokeySettingsStore.getState();
    const defL =
      KOBITOKEY_VALUES.find((v) => v.key === 'trackball_cpi_left')?.default ?? 0;
    const defR =
      KOBITOKEY_VALUES.find((v) => v.key === 'trackball_cpi_right')?.default ?? 0;
    expect(s.local.trackball_cpi_left).toBe(defL);
    expect(s.local.trackball_cpi_right).toBe(defR);
  });
});
