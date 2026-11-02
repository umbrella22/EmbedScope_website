---
title: "Capture display and send input"
description: "Save a fixed display frame, send a logical-pixel tap, and compare the resulting pixels and UI state without assuming rendering has completed."
---

# Capture display and send input

Use a display capture to record pixels and an input tap to reproduce a specific action. These capabilities are independent: firmware can provide either one, both, or neither.

## Save a screen

```sh
escope -d tcp://127.0.0.1:9337 display capture screen-01.png
```

The result reports the output path, dimensions, frame ID, and session. The SDK retrieves a fixed frame and converts supported raw formats to packed RGB before PNG encoding. Choose a new path; an existing file is preserved.

Check the platform's capture source when interpreting the image. It can represent a final display buffer, an LVGL shadow, or another defined plane. Final display mirrors record uploaded pixels; they do not by themselves confirm panel output or what a camera would observe.

## Reproduce one tap

For the reference counter:

```sh
escope -d tcp://127.0.0.1:9337 input tap 100 140 --hold-ms 60
```

Coordinates are logical display pixels. The platform validates the location and converts the request into its input route. A successful response means the tap was accepted. Rendering or page navigation can finish later.

On hardware, read the current [UI tree](./ui-inspection.md) and capture before selecting coordinates. A timed-out tap may already have executed. Read back state before deciding whether to send it again; the SDK does not replay input automatically.

## Compare before and after

```sh
escope -d tcp://127.0.0.1:9337 display capture before-01.png
escope -d tcp://127.0.0.1:9337 input tap 100 140
escope -d tcp://127.0.0.1:9337 ui tree
escope -d tcp://127.0.0.1:9337 display capture after-01.png
```

For a device transition, repeat the observation after navigation completes. Tree and display sampling are independent, including within an Inspector refresh or diagnosis collection.

## Recover an interrupted capture

The capture sequence reserves a fixed frame, reads blocks, then releases it. If capture start times out or is cancelled before the host learns the capture ID, the SDK closes the Session so a platform reset can release an unknown resource. Reconnect before continuing. An explicit device rejection such as `Busy` leaves the Session usable.

Once the ID is known, cancellation or a read failure triggers a cleanup attempt. The platform must also release the frame and any held synthetic input on disconnect. See [Architecture and lifecycles](../../development/architecture.md) for the complete cleanup contract and [Protocol 1](../../reference/protocol.md) for formats and byte units.

The [Inspector](./inspector.md) provides image selection, optional click-to-tap, and background PNG export for the same workflow.
