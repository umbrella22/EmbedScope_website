---
title: "CLI reference"
description: "Look up escope commands, endpoint and DTR options, defaults, numeric limits, JSON output, exit behavior, and diagnosis collection semantics."
---

# CLI reference

The Cargo package is `escope-cli`; the executable is `escope`. Install from the current source checkout:

```sh
cargo install --path crates/escope-cli --locked
escope --help
```

## Global options

```text
escope [OPTIONS] <COMMAND>
```

| Option | Default | Contract |
| --- | --- | --- |
| `-d`, `--device <ENDPOINT>` | Auto-select exactly one enumerated serial port | Direct serial path, `serial://` path, or `tcp://host:port` |
| `--baud <BAUD>` | `115200` | Serial baud rate; unused for TCP |
| `--dtr <POLICY>` | `preserve` | `preserve`, `on`, or `off`; unused for TCP |
| `--timeout-ms <MS>` | `3000` | Positive integer; connection/request timeout and finite `logs` wait |
| `--json` | Disabled | Compact machine-readable output |
| `-h`, `--help` | — | Help for the selected command |
| `-V`, `--version` | — | CLI package version |

Global options can appear before a subcommand. `preserve` uses the underlying port opener's policy; `on` asserts DTR and `off` clears it. A line change can affect reset behavior according to the board. See [Connection](../guide/basic/connection.md).

## `devices`

```sh
escope --json devices
```

Enumerates serial ports without opening them. The JSON array contains:

| Field | Type |
| --- | --- |
| `port` | String path or port name |
| `transport` | String, currently `serial` |
| `manufacturer`, `product`, `serial_number` | Optional strings |
| `usb_vid`, `usb_pid` | Optional u16 values |
| `usb_interface` | Optional u8 value |

Absent metadata is `null`. The USB interface is the CDC communication interface on Linux/Windows and the data interface on macOS. Enumeration does not perform an Agent handshake.

## `simulate`

```text
escope simulate [--listen <ADDRESS>]
```

`--listen` defaults to `127.0.0.1:9337`. The software reference device supplies synthetic pixels/metrics and a 320 × 240 counter screen. Output identifies the endpoint and `physical_device: false`. Counter state persists across connections until server restart. Ctrl-C stops the server.

## `info`

```sh
escope -d tcp://127.0.0.1:9337 info
```

Returns `device` identity, negotiated `session` information, and human-readable `capabilities`. Identity includes name, model, firmware, build, boot, and uptime. Hello and Info require no optional capability bit.

## `logs`

```text
escope logs [--follow] [--count <N>] [--level <LEVEL>] [--target <SUBSTRING>]
```

| Option | Default | Contract |
| --- | --- | --- |
| `--follow` | Disabled | Continue through idle periods until count, Ctrl-C, or error/disconnection |
| `--count` | 1 without follow; unbounded with follow | Positive number of matching records |
| `--level` | `5` | 1=Error, 2=Warn, 3=Info, 4=Debug, 5=Trace; include values at or below it |
| `--target` | No target filter | Host-side substring match; does not alter wire filtering |

Finite reads apply `--timeout-ms` while waiting for each next matching record. Follow mode can remain idle and checks disconnection. The CLI subscribes locally before starting device logs, then unsubscribes on a normal stream exit.

Records include session, sequence, boot-relative timestamp, level, target, message, device `dropped`, and `truncated`. A host broadcast gap emits an object with `type: "host_log_gap"` and `dropped`. These losses have separate sources.

## `metrics`

```text
escope metrics [--watch] [--count <N>] [--interval-ms <MS>]
```

| Option | Default | Contract |
| --- | --- | --- |
| `--watch` | Disabled | Continue sampling until count, Ctrl-C, or error |
| `--count` | 1 without watch; unbounded with watch | Positive sample count |
| `--interval-ms` | `1000` | Positive delay between completed samples |

Unavailable optional fields remain `null`. Memory is measured in bytes. Frame timing, queue, and minimum-free scope are platform-defined. The interval is a delay after a sample; it does not establish a hard sampling frequency.

## `ui tree`

```sh
escope --json -d tcp://127.0.0.1:9337 ui tree
```

Traverses a consistent nonzero revision. The SDK attempts up to three traversals after `Stale` and validates IDs, cursors, parent paths, and a 4096-node limit. Text output lists ID, parent, kind, geometry, and name. JSON retains all host node fields, including flags and revision.

## `display capture`

```text
escope display capture <OUTPUT.png>
```

Retrieves one fixed frame, releases the device capture, and saves a new PNG. Success reports path, width, height, frame ID, and session. File creation rejects an existing path. The parent directory must exist.

## `input tap`

```text
escope input tap <X> <Y> [--hold-ms <MS>]
```

Coordinates are u32 logical display pixels. `--hold-ms` defaults to `60` and accepts 1…5000. The platform validates coordinates and translates the tap to input. Success reports `accepted: true`, coordinates, duration, and session; it does not confirm rendering or navigation completion.

A timeout can occur after the action executes. The SDK does not automatically replay input.

## `crash show`

```sh
escope -d tcp://127.0.0.1:9337 crash show
```

Reads `present`, reason, build ID, message, and boot ID from the platform's retained summary. It does not induce a crash or perform ELF symbol resolution.

## `diagnose`

```text
escope diagnose --output <NEW_DIRECTORY> [--logs <N>]
```

`--output` is required and must name a new directory with an existing parent. `--logs` defaults to `8` and accepts 1…1000.

Schema 1 `report.json` includes `endpoint`, `captured_at_unix_ms`, `hello`, `capabilities`, `info`, supported results, `corrupt_frames`, `complete`, and `issues`. A successful capture writes `screen.png`, with metadata in `display`.

Missing capabilities are skipped without making `complete=false`. Metrics, tree, crash, and capture request failures can be recorded in `issues` while collection continues. Identity, log subscription/unsubscription, decode, or filesystem failures can terminate the command before its final report.

Diagnosis logs use level 5 with a fixed three-second wait per record. That wait is independent of global `--timeout-ms`. Samples are collected sequentially; the report does not establish an atomic tree/display/metrics snapshot.

## Output and exit behavior

With `--json`, successful finite results go to stdout as compact JSON, and log/metric streams emit one object per line. Operational failures go to stderr as `{"ok":false,"error":"…"}` and exit with status 1. Argument errors and help use clap's own output and exit conventions.

Without `--json`, most structured results are pretty-printed JSON; `ui tree` uses its text listing. Remote rejections are reported as errors, including `Unsupported` for absent capabilities. See [Protocol 1](./protocol.md) for status values and [Host SDK](./sdk.md) for error variants.

One process uses a physical serial port at a time. Stop a follower, monitor, or Inspector before another process connects; concurrent operations within one SDK Session share its connection.
