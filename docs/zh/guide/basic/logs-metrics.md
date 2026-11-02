---
title: "日志与指标"
description: "筛选设备结构化日志并采样内存、帧耗时和队列指标，理解丢失统计与缺测字段。"
---

# 日志与指标

日志描述发生的事件，指标描述采样时的运行状态。先确认设备声明 `logs` 或 `metrics` 能力，再根据复现过程采集。

下例使用参考设备入口；连接实际设备时，将 `-d` 替换为目标入口，并按平台设置 DTR。

## 读取与筛选日志

读取有限记录：

```sh
escope -d tcp://127.0.0.1:9337 --json logs --count 8
```

持续跟随某个模块：

```sh
escope -d tcp://127.0.0.1:9337 --json logs --follow --level 3 --target input
```

级别为 Error=1、Warn=2、Info=3、Debug=4、Trace=5；`--level 3` 接收 1–3。`--target input` 按 target 子串过滤。`--count` 计算过滤后的记录数；未指定 count 或 follow 时读取一条。按 Ctrl-C 结束跟随。

## 解释日志字段

| 字段 | 含义 |
| --- | --- |
| `target`、`message` | 记录来源与消息文本 |
| `timestamp_ms` | 设备启动后的毫秒 |
| `seq`、`session` | 本次订阅的顺序与会话关联 |
| `dropped` | 设备在当前订阅周期内累计丢失的记录数 |
| `truncated` | 文本是否因日志容量而截断 |

主机输出的 `host_log_gap` 表示主机消费者落后，与设备 `dropped` 是不同来源。观察长期运行日志时同时检查这两项。日志时间属于设备时钟，与主机导出时间分别解释。

有限读取在等待匹配记录超时时退出失败。无记录可能来自过滤条件、设备没有产生记录、能力或连接问题，排查方法见[故障排查](../advanced/troubleshooting.md)。

## 采样运行指标

```sh
escope -d tcp://127.0.0.1:9337 --json metrics --count 5 --interval-ms 1000
```

持续观察时使用 `metrics --watch`。每行 JSON 对应一次采样，便于重定向保存或用于其他分析工具。

| 指标 | 单位与解释 |
| --- | --- |
| `heap_free` | 空闲 heap，字节 |
| `heap_largest_free` | 最大连续空闲块，字节 |
| `heap_min_free` | 平台提供的最低空闲量，统计范围由平台定义 |
| `psram_free` | 空闲 PSRAM，字节 |
| `frame_ms` | 平台报告的帧耗时，毫秒 |
| `queue_depth` | 平台工作队列深度 |
| `dropped_logs` | 设备报告的日志丢失量 |

缺测字段为 `null`。最低空闲量的采样最小值与 allocator 历史最低水位含义不同；团子 OS 当前不提供该水位值。空闲 heap 与连续块一起观察，能区分总量不足和连续空间不足。

需要连同 UI 与固件身份保存时，使用[导出诊断](./diagnose.md)。
