---
title: "主机 SDK"
description: "从 crates.io 添加 escope-host，通过共享 Session 连接设备、订阅日志、并发请求与捕获显示，并处理取消和错误。"
---

# 主机 SDK

`escope-host` 提供基于 Tokio 的串口/TCP Session。一个 Session 复用同一传输处理并发请求和日志事件，CLI 与 Inspector 均使用这个库。

## 添加依赖

从 crates.io 添加主机 SDK：

```toml
[dependencies]
escope-host = { version = "0.4.0" }
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }
```

## 连接与采集

```rust
use escope_host::{ConnectOptions, Session};
use std::time::Duration;

#[tokio::main]
async fn main() -> escope_host::Result<()> {
    let session = Session::connect_with_options(
        "tcp://127.0.0.1:9337",
        ConnectOptions {
            timeout: Duration::from_secs(5),
            ..Default::default()
        },
    ).await?;

    let info = session.info().await?;
    println!("{} / {}", info.name, info.build_id);
    let capture = session.capture().await?;
    capture.save_png("sdk-screen.png")?;
    session.close();
    Ok(())
}
```

`connect_with_options` 在打开传输并完成 Hello 后返回。`Session::connect(endpoint, baud, timeout)` 是使用默认 DTR 策略的便捷入口。

| ConnectOptions 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `baud` | 115200 | 串口波特率 |
| `timeout` | 3 秒 | 连接/请求超时 |
| `dtr` | None | None 使用打开器默认策略；Some(true/false) 显式设置 |

团子 OS 诊断 CDC 使用 `dtr: Some(true)`。端口枚举使用 `escope_host::devices()`，不会验证 Agent。返回字段见 [CLI devices](./cli.md#devices)。

## Session 接口

| 方法 | 结果或行为 |
| --- | --- |
| `hello()`、`id()` | 协商身份、能力与当前会话编号 |
| `supports(bit)` | 检查某项协议能力 |
| `info()`、`metrics()`、`crash()` | 读取类型化设备数据 |
| `ui_tree()` | 读取并校验节点与 revision |
| `tap(x, y, hold_ms)` | 发送平台输入 |
| `capture()` | 读取固定帧并结束设备捕获 |
| `subscribe()` | 创建本地事件接收器 |
| `start_logs(level)`、`stop_logs()` | 控制设备日志订阅 |
| `request_raw(op, payload)` | 发送已定义协议操作，返回原始 payload |
| `is_closed()`、`close()` | 查询和关闭共享连接 |
| `corrupt_frames()`、`pending_requests()` | 查看接收损坏帧与在途请求数 |

协议类型与能力位通过 `escope_host::protocol` 导出。Session 可 clone，克隆值共享连接；它们不建立独立串口或独立设备会话。`close()` 关闭共享连接。

## 订阅日志

先创建本地接收器，再启动设备订阅：

```rust
let mut events = session.subscribe();
session.start_logs(3).await?;
let event = events.recv().await.expect("event stream available");
let log = event.log()?;
println!("{}: {}", log.target, log.message);
session.stop_logs().await?;
```

实际事件循环需处理 `broadcast::RecvError::Lagged(n)` 与 Closed。Lagged 表示主机消费者漏读，与设备记录中的 dropped 分开统计。日志接收器可以与同一 Session 的指标和捕获请求并行使用。

## Capture

`Capture` 包含协议元数据 `meta` 与 packed RGB888 字节 `rgb`。SDK 校验 stride、长度、ID、offset、终止标记与输入预算，再转换像素。单次捕获固定像素帧，但不同时固定 UI 树或指标。

`save_png(path)` 是同步文件操作，使用 create_new，已有文件会失败。桌面或服务程序可将保存交给后台任务，避免阻塞界面或执行器。

取消捕获的清理按阶段处理：

| 阶段 | SDK 行为 |
| --- | --- |
| Start 明确被设备拒绝，例如 Busy | 返回错误，Session 保持可用 |
| Start 超时/取消且 ID 未知 | 关闭 Session，以触发平台 reset |
| ID 已知后取消或读取失败 | 尝试 CaptureEnd |
| 清理失败且不能确认已失效 | 关闭 Session，由平台 reset 回收 |

## 错误与重试

`Error` 包含 Io、Disconnected、Timeout、Protocol 和 Device(Status)。设备 Busy 是明确拒绝，SDK 不自动重放。点击等副作用请求超时后，先检查设备实际状态，再决定是否重新操作。

普通请求 future 被丢弃时会移除本地 waiter，晚到响应被忽略；这不等同于设备撤销操作。当前没有 typed cancel 方法，扩展操作通过 request_raw 与平台约定实现。

连接关闭后重新建立 Session，重新获取身份、能力和节点上下文。更多请求关联与资源规则见[架构与生命周期](../development/architecture.md)及[协议参考](./protocol.md)。
