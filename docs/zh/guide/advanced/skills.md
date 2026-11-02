---
title: "AI 辅助调试与接入"
description: "安装并调用 EmbedScope skills，辅助采集设备诊断或将 Agent 接入 Rust 与 C/C++ 固件。"
---

# AI 辅助调试与接入

EmbedScope 提供两个 Codex skills：`embedscope-debug` 用于已有 Agent 的设备诊断，`embedscope-integrate` 用于固件接入。它们调用 `escope` 或主机 SDK，并按设备声明的能力选择操作。

## 安装

在 EmbedScope 源码仓库根目录执行：

```sh
python3 scripts/install-skills.py
```

安装目录默认为 `$CODEX_HOME/skills`；未设置 `CODEX_HOME` 时使用 `~/.codex/skills`。也可以指定目录：

```sh
python3 scripts/install-skills.py --destination /path/to/skills
```

安装器检查两个目标目录后再复制。相同内容直接保留；同名目录内容不同时停止安装，并显示冲突路径。客户端的 skill 发现方式见 [Codex skills 文档](https://developers.openai.com/codex/skills/)。

使用前准备可用的 `escope` 命令，或在提示中提供 EmbedScope 源码位置。构建方式见 [快速开始](../start/quick-start.md)。

## 调试已接入的设备

在 Codex 中指定 skill、连接入口和待排查现象：

```text
使用 $embedscope-debug 连接 tcp://127.0.0.1:9337。
读取设备身份，保存一次诊断；点击计数按钮一次，
比较点击前后的 UI 树、截图和日志。
```

连接实际设备时，提供枚举得到的串口路径、所需波特率和 DTR 策略。例如：

```text
使用 $embedscope-debug 连接 /dev/cu.usbmodem-example，
波特率 115200，DTR on。排查页面切换后的卡顿，
采集指标和有限日志，并把结果保存到新的诊断目录。
```

调试输出包含设备/build/boot/session、复现步骤、相关采集文件和结论。日志记录 `dropped`、`truncated` 与主机接收缺口；缺测指标保留为 `null`。对于布局和输入问题，提供点击前后的树与截图，便于比较同一次操作的变化。

## 接入新的固件工程

在目标固件工程中调用：

```text
使用 $embedscope-integrate 将 Agent 接入这个 no_std Rust 工程。
传输使用现有 USB CDC，先完成 Hello/Info，
然后接入日志和 LVGL 对象树。
```

为了确定接入点，提供目标架构、执行器、USB/UART、现有日志器，以及显示和输入路径。skill 会按以下顺序处理：

1. 检查工程依赖和已有传输协议。
2. 实现最小 Backend 与完整帧收发，打通 Hello/Info。
3. 按需加入日志、指标、UI、捕获、输入和崩溃摘要。
4. 检查 UI 线程、TX 部分写、DMA/buffer 和 reset 生命周期。
5. 运行相关测试与目标编译，并给出设备端检查步骤。

C/C++ 工程可以在提示中指定语言与目标工具链；对应流程使用 C ABI、对齐 context 和平台 staticlib wrapper。接口细节见 [Rust 接入](../../integration/rust.md) 与 [C/C++ 接入](../../integration/c.md)。

## 维护与更新

两个 skill 的源码分别位于 `skills/embedscope-debug` 和 `skills/embedscope-integrate`，每个目录包含 `SKILL.md`、`agents/openai.yaml` 和 references。更新安装时若提示本地内容冲突，先比较并保留所需修改，再重新安装。
