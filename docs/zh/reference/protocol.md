---
title: "协议 1 参考"
description: "查询 EmbedScope 的 COBS/CRC/CBOR 帧、整数 key envelope、状态与能力、操作 payload、UI revision、日志和固定帧捕获合同。"
---

# 协议 1 参考

源码定义位于 `crates/escope-protocol/src/{lib,payload,frame}.rs`。CBOR 使用整数 map key；字符串为 UTF-8，envelope payload 是包含操作 CBOR 的 byte string。Rust 结构内存布局不参与传输。

## 帧与容量

```text
COBS(CBOR(Envelope) || CRC32_IEEE_LE(CBOR(Envelope))) || 0x00
```

CRC32 使用反射 IEEE 多项式 `0xedb88320`，初始与最终反转；参考向量 `123456789 → 0xcbf43926`。四字节 CRC 按 little endian 附加，随后整体 COBS 编码。CRC 检查传输完整性，协议本身没有提供鉴权。

| 常量 | 字节数 | 含义 |
| --- | --- | --- |
| `MAX_PAYLOAD` | 1024 | 单个操作 payload |
| `MAX_ENVELOPE` | 1088 | 编码 envelope 预算 |
| `MAX_PACKET` | 1092 | envelope 加 CRC |
| `MAX_FRAME` | 1098 | COBS 上界，含末尾零 |

空定界符被忽略。超长输入丢弃至下一定界符；坏 COBS、CRC 或 CBOR 不污染下一帧。顶层 CBOR 值后的尾随字节被拒绝。

## Envelope

| Key | 字段 | 类型与要求 |
| --- | --- | --- |
| 0 | version | u16，当前 major 为 1 |
| 1 | kind | 0=Request，1=Response，2=Event |
| 2 | session | u32；Hello 请求为 0，后续使用协商值 |
| 3 | id | u32；请求非零，响应回显，事件为 0 |
| 4 | op | u16，操作码 |
| 5 | status | 状态；请求为 0 |
| 6 | payload | CBOR byte string，内部为操作 CBOR 或空字节 |

新增可选 map key 可以跳过。必需字段缺失、类型错误或未知枚举值无效。未知操作返回 Unsupported。结构有效的未知 major 请求由 Agent 返回 Version，保留请求关联信息。

## 状态

| 值 | 名称 | 含义 |
| --- | --- | --- |
| 0 | Ok | 完成 |
| 1 | InvalidArgument | 参数不符合能力要求 |
| 2 | Unsupported | 未提供能力或操作 |
| 3 | Session | 尚未握手或旧会话 |
| 4 | Busy | 平台资源暂不可用 |
| 5 | Stale | 节点修订或捕获失效 |
| 6 | Capacity | 缓冲或资源不足 |
| 7 | Internal | provider 违反返回合同等内部错误 |
| 8 | Version | 不支持该 major |
| 9 | Cancelled | 平台报告已取消 |

C `handle` 回调使用 `ES_STATUS_*`。C feed/take_tx 的本地 `ES_*` 返回值是另一组数字，见 [C/C++ 接入](../integration/c.md)。

## 能力位与操作

| Bit | 名称 | 开放的操作 |
| --- | --- | --- |
| 0 | LOGS | 日志订阅与事件 |
| 1 | METRICS | Metrics |
| 2 | UI_TREE | UiTree |
| 3 | INPUT | InputTap |
| 4 | CAPTURE | CaptureStart/Read/End |
| 5 | CRASH | Crash |

Hello 与 Info 不需要能力位。Agent 处理握手、身份和日志订阅；其余能力通过 Backend 实现。

| Op | 名称 | 请求 → 响应 |
| --- | --- | --- |
| 1 | Hello | 空 → HelloReply |
| 2 | Info | 空 → DeviceInfo |
| 3 | Metrics | 空 → Metrics |
| 4 | LogsSubscribe | LogFilter 或空 → 空 |
| 5 | LogsUnsubscribe | 空 → 空 |
| 6 | UiTree | TreeQuery → UiNode |
| 7 | InputTap | InputTap → 空 |
| 8 | CaptureStart | 空 → CaptureMeta |
| 9 | CaptureRead | CaptureRead → CaptureChunk |
| 10 | CaptureEnd | CaptureEnd → 空 |
| 11 | Crash | 空 → CrashInfo |
| 12 | Cancel | Cancel → 平台定义结果；当前参考设备释放捕获 |
| 13 | Log | 设备事件 LogRecord；拒绝作为请求 |

## Payload map

每行按照 `key:字段(类型)` 列出 map。`?T` 表示 Option，可缺省或为 null；整数按 CBOR 编码。

| 类型 | 字段 |
| --- | --- |
| HelloReply | 0:session(u32), 1:capabilities(u32), 2:max_payload(u32), 3:protocol(u16), 4:name(str), 5:build_id(str) |
| DeviceInfo | 0:name(str), 1:model(str), 2:firmware(str), 3:build_id(str), 4:boot_id(u32), 5:uptime_ms(u64) |
| Metrics | 0:uptime_ms(u64), 1:heap_free(?u64), 2:heap_min_free(?u64), 3:heap_largest_free(?u64), 4:psram_free(?u64), 5:frame_ms(?u32), 6:queue_depth(?u32), 7:dropped_logs(u64) |
| TreeQuery | 0:cursor(u32), 1:revision(u32) |
| UiNode | 0:id(u32), 1:parent(u32), 2:kind(str), 3:name(str), 4:x(i32), 5:y(i32), 6:width(u32), 7:height(u32), 8:flags(u32), 9:revision(u32), 10:next_cursor(?u32) |
| InputTap | 0:x(u32), 1:y(u32), 2:hold_ms(u32) |
| CaptureMeta | 0:capture_id(u32), 1:width(u32), 2:height(u32), 3:stride(u32), 4:format(enum), 5:total_bytes(u32), 6:frame_id(u64) |
| CaptureRead | 0:capture_id(u32), 1:offset(u32), 2:length(u32) |
| CaptureChunk | 0:capture_id(u32), 1:offset(u32), 2:data(bytes), 3:done(bool) |
| CaptureEnd | 0:capture_id(u32) |
| Cancel | 0:request_id(u32) |
| LogFilter | 0:max_level(u8) |
| LogRecord | 0:seq(u64), 1:timestamp_ms(u64), 2:level(u8), 3:target(str), 4:message(str), 5:dropped(u64), 6:truncated(bool) |
| CrashInfo | 0:present(bool), 1:reason(str), 2:build_id(str), 3:message(str), 4:boot_id(u32) |

内存、stride、offset 和 length 以字节计；位置/尺寸以逻辑显示像素计；设备时间是启动后的毫秒。缺测指标不用零代替。`heap_min_free` 的统计范围由平台提供，采样最小值不等于 allocator 历史 low-water。

## 树遍历

首个查询为 `cursor=0, revision=0`。首节点返回非零 revision，后续查询保持该值，`next_cursor=null` 结束。`parent=0` 表示根。

树变化返回新 revision 或 Stale。主机最多重试三轮，且拒绝重复 cursor、重复 ID、缺失 parent、parent 环与超过 4096 节点。节点 ID 不能脱离 session/revision 使用。

## 显示捕获

PixelFormat：1=RGB565 little endian，2=RGB888，3=RGBA8888。stride 至少容纳一行，`total_bytes=stride×height`。RGB565 逐像素按 little-endian u16 解释，与主机端序无关。RGBA 当前直接导出 RGB 通道，alpha 不参与合成。

Start 固定一帧。Read 返回匹配 ID/offset 的非空数据，不能超过请求长度，`done` 仅在总长度恰好完成时为 true。参考设备每块最多返回 768 数据字节。正常结束发送 End；断线由 Backend reset 释放资源。主机限制总输入为 32 MiB。

开始或清理结果不明时的连接关闭策略见 [捕获生命周期](../development/architecture.md)。

## 日志

Error=1、Warn=2、Info=3、Debug=4、Trace=5；`max_level` 包含数值更小的级别。target 子串过滤由主机提供，不属于当前 LogFilter wire 字段。

Agent FIFO 保存 16 条，target/message 前缀上限为 48/192 个 UTF-8 字节，截断置 `truncated`。`dropped` 为当前订阅生命周期内累计丢失数。seq 和设备时间关联当前会话，不表示主机墙钟时间。
