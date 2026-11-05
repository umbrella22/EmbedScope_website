---
title: "架构与生命周期"
description: "理解 no_std Agent、平台 Backend、Tokio Session 与桌面 Inspector 的分工，以及请求、日志、UI revision 和捕获资源的生命周期。"
---

# 架构与生命周期

EmbedScope 使用一条字节流连接主机 Session 与设备 Agent。协议与 Agent 无堆分配，平台 Backend 提供实际能力；CLI 与 Inspector 复用主机 SDK。

```text
CLI / Inspector / 自定义主机应用
                 │
        escope-host · Tokio Session
                 │
        TCP / Serial 字节流
                 │
       escope-protocol + escope-agent
                 │
      Backend · 平台任务 / UI 安全点
       日志 / 指标 / 树 / 显示 / 输入 / Crash
```

## 工作区分工

| Crate | 责任 | 运行环境 |
| --- | --- | --- |
| `escope-protocol` | Typed CBOR、envelope、COBS、CRC 与有界解码 | 无堆分配 `no_std` |
| `escope-agent` | 握手、会话、能力检查、日志队列、Backend 分发 | 无堆分配 `no_std` |
| `escope-host` | Tokio Session、TCP/serial、并发请求、树与捕获校验 | 主机 `std` |
| `escope-cli` | `escope` 命令、JSON、参考设备、诊断包 | 主机 `std` |
| `escope-lvgl` | UI 线程桥、节点注册表、可选 native adapter | `no_std`；native 复用宿主 LVGL |
| `escope-c-api` | 对齐 context 与 C 回调 ABI | 无堆分配 `no_std` rlib |
| `escope-desktop` | egui/eframe Inspector 与后台 worker | 原生桌面 |

Agent 不安装日志器、不建立 USB 描述符，也不取代原有更新协议。通用 C rlib 不提供全局 panic handler；最终固件封装负责运行时与链接。

## 请求与响应

连接完成前，Session 发送 `Hello(session=0)`。Agent 清理平台会话资源，再返回非零 session、协议、构建身份和能力。之后每个请求携带 session、非零 id 与 operation；响应回显这些关联信息。

每条连接只有一个读取循环。Session 最多支持 32 个在途调用和 32 个排队请求。响应不仅匹配 id，还检查 operation、版本与 session。超时和 future 取消都会移除 waiter，晚到响应被忽略。点击等副作用操作不自动重放。

并发请求在**同一个进程的同一个 Session**中复用连接。独立运行的 CLI 与 Inspector 各自打开串口，同一串口同时只能由一个进程使用。

## 会话与平台清理

重复 Hello 会重置 Backend、清理订阅并轮换 session。断线由集成层调用 reset，同时丢弃部分 RX 与待发 TX。平台负责在启动/新连接时提供不同的非零 seed。

设备身份、固件 build、boot 和 session 各自表达不同范围。UI 节点与 capture ID 不能跨 session 复用。reset 还需要释放捕获和未完成的合成输入，避免下一次连接继承上次操作。

## 同步 Backend 与任务调度

`Backend::handle` 同步返回。对 UI 的可靠接入方式，是通信任务将完整请求排队到 UI loop 的安全点，在该线程执行 Agent/UiBridge，再将编码后的响应交回 TX。

另一种方式是平台提前准备安全只读的结果。资源暂不可用时返回 Busy；SDK 会把这个结果交给调用方，不自动轮询直到成功。平台不能依赖透明的异步重试来完成其工作队列。

同一个 Agent 或 C context 的调用串行。其他任务与 ISR 使用有界队列传递日志或工作，不能从多个执行上下文直接操作同一状态。

## 日志的两个丢失来源

设备 Agent FIFO 保存 16 条记录，满时丢弃新记录。平台上游日志队列的损失通过 `record_dropped_logs` 合并。target/message 的 UTF-8 前缀上限为 48/192 字节，字符边界截断通过 `truncated` 标记；设备 `dropped` 报告累计丢失。

主机将事件放入容量 128 的 broadcast。接收者落后时得到 `Lagged(n)`；它与设备 FIFO 丢失不同。Inspector 的可视窗口另外保留最近 512 条。分析长期日志时需要同时观察这几层边界。

## UI 树的一致性

`UiBridge<T: TreeSource>` 在 UI 线程检查非零 revision。树变化使旧查询返回 Stale。SDK 最多尝试三轮，拒绝重复 cursor/ID、缺失 parent、parent 环和超过 4096 节点。

native 适配器直接使用应用共享的 `rs_lvgl_sys` 0.5.0 provider，根据有效配置识别控件类型和普通 Flex/Grid 布局，同时读取原生几何和 state。树保留原生 host 与内部节点；自定义 TreeSource 提供文本、View key 和组件边界等语义字段。NodeRegistry 的 generation 防止删除后地址复用恢复旧 ID，耗尽槽位会退休。

树提供对象元数据，截图提供像素。LVGL shadow、局部 view snapshot 与最终屏幕对应不同渲染范围，由平台根据显示路径选择捕获来源。

## 捕获资源生命周期

捕获由 Start → Read → End 组成。Start 建立固定帧视图，Read 返回 ID/offset 一致的数据块，End 释放资源。主机验证 stride、总长度、块长、done、格式与 32 MiB 输入预算，转换成 packed RGB888 后导出 PNG。

| 结束路径 | SDK 行为 | 平台责任 |
| --- | --- | --- |
| 正常完成 | 发送 CaptureEnd | 释放固定帧 |
| 设备明确拒绝 Start，如 Busy | 保持 Session 可用 | 不残留已接受的捕获 |
| Start 超时、取消或回复不可解码，ID 未知 | 关闭 Session，调用方需重连 | 断线/reset 释放未知 ID 资源 |
| ID 已知时取消或读取失败 | 尝试 CaptureEnd | 处理释放；Stale 表示已失效 |
| End 清理失败 | 关闭 Session | reset 兜底释放 |

主机在发出 Start 前建立 cleanup lease，避免 future 在等待响应时被取消而泄漏固定帧。平台 reset 的正确实现仍是协议完整性的组成部分。

## Inspector 的线程边界

egui 主线程处理输入、绘制与结果；后台工作线程执行连接、指标、捕获和日志。PNG 文件创建与编码由独立后台线程执行，任务保留提交时的固定截图，断线后继续执行。断线清空设备截图、节点选择与输入上下文，revision 变化清空旧选择。缺少能力或指标时，界面显示真实缺测状态。

协议字段见 [协议 1](../reference/protocol.md)，接入实现见 [Rust](../integration/rust.md)、[C/C++](../integration/c.md) 与 [LVGL](../integration/lvgl.md)。
