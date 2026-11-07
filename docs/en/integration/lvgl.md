---
title: "LVGL, display, and input"
description: "Inspect native widget and layout kinds with EmbedScope 0.5 and rs_lvgl_sys 0.7, maintain UI-thread revisions, and connect display capture and input."
---

# LVGL, display, and input

`escope-lvgl` reads an application's existing objects through a UI-thread bridge. Display capture and input are separate platform capabilities, so they can include rendering and input paths outside LVGL.

## 1. Choose the tree adapter

| Adapter | Suitable source | Output |
| --- | --- | --- |
| Custom `TreeSource` | Widget registry, semantic metadata, or an owned tree snapshot | Platform-defined names, kinds, geometry, and flags |
| `native::NativeTree` | LVGL 9.6 objects using `rs_lvgl_sys` / `rs_lvgl` / `rs_lvgl_ui` 0.7.0 | Enabled widget and layout kinds, empty names, geometry, and native state bits |

The default library does not link a native LVGL provider:

```toml
[dependencies]
escope-lvgl = { version = "0.5.0" }
```

Enable `features = ["native"]` for NativeTree. The adapter depends directly on `rs_lvgl_sys` 0.7.0 and shares the application's actual LVGL provider, ABI, and configuration. It does not require the higher-level `rs_lvgl` style API.

The native adapter and application use the same provider version line:

| EmbedScope SDK | `rs_lvgl_sys` / `rs_lvgl` / `rs_lvgl_ui` |
| --- | --- |
| 0.5.x | 0.7.x |
| 0.4.x | 0.6.x |
| 0.3.x | 0.5.x |
| 0.2.x | 0.4.x |
| 0.1.x | 0.3.x |

Upgrade the SDK, application rs_lvgl dependencies, and lockfile together. Confirm that the dependency graph contains one `links = "lvgl"` provider. Custom `TreeSource` implementations are independent of this matrix. The device wire protocol remains v1; the CLI and Inspector use protocol negotiation and device-advertised capabilities to select available operations.

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

NativeTree recognizes enabled widget kinds such as `label`, `button`, `slider`, and `image`. Plain native objects with Flex or Grid layouts appear as `row`, `column`, or `grid`; other objects appear as `lv_obj`. Widget class takes priority over layout, so a button with Flex remains a `button`. Configurations with Flex or Grid disabled are supported.

The tree includes native host objects and internal widget nodes. Geometry comes from laid-out native objects, and flags contain native state bits. Names are empty. Supply an application-defined `TreeSource` for label text, declarative View keys, or component boundaries.

The rs_lvgl_ui 0.7 `typed::...` constructors, `child_if`, `binding`, and component slots produce ordinary LVGL objects. Inspector displays their native parent-child relationships. Slots add no wrapper nodes; conditional children appear when mounted. Publish a new revision after event handling, application updates, and reconciliation complete so queries read the resulting geometry and state.

UI constructors map to Inspector's native `kind` values as follows:

| rs_lvgl_ui constructor | Inspector native `kind` |
| --- | --- |
| `container()` | `lv_obj`; Flex/Grid layouts classify as `row`, `column`, or `grid` |
| `progress_bar(...)` | `bar` |
| `message_box(...)` | `msgbox` |
| `animated_image(...)` | `animimage` |
| `range_slider(...)` | `slider` |
| `textarea(...)` | `textarea`, including native internal nodes |
| `chart(ChartSpec)` | `chart` |
| `custom(widget, props)` | The actual LVGL class created by the widget; an arc root appears as `arc` |

The two endpoints of a range slider, chart series IDs, and custom-widget Props add no virtual tree nodes. Flex wrap and reverse settings affect the resulting coordinates; parent-child relationships come from actual LVGL objects. Node IDs are scoped to session/revision and are independent of View keys and chart series IDs.

To upgrade a native integration from EmbedScope 0.4, update the SDK to 0.5, update application `rs_lvgl`, `rs_lvgl_ui`, and provider dependencies to 0.7, and regenerate the lockfile. The rs_lvgl_ui 0.7 migration includes three breaking changes: charts use `chart(ChartSpec)` with stable `ChartSeries` IDs; custom widgets implement `CustomWidget::Props`, `validate`, `apply_props`, and the lifecycle hooks, and use `custom(widget, props)`; manually constructed `WidgetKind::Textarea` variants add an `input` field. The ordinary `textarea(...)` constructor does not require setting that field manually. See the [rs_lvgl_ui 0.7 migration guide](https://umbrella22.github.io/rs_lvgl_website/en/guide/ui-api-migration.html) for complete interfaces and examples.

`NativeTree` traverses only the root passed to its constructor. Dialogs mounted through `App::overlay` belong to the LVGL top layer, a separate root from the active screen. Select `lv_layer_top()` as the root on the UI thread to inspect those dialogs. An application-defined `TreeSource` can manage node identities and hierarchy when exporting multiple layers together.

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

The EmbedScope repository's [`examples/rs-lvgl-ui`](https://github.com/umbrella22/EmbedScope/tree/master/examples/rs-lvgl-ui) uses rs_lvgl 0.7.0 to verify native trees, a memory display, and input. See [Build and test](../development/testing.md) for commands.

The [rs_lvgl EmbedScope guide](https://umbrella22.github.io/rs_lvgl_website/en/guide/embedscope.html) provides a real native example using published dependencies, UI-thread access, fixed display capture and native pointer input. It documents enabling diagnostics and omitting them from production builds. `embedscope` is an application-owned optional feature; `--release` does not disable it.
