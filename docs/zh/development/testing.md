---
title: "构建与测试"
description: "配置 Rust 与平台依赖，构建 CLI 和 Inspector，运行 workspace、LVGL、C ABI、端到端与裸机交叉编译检查。"
---

# 构建与测试

Rust 命令在 EmbedScope 源码仓库根目录执行。文档站使用独立的 EmbedScope_website 仓库。

## 工具与平台依赖

| 工具 | 用途 |
| --- | --- |
| Rust/Cargo | CLI 与设备库最低 1.88；桌面 Inspector 最低 1.95 |
| rustfmt、clippy | 格式和静态检查 |
| Python 3 | CLI 端到端测试与 skill 安装 |
| C 编译器与链接器 | LVGL native 构建和 C ABI harness |
| libclang | rs_lvgl native 绑定生成 |
| Bash/POSIX 环境 | 运行仓库检查、C harness 和打包脚本 |

macOS 使用系统 Command Line Tools 提供编译工具。Linux 桌面构建需要 X11/Wayland 与 OpenGL 相关开发依赖。Windows 使用与 Rust host target 匹配的 C 工具链和链接器；CLI E2E 使用 POSIX 管道，需在 POSIX 环境执行。

安装检查组件：

```sh
rustup component add rustfmt clippy
```

## 构建与运行

```sh
cargo build -p escope-cli
cargo build -p escope-desktop
```

CLI 位于 `target/debug/escope`，Inspector 位于 `target/debug/escope-desktop`；Windows 可执行文件使用 `.exe` 后缀。

启动参考设备与 Inspector：

```sh
./target/debug/escope simulate
```

```sh
cargo run -p escope-desktop -- tcp://127.0.0.1:9337
```

以上两个命令分别在不同终端执行。需要优化构建时，为 cargo build 增加 `--release`，产物位于 `target/release/`。

## 运行测试

```sh
cargo test --workspace
cargo test -p escope-lvgl --features native -- --test-threads=1
```

workspace 测试覆盖协议、Agent、主机和桌面 worker。native LVGL 测试使用内存显示，覆盖对象读取、删除和 revision；它使用全局 LVGL 状态，因此串行执行。

CLI 端到端测试在独立进程中启动参考设备，检查命令、JSON、点击、PNG 与诊断包：

```sh
cargo build -p escope-cli
python3 scripts/check-e2e.py
```

每次结果保存在新的 `target/validation/cli-e2e-*` 目录，包括命令回执和截图。

C ABI 测试编译主机 staticlib wrapper，并使用系统 C11 编译器链接和运行 harness：

```sh
bash scripts/check-c-api.sh
```

可通过 `CC` 选择 C 编译器。输出位于 `target/validation/c-api/`，运行日志为 `harness.log`。固件 staticlib 的 panic handler 与链接配置见 [C/C++ 接入](../integration/c.md)。

## 检查裸机库

以下 target 可用于检查不依赖主机运行时的设备侧库：

```sh
rustup target add riscv32imafc-unknown-none-elf
cargo check -p escope-protocol -p escope-agent -p escope-lvgl -p escope-c-api --target riscv32imafc-unknown-none-elf
```

该命令检查默认 feature 的库；应用工程还需使用实际 target、LVGL provider 和链接配置完成固件构建。最小 Agent 循环可在主机运行：

```sh
cargo run -p escope-agent --example poll_device
```

## 运行完整检查

```sh
bash scripts/check.sh
```

脚本依次执行格式、两组 clippy、workspace 测试、native LVGL 测试、RISC-V 库检查、CLI E2E 与 C harness。上面的工具和裸机 target 需要预先安装。

单独运行静态检查：

```sh
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo clippy -p escope-lvgl --features native --all-targets -- -D warnings
```

## 扩展桌面语言

Inspector 使用 Fluent 语言文件，目前支持简体中文和英文。界面通过左下角地球菜单切换语言，偏好由桌面应用存储保存；设备数据和原始错误保持原文。

新增语言时，复制 `crates/escope-desktop/locales/en-US.ftl`，翻译文案并保留条目 ID 与命名参数，然后在 `src/i18n.rs` 的 `LOCALES` 中登记语言 ID、原生名称、内嵌资源与文档前缀。页面代码不需要增加语言分支。没有对应语言文档时，文档前缀使用英文入口。

```sh
cargo test -p escope-desktop
```

测试检查各语言条目及参数一致、Fluent 语法、格式化回退、偏好保存，以及中英文在最小和默认窗口尺寸下的布局与状态保留。新增语言后还需检查原生窗口的字体覆盖与控件宽度。完整源码导航与翻译规则见产品仓库的 `crates/escope-desktop/README.md`。

## 检查平台接入

在目标固件与实际设备上检查身份、能力、日志与指标、树、固定显示帧、模拟输入，以及坏帧恢复和断线重连。中断捕获或合成按压后，确认平台 reset 回收相关资源。将源码版本、固件身份、命令和输出一起保存，便于复现。

[团子 OS 接入](../integration/dango.md)提供独立控制台与诊断 CDC 的操作示例；其他设备可按自己实现的能力采用相同的身份、树、画面与输入流程。

## 构建文档站

进入 EmbedScope_website 仓库，使用符合 `package.json` engines 要求 `^20.19.0 || >=22.12.0` 的 Node.js：

```sh
npm ci
npm run check-docs
npm run typecheck
npm run build
npm run check-build
```

`check-docs` 检查 frontmatter、链接、导航和双语页面；`check-build` 检查生产产物。开发预览使用 `npm run dev`，查看生产构建使用 `npm run preview`。
