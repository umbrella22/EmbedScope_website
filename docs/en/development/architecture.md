---
title: "Architecture and lifecycles"
description: "Understand the device Agent, synchronous platform Backend, Tokio Session, UI scheduling, log loss, and capture cleanup across disconnects."
---

# Architecture and lifecycles

A reliable byte stream connects a host Session to a device Agent. The Agent handles protocol/session state; the platform Backend supplies the device capabilities. CLI, Inspector, and custom applications reuse the host SDK.

```text
CLI / Inspector / custom collector
                │
        escope-host Session
                │
          Serial or TCP
                │
  escope-protocol + escope-agent
                │
       Synchronous Backend
                │
 Logs / Metrics / UI / Display / Input / Crash
```

## Component boundaries

| Crate | Responsibility | Environment |
| --- | --- | --- |
| `escope-protocol` | Typed CBOR, envelope, COBS, CRC, bounded decoding | Allocation-free `no_std` |
| `escope-agent` | Hello, sessions, capabilities, log queue, Backend dispatch | Allocation-free `no_std` |
| `escope-host` | Transport, request matching, events, tree/capture validation | Host `std` and Tokio |
| `escope-cli` | `escope`, JSON, reference device, diagnosis files | Host `std` |
| `escope-lvgl` | UI-thread bridge, registry, optional native reads | `no_std`; native shares the application's provider |
| `escope-c-api` | Caller-allocated context and callback ABI | Allocation-free `no_std` rlib |
| `escope-desktop` | egui/eframe Inspector, connection worker, PNG export | Native desktop |

Firmware creates USB descriptors or UART setup, chooses task scheduling, and provides its logger and runtime. The Agent does not replace an application-update protocol or install a global logger.

## Connection and request flow

Session opens the transport and sends Hello with session zero. The Agent resets platform session resources and returns a nonzero session, protocol version, payload budget, capabilities, and identity. Session validates negotiation before becoming available to the caller.

Subsequent requests carry session, nonzero request ID, and operation. One writer sends complete frames, and one reader matches responses by ID, operation, version, and session. There are 32 in-flight permits and a bounded 32-request writer queue. Cloned Sessions share this connection.

Timeout or future cancellation removes the host waiter. Late replies are ignored. Dropping a waiter does not universally cancel device work, and taps are never replayed automatically. Request-ID exhaustion closes the Session and requires a new connection.

A physical serial connection belongs to one process at a time. The SDK multiplexes operations within one Session; a serial broker for independent CLI and Inspector processes is not provided.

## Session and platform reset

Repeated Hello clears subscriptions and backend resources and advances an active session. Transport disconnect calls for platform reset plus clearing partial RX and pending TX. The integration provides a nonzero seed that changes across startup or new platform connections.

Build, boot, and session identify different lifetimes. Node revision and capture ID apply within their session context. Reset releases capture and held synthetic input, so a new connection cannot inherit them.

The C ABI embeds decoder, Agent, and pending TX into fixed-address caller storage. Every call on a context requires external serialization. Callback reentry detection only detects reentry and does not act as a cross-thread lock.

## UI scheduling and synchronous Backend

`Backend::handle` returns synchronously. A UI integration sends complete requests from transport to a bounded UI queue, executes Agent/UiBridge at a safe point, then sends encoded responses through TX. Live object access stays between UI mutation, layout, and rendering.

A platform can prepare read-only snapshots in advance and return Busy when a resource is unavailable. It manages that work and result lifetime itself. Busy has no SDK completion token or automatic polling behavior.

UiBridge and the registry are neither Send nor Sync. Native reads require a live root and the application's actual LVGL provider/configuration. The native adapter uses the shared `rs_lvgl_sys` 0.4.0 provider directly to identify enabled widget classes and plain Flex/Grid layouts, and to read geometry/state. It retains native host objects and internal nodes. Custom TreeSource implementations can supply text, View keys, and component boundaries. Deletion hooks remove registry tokens before addresses are reused, and exhausted generations retire registry slots.

Tree traversal fixes a revision, detects Stale, and retries within a bounded attempt count. Display capture fixes pixels separately. No operation makes both observations atomic. Tap acceptance can precede the next page's tree or display frame.

## Logs and loss accounting

Structured records fan out from the existing logger before text formatting. Other tasks and ISRs queue data; one Agent task publishes records and records any platform queue loss.

The Agent FIFO holds 16 records, drops new arrivals on overflow, and bounds UTF-8 target/message prefixes to 48/192 bytes. Drop accounting and sequence clear with Hello, unsubscribe, or reset. Device time remains milliseconds since boot.

The host broadcasts through a 128-event channel. A slow receiver reports `Lagged(n)` independently of device drops. Inspector history retains 512 recent records. A long-running collector records device drops, truncation, and host receiver gaps to describe completeness.

## Capture cleanup

CaptureStart reserves a fixed frame. CaptureRead returns blocks from that same frame. CaptureEnd releases it. The SDK validates dimensions, stride, raw length, format, chunk identity/offset/terminal state, and a 32 MiB raw budget before returning packed RGB888.

A cleanup lease is armed before sending Start, covering cancellation while its reply is pending:

| Exit path | SDK behavior | Platform behavior |
| --- | --- | --- |
| Normal reads and End | Return an owned Capture | Release fixed frame |
| Explicit Start rejection, including Busy | Return error with Session usable | Do not retain an accepted lease |
| Start timeout/cancellation or undecodable metadata before a known ID | Close Session | Release unknown-ID resources on disconnect/reset |
| Failure/cancellation after a known ID | Attempt End through the current Tokio runtime | Release frame; Stale can mean already invalid |
| Cleanup End fails except Stale, or no runtime can run cleanup | Close Session | Reset provides final release |

The host cannot clean up an unknown remote ID by sending End. Platform reset is therefore part of the resource contract. Protocol Cancel is a separate platform-defined operation, without a universal request registry or typed SDK method.

## Inspector workers

The egui thread handles drawing, user input, selection, and returned results. A connection worker performs handshake, logs, and refresh requests. Tree, metrics, and capture are fetched sequentially; a refresh is not a joint snapshot.

A separate PNG thread retains the selected immutable Capture and performs file creation and encoding. It continues through device disconnect/reconnect and reports Saving, Saved, or an error. The UI does not wait for filesystem work. Disconnect clears the device image, selection, and input mode while an active export retains its own frame and status.

See [Host SDK](../reference/sdk.md), [Protocol 1](../reference/protocol.md), [Rust integration](../integration/rust.md), and [C/C++ integration](../integration/c.md) for exact interfaces.
