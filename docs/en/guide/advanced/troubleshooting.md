---
title: "Troubleshooting"
description: "Resolve serial timeouts, native provider mismatches, empty node names, log gaps, stale trees, capture cleanup, and C ABI receive-loop problems."
---

# Troubleshooting

Run `info` against the actual endpoint before comparing observations. Check the model, firmware build, boot/session, and capabilities. Preserve the original command and error.

## Connection times out or the port changes

Run `escope devices` again after reconnecting hardware. Enumeration does not open ports, and an old path can change after unplugging or a firmware update. A multi-interface USB device may have separate console and diagnostic ports.

Close a serial monitor, CLI follower, or Inspector already using the same physical port. Select the correct baud and use `--dtr on` when firmware waits for DTR. The Dango adapter requires its [second CDC function](../../integration/dango.md).

For TCP, leave the server running and connect to its current listen address. A stream mixed with unframed text logs or an existing update protocol does not form a valid EmbedScope transport.

## A capability is Unsupported or a metric is null

Check Hello capabilities. Firmware advertises only implemented operations. A missing capability returns `Unsupported`; it does not return a successful empty result.

`null` or **Unavailable** means the platform did not supply the measurement. Check its memory pool, queue definition, and frame timing scope. A sampled minimum does not establish an allocator low-water value.

## A request returns Busy, Session, Stale, or Capacity

| Result | Check and recovery |
| --- | --- |
| `Busy` | Check an active capture or unavailable UI resource; retry after it becomes available |
| `Session` | Reconnect with Hello and discard previous session context |
| `Stale` | Read the tree or capture again using current IDs and revision |
| `Capacity` | Check payload, tree, buffer, and platform resource limits |

`Backend::handle` is synchronous. `Busy` does not create a job that the SDK polls automatically. A timed-out tap may already have executed; read back the state before deciding to send it again.

## Logs are quiet, truncated, or incomplete

First collect without a target filter. Levels run from Error=1 to Trace=5, and level 3 includes Error/Warn/Info. Host `--target` matches a substring. A finite command times out when matching records do not arrive; follow mode can wait during idle periods.

Preserve device `dropped`, record `truncated`, and host receiver gaps. They describe separate loss mechanisms. Inspector history also ends at 512 recent records. For the SDK, create the local receiver with `subscribe()` before `start_logs()`.

For `diagnose`, each requested log has a fixed three-second wait. Reduce `--logs` on a quiet device; the global RPC timeout does not extend that wait.

## Trees are continually Stale or names are empty

Repeated `Stale` can mean the tree changes during traversal. Run queries at UI safe points. Advance revision after actual node, layout, property, or state changes, without advancing it merely because a node was read.

SDK 0.4.0 NativeTree identifies enabled widget classes and plain Flex/Grid layouts; unclassified native objects appear as `lv_obj`. Names remain empty. Label text, View keys, and component boundaries require an application-defined `TreeSource`. Check the SDK version and actual provider when an older integration reports only `lv_obj`. Deletion hooks must remove registry entries before an address is reused. Stop all reads before freeing a root or deinitializing LVGL.

## Tree and screenshot show different pages

Tree and capture are independent requests. A tap acknowledgement can precede navigation completion, so a refresh during a transition can contain observations from different times. Refresh again after the change and compare revision, frame ID, and logs. A fixed capture guarantees one display frame across its reads; it does not synchronize the tree.

## Capture closes the Session or colors are wrong

A start timeout, cancellation, or undecodable start response can leave an unknown capture ID. The SDK closes the Session so platform reset can release that resource. Reconnect before continuing. An explicit device rejection such as `Busy` leaves the Session usable.

After the ID is known, cancellation attempts CaptureEnd. Cleanup failure other than `Stale` closes the connection. `Backend::reset` must release the frame even when End never arrives.

Check raw format, row stride, `stride × height = total_bytes`, and fixed-buffer lifetime. RGB565 uses little-endian pixels. RGBA export copies RGB channels without alpha composition. Missing Home or transition content can indicate an LVGL-only capture source; compare the platform's actual display paths.

## Saving reports an existing path or an I/O error

PNG files and diagnosis directories use create-new semantics. Enter an unused path with an existing parent. In the Inspector, inspect the inline error and retry after the current export completes. A pending export retains its submitted frame through disconnection.

On macOS, writing to an external volume may wait for the system's file-access permission. Respond to the system prompt or use an already authorized directory. The Inspector can continue to show **Saving** while permission is pending.

Check command exit status after `diagnose`. Individual request failures can appear in `issues`, while identity, subscription, or filesystem failures can terminate collection before a final report is written.

## The C receive loop stops progressing

Advance RX by `consumed` even after `ES_PROTOCOL`. `ES_BUSY` with `consumed=0` requires draining TX before retrying the same suffix. `take_tx` with insufficient capacity preserves the frame and reports the required size through `written`.

Serialize every call on one context, including log publication. Callback reentry detection does not provide a thread lock. Keep local `ES_*` results separate from callback `ES_STATUS_*` values. See [C/C++ integration](../../integration/c.md).

## Report a reproducible issue

Include source revision, target/toolchain, device or reference model, endpoint type, build/boot/session, capabilities, exact command, and original error. Attach the [diagnosis directory](../basic/diagnose.md), and add before/after trees and pixels for UI or input problems. State whether each observation came from software, a native process, or a physical device.
