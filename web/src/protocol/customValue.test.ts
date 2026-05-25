import { describe, expect, it, vi } from 'vitest';
import { emptyPacket, type VialPacket } from '../transport/types';
import { ViaCommand } from './commands';
import {
  buildKobitokeyGetValue,
  buildKobitokeySetValue,
  fetchKobitokeySettings,
  getKobitokeyValue,
  KOBITOKEY_CHANNEL,
  KOBITOKEY_VALUES,
  parseKobitokeyGetValue,
  setKobitokeyValue,
  valueBytes,
  type ValueDef,
} from './customValue';

const cpiLeft: ValueDef =
  KOBITOKEY_VALUES.find((v) => v.key === 'trackball_cpi_left') ?? KOBITOKEY_VALUES[0]!;
const cpiRight: ValueDef =
  KOBITOKEY_VALUES.find((v) => v.key === 'trackball_cpi_right') ?? KOBITOKEY_VALUES[1]!;

describe('customValue packet builders', () => {
  it('builds GetValue packet with channel + id', () => {
    const p = buildKobitokeyGetValue(cpiLeft.id);
    expect(p[0]).toBe(ViaCommand.CustomGetValue);
    expect(p[1]).toBe(KOBITOKEY_CHANNEL);
    expect(p[2]).toBe(cpiLeft.id);
  });

  it('encodes u16 CPI big-endian', () => {
    const p = buildKobitokeySetValue(cpiLeft, 1600);
    expect(p[0]).toBe(ViaCommand.CustomSetValue);
    expect(p[1]).toBe(KOBITOKEY_CHANNEL);
    expect(p[2]).toBe(cpiLeft.id);
    expect(p[3]).toBe(0x06);
    expect(p[4]).toBe(0x40);
  });
});

describe('valueBytes', () => {
  it('returns 2 for u16, 1 for u8/bool', () => {
    expect(valueBytes('u16')).toBe(2);
    expect(valueBytes('u8')).toBe(1);
    expect(valueBytes('bool')).toBe(1);
  });
});

describe('parseKobitokeyGetValue', () => {
  it('reads u16 BE from offset 3', () => {
    const reply = emptyPacket();
    reply[3] = 0x06;
    reply[4] = 0x40;
    expect(parseKobitokeyGetValue(cpiLeft, reply)).toBe(0x0640);
  });
});

describe('transport helpers', () => {
  function fakeTransport(reply: VialPacket) {
    return {
      sendAndReceive: vi.fn().mockResolvedValue(reply),
    } as unknown as Parameters<typeof getKobitokeyValue>[0];
  }

  it('getKobitokeyValue falls back to default for out-of-range replies', async () => {
    const reply = emptyPacket();
    reply[3] = 0xff;
    reply[4] = 0xff;
    const transport = fakeTransport(reply);
    await expect(getKobitokeyValue(transport, cpiLeft)).resolves.toBe(cpiLeft.default);
  });

  it('setKobitokeyValue clamps to def range before sending', async () => {
    const reply = emptyPacket();
    const sent: VialPacket[] = [];
    const transport = {
      sendAndReceive: vi.fn((p: VialPacket) => {
        sent.push(p);
        return Promise.resolve(reply);
      }),
    } as unknown as Parameters<typeof setKobitokeyValue>[0];

    await setKobitokeyValue(transport, cpiLeft, 99999);
    expect(sent[0]).toBeDefined();
    const word = (sent[0]![3]! << 8) | sent[0]![4]!;
    expect(word).toBe(cpiLeft.max);
  });

  it('fetchKobitokeySettings reads every defined value', async () => {
    const calls: number[] = [];
    const transport = {
      sendAndReceive: vi.fn((p: VialPacket) => {
        calls.push(p[2]!);
        const reply = emptyPacket();
        reply[3] = 0x06;
        reply[4] = 0x40;
        return Promise.resolve(reply);
      }),
    } as unknown as Parameters<typeof fetchKobitokeySettings>[0];
    const settings = await fetchKobitokeySettings(transport);
    expect(calls).toEqual([cpiLeft.id, cpiRight.id]);
    expect(settings.trackball_cpi_left).toBe(0x0640);
    expect(settings.trackball_cpi_right).toBe(0x0640);
  });
});
