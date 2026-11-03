---
title: "Quick start"
description: "Install escope from source, connect to the software reference device, tap its counter, and save a PNG and diagnosis directory."
---

# Quick start

Complete a first diagnostic session without a development board. The software reference device provides synthetic logs, metrics, a UI tree, and a 320 × 240 counter screen.

## 1. Prepare the environment

Install Rust and Cargo, then check the toolchain:

```sh
rustc --version
cargo --version
```

The CLI and device-side libraries require Rust 1.88 or newer. The desktop Inspector requires Rust 1.95 or newer. A host C toolchain and platform build dependencies are also needed when building the Inspector, native LVGL adapter, or C examples. See [Build and test](../../development/testing.md) for those paths.

## 2. Install from source

From an existing EmbedScope source checkout, run these commands at its repository root:

```sh
cargo install --path crates/escope-cli --locked
escope --help
```

The Cargo package is `escope-cli`; the installed executable is `escope`. Ensure Cargo's binary directory is on `PATH`. Registry packages and prebuilt binaries are not currently provided.

For a local build without installation, run `cargo build -p escope-cli` and use `./target/debug/escope` in the following commands. On Windows, the executable has an `.exe` suffix.

## 3. Start the reference device

In the first terminal:

```sh
escope simulate
```

Leave it running. Its output identifies `tcp://127.0.0.1:9337` as a software reference endpoint and reports `physical_device: false`.

## 4. Check identity and find the control

In a second terminal:

```sh
escope -d tcp://127.0.0.1:9337 info
escope -d tcp://127.0.0.1:9337 ui tree
```

Check that the model is `software / synthetic`. The identity result also contains build, boot, session, and capabilities. The tree includes the counter button and its geometry.

## 5. Tap and save the screen

```sh
escope -d tcp://127.0.0.1:9337 input tap 100 140
escope -d tcp://127.0.0.1:9337 ui tree
escope -d tcp://127.0.0.1:9337 display capture counter-01.png
```

The tap result contains `accepted: true`. The reference device increments its counter, updates the tree, and changes the pixels. Open `counter-01.png` to inspect the 320 × 240 result. Counter state persists across connections until the simulator restarts.

Use an unused PNG filename on each run. Existing files are preserved.

## 6. Save a diagnosis directory

```sh
escope -d tcp://127.0.0.1:9337 diagnose --output diagnosis-01 --logs 3
```

The new `diagnosis-01` directory contains `report.json` and `screen.png`. Check `complete` and `issues` in the report. The report collects identity and the supported logs, metrics, tree, crash, and display data. The directory must not already exist, and its parent must exist.

## Continue

Open [Desktop Inspector](../basic/inspector.md) for a visual workspace, or use [Logs and metrics](../basic/logs-metrics.md) to investigate runtime behavior. To connect hardware, follow [Connect a device](../basic/connection.md). Firmware without an Agent starts with [Rust integration](../../integration/rust.md) or [C/C++ integration](../../integration/c.md).
