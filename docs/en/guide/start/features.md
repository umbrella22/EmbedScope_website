---
title: "Feature navigation"
description: "Choose an EmbedScope workflow for connection problems, runtime behavior, UI layout, display pixels, input, or diagnosis collection."
---

# Feature navigation

Start with the observation needed to explain the problem. Every workflow begins with device identity and the capabilities reported by Hello.

| Task | Workflow | Result |
| --- | --- | --- |
| Find the diagnostic endpoint | [Connect a device](../basic/connection.md) | Enumerated serial metadata and a successful Agent handshake |
| Investigate memory or a slow page | [Logs and metrics](../basic/logs-metrics.md) | Structured records and measurements with their statistical scope |
| Locate a control or inspect layout | [Inspect the UI tree](../basic/ui-inspection.md) | Node hierarchy, geometry, flags, and revision |
| Compare pixels before and after input | [Capture display and send input](../basic/display-input.md) | Fixed-frame PNGs and accepted tap results |
| Work visually with tree and pixels | [Desktop Inspector](../basic/inspector.md) | Linked selection, properties, metrics, and recent logs |
| Save the current diagnostic context | [Collect a diagnosis](../basic/diagnose.md) | A new directory with a report and available capture |
| Use a coding assistant | [Debug and integration skills](../advanced/skills.md) | A capability-based collection or firmware integration workflow |
| Resolve a failed command | [Troubleshooting](../advanced/troubleshooting.md) | Checks tied to the observed error or missing data |

## Add support to firmware

Choose [Rust](../../integration/rust.md) or [C/C++](../../integration/c.md) for the initial Agent and transport. Add [LVGL, display, and input](../../integration/lvgl.md) when the firmware has a UI. [Dango OS](../../integration/dango.md) describes the existing ESP-Mosaico adapter and its independent diagnostic CDC.

Only advertise capabilities implemented by the platform. A log-and-metrics device can use EmbedScope without a UI tree or display capture.

## Look up an exact contract

Use the [CLI reference](../../reference/cli.md) for command syntax and defaults, the [Host SDK reference](../../reference/sdk.md) for Rust APIs and errors, and the [Protocol 1 reference](../../reference/protocol.md) for wire fields, statuses, and capacities. [Architecture and lifecycles](../../development/architecture.md) describes request matching, UI scheduling, and resource cleanup.
