---
title: "LVGL, display, and input"
description: "Export an existing LVGL tree on the UI thread, maintain revisions and identities, and connect final display capture and unified input."
---

# LVGL, display, and input

`escope-lvgl` reads an application's existing objects through a UI-thread bridge. Display capture and input are separate platform capabilities, so they can include rendering and input paths outside LVGL.

## 1. Choose the tree adapter

| Adapter | Suitable source | Output |
| --- | --- | --- |
| Custom `TreeSource` | Widget registry, semantic metadata, or an owned tree snapshot | Platform-defined names, kinds, geometry, and flags |
| `native::NativeTree` | Existing `rs_lvgl 0.3.1` / LVGL 9.6 objects | Generic `lv_obj` kinds, empty names, geometry, and native state bits |

The default library does not link a native LVGL provider:

```toml
[dependencies]
escope-lvgl = { version = "0.1.0" }
```

Enable `features = ["native"]` for NativeTree. The adapter and application must use the same actual LVGL provider, ABI, and configuration. Linking a separate copy does not give access to the application's native object state.

## 2. Route requests to the UI thread

Create `TreeSource` and `UiBridge` on the UI thread. Queue complete tree requests from the communication task to a safe point between object mutation, layout, and rendering, then call `bridge.tree(payload, reply)` and return its encoded response to TX.

`UiBridge` is neither `Send` nor `Sync`. Reads cannot overlap object deletion, concurrent layout, callback reentry, or LVGL deinitialization. `Backend::handle` remains synchronous; any platform queue and prepared results need an explicit lifecycle.

Custom metadata implements:

```rust
pub trait TreeSource {
    fn revision(&self) -> u32;
    fn read_node(&mut self, cursor: u32)
        -> Result<escope_protocol::UiNode<'_>, escope_protocol::Status>;
}
```

Each node has a nonzero ID and the current nonzero revision. `parent=0` identifies a root, and `next_cursor=None` ends traversal. A custom source can snapshot names and geometry on the UI thread to prevent later reads from borrowing live objects.

## 3. Connect NativeTree when needed

Given an existing live root as `NonNull<rs_lvgl::sys::lv_obj_t>`:

```rust
use escope_lvgl::{native::NativeTree, UiBridge};

// Execute on the UI thread while root and its descendants remain valid.
let source = unsafe { NativeTree::<128>::new(root) };
let mut bridge = UiBridge::new(source);
```

The const parameter is the native walk capacity. A larger tree returns `Capacity`. Stop the adapter before deleting its root or deinitializing LVGL.

After node, property, layout, or state changes and before the next query, notify the source:

```rust
bridge.source_mut().changed()?;
```

Custom TreeSource implementations maintain revision themselves. Old queries return `Stale`; the host retries the traversal within its bounded attempt count. Recreate the session and adapter when revision space is exhausted.

When using `NodeRegistry`, call `remove` from deletion hooks before the native address can be reused. IDs are interpreted with session and revision. Registry generations prevent a deleted ID from resolving to a newly allocated object at the same address.

## 4. Capture a fixed display frame

Implement CaptureStart, CaptureRead, and CaptureEnd on the platform. Start retains a fixed frame with ID, dimensions, format, byte stride, total length, and frame ID. Read serves that same frame in offset blocks. End and disconnect/reset release it.

Choose a source that covers the intended visible content. An LVGL shadow can omit direct drawing and transition composition. A final-upload mirror can include those paths and describes the pixels submitted to the display. Panel readback requires a separate platform implementation. Prevent rendering or DMA from overwriting a retained frame; a separate capture buffer can allow slow transfers without blocking display progress.

Formats are RGB565 little endian, RGB888, and RGBA8888. Stride and offsets are bytes. The host exports RGB channels directly from RGBA without alpha composition. See [Protocol 1](../reference/protocol.md) for validation and capacities.

## 5. Route input and validate the result

Convert logical display coordinates to the application's unified input route. Validate coordinates and hold duration, deliver ordered press/release, and release unfinished synthetic input on reset. An acknowledgement means acceptance; navigation may complete later.

Use an endpoint and coordinates appropriate for the current device:

```sh
escope -d tcp://127.0.0.1:9337 ui tree
escope -d tcp://127.0.0.1:9337 display capture before-01.png
escope -d tcp://127.0.0.1:9337 input tap 100 140
escope -d tcp://127.0.0.1:9337 display capture after-01.png
```

The sample coordinates belong to the software reference counter. Use [Inspector](../guide/basic/inspector.md) to examine object bounds on another device. [Dango OS](./dango.md) provides an existing custom tree and final-display integration.

## Run the rs_lvgl integration example

The [rs_lvgl EmbedScope guide](https://umbrella22.github.io/rs_lvgl_website/en/guide/embedscope.html) provides a real native example using published dependencies, UI-thread access, fixed display capture and native pointer input. It documents enabling diagnostics and omitting them from production builds. `embedscope` is an application-owned optional feature; `--release` does not disable it.
