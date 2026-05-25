import { describe, expect, it, vi } from 'vitest';
import { intoVialPacket, type VialPacket } from '../transport/types';
import type { WebHidTransport } from '../transport/webhid';
import { ViaCommand } from './commands';
import {
  buildKobitokeyCustomSave,
  buildKobitokeyGetValue,
  buildKobitokeySetValue,
  fetchKobitokeySettings,
  getKobitokeyValue,
  KOBITOKEY_CHANNEL,
  KOBITOKEY_VALUES,
  parseKobitokeyGetValue,
  setKobitokeyValue,
  valueBytes,
} from './customValue';

describe('builders', () => {
  it('buildKobitokeyGetValue writes [0x08, 0xC0, id]', () => {
    const p = buildKobitokeyGetValue(0x05);
    expect(p[0]).toBe(ViaCommand.CustomGetValue);
    expect(p[1]).toBe(KOBITOKEY_CHANNEL);
    expect(p[2]).toBe(0x05);
  });

  it('buildKobitokeySetValue encodes u16 BE at byte 3..5', () => {
    const def = KOBITOKEY_VALUES.find((v) => v.key === 'trackball_cpi');
    if (!def) throw new Error('trackball_cpi def missing');
    const p = buildKobitokeySetValue(def, 1600);
    expect(p[0]).toBe(ViaCommand.CustomSetValue);
    expect(p[1]).toBe(KOBITOKEY_CHANNEL);
    expect(p[2]).toBe(0x01);
    expect(p[3]).toBe(0x06); // 1600 = 0x0640
    expect(p[4]).toBe(0x40);
  });

  it('buildKobitokeySetValue encodes u8 / bool at byte 3', () => {
    const def = KOBITOKEY_VALUES.find((v) => v.key === 'scroll_throttle_ms');
    if (!def) throw new Error('scroll_throttle_ms def missing');
    const p = buildKobitokeySetValue(def, 25);
    expect(p[3]).toBe(25);

    const boolDef = KOBITOKEY_VALUES.find((v) => v.key === 'scroll_invert_x');
    if (!boolDef) throw new Error('scroll_invert_x def missing');
    const q = buildKobitokeySetValue(boolDef, 1);
    expect(q[3]).toBe(1);
  });

  it('buildKobitokeyCustomSave writes [0x09, 0xC0, id]', () => {
    const p = buildKobitokeyCustomSave(0x01);
    expect(p[0]).toBe(ViaCommand.CustomSave);
    expect(p[1]).toBe(KOBITOKEY_CHANNEL);
    expect(p[2]).toBe(0x01);
  });
});

describe('parsers', () => {
  it('parseKobitokeyGetValue reads BE u16 at offset 3', () => {
    const def = KOBITOKEY_VALUES.find((v) => v.key === 'trackball_cpi');
    if (!def) throw new Error('trackball_cpi def missing');
    const reply = new Uint8Array(new ArrayBuffer(32));
    reply[3] = 0x06;
    reply[4] = 0x40;
    expect(parseKobitokeyGetValue(def, intoVialPacket(reply))).toBe(1600);
  });

  it('parseKobitokeyGetValue reads u8 at offset 3', () => {
    const def = KOBITOKEY_VALUES.find((v) => v.key === 'scroll_throttle_ms');
    if (!def) throw new Error('scroll_throttle_ms def missing');
    const reply = new Uint8Array(new ArrayBuffer(32));
    reply[3] = 25;
    expect(parseKobitokeyGetValue(def, intoVialPacket(reply))).toBe(25);
  });

  it('valueBytes maps types to byte counts', () => {
    expect(valueBytes('u16')).toBe(2);
    expect(valueBytes('u8')).toBe(1);
    expect(valueBytes('bool')).toBe(1);
  });
});

describe('transport', () => {
  function mockTransport(
    handler: (packet: VialPacket) => Uint8Array<ArrayBuffer>,
  ): WebHidTransport {
    return {
      sendAndReceive: vi.fn(async (packet: VialPacket) => intoVialPacket(handler(packet))),
    } as unknown as WebHidTransport;
  }

  it('getKobitokeyValue clamps out-of-range firmware replies to the default', async () => {
    const def = KOBITOKEY_VALUES.find((v) => v.key === 'trackball_cpi');
    if (!def) throw new Error('trackball_cpi def missing');
    // Firmware returns 65535 (RMK stub would leave whatever was in the
    // buffer there) — out of range, clamp to default.
    const t = mockTransport(() => {
      const r = new Uint8Array(new ArrayBuffer(32));
      r[3] = 0xff;
      r[4] = 0xff;
      return r;
    });
    expect(await getKobitokeyValue(t, def)).toBe(def.default);
  });

  it('getKobitokeyValue returns in-range firmware values verbatim', async () => {
    const def = KOBITOKEY_VALUES.find((v) => v.key === 'trackball_cpi');
    if (!def) throw new Error('trackball_cpi def missing');
    const t = mockTransport(() => {
      const r = new Uint8Array(new ArrayBuffer(32));
      r[3] = 0x06;
      r[4] = 0x40; // 1600
      return r;
    });
    expect(await getKobitokeyValue(t, def)).toBe(1600);
  });

  it('setKobitokeyValue clamps to the def range before sending', async () => {
    const def = KOBITOKEY_VALUES.find((v) => v.key === 'trackball_cpi');
    if (!def) throw new Error('trackball_cpi def missing');
    let captured: VialPacket | null = null;
    const t = mockTransport((packet) => {
      captured = packet;
      return new Uint8Array(new ArrayBuffer(32));
    });
    await setKobitokeyValue(t, def, 99999); // way over 3200 max
    const sent = captured as VialPacket | null;
    expect(sent).not.toBeNull();
    if (sent) {
      // 3200 = 0x0C80
      expect(sent[3]).toBe(0x0c);
      expect(sent[4]).toBe(0x80);
    }
  });

  it('fetchKobitokeySettings reads every slot in order', async () => {
    const seen: number[] = [];
    const t = mockTransport((packet) => {
      seen.push(packet[2] ?? -1);
      const r = new Uint8Array(new ArrayBuffer(32));
      // Reply with each def's default → fetchKobitokeySettings returns
      // those verbatim.
      const def = KOBITOKEY_VALUES.find((v) => v.id === (packet[2] ?? -1));
      if (def) {
        if (valueBytes(def.type) === 2) {
          r[3] = (def.default >> 8) & 0xff;
          r[4] = def.default & 0xff;
        } else {
          r[3] = def.default;
        }
      }
      return r;
    });
    const settings = await fetchKobitokeySettings(t);
    expect(seen).toEqual(KOBITOKEY_VALUES.map((v) => v.id));
    expect(settings.trackball_cpi).toBe(1000);
    expect(settings.scroll_invert_x).toBe(0);
  });
});
