---
title: "连接设备"
description: "选择串口或 TCP 入口，配置 DTR，并通过握手确认设备固件与可用能力。"
---

# 连接设备

设备需要运行 EmbedScope Agent，并提供可靠的字节流。普通文本控制台不会响应 EmbedScope 握手。尚未接入 Agent 的工程先阅读[设备接入](../../integration/rust.md)。

## 选择串口

枚举端口及 USB 元数据：

```sh
escope --json devices
```

通过 `port`、`product`、`serial_number` 和 `usb_interface` 选择目标。`usb_vid` 与 `usb_pid` 是数值，JSON 中以十进制表示。枚举不打开端口，也不检测端口是否运行 Agent；同一 USB 设备可能提供控制台和诊断两个接口。

例如，将实际诊断端口写入变量：

```sh
ESCOPE_PORT=/dev/cu.usbmodem-example
escope -d "$ESCOPE_PORT" --dtr on --json info
```

Windows 端口使用 `COM3` 等名称，Linux 常见 `/dev/ttyACM0`。路径以当前枚举结果为准。省略 `-d` 时，CLI 仅在恰好发现一个串口的情况下自动选择。

## 配置串口参数

`--baud` 默认为 115200。`--dtr` 的三种策略为：

| 值 | 行为 |
| --- | --- |
| `preserve` | 使用串口打开器的默认策略，不额外设置 DTR |
| `on` | 打开后拉起 DTR |
| `off` | 打开后拉低 DTR |

USB CDC 可能等到 DTR 拉起才接收数据，团子 OS 的诊断接口需要 `--dtr on`。其他板的控制线可能连接复位电路，按该平台的要求设置。

串口连接默认独占。切换 CLI、Inspector 或其他串口工具之前，先关闭当前连接。一个主机程序内部的多个功能可以复用同一个 SDK Session。

## 连接 TCP

```sh
escope -d tcp://127.0.0.1:9337 --json info
```

TCP 服务需要直接承载 EmbedScope 字节帧。串口参数对 TCP 不生效。当前 TCP 用于本地开发和受控测试环境，协议没有配对与鉴权机制。

## 确认连接结果

`info` 输出包含三部分：

| 字段 | 检查内容 |
| --- | --- |
| `device` | 设备名称、model、firmware、build_id、boot_id 与 uptime_ms |
| `session` | 本次握手编号、协议、最大 payload 与协商身份 |
| `capabilities` | 本次连接可使用的功能名称 |

`build_id` 区分固件，`boot_id` 区分一次启动，session 区分握手生命周期。重新连接后重新获取这些信息，旧节点和捕获 ID 不跨 session 使用。

## 调整超时

```sh
escope -d "$ESCOPE_PORT" --dtr on --timeout-ms 5000 info
```

默认请求超时为 3000 ms。先确认端口、DTR 与占用来源，再根据设备响应速度调整超时。常见失败处理见[故障排查](../advanced/troubleshooting.md)，完整选项见 [CLI 参考](../../reference/cli.md)。
