---
title: "Collect a diagnosis"
description: "Export device identity and supported diagnostic data into a new directory, then assess collection completeness and retained crash information."
---

# Collect a diagnosis

Use `diagnose` to collect the current device context into files that can be inspected later. Start with identity so the endpoint and firmware are known.

## Create the directory

```sh
escope -d tcp://127.0.0.1:9337 info
escope -d tcp://127.0.0.1:9337 diagnose --output diagnosis-01 --logs 3
```

Choose an unused directory whose parent exists. `diagnose` creates that directory and writes `report.json`. It also writes `screen.png` when display capture succeeds. Existing directories and files are preserved.

The report includes endpoint, host collection time, negotiated session and capabilities, device/build/boot identity, corrupt-frame count, and the supported metrics, tree, crash, display, and log results. The samples are collected in sequence; the directory is not an atomic snapshot of every capability.

## Check what completed

Open `report.json` and inspect:

| Field | Interpretation |
| --- | --- |
| `schema` | Report format version, currently 1 |
| `complete` | No recorded collection issue among the supported items |
| `issues` | Collection errors, including an incomplete log sample |
| `capabilities` | Data the connected firmware advertised |
| `corrupt_frames` | Frames rejected by the host decoder during this session |

An absent capability is skipped and does not make `complete` false. A complete report confirms collection; it does not establish the root cause of a device problem. Individual metrics, tree, crash, and capture request errors can be recorded while other items remain available.

Some failures terminate the command before a final report is written: identity collection, log subscription changes, or filesystem writes can fail directly. Check the command's exit status and original error as well as any files that were created.

## Choose a realistic log count

The default diagnosis requests eight records. Each record currently has a fixed three-second wait, separate from the global RPC timeout. Reduce `--logs` for a quiet device, or reproduce an action that emits useful logs while collection is active. Raising `--timeout-ms` does not extend that per-record diagnosis wait.

Keep record `dropped`, `truncated`, and host log gap information when assessing whether all relevant events were collected. Device timestamps are boot-relative; host collection time uses the host clock.

## Read a crash summary

```sh
escope -d tcp://127.0.0.1:9337 crash show
```

Crash support returns the platform's retained summary and its build/boot attribution. `present: false` means no summary is available from that source. It does not prove that the firmware has never crashed. The command does not induce a crash or resolve an ELF backtrace.

For an interaction issue, add a clearly identified before/after tree and capture using [Display and input](./display-input.md). Exact options and output behavior are in the [CLI reference](../../reference/cli.md).
