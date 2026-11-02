---
title: "CLI 参考"
description: "查询 escope 全局选项、命令参数、JSON 输出、文件行为与退出状态。"
---

# CLI 参考

```sh
escope [OPTIONS] <COMMAND>
escope <COMMAND> --help
```

安装与首次运行见[快速开始](../guide/start/quick-start.md)。本页集中列出参数和输出约定。

## 全局选项

全局选项可放在子命令前后。

| 选项 | 默认值 | 含义 |
| --- | --- | --- |
| `-d, --device` | 自动选择唯一串口 | 串口路径、`serial:///dev/...` 或 `tcp://host:port` |
| `--baud` | 115200 | 串口波特率 |
| `--dtr` | `preserve` | `preserve`、`on` 或 `off` |
| `--timeout-ms` | 3000 | 正整数，请求超时；有限 logs 也使用此等待设置 |
| `--json` | 关闭 | 紧凑 JSON；流式结果每行一个对象 |
| `-h, --help` | — | 显示帮助 |
| `-V, --version` | — | 显示版本 |

`preserve` 使用串口打开器的默认 DTR 策略。TCP 忽略串口配置。多串口时需要显式指定设备，详见[连接设备](../guide/basic/connection.md)。

## devices

```sh
escope --json devices
```

只枚举端口，不打开串口或发送握手。每个条目包含：

| 字段 | 类型 |
| --- | --- |
| `port`、`transport` | 字符串；transport 当前为 serial |
| `manufacturer`、`product`、`serial_number` | 可空字符串 |
| `usb_vid`、`usb_pid` | 可空 u16，以 JSON 数值表示 |
| `usb_interface` | 可空 u8；macOS 为数据接口号，Linux/Windows 为通信接口号 |

## simulate

```sh
escope simulate --listen 127.0.0.1:9337
```

`--listen` 默认为 `127.0.0.1:9337`。启动提供合成指标和像素的软件参考设备，输出入口与 `physical_device=false`。Ctrl-C 停止服务。

## info

```sh
escope -d ENDPOINT --json info
```

返回 `device`、`session` 与能力名称数组 `capabilities`。设备字段为 name、model、firmware、build_id、boot_id 和 uptime_ms；会话字段对应协议 Hello。

## logs

```sh
escope -d ENDPOINT --json logs --count 8 --level 3 --target input
escope -d ENDPOINT logs --follow
```

| 选项 | 默认与约束 |
| --- | --- |
| `--count` | 正整数；缺省时普通模式读取 1 条，follow 持续读取 |
| `--follow` | 持续等待，直到 Ctrl-C 或断线；指定 count 时以 count 为上限 |
| `--level` | 5；允许 1–5，接收数值小于等于该值的级别 |
| `--target` | 不过滤；匹配 target 子串，由主机执行 |

有限读取在等待匹配记录超时时失败。主机消费者落后时输出 `type=host_log_gap` 和丢失数量。设备字段含义见[日志与指标](../guide/basic/logs-metrics.md)。

## metrics

```sh
escope -d ENDPOINT --json metrics --count 5 --interval-ms 1000
escope -d ENDPOINT metrics --watch
```

`--count` 为正整数，普通模式缺省采样一次；`--watch` 持续采样，显式 count 可限制次数。`--interval-ms` 默认为 1000，必须为正整数。可选指标缺测输出 null。

## ui tree

```sh
escope -d ENDPOINT --json ui tree
```

遍历当前树。JSON 输出节点数组，默认可读输出列出 id、parent、kind、几何与名称。节点身份和数据范围见 [UI 检查](../guide/basic/ui-inspection.md)。

## display capture

```sh
escope -d ENDPOINT display capture screen.png
```

输出路径必须不存在。完成后返回 path、width、height、frame_id 和 session；PNG 来自设备固定捕获。支持的像素格式见[协议参考](./protocol.md)。

## input tap

```sh
escope -d ENDPOINT input tap 100 140 --hold-ms 60
```

x、y 为 u32 逻辑像素，`--hold-ms` 默认为 60，允许 1–5000 ms。平台执行额外范围校验。成功返回 accepted、x、y、hold_ms 和 session；accepted 表示接受请求，不保证页面已切换完成。

## crash show

```sh
escope -d ENDPOINT --json crash show
```

返回 present、reason、build_id、message 和 boot_id，由平台决定保留与身份关联策略。

## diagnose

```sh
escope -d ENDPOINT diagnose --output diagnosis-001 --logs 8
```

`--output` 必填，新目录的父目录需存在。`--logs` 默认为 8，允许 1–1000 条，日志阶段每条最多等待 3 秒；全局 timeout 不改变这个等待。

输出摘要包含 path、complete 与 issues，目录内保存 report.json 及可用的 screen.png。部分能力采集错误会进入 issues；握手、订阅或文件写入等错误可能终止命令。完整解释见[导出诊断](../guide/basic/diagnose.md)。

## 输出与退出状态

成功数据写入 stdout，错误写入 stderr。`--json` 下操作错误为 `{"ok":false,"error":"..."}`，退出 1。参数错误、帮助和版本保留命令行解析器的退出行为。诊断中的部分采集问题通过 complete/issues 表达，不能只用退出 0 判断现场完整。

文件输出使用新路径；捕获不覆盖已有 PNG，diagnose 不复用已有目录。CLI 没有 shell、OTA、文件传输、事件录制、ELF 符号解析或 cancel 子命令。
