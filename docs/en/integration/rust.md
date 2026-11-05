---
title: "Rust integration"
description: "Add a minimal no_std Agent, connect a complete-frame byte transport, and implement platform capabilities with correct task and reset lifecycles."
---

# Rust integration

Add `escope-agent` and `escope-protocol` to the firmware, establish Hello and Info, then enable each platform capability. Both libraries are allocation-free `no_std` and do not require Tokio, Embassy, or a specific RTOS.

## 1. Add dependencies

Add the protocol and Agent from crates.io. Both support `no_std` by default:

```toml
[dependencies]
escope-protocol = { version = "0.2.0" }
escope-agent = { version = "0.2.0" }
```

Reuse the application's transport and logger. A dedicated UART or USB CDC stream can carry binary protocol frames without changing an existing console or update protocol.

## 2. Implement identity first

```rust
use escope_agent::Backend;
use escope_protocol::{DeviceInfo, Status};

struct Device;

impl Backend for Device {
    fn capabilities(&self) -> u32 { 0 }

    fn info(&self) -> DeviceInfo<'_> {
        DeviceInfo {
            name: "minimal",
            model: "example",
            firmware: "0.1.0",
            build_id: "example-build",
            boot_id: 1,
            uptime_ms: 0,
        }
    }

    fn handle(
        &mut self,
        _operation: u16,
        _payload: &[u8],
        _reply: &mut [u8],
    ) -> Result<usize, Status> {
        Err(Status::Unsupported)
    }

    fn reset(&mut self) {}
}
```

Zero capability bits are valid. The Agent handles Hello, Info, and log subscription state. Capability-specific requests reach the Backend after capability checks. A successful `handle` writes the operation's CBOR response to `reply` and returns its initialized length. Return `Unsupported` for an unknown operation.

Replace the example fields with actual identity and time sources. Build identifies firmware, boot identifies one startup, and session identifies a negotiated connection lifecycle. They have different scopes.

## 3. Connect the receive/send loop

Run the complete host example from the EmbedScope root:

```sh
cargo run -p escope-agent --example poll_device
```

It constructs a request, feeds one byte at a time, and produces an encoded Hello response through:

```text
Transport RX
  → FrameDecoder::push
  → decode_frame using separate scratch storage
  → Agent::handle(request, backend, tx)
  → Transport TX sends the complete returned frame
```

Replace the byte source and sink with the target transport. Packet boundaries are unrelated to protocol boundaries: reads can split a frame or contain several frames. Preserve decoded scratch borrows until `handle` returns.

TX storage holds `MAX_FRAME`. For partial or nonblocking writes, retain the unsent suffix and finish it before reusing the buffer. The Agent checks response capacity before dispatching platform side effects.

Create `Agent::new(seed)` with a nonzero seed that changes across startup or new platform connections. On disconnect, call `agent.reset(&mut backend)`, clear the decoder, and discard pending platform TX. `Backend::reset` releases capture, ends held synthetic input, and clears session-bound work.

## 4. Execute work on the correct task

Serialize all access to one Agent. Other tasks and ISRs place structured logs in a bounded queue; the Agent task publishes them with `push_log`. Fan out `log::Record` at the existing global logger before formatting. A second global logger installation does not provide fan-out.

For UI capabilities, the transport task queues complete requests to a UI-loop safe point. Execute Agent/UiBridge there between mutations, layout, and rendering, then return the encoded response to TX.

`Backend::handle` is synchronous. `Busy` is an explicit rejection/retry result, without an asynchronous completion token. The SDK does not poll or replay it. A platform that prepares snapshots in advance manages its own work, ready result, and lifetime.

## 5. Enable and verify capabilities

| Capability | Platform implementation |
| --- | --- |
| Logs | Structured records, boot-relative clock, bounded queue and loss reporting |
| Metrics | Available fields and documented memory/timing/queue scope |
| UI tree | UI-thread reads, nonzero revisions, node lifetime and deletion hooks |
| Capture | Fixed display frame, byte layout, buffer/DMA lifetime, and release |
| Input | Logical coordinates, validated hold duration, unified press/release route |
| Crash | Retained summary attributed to the relevant build and boot |

Build for the real target, then run `escope -d ENDPOINT info` against the connected device. Check identity and capabilities before each new capability's command. Exercise malformed-frame recovery, disconnect/reconnect, held input cleanup, and interrupted capture.

See [LVGL integration](./lvgl.md) for UI/display/input, [Protocol 1](../reference/protocol.md) for payloads and budgets, and [Build and test](../development/testing.md) for host and bare-metal checks.
