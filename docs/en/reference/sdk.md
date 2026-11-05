---
title: "Host SDK reference"
description: "Reference escope-host connection options, typed Session APIs, log events, data models, capture conversion, error variants, and cancellation behavior."
---

# Host SDK reference

`escope-host` provides a Tokio-based Rust Session shared by the CLI and Inspector. Add the SDK from crates.io:

```toml
[dependencies]
escope-host = { version = "0.3.0" }
tokio = { version = "1", features = ["rt-multi-thread", "macros"] }
```

## ConnectOptions and Session

```rust
use escope_host::{ConnectOptions, Session};
use std::time::Duration;

async fn collect() -> escope_host::Result<()> {
    let session = Session::connect_with_options(
        "tcp://127.0.0.1:9337",
        ConnectOptions {
            baud: 115200,
            timeout: Duration::from_secs(3),
            dtr: None,
        },
    ).await?;

    let info = session.info().await?;
    println!("{} / {}", info.name, info.build_id);
    let capture = session.capture().await?;
    capture.save_png("new-screen.png")?;
    session.close();
    Ok(())
}
```

| ConnectOptions field | Default | Meaning |
| --- | --- | --- |
| `baud: u32` | `115200` | Serial baud; unused for TCP |
| `timeout: Duration` | 3 seconds | Transport open, request capacity wait, and request round-trip timeout |
| `dtr: Option<bool>` | `None` | Preserve opener policy; `Some(true)` asserts, `Some(false)` clears |

`Session::connect(endpoint, baud, timeout)` uses `dtr=None`. Both connection functions return only after validating Hello. Endpoints accept direct serial paths, `serial://` paths, and `tcp://host:port`. TCP does not use serial settings.

## Session methods

All asynchronous operations below return `escope_host::Result<T>`.

| Method | Result or behavior |
| --- | --- |
| `Session::connect(endpoint, baud, timeout)` | Async; returns a negotiated `Session` |
| `Session::connect_with_options(endpoint, options)` | Async; returns a negotiated `Session` with explicit serial policy |
| `hello()` | `&Hello` negotiated metadata |
| `id()` | Current u32 session |
| `supports(mask)` | True when every capability bit in `mask` is present |
| `info().await` | `DeviceInfo` |
| `metrics().await` | `Metrics` |
| `ui_tree().await` | `Vec<UiNode>` with validated parent paths and one revision |
| `tap(x, y, hold_ms).await` | Unit on accepted input |
| `capture().await` | Owned, validated `Capture` |
| `crash().await` | `CrashInfo` |
| `subscribe()` | Local `broadcast::Receiver<Event>` |
| `start_logs(max_level).await` | Start/update device log subscription |
| `stop_logs().await` | End device log subscription |
| `request_raw(operation, payload).await` | Raw response payload bytes for a defined protocol operation |
| `corrupt_frames()` | Host reader's rejected-frame count |
| `pending_requests()` | Current waiter count |
| `is_closed()` | Connection closed state |
| `close()` | Close shared connection, abort transport tasks, fail pending requests |

Session is cloneable; clones share the same connection and closing one closes that shared connection. One reader matches responses by ID, operation, version, and session. Limits are 32 in-flight calls, a 32-request writer queue, and a 128-event broadcast channel.

`ui_tree()` retries a full traversal on `Stale` for at most three attempts. It rejects duplicate IDs/cursors, missing parents, parent cycles, zero revision, and more than 4096 nodes. It does not synchronize its result with a separate capture.

## Log events

Create a local receiver before starting device logs so immediate events have a receiver:

```rust
use escope_host::Session;

async fn read_one_log(session: &Session) -> escope_host::Result<()> {
    let mut events = session.subscribe();
    session.start_logs(3).await?;
    match events.recv().await {
        Ok(event) => println!("{:?}", event.log()?),
        Err(error) => eprintln!("host log receiver: {error}"),
    }
    session.stop_logs().await?;
    Ok(())
}
```

`Event` contains session, operation, and payload. `Event::log()` validates and decodes a Log event into an owned `LogRecord`. A long-lived collector handles `RecvError::Lagged(n)` separately from closure and device `dropped`. A local receiver does not itself create a device subscription.

`start_logs` uses numeric levels 1…5, inclusive toward lower values. Target substring filtering is implemented by the CLI, without a current wire target field. Device sequence and drop accounting reset when log state is cleared by unsubscribe, Hello, or reset. Device timestamps use milliseconds since boot.

## Data models

Public host models use owned strings and implement serialization.

| Model | Fields |
| --- | --- |
| `Hello` | session, capabilities, max_payload, protocol, name, build_id |
| `DeviceInfo` | name, model, firmware, build_id, boot_id, uptime_ms |
| `Metrics` | uptime_ms, heap_free, heap_min_free, heap_largest_free, psram_free, frame_ms, queue_depth, dropped_logs |
| `UiNode` | id, parent, kind, name, x, y, width, height, flags, revision |
| `LogRecord` | session, seq, timestamp_ms, level, target, message, dropped, truncated |
| `CrashInfo` | present, reason, build_id, message, boot_id |

Metric memory fields are optional u64 byte counts. `frame_ms` and `queue_depth` are optional u32 values. `uptime_ms` and `dropped_logs` are u64. Missing values remain `None`/JSON null. Their source and statistical scope are defined by the platform.

`devices() -> Result<Vec<PortInfo>>` enumerates serial metadata without opening a port. `PortInfo` fields and OS interface conventions are listed in the [CLI reference](./cli.md). `capability_names(mask)` maps known capability bits to their command-facing names. `tree_depths(nodes)` validates parents and returns a node-to-depth map.

## Capture

`Capture` has `meta: protocol::CaptureMeta` and `rgb: Vec<u8>`. The RGB data uses packed RGB888 rows with raw padding removed. `Capture::from_raw(meta, raw)` validates metadata and length before conversion.

The SDK validates a raw-frame budget of 32 MiB, positive dimensions and ID, checked stride/total arithmetic, supported format, matching read ID/offset, nonempty bounded data, and the exact terminal `done` flag. Read size is `min(negotiated max_payload − 64, 768)` bytes.

`Capture::save_png(path)` performs synchronous filesystem I/O with `create_new(true)`. It preserves an existing path. Call it in a worker when the caller has a UI or other latency-sensitive loop. The Inspector supplies a separate export thread; the SDK method itself is synchronous.

Capture uses Start → Read → End with a cleanup lease. A confirmed device rejection at Start, including Busy, leaves the Session usable. An unknown-ID start timeout/cancellation or undecodable response closes it. Once an ID is known, failure/cancellation attempts End on the current Tokio runtime. Failed cleanup other than Stale closes the Session. See [Architecture and lifecycles](../development/architecture.md) for reset responsibilities.

## Errors and cancellation

| Error variant | Meaning |
| --- | --- |
| `Io(String)` | Transport or filesystem I/O failure |
| `Disconnected` | Closed transport or shared Session |
| `Timeout` | Capacity wait, transport open, or request timeout |
| `Protocol(String)` | Frame, identity, payload, tree, or capture contract violation |
| `Device(Status)` | Explicit remote rejection, including Busy, Stale, or Unsupported |

Dropping a request future removes its host waiter. Late responses are ignored. It does not universally cancel remote work. Requests with side effects, including input, are not replayed automatically. `Busy` is returned directly without SDK polling.

There is no typed `Session::cancel` method. Protocol Cancel is available through `request_raw` only when the platform defines its behavior. It is separate from capture lease cleanup. Reconnect when the Session closes, and rely on platform `Backend::reset` to release resources at that boundary.
