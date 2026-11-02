---
title: "Debug and integration skills"
description: "Install the two EmbedScope coding-agent skills, diagnose an integrated device, or add the Agent to Rust and C/C++ firmware."
---

# Debug and integration skills

EmbedScope includes two Codex skills. `embedscope-debug` collects observations from a device that already has an Agent. `embedscope-integrate` adds the Agent to firmware and connects the platform capabilities.

## Install the skills

From the EmbedScope source root:

```sh
python3 scripts/install-skills.py
```

The installer uses `$CODEX_HOME/skills`, or `~/.codex/skills` when `CODEX_HOME` is unset. Choose another installation directory with:

```sh
python3 scripts/install-skills.py --destination /path/to/skills
```

Both destinations are checked before copying. Identical installed content is retained. A same-name directory with different content stops installation and reports the preserved path. Compare those changes before updating. Client discovery is described in the [Codex skills documentation](https://developers.openai.com/codex/skills/).

Provide an installed `escope` executable or the EmbedScope checkout location. [Quick start](../start/quick-start.md) covers source installation.

## Diagnose an integrated device

Invoke the debug skill with the endpoint and a concrete observation:

```text
Use $embedscope-debug with tcp://127.0.0.1:9337.
Read device identity and save a diagnosis in a new directory.
Tap the counter button once and compare trees, captures, and logs
before and after the action.
```

For serial hardware, include port, baud, and DTR policy:

```text
Use $embedscope-debug with /dev/cu.usbmodem-example,
baud 115200 and DTR on. Investigate a stutter after a page change.
Collect bounded logs and metrics and save the files in a new directory.
```

The workflow starts with device/build/boot/session and capabilities, then collects the relevant observations. Results identify the data source, reproduction, files, missing evidence, and log loss. Synthetic reference results remain distinct from physical-device observations. A diagnosis request does not by itself authorize a firmware update or device reset.

## Add the Agent to firmware

Invoke the integration skill in the firmware project:

```text
Use $embedscope-integrate to add an Agent to this no_std Rust project.
Use the existing USB CDC transport and logger.
Establish Hello and Info first, then add logs and the LVGL tree.
```

Include target architecture, executor or RTOS, transport, logger, LVGL provider, and display/input paths when known. The workflow builds a minimal connection, adds capabilities incrementally, and checks partial TX, UI scheduling, capture lifetime, and reset behavior.

For C/C++, specify the target C and Rust toolchains. That path uses the aligned C context and target staticlib/runtime setup. See [Rust integration](../../integration/rust.md), [C/C++ integration](../../integration/c.md), and [LVGL integration](../../integration/lvgl.md) for the underlying contracts.

## Maintain a local installation

The versioned sources are `skills/embedscope-debug` and `skills/embedscope-integrate` in EmbedScope. Each contains `SKILL.md`, agent metadata, and references. Reinstall after reviewing updates; the installer preserves differing local directories.
