---
title: "Rust 设备接入"
description: "在 Rust 固件中实现 Backend 和 Agent 收发循环，接入字节传输、日志、UI 与显示，并处理断线和资源释放。"
---

# Rust 设备接入

设备侧的最小依赖是 `escope-protocol` 与 `escope-agent`。两者均为无堆分配的 `no_std` 库，通过 `Backend` 访问平台能力，复用固件现有的传输、任务调度与日志器。

从 crates.io 添加设备侧协议与 Agent，两个库默认兼容 `no_std`：

```toml
[dependencies]
escope-protocol = { version = "0.1.0" }
escope-agent = { version = "0.1.0" }
```

## 先实现身份

`Backend` 是 Agent 与平台之间的同步接口。先通过 Hello 和 Info 建立基本连接，再逐项启用实现的能力。

```rust
use escope_agent::Backend;
use escope_protocol::{DeviceInfo, Status};

struct Device;

impl Backend for Device {
    fn capabilities(&self) -> u32 { 0 }

    fn info(&self) -> DeviceInfo<'_> {
        DeviceInfo {
            name: "minimal",
            model: "example",
            firmware: "0.1.0",
            build_id: "example",
            boot_id: 1,
            uptime_ms: 0,
        }
    }

    fn handle(
        &mut self,
        _op: u16,
        _payload: &[u8],
        _reply: &mut [u8],
    ) -> Result<usize, Status> {
        Err(Status::Unsupported)
    }

    fn reset(&mut self) {}
}
```

这个最小示例的 `capabilities=0` 是有效配置。Hello、Info 与日志订阅协议由 Agent 处理；其他操作仅在对应能力位开放后交给 Backend。`handle` 将该操作的 CBOR 响应编码进 `reply`，返回已初始化字节数；不支持的操作返回 `Unsupported`。

生产固件应将示例身份替换为实际设备、构建与启动信息。`build_id` 标识固件；`boot_id` 标识启动；协议 session 标识一次握手生命周期，三者用途不同。

## 可执行的最小循环

仓库提供完整示例，不依赖具体串口 HAL：

```sh
cargo run -p escope-agent --example poll_device
cargo check -p escope-protocol -p escope-agent --target riscv32imafc-unknown-none-elf
```

它构造 Hello 并逐字节喂入解码器，展示以下调用链：

```text
接收字节
  → FrameDecoder::push
  → decode_frame（使用独立 scratch）
  → Agent::handle（生成完整 TX 帧）
  → 发送全部 TX 字节
```

将示例中的字节来源与输出替换为 UART、USB CDC 或其他可靠字节流。传输包边界与 EmbedScope 帧边界无关；一帧可能跨多次接收，一次接收也可能含多帧。

RX scratch 中借用的数据必须保持有效，直到 `handle` 完成。TX 至少提供 `MAX_FRAME` 字节，当前为 1098 字节；Agent 会在平台副作用前检查响应容量。非阻塞写入时保留未发送后缀，完整发送后才能复用 TX 给下一响应或日志事件。

## 会话与断线

`Agent::new(seed)` 的 seed 必须非零。平台重启或建立新连接时应提供不同 seed；重复 Hello 与 `reset` 会继续轮换 session。seed 不替代设备或构建身份。

断线时调用 `Agent::reset(&mut backend)`，同时清理 `FrameDecoder` 和平台待发送状态。Backend 的 `reset` 需要释放捕获资源、结束合成按下状态，并清理依赖会话的异步工作。重新连接从 Hello 开始。

## Embassy、RTOS 与 UI 任务

Agent 不依赖执行器。选择能够安全执行各项能力的任务运行它：

1. 通信任务组装完整请求。
2. 对 UI 操作，将请求投递到有界 UI 工作队列。
3. UI loop 在布局与渲染之间的安全点执行 Agent/UiBridge。
4. 将编码后的响应交给 TX 任务，完整发送。

当前 `Backend::handle` 同步返回。`Busy` 是明确结果，SDK 不会自动轮询或重放副作用请求；平台若预计算快照，应自行管理任务与结果生命周期。

同一个 Agent 的调用必须串行。其他任务或 ISR 的日志先进入有界队列，再由 Agent 所在任务调用 `push_log`。在原有 `log::Log` 安装点对结构化 `log::Record` 做 fan-out，再分别格式化；重复安装全局 logger 不能实现双路输出。

## 分阶段开放能力

| 能力 | 平台责任 |
| --- | --- |
| Metrics | 声明可测字段、字节单位与统计范围；缺测保留 `None` |
| Logs | 结构化记录、时间来源、过滤与有界丢失统计 |
| UI tree | UI 线程、非零 revision、节点删除与身份有效期 |
| Capture | 固定帧、像素格式、stride、缓存/DMA 生命周期与释放 |
| Input | 坐标/时长校验、统一输入路由、有序按下抬起与 reset 释放 |
| Crash | 保存与当前 build/boot 对应的摘要 |

LVGL 适配见 [LVGL 接入](./lvgl.md)，帧与 payload 定义见 [协议 1](../reference/protocol.md)。完成接入后，通过 `escope info` 确认设备身份和能力，再使用对应命令检查各项功能。
