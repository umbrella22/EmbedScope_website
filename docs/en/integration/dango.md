---
title: "Dango OS"
description: "Build the optional Dango OS EmbedScope adapter, select its second CDC with DTR, and debug native and Lua screens, final display pixels, and runtime behavior."
---

# Dango OS

Dango OS is a Rust companion-device system for ESP-Mosaico V1.2 / ESP32-S31 with a 480 × 480 AMOLED touch display. Its UI combines a directly drawn Home character, native LVGL pages, Lua applications, and composed transitions.

The EmbedScope adapter adds structured logs, metrics, an LVGL object tree, final-display capture, synthetic input, and a retained crash summary. It uses a dedicated USB CDC function alongside the existing console, application installation, and OTA channel.

## Prepare the source and toolchain

Use a Dango OS checkout containing `crates/os/src/embedscope/` and the optional `embedscope` feature in `crates/os/Cargo.toml`. The official v0.4.0 firmware does not include this diagnostic Agent. Commands here target source with the adapter enabled.

Place the EmbedScope source alongside the Dango repository to match its current path dependencies:

```text
work/
  EmbedScope/
  esp-32/
```

For another layout, adjust the optional `escope-protocol`, `escope-agent`, and `escope-lvgl` paths in the firmware manifest. Use the firmware's `rust-toolchain.toml`, Espressif RISC-V GCC/newlib, and host libclang. The firmware's `.cargo/config.toml` contains local tool paths that may need environment overrides on another machine. Follow the Dango source build instructions for the platform toolchain.

## Build with the feature

From the Dango source root:

```sh
cargo fw --features embedscope
```

The feature enables the diagnostic module, second CDC, UI-thread Agent, final-display capture, and `rs_lvgl_ui` diagnostics. `cargo fw` builds the release firmware; deploy it using the Dango installation or OTA procedure for the intended device. A build without `embedscope` omits this diagnostic path.

### Normal and diagnostic firmware

`embedscope` is disabled by default. Cargo features select diagnostic functionality independently of the debug/release optimization profile:

| Command | Result |
| --- | --- |
| `cargo fw` | Release firmware without the EmbedScope Agent or second diagnostic CDC |
| `cargo fw --features embedscope` | Release firmware with EmbedScope diagnostics |

The `cargo fw` alias already includes `--release`. An explicitly enabled feature remains present in a release build; `--release` does not disable it. Returning to plain `cargo fw` selects the feature-disabled artifacts without requiring `cargo clean`.

The device continues running its installed image. Installing an image without the feature removes the Agent, diagnostic CDC, and capture buffers. Dango's original console logs and OTA remain available.

Build or install the host CLI from the adjacent EmbedScope source as shown in [Quick start](../guide/start/quick-start.md).

## Select the second CDC and assert DTR

```sh
escope --json devices
```

The console uses CDC communication/data interfaces 0/1. EmbedScope uses 2/3. The host metadata exposes different sides of that CDC pair:

| Host | Diagnostic `usb_interface` |
| --- | --- |
| macOS | Data interface 3 |
| Linux / Windows | Communication interface 2 |

Select the enumerated diagnostic path. Paths can change and are not portable across machines. A typical macOS diagnostic path is `/dev/cu.usbmodemmosaico_s31_r13`; confirm enumeration and identity before using it.

```sh
escope -d /dev/cu.usbmodemmosaico_s31_r13 --dtr on info
```

The adapter's receive path waits for asserted DTR. Inspect the device model, firmware build, boot/session, and declared capabilities in the response. One process uses a physical diagnostic port at a time. The separate console CDC can continue to carry its own protocol.

## Inspect native and Lua pages

```sh
escope -d /dev/cu.usbmodemmosaico_s31_r13 --dtr on ui tree
escope -d /dev/cu.usbmodemmosaico_s31_r13 --dtr on display capture dango-before-01.png
```

The Dango adapter builds a custom owned tree on the UI thread. It includes widget kinds and label text for native and Lua LVGL pages. This is additional platform metadata beyond the general NativeTree adapter's generic `lv_obj` and empty names.

Home character drawing lives outside the LVGL object tree. Capture reads a fixed mirror of the last completed final display upload, covering Home, normal screens, and slide composition. It is not panel GRAM readback or a camera observation.

Use the current tree and image to choose coordinates, then send one tap:

```sh
escope -d /dev/cu.usbmodemmosaico_s31_r13 --dtr on input tap 240 240
escope -d /dev/cu.usbmodemmosaico_s31_r13 --dtr on ui tree
escope -d /dev/cu.usbmodemmosaico_s31_r13 --dtr on display capture dango-after-01.png
```

The example coordinates are the center of the display; the control at that location depends on the current page. Input uses the unified application route. Tap acceptance can precede a page switch, and tree/display sampling is independent. Refresh again after navigation completes.

For visual inspection, launch `cargo run -p escope-desktop -- /dev/cu.usbmodemmosaico_s31_r13` from EmbedScope, check **DTR**, and connect. See [Desktop Inspector](../guide/basic/inspector.md).

## Collect runtime evidence

```sh
escope -d /dev/cu.usbmodemmosaico_s31_r13 --dtr on metrics
escope -d /dev/cu.usbmodemmosaico_s31_r13 --dtr on logs --count 8
escope -d /dev/cu.usbmodemmosaico_s31_r13 --dtr on diagnose --output dango-diagnosis-01 --logs 3
```

Interpret Dango measurements by their actual source:

| Field | Dango meaning |
| --- | --- |
| `heap_free`, `heap_largest_free` | Current internal allocator free bytes and largest free block |
| `psram_free` | Current external-memory allocator free bytes |
| `heap_min_free` | Unavailable; the sampled minimum is not reported as allocator low-water |
| `frame_ms` | Available final upload/live-mirror work duration, without a guaranteed renderer FPS interpretation |
| `queue_depth` | Diagnostic receive/request queue depth |
| `dropped_logs` | Agent log queue loss for its current subscription lifecycle |

Structured `rs_lvgl_ui.stats` logs provide UI update information. Retain their target, device time, and loss markers. A quiet diagnosis may need a smaller `--logs` count because each record has a fixed three-second wait.

`crash show` reads the retained platform summary with available build/boot attribution. Check that attribution before associating a retained crash with the running firmware. Use [Collect a diagnosis](../guide/basic/diagnose.md) for report interpretation and [Troubleshooting](../guide/advanced/troubleshooting.md) for reconnect, capture, and missing-data failures.
