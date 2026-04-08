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

/// Reset firmware for KobitoKey.
///
/// Erases the RMK storage area (0x60000-0x70000) to clear:
/// - Saved keymap / Vial settings
/// - BLE peer addresses (split pairing)
/// - Any other persisted configuration
///
/// After erasing, the keyboard reboots automatically.
/// Flash the normal firmware (central/peripheral) again after this.
#[entry]
fn main() -> ! {
    let nvmc = unsafe { &*nrf52840_pac::NVMC::ptr() };

    // Erase 16 pages (64KB) starting from 0x60000
    let mut addr = 0x60000u32;
    while addr < 0x70000 {
        // Wait for NVMC ready
        while nvmc.ready.read().ready().is_busy() {}

        // Enable erase
        nvmc.config.write(|w| w.wen().een());

        // Wait for NVMC ready
        while nvmc.ready.read().ready().is_busy() {}

        // Erase page
        nvmc.erasepage().write(|w| unsafe { w.bits(addr) });

        // Wait for erase complete
        while nvmc.ready.read().ready().is_busy() {}

        // Back to read mode
        nvmc.config.write(|w| w.wen().ren());

        addr += PAGE_SIZE;
    }

    cortex_m::peripheral::SCB::sys_reset();
}
