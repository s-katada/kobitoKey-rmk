import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KOBITOKEY_VALUES, valueBytes } from '../protocol/customValue';
import { intoVialPacket, type VialPacket } from '../transport/types';
import type { WebHidTransport } from '../transport/webhid';
import { useKobitokeySettingsStore } from './kobitokeySettings';

vi.useFakeTimers();

class FakeTransport {
  stored = new Map<number, number>();
  writes: Array<{ id: number; value: number }> = [];

  async sendAndReceive(packet: VialPacket): Promise<VialPacket> {
    const reply = new Uint8Array(new ArrayBuffer(32));
    const cmd = packet[0];
    const channel = packet[1];
    const id = packet[2] ?? 0;
    if (channel !== 0xc0) return intoVialPacket(reply);

    const def = KOBITOKEY_VALUES.find((v) => v.id === id);

    if (cmd === 0x08 && def) {
      // CustomGetValue
      const stored = this.stored.get(id);
      if (stored !== undefined) {
        if (valueBytes(def.type) === 2) {
          reply[3] = (stored >> 8) & 0xff;
          reply[4] = stored & 0xff;
        } else {
          reply[3] = stored;
        }
      }
    } else if (cmd === 0x07 && def) {
      // CustomSetValue
      let value: number;
      if (valueBytes(def.type) === 2) {
        value = ((packet[3] ?? 0) << 8) | (packet[4] ?? 0);
      } else {
        value = packet[3] ?? 0;
      }
      this.writes.push({ id, value });
      this.stored.set(id, value);
    }
    return intoVialPacket(reply);
  }
}

function fakeTransport(): { fake: FakeTransport; transport: WebHidTransport } {
  const fake = new FakeTransport();
  return { fake, transport: fake as unknown as WebHidTransport };
}

beforeEach(() => {
  useKobitokeySettingsStore.getState().detach();
});

describe('attach', () => {
  it('reads every slot and reflects them in baseline + local', async () => {
    const { fake, transport } = fakeTransport();
    fake.stored.set(0x01, 1600); // trackball_cpi_left
    fake.stored.set(0x02, 2400); // trackball_cpi_right
    await useKobitokeySettingsStore.getState().attach(transport);
    const s = useKobitokeySettingsStore.getState();
    expect(s.phase.kind).toBe('ready');
    expect(s.local.trackball_cpi_left).toBe(1600);
    expect(s.local.trackball_cpi_right).toBe(2400);
  });
});

describe('setValue', () => {
  beforeEach(async () => {
    const { transport } = fakeTransport();
    await useKobitokeySettingsStore.getState().attach(transport);
  });

  it('updates local immediately', () => {
    useKobitokeySettingsStore.getState().setValue('trackball_cpi_left', 1600);
    expect(useKobitokeySettingsStore.getState().local.trackball_cpi_left).toBe(1600);
  });

  it('clamps to the def range before storing locally', () => {
    useKobitokeySettingsStore.getState().setValue('trackball_cpi_left', 99999);
    expect(useKobitokeySettingsStore.getState().local.trackball_cpi_left).toBe(3200);
  });

  it('debounces wire writes (one round-trip per slot after settle)', async () => {
    const { fake, transport } = fakeTransport();
    await useKobitokeySettingsStore.getState().attach(transport);
    const store = useKobitokeySettingsStore.getState();
    store.setValue('trackball_cpi_left', 1400);
    store.setValue('trackball_cpi_left', 1500);
    store.setValue('trackball_cpi_left', 1600);
    expect(fake.writes).toEqual([]);
    await vi.advanceTimersByTimeAsync(200);
    expect(fake.writes).toEqual([{ id: 0x01, value: 1600 }]);
  });

  it('reset commits the default through the same debounce path', async () => {
    const { fake, transport } = fakeTransport();
    fake.stored.set(0x01, 1600);
    await useKobitokeySettingsStore.getState().attach(transport);
    useKobitokeySettingsStore.getState().resetCategory(['trackball_cpi_left']);
    await vi.advanceTimersByTimeAsync(200);
    const cpiLeftDefault =
      KOBITOKEY_VALUES.find((v) => v.key === 'trackball_cpi_left')?.default ?? 0;
    expect(fake.writes).toEqual([{ id: 0x01, value: cpiLeftDefault }]);
  });
});
