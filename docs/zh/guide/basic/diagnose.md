---
title: "导出诊断"
description: "将固件身份、日志、指标、UI 树、截图与崩溃摘要保存为诊断包，并检查采集结果。"
---

# 导出诊断

`diagnose` 将一次连接中的身份与可用能力汇集到新目录，适合保存问题现场或交给其他开发者分析。

## 采集现场

```sh
escope -d tcp://127.0.0.1:9337 diagnose --output diagnosis-001 --logs 8
```

使用尚不存在的目录，父目录需要已经存在。`--logs` 指定期望记录数，默认为 8。

典型产物为：

```text
diagnosis-001/
├── report.json
└── screen.png
```

只有设备提供显示能力且捕获成功时才有 `screen.png`。

## 检查报告

先查看 `complete` 与 `issues`，再阅读具体数据：

| 字段 | 内容 |
| --- | --- |
| `info`、`hello` | 设备、固件、启动和会话身份 |
| `capabilities` | 当前设备声明的功能 |
| `metrics`、`logs`、`ui_tree` | 运行指标、有限日志与对象树 |
| `display` | PNG 路径、尺寸与 frame_id |
| `crash` | 平台提供的崩溃摘要 |
| `captured_at_unix_ms` | 主机采集时间 |
| `issues`、`complete` | 采集中的问题和完成状态 |

缺少能力会跳过对应项，不自动判定失败。已连接后的单项采集失败会记录 issues，令 complete 为 false；握手、订阅或文件系统等错误可能直接终止命令。若进程失败，检查 stderr 与实际生成的文件，不把目录存在视为采集完成。

日志阶段等待每条记录最多 3 秒，凑齐指定数量后结束。`--timeout-ms` 调整设备请求超时，不延长这里的日志等待。

## 分析界面问题

先保存一次现场，复现一次输入，等页面稳定后用另一个新目录采集。比较 build/boot、UI revision、截图和相关日志，确认两份报告对应同一次固件启动。设备毫秒时间与主机墙钟时间属于不同时间源。

界面交互方法见 [UI 检查](./ui-inspection.md)与[显示与输入](./display-input.md)。一次诊断包汇集多个独立采样，不提供树、指标和像素的原子快照。

## 单独读取崩溃摘要

```sh
escope -d tcp://127.0.0.1:9337 --json crash show
```

`present=false` 表示平台没有当前可用记录。存在记录时结合 `reason`、`message`、`build_id` 与 `boot_id` 判断来源。历史记录可能没有可确认的构建身份；该接口不执行 ELF 符号解析或完整栈展开。
