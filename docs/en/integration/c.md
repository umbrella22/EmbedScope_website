---
title: "C/C++ integration"
description: "Link the Rust Agent through a C ABI, configure aligned context storage and callbacks, and implement fragmented RX, complete TX, logs, and reset."
---

# C/C++ integration

`escope-c-api` exposes the Rust Agent through a C ABI. Firmware supplies transport, scheduling, memory, display, and input, includes the matching header, and links a static library compiled for its target.

## 1. Download and build the C SDK

Download the C SDK ZIP from [GitHub Releases](https://github.com/umbrella22/EmbedScope/releases/latest). It contains:

- `include/escope.h`: the C/C++ interface.
- `vendor/`: matching protocol, Agent, and C ABI Rust sources.
- `Cargo.toml` and `src/`: the static-library wrapper.

Install Rust 1.88 or newer and the firmware's target toolchain. From the extracted directory, build for the target, for example:

```sh
rustup target add riscv32imafc-unknown-none-elf
cargo build --release --locked --target riscv32imafc-unknown-none-elf
```

Replace the example target with the device's actual Rust target. ESP Xtensa uses the appropriate Espressif toolchain. Add `include/` to the C/C++ include path and link `target/<target>/release/libescope_c_sdk.a` into the firmware. Cargo resolves and downloads third-party Rust dependencies.

Match CPU instructions, ABI, linker script, and runtime to the firmware. The wrapper's default panic handler spins; replace it with the board's reset or watchdog policy and retain exactly one Rust panic handler. `--features std` is for host checks. Use the header and Rust SDK from the same release.

## 2. Configure callbacks and context storage

`EsCallbacks` provides platform data and operation handling:

| Callback | Contract |
| --- | --- |
| `capabilities` | Required; report implemented capability bits |
| `info` | Required; fill UTF-8 device/build/boot/time identity |
| `handle` | Optional; decode payload, encode reply, return `ES_STATUS_*` |
| `reset` | Optional; release capture, input, and session-bound work when used |

Query `escope_context_size()` and `escope_context_alignment()`, allocate that size at the required alignment, then initialize once with a nonzero session seed. Keep the context at a fixed address until all calls finish. The C harness demonstrates an aligned allocation; firmware can use its own allocation or reserved storage.

Callback code and `user` data remain valid for the entire context lifetime. Identity strings remain readable until the enclosing call returns and are copied before further callbacks. Payload/reply pointers are temporary borrows; callbacks cannot retain them, unwind, or write beyond the supplied capacity. Set `reply_len` only to initialized bytes.

Serialize every call on a context, including log publication. Queue ISR or other-task records for the context task. Callback reentry detection returning `ES_BUSY` does not synchronize threads. A live context cannot be reinitialized.

The header defines valid pointers, alignment, lengths, and non-overlap requirements. It checks representable argument errors but cannot validate arbitrary non-null addresses or prevent an out-of-bounds C callback write.

## 3. Feed fragments and drain complete frames

```text
Remaining RX bytes
  → escope_feed
  → Advance by consumed, including on ES_PROTOCOL
  → escope_take_tx copies a complete pending frame
  → Transport retains and sends every unsent TX byte
  → Continue with the remaining RX suffix
```

`escope_feed` handles at most one completed frame per call. A malformed or oversized frame returns `ES_PROTOCOL` at its delimiter; the next call can continue with fresh framing. Always advance by `consumed`.

A pending TX frame makes feed return `ES_BUSY` with `consumed=0`. Drain it before retrying the same input. `escope_take_tx` copies a whole frame: insufficient capacity preserves it and reports the required `written` size. `out=NULL, capacity=0` can query that size. No pending frame reports `written=0`.

After extraction, the transport retains any unsent suffix during partial writes. `escope_poll` places at most one queued log into an empty TX slot. Budget polling so diagnostic events do not prevent control requests from progressing.

## 4. Keep ABI results separate from operation status

Function calls such as feed and take_tx return local `ES_*` values. `EsHandleFn` returns remote `ES_STATUS_*` values, which are encoded in a response. In particular, local `ES_BUSY` is 3, while remote `ES_STATUS_BUSY` is 4; value 3 on the wire means Session.

`ES_CALLBACK=5` is defined in the ABI but is not returned by the current feed path. A nonzero info callback result is encoded as remote Internal. Oversize identity is remote Capacity and invalid UTF-8 is remote InvalidArgument. The feed call queues those failures as protocol responses.

See [Protocol 1](../reference/protocol.md) for both complete tables and the callback payload maps. Operation rejections arrive in protocol responses and are distinct from a local feed error.

## 5. Add logs and disconnect cleanup

Publish UTF-8 records with `escope_push_log` from the serialized context task. Identity fields reject invalid UTF-8 and oversize values. Log fields have a separate truncation contract that preserves UTF-8 prefixes and marks `truncated`.

On transport disconnect, call `escope_reset`. It clears partial RX, pending TX, logs, and subscriptions, calls platform reset, and advances session. Release capture buffers and held synthetic input in the reset callback. A new host starts with Hello. Reset before releasing storage when backend resources are active.

UI callbacks run on the application's UI thread. [Rust integration](./rust.md) describes capability scheduling; [LVGL integration](./lvgl.md) describes native provider, object, display, and input lifetimes.

## Run the host C example

From the EmbedScope source root:

```sh
bash scripts/check-c-api.sh
```

The script builds the host staticlib wrapper, compiles and links `examples/c/harness.c`, and runs initialization, RX/TX, log, reset, and error checks with the system C compiler. The host wrapper uses `std`.
