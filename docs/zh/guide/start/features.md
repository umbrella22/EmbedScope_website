---
title: "功能导航"
description: "按运行状态、界面交互和现场采集查找 EmbedScope 的使用指南。"
---

# 功能导航

按待解决的问题选择功能。连接前先通过 [info](../basic/connection.md)确认当前固件、启动身份和能力。

## 观察运行状态

| 任务 | 工具与结果 | 指南 |
| --- | --- | --- |
| 查看指定模块的错误或行为 | 按级别、target 筛选结构化日志 | [日志与指标](../basic/logs-metrics.md) |
| 观察内存变化与卡顿 | 连续采样 heap、PSRAM、帧耗时和队列深度 | [日志与指标](../basic/logs-metrics.md) |
| 读取上次故障信息 | 平台保存的 crash 摘要及其构建来源 | [导出诊断](../basic/diagnose.md) |

## 检查界面与交互

| 任务 | 工具与结果 | 指南 |
| --- | --- | --- |
| 定位控件、尺寸与父子关系 | 带 session/revision 的 UI 树 | [UI 检查](../basic/ui-inspection.md) |
| 保存当前画面 | 固定帧捕获与 PNG | [显示与输入](../basic/display-input.md) |
| 复现一次点击 | 逻辑像素坐标、按压时长、前后状态 | [显示与输入](../basic/display-input.md) |
| 同时浏览树、像素与日志 | 原生桌面窗口、对象选点联动 | [桌面 Inspector](../basic/inspector.md) |

## 保存与分析现场

| 任务 | 入口 | 指南 |
| --- | --- | --- |
| 保存一份可共享的设备现场 | `diagnose` | [导出诊断](../basic/diagnose.md) |
| 使用编码助手采集或接入 | 两份 EmbedScope skills | [AI 辅助调试与接入](../advanced/skills.md) |
| 处理连接、日志和捕获异常 | 按现象检查并恢复 | [故障排查](../advanced/troubleshooting.md) |
| 在自定义主机工具中调用 | `escope-host::Session` | [主机 SDK](../../reference/sdk.md) |

## 扩展设备能力

[Rust](../../integration/rust.md)与 [C/C++](../../integration/c.md)接入指南提供最小 Agent 流程。[LVGL 与 rs_lvgl](../../integration/lvgl.md)说明对象树和线程约束，[团子 OS](../../integration/dango.md)提供平台接入及调试示例。完整参数和线协议分别见 [CLI](../../reference/cli.md)与[协议参考](../../reference/protocol.md)。
