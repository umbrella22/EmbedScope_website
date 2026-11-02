---
title: "Logs and metrics"
description: "Collect bounded or continuous structured logs, compare runtime measurements, and interpret missing values, truncation, and dropped records."
---

# Logs and metrics

Read identity first, then collect the runtime observations relevant to a reproduction. The commands below use the [software reference device](../start/quick-start.md); replace its TCP endpoint with the hardware diagnostic endpoint.

## Read a bounded log sample

```sh
escope -d tcp://127.0.0.1:9337 info
escope -d tcp://127.0.0.1:9337 logs --count 3
```

Each record includes device time, severity, target, message, sequence, device drop count, and a truncation flag. A finite collection finishes after the requested matching records. It fails if no next matching record arrives within the configured finite log timeout.

Inspect an unfiltered sample before choosing a target filter:

```sh
escope -d tcp://127.0.0.1:9337 logs --follow --level 3 --target reference
```

This example follows Error, Warn, and Info records whose target contains `reference`. Follow mode can remain idle; Ctrl-C ends collection. A target filter is a host-side substring match. It does not reduce device traffic or configure a firmware target filter.

## Save a longer collection

```sh
escope --json -d tcp://127.0.0.1:9337 logs --follow > logs.jsonl
```

Streaming JSON uses one object per line. Preserve `host_log_gap` objects along with records. Stop the follower before opening the same physical serial port in another tool.

Three fields describe different loss mechanisms:

| Observation | Meaning |
| --- | --- |
| Record `dropped` increases | The device's bounded log queue discarded records |
| Record `truncated` is true | A UTF-8 target or message was shortened to its field capacity |
| `host_log_gap` / SDK `Lagged(n)` | A host event receiver fell behind its broadcast channel |

The device drop count and sequence follow the Agent's log subscription lifecycle. They are not lifetime boot counters. The Inspector also limits its visible history to 512 records.

## Compare measurements around an action

```sh
escope -d tcp://127.0.0.1:9337 metrics
escope -d tcp://127.0.0.1:9337 metrics --count 5 --interval-ms 500
```

For an ongoing view:

```sh
escope -d tcp://127.0.0.1:9337 metrics --watch
```

Compare the same firmware and reproduction conditions. Memory fields are bytes. `null` means the platform did not provide a measurement; it must not be treated as zero. A platform defines whether frame duration measures rendering, display upload, or another part of a frame. Queue depth also needs the platform's queue definition.

`heap_min_free` requires a documented statistical scope. A minimum observed in occasional samples does not establish the allocator's historical low-water value. The [Dango adapter](../../integration/dango.md) leaves that field unavailable.

## Correlate time and input

Device timestamps use milliseconds since boot. Host collection time uses the host clock; the protocol does not synchronize these clocks. Save build, boot, and session alongside results, then use before/after observations to relate a tap to subsequent logs or metric changes.

Use [Collect a diagnosis](./diagnose.md) to save identity and several capabilities together. Exact defaults, level values, and stream behavior are in the [CLI reference](../../reference/cli.md).
