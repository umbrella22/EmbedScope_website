---
title: "Protocol 1 reference"
description: "Reference framing, integer-key CBOR payloads, statuses, capability bits, C ABI results, tree revisions, log limits, and fixed-frame capture."
---

# Protocol 1 reference

Source definitions are in `crates/escope-protocol/src/{lib,payload,frame}.rs`. CBOR maps use integer keys. Strings are UTF-8, and envelope payload is a byte string containing operation CBOR. Rust memory layout is not a wire representation.

## Framing and capacity

```text
COBS(CBOR(Envelope) || CRC32_IEEE_LE(CBOR(Envelope))) || 0x00
```

CRC32 uses reflected IEEE polynomial `0xedb88320` with initial/final inversion; `123456789 → 0xcbf43926` is the reference vector. Append the four-byte CRC in little endian before COBS encoding. CRC provides transport integrity; the protocol does not supply authentication or encryption.

| Constant | Bytes | Meaning |
| --- | --- | --- |
| `MAX_PAYLOAD` | 1024 | Operation payload |
| `MAX_ENVELOPE` | 1088 | Encoded envelope budget |
| `MAX_PACKET` | 1092 | Envelope plus CRC |
| `MAX_FRAME` | 1098 | COBS upper bound including delimiter |

Empty delimiters are ignored. Oversized input is discarded through the next delimiter. Bad COBS, CRC, or CBOR does not poison the next frame. Trailing bytes after the top-level CBOR value are rejected.

## Envelope

| Key | Field | Type and requirement |
| --- | --- | --- |
| 0 | version | u16, current major 1 |
| 1 | kind | 0=Request, 1=Response, 2=Event |
| 2 | session | u32; 0 for Hello, negotiated value afterward |
| 3 | id | u32; nonzero request, echoed response, 0 event |
| 4 | op | u16 operation code |
| 5 | status | Status; 0 in requests |
| 6 | payload | CBOR byte string containing operation CBOR or empty bytes |

New optional map keys can be skipped. Missing required fields, invalid types, and unknown enum values are invalid. Unknown operations return Unsupported. A structurally valid unknown-major request receives Version from the Agent, preserving request correlation.

## Remote statuses

| Value | Name | Meaning |
| --- | --- | --- |
| 0 | Ok | Completed |
| 1 | InvalidArgument | Parameters violate capability requirements |
| 2 | Unsupported | Capability or operation unavailable |
| 3 | Session | Missing handshake or old session |
| 4 | Busy | Platform resource temporarily unavailable |
| 5 | Stale | Old node revision or capture |
| 6 | Capacity | Insufficient buffer or resources |
| 7 | Internal | Internal issue such as a provider contract violation |
| 8 | Version | Unsupported major |
| 9 | Cancelled | Platform reports cancellation |

C `handle` callbacks return `ES_STATUS_*`. Local C feed/take_tx `ES_*` results use a different number space, listed below. `Busy` is a synchronous result; the SDK returns it without automatic polling or replay.

## Capabilities and operations

| Bit | Name | Operations |
| --- | --- | --- |
| 0 | LOGS | Log subscription and events |
| 1 | METRICS | Metrics |
| 2 | UI_TREE | UiTree |
| 3 | INPUT | InputTap |
| 4 | CAPTURE | CaptureStart/Read/End |
| 5 | CRASH | Crash |

Hello and Info require no capability bit. The Agent handles handshake, identity, and log subscriptions; Backend implements other capabilities.

| Op | Name | Request → response |
| --- | --- | --- |
| 1 | Hello | Empty → HelloReply |
| 2 | Info | Empty → DeviceInfo |
| 3 | Metrics | Empty → Metrics |
| 4 | LogsSubscribe | LogFilter or empty → empty |
| 5 | LogsUnsubscribe | Empty → empty |
| 6 | UiTree | TreeQuery → UiNode |
| 7 | InputTap | InputTap → empty |
| 8 | CaptureStart | Empty → CaptureMeta |
| 9 | CaptureRead | CaptureRead → CaptureChunk |
| 10 | CaptureEnd | CaptureEnd → empty |
| 11 | Crash | Empty → CrashInfo |
| 12 | Cancel | Cancel → platform-defined result |
| 13 | Log | Device LogRecord event; rejected as a request |

Cancel has no universal Agent job registry. A platform defines the resources or pending work it cancels. The reference device releases capture; the Dango adapter releases capture and held synthetic input. Generic host future cancellation and capture cleanup do not imply that a Cancel request was sent. There is no typed SDK Cancel method or CLI Cancel command.

## Payload maps

Each row lists `key:field(type)`. `?T` denotes Option, omitted or null. Integers use CBOR encoding.

| Type | Fields |
| --- | --- |
| HelloReply | 0:session(u32), 1:capabilities(u32), 2:max_payload(u32), 3:protocol(u16), 4:name(str), 5:build_id(str) |
| DeviceInfo | 0:name(str), 1:model(str), 2:firmware(str), 3:build_id(str), 4:boot_id(u32), 5:uptime_ms(u64) |
| Metrics | 0:uptime_ms(u64), 1:heap_free(?u64), 2:heap_min_free(?u64), 3:heap_largest_free(?u64), 4:psram_free(?u64), 5:frame_ms(?u32), 6:queue_depth(?u32), 7:dropped_logs(u64) |
| TreeQuery | 0:cursor(u32), 1:revision(u32) |
| UiNode | 0:id(u32), 1:parent(u32), 2:kind(str), 3:name(str), 4:x(i32), 5:y(i32), 6:width(u32), 7:height(u32), 8:flags(u32), 9:revision(u32), 10:next_cursor(?u32) |
| InputTap | 0:x(u32), 1:y(u32), 2:hold_ms(u32) |
| CaptureMeta | 0:capture_id(u32), 1:width(u32), 2:height(u32), 3:stride(u32), 4:format(enum), 5:total_bytes(u32), 6:frame_id(u64) |
| CaptureRead | 0:capture_id(u32), 1:offset(u32), 2:length(u32) |
| CaptureChunk | 0:capture_id(u32), 1:offset(u32), 2:data(bytes), 3:done(bool) |
| CaptureEnd | 0:capture_id(u32) |
| Cancel | 0:request_id(u32) |
| LogFilter | 0:max_level(u8) |
| LogRecord | 0:seq(u64), 1:timestamp_ms(u64), 2:level(u8), 3:target(str), 4:message(str), 5:dropped(u64), 6:truncated(bool) |
| CrashInfo | 0:present(bool), 1:reason(str), 2:build_id(str), 3:message(str), 4:boot_id(u32) |

Memory, stride, offset, and length are bytes. Geometry uses logical display pixels. Device time is milliseconds since boot. Unavailable metrics do not become zero. The platform defines `heap_min_free`, frame timing, and queue scope; a sampled minimum is not an allocator's historical low-water value.

## Tree traversal

Begin with `cursor=0, revision=0`. The first node supplies a nonzero revision, used for later queries. `next_cursor=null` ends traversal. `parent=0` marks a root.

Changes return a new revision or Stale. The host retries up to three traversals and rejects duplicate cursors/IDs, missing parents, parent cycles, and more than 4096 nodes. Interpret node IDs only with their session and revision.

A consistent tree and a fixed capture still represent independent sampling. Protocol 1 has no joint tree/display snapshot operation.

## Display capture

PixelFormat is 1=RGB565 little endian, 2=RGB888, 3=RGBA8888. Stride must hold a row, and `total_bytes=stride×height`. RGB565 pixels are little-endian u16 independently of host byte order. RGBA currently exports RGB channels directly without alpha composition.

Dimensions and capture ID are positive. Start fixes a frame. Read returns nonempty data with matching ID and offset, no longer than requested. `done` becomes true exactly at total length. The host requests blocks of `min(max_payload − 64, 768)` bytes. End releases normally; Backend reset releases on disconnect. Host raw-frame input is limited to 32 MiB.

See [capture lifecycle](../development/architecture.md) for closing the connection when start or cleanup results are unknown.

## Logs

Error=1, Warn=2, Info=3, Debug=4, Trace=5. `max_level` includes lower numeric levels. Target substring filtering is a host feature, not a current LogFilter wire field.

An empty subscription payload selects level 5. The Agent FIFO stores 16 records and discards new arrivals when full. Target/message prefixes retain up to 48/192 UTF-8 bytes with `truncated` marking shortening. `dropped` is cumulative within the log subscription lifecycle and can include platform queue loss recorded by the Agent task. Hello, unsubscribe, and reset clear log state, sequence, and drop accounting. Device timestamps use the boot-relative clock independently of the host wall clock.

## Local C ABI results

The C header exposes local function results and remote callback statuses in separate namespaces:

| Local result | Value | Meaning |
| --- | --- | --- |
| `ES_OK` | 0 | ABI call completed |
| `ES_INVALID_ARGUMENT` | 1 | Invalid argument, pointer contract, or alignment |
| `ES_CAPACITY` | 2 | Insufficient context/output capacity |
| `ES_BUSY` | 3 | Pending TX or callback reentry |
| `ES_PROTOCOL` | 4 | Receive-frame or encoding failure |
| `ES_CALLBACK` | 5 | Defined callback error constant; current feed does not return it |

`EsHandleFn` returns remote `ES_STATUS_*` using the status values above. Returning local `ES_BUSY=3` from a handle callback would encode Session; remote `ES_STATUS_BUSY=4` encodes Busy.

Identity capacities are name 64, model 64, firmware 32, and build ID 64 UTF-8 bytes. An info callback returning nonzero produces remote Internal. Oversize identity produces remote Capacity, and invalid UTF-8 produces remote InvalidArgument; identity is not truncated. The feed call queues these failures as protocol responses. Log truncation follows its separate contract. See [C/C++ integration](../integration/c.md) and the matching `escope.h` for pointer, context, consumed-byte, and complete-TX requirements.
