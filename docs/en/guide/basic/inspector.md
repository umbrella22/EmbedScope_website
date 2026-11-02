---
title: "Desktop Inspector"
description: "Connect visually to a device, inspect objects and pixels, send taps, follow logs, and save a fixed screenshot in the background."
---

# Desktop Inspector

The Inspector brings UI objects, display pixels, properties, metrics, and logs into one desktop window. Use it to locate controls and examine how a page changes after input.

![EmbedScope Inspector connected to Dango OS](/images/inspector-dango.jpg)

## Launch and connect

From the EmbedScope source root:

```sh
cargo run -p escope-desktop -- tcp://127.0.0.1:9337
```

Start the [software reference device](../start/quick-start.md) first, or replace the endpoint with a firmware serial path or TCP address. Enter the endpoint in the top bar and click **Connect**. The connection loads identity and initial data and subscribes to available logs.

Serial baud is 115200. Check **DTR** before connecting when the device needs asserted DTR. Unchecked means preserve the underlying opener policy. Use the [CLI](../../reference/cli.md) or [SDK](../../reference/sdk.md) for another baud or explicit DTR off. Close any other process using the same physical serial port.

## Find an object

| Area | Content |
| --- | --- |
| UI TREE, left | Node kind, ID, and device-provided name |
| DISPLAY OUTPUT, center | Captured pixels, dimensions, frame ID, and selected bounds |
| DEVICE, right | Device, firmware build, session, and protocol |
| SYSTEM METRICS, right | Available uptime, memory, frame, and queue measurements |
| SELECTED OBJECT, right | Revision, geometry, and flags |
| EVENT LOG, bottom | Device time, severity, target, message, and loss markers |

Select a tree node or click an object in the image. The selected bounds and properties help relate geometry to pixels. Missing metrics show **Unavailable**. The Inspector uses installed system CJK fonts as a fallback for Chinese text; it does not download or bundle a system font. Startup still works when no matching font is installed.

## Refresh after a change

Click **Refresh** or enable **Refresh every second**. Tree, metrics, and capture are fetched separately and sequentially. A refresh during navigation can therefore combine observations from different points in the transition. Refresh again after the page settles and compare revision, frame ID, and logs.

A tree revision change clears the previous node selection. **Disconnect** clears device pixels, selection, and input context. Reconnection collects fresh device state.

## Send taps from the image

1. Connect a device with input capability.
2. Enable **Send taps to device**.
3. Click the target in the captured image.

The Inspector converts the image position into logical display coordinates, sends a 60 ms tap, and refreshes. Without the checkbox, image clicks select objects. An accepted tap can precede navigation or rendering completion. Use CLI `input tap --hold-ms` to choose another hold duration.

## Save a fixed frame

Enter a new path under the image and click **Save PNG**. The default directory is Pictures, falling back to the system temporary directory. File creation and PNG encoding run on a separate background thread, and the interface displays **Saving**, **Saved**, or the actual error.

The task retains the frame submitted when saving began. Disconnecting or reconnecting does not replace that frame or cancel the export, and its status remains visible. Another save is disabled while one is pending. Existing files produce an error and remain unchanged; enter an unused name to retry.

## Collect longer logs

The window retains 512 recent records. Use [CLI log collection](./logs-metrics.md) for a longer stream and preserve device drops, truncation, and host receiver gaps when assessing completeness.

For a local macOS development bundle, run `bash scripts/package-macos.sh` from the source root. It packages a debug build as `target/EmbedScope Inspector.app`. Platform build requirements are listed in [Build and test](../../development/testing.md).
