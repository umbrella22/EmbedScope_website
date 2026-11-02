---
title: "快速开始"
description: "从源码安装 escope，连接软件参考设备，完成第一个点击、屏幕捕获和诊断包。"
---

# 快速开始

通过本机软件参考设备完成第一次会话，无需准备开发板。以下命令在 EmbedScope 源码根目录执行。

## 环境准备

准备 Rust/Cargo 稳定版和平台链接器。可以先检查工具是否可用：

```sh
rustc --version
cargo --version
```

工作区声明最低 Rust 版本为 1.88。桌面程序和原生 LVGL 的额外依赖见[构建与测试](../../development/testing.md)。

## 第一步：安装命令行工具

当前版本使用源码安装：

```sh
cargo install --path crates/escope-cli --locked
escope --version
```

Cargo 将 `escope` 安装到其 bin 目录。若终端找不到命令，将 Cargo bin 目录加入 PATH，或使用 `cargo build -p escope-cli` 后的 `target/debug/escope`。

## 第二步：启动参考设备

在第一个终端运行：

```sh
escope simulate
```

服务默认监听 `127.0.0.1:9337`。输出中的 `physical_device` 为 `false`；保持这个终端运行，在第二个终端执行后续命令。

## 第三步：建立连接

```sh
escope -d tcp://127.0.0.1:9337 --json info
escope -d tcp://127.0.0.1:9337 ui tree
```

`info` 返回 `device`、`session` 和 `capabilities`。确认设备的 model 为 `software / synthetic`，能力包含 `ui.tree`、`input.tap` 和 `display.capture`。树中可以看到计数标签与按钮。

## 第四步：点击并保存画面

```sh
escope -d tcp://127.0.0.1:9337 input tap 100 140
escope -d tcp://127.0.0.1:9337 ui tree
escope -d tcp://127.0.0.1:9337 display capture first-screen.png
```

点击后，标签变为 `Counter: 1`，显示帧和像素随之变化。计数保存在服务进程内；如果先前已经点击过，数值会继续增加。`first-screen.png` 必须使用尚不存在的文件名。

![参考设备点击后的画面](/images/reference-capture.png)

## 第五步：导出诊断包

```sh
escope -d tcp://127.0.0.1:9337 diagnose --output first-diagnosis --logs 3
```

打开新目录中的 `report.json`，检查 `complete=true` 和空的 `issues`。目录内的 `screen.png` 保存本次采集的画面，报告同时包含身份、日志、指标与 UI 树。参考设备的指标是合成值，缺测字段为 `null`。

体验结束后，在运行参考设备的终端按 Ctrl-C 关闭服务。

## 下一步

- [连接设备](../basic/connection.md)：连接串口 Agent，配置 DTR 和超时。
- [桌面 Inspector](../basic/inspector.md)：在一个窗口里检查对象与画面。
- [功能导航](./features.md)：按调试任务选择日志、指标、UI 或诊断导出。
- [Rust 接入](../../integration/rust.md)：将 Agent 加入自己的固件。
