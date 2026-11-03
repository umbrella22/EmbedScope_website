---
title: "Quick start"
description: "Download escope, connect to the software reference device, tap its counter, and save a PNG and diagnosis directory."
---

# Quick start

Complete a first diagnostic session without a development board. The software reference device provides synthetic logs, metrics, a UI tree, and a 320 × 240 counter screen.

## 1. Download the CLI

Open [GitHub Releases](https://github.com/umbrella22/EmbedScope/releases/latest) and choose a CLI ZIP for your operating system and processor:

| System | Archive |
| --- | --- |
| Linux | x86_64 CLI ZIP |
| Windows | x86_64 CLI ZIP |
| macOS | arm64 for Apple Silicon, x86_64 for Intel |

Extract it into a permanent directory. On macOS and Linux, run this from that directory:

```sh
./escope --version
```

On Windows PowerShell:

```powershell
.\escope.exe --version
```

## 2. Add the directory to PATH

Add the directory containing `escope` to your shell's `PATH`. On Windows, add it to the user `Path` environment variable and open a new terminal. The following commands then work from any working directory. The prebuilt CLI does not require Rust. Compare the download's SHA-256 with `SHA256SUMS` from the same Release to check file integrity.

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

## Install with an existing Rust environment

Cargo is an alternative for machines with Rust 1.88 or newer and the platform's build dependencies:

```sh
cargo install escope-cli --version '=0.1.1' --locked
```

See [Build and test](../../development/testing.md) for toolchains used to build the Inspector, native LVGL adapter, and C/C++ SDK from source.

## Continue

Open [Desktop Inspector](../basic/inspector.md) for a visual workspace, or use [Logs and metrics](../basic/logs-metrics.md) to investigate runtime behavior. To connect hardware, follow [Connect a device](../basic/connection.md). Firmware without an Agent starts with [Rust integration](../../integration/rust.md) or [C/C++ integration](../../integration/c.md).
