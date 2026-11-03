---
title: "团子 OS"
description: "为团子 OS 启用 EmbedScope Agent，连接独立诊断 CDC，并调试原生页面、Lua 应用和系统显示。"
---

# 团子 OS

[团子 OS](https://github.com/umbrella22/dangoOS) 是运行在 ESP-Mosaico 上的 Rust 嵌入式系统，提供团子主页、原生设置、Lua 应用，以及音频、传感器和设备服务。原生界面使用 LVGL 与 rs_lvgl_ui，主页、Lua 和转场通过系统显示平面输出。

EmbedScope 的团子适配器提供结构化日志、真实内存指标、UI 树、最终显示捕获、模拟输入和 RTC 崩溃摘要。原控制台继续处理文本、应用管理和 A/B OTA，诊断使用独立的第二路 USB CDC。

## 准备工程

克隆[团子 OS 源码](https://github.com/umbrella22/dangoOS)，按工程的构建说明准备固件工具链。EmbedScope 由应用的 `embedscope` feature 控制，默认关闭。

适配器使用 `escope-protocol`、`escope-agent` 与 `escope-lvgl`，由 `embedscope` feature 统一启用。

团子工程使用 Rust 1.99.1、`riscv32imafc-unknown-none-elf`、Espressif RISC-V C 编译器与 libclang。按团子工程的构建说明配置 `.cargo/config.toml` 中的本机工具链路径。rs_lvgl 与 rs_lvgl_ui 使用 0.3.1，适配器复用同一 LVGL 9.6 provider。

## 启用并构建 Agent

在团子工程执行：

```sh
cargo build -p os --bin os-fw --release \
  --target riscv32imafc-unknown-none-elf \
  --features firmware,embedscope
```

该命令只构建固件。使用团子工程已有的镜像生成和设备更新工具安装；`escope` 不提供 OTA。关闭 `embedscope` feature 可构建不带诊断接口的版本。

### 正常固件与诊断固件

`embedscope` 默认关闭，是否包含诊断功能由 Cargo feature 决定，与 debug/release 优化模式分别控制：

| 命令 | 构建结果 |
| --- | --- |
| `cargo fw` | release 固件，不含 EmbedScope Agent 和第二路诊断 CDC |
| `cargo fw --features embedscope` | release 固件，包含 EmbedScope 诊断能力 |

`cargo fw` 别名已经包含 `--release`。显式开启 feature 后，release 构建仍会保留诊断代码；`--release` 不负责关闭它。切回普通 `cargo fw` 时，Cargo 会按关闭诊断的配置重新选择构建产物，无需先执行 `cargo clean`。

设备运行已烧入的固件。安装不带 feature 的镜像后，Agent、诊断 CDC 与采集缓冲不再存在；原控制台日志和 OTA 仍由团子系统提供。

## 连接诊断接口

先按[快速开始](../guide/start/quick-start.md)安装 `escope`。

安装包含 Agent 的固件后，枚举端口：

```sh
escope --json devices
```

ESP-Mosaico S31 的 VID:PID 为 `303a:4001`，JSON 中显示为 12346 和 16385。用同一 `serial_number` 下的 `usb_interface` 区分两路接口：

| 接口 | macOS 串口接口号 | Linux/Windows 常见通信接口号 | 用途 |
| --- | --- | --- | --- |
| 原 CDC | 1 | 0 | 文本控制台、应用管理、OTA |
| 第二 CDC | 3 | 2 | EmbedScope 二进制诊断 |

端口名随机器与 USB 枚举变化。下面的路径仅作示例，替换为实际第二路 CDC，并启用 DTR：

```sh
ESCOPE_PORT=/dev/cu.usbmodemmosaico_s31_r13
escope -d "$ESCOPE_PORT" --dtr on --json info
```

确认 model 为 `ESP-Mosaico S31 / physical`，build_id 对应刚安装的诊断固件。Inspector 使用同一端口并勾选 DTR；切换到 CLI 之前先断开 Inspector。

## 调试运行状态

```sh
escope -d "$ESCOPE_PORT" --dtr on logs --follow --level 3 --target rs_lvgl_ui
```

按 Ctrl-C 结束跟随并释放串口。`rs_lvgl_ui.stats` 记录当前页面、对象和更新统计。复现卡顿或页面切换时，将这些日志与指标一起观察：

```sh
escope -d "$ESCOPE_PORT" --dtr on --json metrics --count 5 --interval-ms 1000
```

internal heap、最大连续块与 PSRAM 分别报告，最低空闲水位缺测为 null。CLI 进程使用完会释放串口；需要同时采集多项时，使用 Inspector 或同一个 SDK Session。

## 调试原生页面与 Lua 应用

在设备上打开待检查页面，再读取树和画面：

```sh
escope -d "$ESCOPE_PORT" --dtr on ui tree
escope -d "$ESCOPE_PORT" --dtr on display capture dango-before.png
```

原生页面的树提供真实控件类型、label 文本、几何和页面名称，可据此确定目标坐标。对目标控件执行一次点击：

```sh
escope -d "$ESCOPE_PORT" --dtr on input tap 104 140 --hold-ms 60
```

坐标必须根据当前页面选择；`(104, 140)` 是 Launcher 中设置图标的示例。等待切换完成后重新读取树与截图。输入通过系统统一队列，原生 UI 与 Lua 应用都能收到相应事件。

主页和 Lua 画布中的内容不会逐个出现在 LVGL 树中。显示捕获来自最后完成上传的最终平面，仍包含 Home、Screen 和 Slide 转场；树和画面是独立采样。

需要保存完整现场时：

```sh
escope -d "$ESCOPE_PORT" --dtr on diagnose --output dango-diagnosis --logs 8
```

检查报告的 complete、issues、固件身份与各项数据。RTC 摘要可能保留历史 panic；只有完整 build marker 匹配时才关联构建和启动身份。进一步处理连接与采集问题见[故障排查](../guide/advanced/troubleshooting.md)。
