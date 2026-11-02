---
title: "Introduction"
description: "Use EmbedScope to connect embedded firmware to logs, runtime metrics, UI inspection, screen capture, and input tools written in Rust."
---

# Introduction

EmbedScope connects embedded firmware to a set of Rust diagnostic tools. A small device Agent exposes the capabilities provided by the firmware; the `escope` CLI, desktop Inspector, and host SDK read those capabilities through serial or TCP.

Use it to investigate a page that renders incorrectly, correlate input with logs, compare memory measurements, or collect a diagnosis directory with the device's identity and screen. The same host tools work with the included software reference device and with firmware that implements the Agent interface.

## From a device to a useful result

The device supplies structured data through a `Backend`: logs, metrics, UI nodes, display pixels, input, and retained crash information. Firmware can implement a subset. Hello and Info work with no optional capabilities enabled, so a small initial integration can establish identity before adding display or UI support.

The host tools provide three ways to use that data:

| Tool | Use |
| --- | --- |
| `escope` CLI | Inspect a device, stream logs, save PNGs, and export diagnosis directories |
| Desktop Inspector | Compare an object tree with pixels, inspect properties, and send taps |
| `escope-host` SDK | Build a custom collector or automate a defined reproduction |

The Agent and protocol are allocation-free `no_std` libraries. They use the application's transport, scheduler, logger, and display/input paths. Rust firmware uses the Agent directly; C/C++ firmware uses the C ABI and a target Rust build.

## Data reflects the platform integration

A UI tree describes objects. A capture records pixels from the source selected by the platform. A tap acknowledgement reports that input was accepted. These observations can occur at different times, especially while a page is changing.

Check device, build, boot, session, and capabilities before comparing results. Missing measurements remain unavailable. A successful connection to the software reference device verifies the host workflow with synthetic data; it does not measure a physical board.

EmbedScope currently provides source builds. The crates and CLI are not published to a package registry. Arbitrary shell execution, file transfer, OTA updates, operation recording, JTAG, and ELF symbol analysis are outside the current command set.

## Start here

Follow [Quick start](./quick-start.md) to install `escope`, start the reference device, tap a control, and save a screen and diagnosis. Use [Feature navigation](./features.md) to choose a debugging task, or begin [Rust integration](../../integration/rust.md) and [C/C++ integration](../../integration/c.md) when firmware needs an Agent.
