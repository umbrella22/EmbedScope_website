---
title: "Build and test"
description: "Prepare Rust and native tools, build the CLI and Inspector, and run protocol, workspace, LVGL, C ABI, end-to-end, and bare-metal checks."
---

# Build and test

Run product commands from the EmbedScope source root. The documentation site is maintained in the separate EmbedScope_website repository.

## Prepare the tools

| Tool | Use |
| --- | --- |
| Rust/Cargo | CLI/device libraries: Rust 1.88; desktop Inspector: Rust 1.95 |
| rustfmt and clippy | Formatting and static analysis |
| Python 3 | CLI E2E and skill installer |
| C compiler and linker | Native LVGL and C ABI harness |
| libclang | Native rs_lvgl binding generation |
| Bash/POSIX environment | Product check and packaging scripts |

On macOS, Command Line Tools provide the system C tools. Linux desktop builds require X11/Wayland and OpenGL development dependencies. Windows requires a C compiler/linker matching the Rust host target. The CLI E2E script uses POSIX pipes.

```sh
rustup component add rustfmt clippy
rustup target add riscv32imafc-unknown-none-elf
```

## Build the host tools

```sh
cargo build -p escope-cli
cargo build -p escope-desktop
```

The executables are `target/debug/escope` and `target/debug/escope-desktop`, with `.exe` on Windows. Add `--release` for optimized binaries under `target/release/`.

Start the reference device in one terminal:

```sh
./target/debug/escope simulate
```

Then launch the Inspector in another:

```sh
cargo run -p escope-desktop -- tcp://127.0.0.1:9337
```

Default workspace members exclude the desktop package. Explicit desktop commands or `--workspace` include it.

## Run workspace and native tests

```sh
cargo test --workspace
cargo test -p escope-lvgl --features native -- --test-threads=1
```

Workspace tests cover protocol, Agent, host, C ABI, UI bridge, and desktop behavior, including subtree order, ancestor-preserving search, and overlapping-object selection. Native LVGL tests verify widget/layout classification, reads, deletion, and revision with a real memory display. They run serially because LVGL has global state.

An independent consumer uses registry `rs_lvgl` / `rs_lvgl_ui` 0.5.0 to build a real 320×240 memory display. It verifies widget kinds, native host hierarchy, padding-derived geometry, and stale revisions. The `composition` test covers typed constructors, component slots, conditional children, controlled-input reconciliation, and top-layer dialogs. Separate configuration probes exercise providers with no layouts, Grid only, and Flex only:

```sh
cargo test --manifest-path examples/rs-lvgl-ui/Cargo.toml --target-dir target --locked -- --test-threads=1
cargo test --manifest-path examples/rs-lvgl-ui/Cargo.toml --target-dir target --features composition --locked -- --test-threads=1
python3 scripts/check-lvgl-config.py
```

Before publication, `python3 scripts/release.py verify` runs the same native UI consumer against extracted SDK archives. Post-publication registry verification uses crates.io dependencies only. Both paths require a single `rs_lvgl_sys` 0.5.0 provider. These tests do not exercise a physical panel.

## Exercise the CLI end to end

```sh
cargo build -p escope-cli
python3 scripts/check-e2e.py
```

The script starts a software reference device in another process and checks JSON, commands, input, PNGs, and diagnosis output. Each run writes a new `target/validation/cli-e2e-*` directory. Its pixels and metrics are synthetic.

## Link and run the C ABI harness

```sh
bash scripts/check-c-api.sh
```

The script builds a host staticlib wrapper, compiles and links the C11 harness with the system compiler, and runs it. Set `CC` to choose a C compiler. Outputs are under `target/validation/c-api/`, including `harness.log`.

This verifies the host ABI path. Firmware requires its actual Rust target, final staticlib wrapper, panic handler, runtime, and linker setup. See [C/C++ integration](../integration/c.md).

## Check bare-metal libraries

```sh
cargo check -p escope-protocol -p escope-agent -p escope-lvgl -p escope-c-api --target riscv32imafc-unknown-none-elf
cargo run -p escope-agent --example poll_device
```

The target check covers default library features without a host runtime. It does not link an application or validate a board. Native LVGL integration also needs the application's actual provider, configuration, and firmware link.

## Run the product gate

```sh
bash scripts/check.sh
```

The gate runs formatting, workspace and native clippy, workspace/native tests, the 0.5 UI consumer, three LVGL configuration probes, RISC-V library compilation, CLI E2E, and the C harness. Install the components and target first.

Individual static checks are:

```sh
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo clippy -p escope-lvgl --features native --all-targets -- -D warnings
```

## Extend desktop languages

The Inspector uses Fluent catalogs and currently supports English and Simplified Chinese. The globe menu changes the language; desktop application storage saves the preference. Device data and original errors remain literal.

To add a language, copy `crates/escope-desktop/locales/en-US.ftl`, translate values while preserving message IDs and named parameters, and register its ID, native name, embedded resource, and documentation prefix in `LOCALES` in `src/i18n.rs`. Views need no language-specific branches. Use the English documentation prefix when a translated site is unavailable.

```sh
cargo test -p escope-desktop
```

Tests check catalog and parameter parity, Fluent syntax, formatting fallback, saved preferences, and bilingual layout and state at minimum and default window sizes. Also check native font coverage and control widths for a new language. The product repository's `crates/escope-desktop/README.md` contains the source map and translation rules.

## Validate a platform integration

Use the platform build and actual hardware to verify identity, capabilities, logs/metrics, bad-frame recovery, disconnect/reconnect, current tree, capture source, accepted input, and cleanup of held input or an interrupted capture. Keep source revision, firmware identity, host commands, and output files together.

The [Dango OS integration guide](../integration/dango.md) provides commands for a platform with separate console and diagnostic CDC functions. Use its identity, tree, display, and input workflow as a starting point for the corresponding capabilities on another device.

## Build the documentation

In EmbedScope_website, use Node.js `^20.19.0 || >=22.12.0` as required by `package.json`:

```sh
npm ci
npm run check-docs
npm run typecheck
npm run build
npm run check-build
```

`check-docs` checks frontmatter, navigation, links, and locale parity. `check-build` inspects production output. Use `npm run dev` for authoring and `npm run preview` for the production preview. Verify the configured deployment base when checking absolute routes and assets.
