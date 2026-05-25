import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useKobitokeySettingsStore } from '../state/kobitokeySettings';
import { KobitokeySettingsPanel } from './KobitokeySettingsPanel';

function prime(local: Partial<Record<string, number>>) {
  // Fill in defaults for any field the caller doesn't override.
  const defaults: Record<string, number> = {
    trackball_cpi: 1000,
    scroll_throttle_ms: 0,
    scroll_invert_x: 0,
    scroll_invert_y: 0,
    status_led_purple_hold_ms: 200,
    status_led_battery_high_threshold: 60,
    status_led_battery_low_threshold: 20,
  };
  const merged = { ...defaults, ...local };
  useKobitokeySettingsStore.setState({
    phase: { kind: 'ready' },
    transport: null,
    baseline: merged as never,
    local: merged as never,
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

  it('renders all three categories with a slider per numeric value', () => {
    prime({});
    render(<KobitokeySettingsPanel />);
    expect(screen.getByText('トラックボール')).toBeTruthy();
    expect(screen.getByText('スクロール')).toBeTruthy();
    expect(screen.getByText('ステータス LED')).toBeTruthy();
    expect(screen.getAllByRole('slider').length).toBeGreaterThanOrEqual(4);
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  });

  it('shows the firmware-deferred banner by default and dismisses it on click', async () => {
    prime({});
    const user = userEvent.setup();
    render(<KobitokeySettingsPanel />);
    expect(screen.getByText(/開発中の機能/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '非表示' }));
    expect(screen.queryByText(/開発中の機能/)).toBeNull();
  });
});

describe('KobitokeySettingsPanel — interaction', () => {
  it('moving a slider updates the store local value immediately', () => {
    prime({});
    render(<KobitokeySettingsPanel />);
    const cpi = screen.getByLabelText('CPI') as HTMLInputElement;
    fireEvent.change(cpi, { target: { value: '1800' } });
    expect(useKobitokeySettingsStore.getState().local.trackball_cpi).toBe(1800);
  });

  it('toggling an invert checkbox flips the boolean', async () => {
    prime({});
    const user = userEvent.setup();
    render(<KobitokeySettingsPanel />);
    const invertX = screen.getByLabelText('横スクロール反転') as HTMLInputElement;
    expect(invertX.checked).toBe(false);
    await user.click(invertX);
    expect(useKobitokeySettingsStore.getState().local.scroll_invert_x).toBe(1);
  });

  it('"このカテゴリを初期化" resets just that category', () => {
    prime({ trackball_cpi: 2400, scroll_invert_x: 1 });
    render(<KobitokeySettingsPanel />);
    const buttons = screen.getAllByRole('button', { name: 'このカテゴリを初期化' });
    // First button = Trackball
    (buttons[0] as HTMLButtonElement).click();
    expect(useKobitokeySettingsStore.getState().local.trackball_cpi).toBe(1000);
    expect(useKobitokeySettingsStore.getState().local.scroll_invert_x).toBe(1); // untouched
  });

  it('"全て出荷時に戻す" resets every category', () => {
    prime({ trackball_cpi: 2400, scroll_invert_x: 1, status_led_purple_hold_ms: 500 });
    render(<KobitokeySettingsPanel />);
    (screen.getByRole('button', { name: '全て出荷時に戻す' }) as HTMLButtonElement).click();
    const s = useKobitokeySettingsStore.getState();
    expect(s.local.trackball_cpi).toBe(1000);
    expect(s.local.scroll_invert_x).toBe(0);
    expect(s.local.status_led_purple_hold_ms).toBe(200);
  });
});
