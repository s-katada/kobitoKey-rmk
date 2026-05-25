//! KobitoKey reset firmware.
//!
//! RMK の Storage 領域 (0x60000-0x70000, 64KB) を消去するための独立 FW。
//! 消去対象:
//!   - 保存済みキーマップ / Vial 設定
//!   - BLE ペアリング情報 (split central / peripheral, host)
//!   - その他永続化された設定
//!
//! 動作:
//!   1. NVMC を Erase モードに
//!   2. 4KB ページ x 16 = 64KB を順次消去
//!   3. 完了後にソフトリセット
//!
//! Flash 手順:
//!   - kobito-key-reset.uf2 をどちらかの XIAO BLE にドラッグ
//!   - 自動再起動後、通常 FW を再フラッシュ

#![no_main]
#![no_std]

use core::panic::PanicInfo;

use cortex_m_rt::entry;
use nrf52840_pac as _;

#[panic_handler]
fn panic(_: &PanicInfo) -> ! {
    loop {}
}

const PAGE_SIZE: u32 = 4096;
const STORAGE_START: u32 = 0x60000;
const STORAGE_END: u32 = 0x70000;

#[entry]
fn main() -> ! {
    let nvmc = unsafe { &*nrf52840_pac::NVMC::ptr() };

    let mut addr = STORAGE_START;
    while addr < STORAGE_END {
        while nvmc.ready.read().ready().is_busy() {}

        nvmc.config.write(|w| w.wen().een());

        while nvmc.ready.read().ready().is_busy() {}

        nvmc.erasepage().write(|w| unsafe { w.bits(addr) });

        while nvmc.ready.read().ready().is_busy() {}

        nvmc.config.write(|w| w.wen().ren());

        addr += PAGE_SIZE;
    }

    cortex_m::peripheral::SCB::sys_reset();
}
