---
title: "Desktop Inspector"
description: "Connect visually to a device, inspect objects and pixels, send taps, follow logs, and save a fixed screenshot in the background."
---

# Desktop Inspector

The Inspector is EmbedScope's native desktop tool for UI inspection, structured logs, system metrics, and device information. It uses the same device protocol and host SDK as the CLI.

![Inspector connected to the software reference device, with linked objects, display, and properties](/images/inspector-reference.jpg)

This screenshot uses the software reference device and synthetic pixels and measurements. For a physical device, see [Dango OS integration](../../integration/dango.md).

## Launch and connect

From the EmbedScope source root:

```sh
cargo run -p escope-desktop -- tcp://127.0.0.1:9337
```

Start the [software reference device](../start/quick-start.md) first, or replace the endpoint with a firmware serial path or TCP address. Enter the endpoint in the top bar and click **Connect**. The connection loads identity and initial data and subscribes to available logs.

For a local macOS development bundle, run:

```sh
bash scripts/package-macos.sh
```

The script packages a debug build as `target/EmbedScope Inspector.app`. Platform build requirements are listed in [Build and test](../../development/testing.md).

Serial baud is 115200. Check **DTR** before connecting when the device needs asserted DTR. Unchecked means preserve the underlying opener policy. Use the [CLI](../../reference/cli.md) or [SDK](../../reference/sdk.md) for another baud or explicit DTR off. Close any other process using the same physical serial port.

After connecting, open **Device** from the left navigation to confirm the name, model, build, boot ID, and session. The bottom status bar shows connection state and snapshot age. Click **Disconnect** before using the CLI on the same serial port.

## Choose a workspace

The left navigation provides four pages. Hover over an icon to see its name. The theme button at the bottom switches between dark and light appearance.

| Page | Purpose |
| --- | --- |
| UI Inspector | Locate controls across the object tree, display pixels, and properties |
| Event logs | Read event time, severity, target, message, and loss markers |
| System metrics | Inspect the latest memory, frame, and queue measurements |
| Device | Confirm identity, connection details, and advertised capabilities |

**Refresh** and **Live · 1s** are available on every page. In UI Inspector, **Logs** toggles the bottom event drawer.

## Find an object

1. Filter **Objects** by kind, name, or ID and select a node.
2. Compare the highlighted bounds in the image with its geometry and attributes in **Properties**.
3. In the default **Inspect** mode, click the image to select a hit object directly.

The image also shows display dimensions and frame ID. Missing metrics show **Unavailable**. The Inspector uses installed system CJK fonts as a fallback for Chinese text; it does not download or bundle a system font. Startup still works when no matching font is installed.

## Refresh after a change

Click **Refresh** or enable **Live · 1s** to refresh once a second. Tree, metrics, and capture are fetched separately and sequentially. A refresh during navigation can therefore combine observations from different points in the transition. Refresh again after the page settles and compare revision, frame ID, and logs.

A tree revision change clears the previous node selection. **Disconnect** clears device pixels and selection and turns off input mode and live refresh. Received logs remain available for inspection; reconnection starts a fresh device session.

## Send taps from the image

1. Connect a device with input capability.
2. Switch to **Send taps**. The controls use amber to indicate that input is armed.
3. Click the target in the captured image.

The Inspector converts the image position into logical display coordinates, sends a 60 ms tap, and refreshes. Switch back to **Inspect** when finished to resume selecting objects. An accepted tap can precede navigation or rendering completion. Use CLI `input tap --hold-ms` to choose another hold duration.

## Filter and follow logs

**Event logs** and the Inspector drawer share the latest 512 records. Search by target or message and select a minimum severity. **Follow** scrolls to the newest matching record; **Clear** clears the local window buffer while device collection continues.

**Device dropped** is the subscription's cumulative loss count when that record was sent. **Record fields truncated** indicates that a record field was truncated. Host receiver gaps appear as a separate session warning, retained until the next connection. Use [CLI log collection](./logs-metrics.md) for a longer stream.

## Save a fixed frame

Enter a new path under the image and click **Save PNG**. The default directory is Pictures, falling back to the system temporary directory. File creation and PNG encoding run on a separate background thread, and the interface displays **Saving**, **Saved**, or the actual error.

The task retains the frame submitted when saving began. Disconnecting or reconnecting does not replace that frame or cancel the export, and its status remains visible. Another save is disabled while one is pending. Existing files produce an error and remain unchanged; enter an unused name to retry.
