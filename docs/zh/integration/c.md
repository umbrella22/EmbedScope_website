---
title: "C/C++ 设备接入"
description: "通过 C ABI 将 Rust Agent 接入现有 C 或 C++ 固件，正确管理对齐存储、回调、分片收发、返回码和固件静态库运行时。"
---

# C/C++ 设备接入

`escope-c-api` 将同一个 Rust Agent 暴露为 C ABI。设备继续使用自己的 HAL、任务和内存分配策略。头文件位于源码仓库的 `crates/escope-c-api/include/escope.h`。

它是无堆分配的 `no_std` rlib。固件需要用 Rust 交叉编译相关代码，并提供最终 staticlib wrapper、目标 panic handler、链接脚本和运行时。

## 运行 C 示例

在 EmbedScope 源码根目录执行：

```sh
bash scripts/check-c-api.sh
cargo check -p escope-c-api --target riscv32imafc-unknown-none-elf
```

第一个命令构建主机 staticlib wrapper，使用系统 C 编译器编译、链接并执行 `examples/c/harness.c`。示例演示初始化、收发和 reset，并检查缓冲容量与错误处理。主机 wrapper 使用 `std`，固件版本需要提供目标运行时。

## Context 与回调

依次执行：

1. 读取 `escope_context_size()` 和 `escope_context_alignment()`。
2. 分配满足大小与对齐要求、地址保持不变的存储。
3. 设置 `EsCallbacks`，调用一次 `escope_init`，传入非零 session seed。
4. 在同一个执行上下文中串行调用 feed、take_tx、poll、push_log 和 reset。
5. 释放存储前调用 reset，确保平台捕获或输入资源已释放。

`capabilities` 和 `info` 回调必需；`handle` 和 `reset` 可选。回调代码与 `user` 数据的寿命覆盖整个 context。回调不得 unwind、保留临时 payload/reply 指针，或写出 `reply_capacity`。UI 回调在应用的 UI 线程执行。

同一个 context 的所有调用都需要串行，包括 ISR 或其他任务的日志。回调重入会返回 Busy；重入检测不能代替跨线程同步。活跃 context 不得重新 init。

身份字符串为 UTF-8，容量按字节计算：name 64、model 64、firmware 32、build_id 64。库会复制回调身份，超长或非法 UTF-8 会造成错误，不将截断的身份当作完整构建标识。其他指针、长度、对齐和重叠条件以 header 合同为准；库无法验证任意非空地址或阻止 C 回调越界写入。

## 分片接收与完整发送

`escope_feed(context, data, len, &consumed)` 接受任意字节片段。每次最多处理一个完整帧，调用方总是按 `consumed` 推进输入，包括返回 `ES_PROTOCOL` 的情况。

```text
取收到的剩余字节
  → feed
  → 按 consumed 推进
  → take_tx 取出完整响应
  → 保留 TX 未发送后缀直到传输完成
  → 继续 feed 剩余 RX
```

TX slot 已满时，feed 返回 `ES_BUSY` 且 `consumed=0`。先排空 TX，再重试未消费后缀。坏帧在定界符处返回 `ES_PROTOCOL`；下一次 feed 从新帧开始，操作本身的拒绝则通过协议响应传回。

`escope_take_tx` 复制完整帧。输出容量不足时返回 `ES_CAPACITY`，保留待发帧，并通过 `written` 返回所需大小；可用 `out=NULL, capacity=0` 查询。没有待发帧时 `written=0`。取出后，部分硬件发送的剩余字节由调用方保存。

`escope_poll` 只在 TX 为空时转入至多一条日志。调度时给控制请求保留预算，避免持续日志延迟输入或截图控制响应。

## 两组返回码

本地 ABI 结果和设备操作结果是两个命名空间：

| 本地 ABI 码 | 值 | 用途 |
| --- | --- | --- |
| `ES_OK` | 0 | 调用完成 |
| `ES_INVALID_ARGUMENT` | 1 | 指针、对齐、参数等错误 |
| `ES_CAPACITY` | 2 | context 或输出空间不足 |
| `ES_BUSY` | 3 | TX 待处理或回调重入 |
| `ES_PROTOCOL` | 4 | 接收帧或编码错误 |
| `ES_CALLBACK` | 5 | 已定义；当前实现没有直接返回此值的路径 |

`EsHandleFn` 回调返回的是 `ES_STATUS_*`，例如 `ES_STATUS_UNSUPPORTED=2`、`ES_STATUS_BUSY=4`。不要将本地 `ES_BUSY=3` 作为 wire Busy 返回。完整远端状态见 [协议 1](../reference/protocol.md)。

身份回调返回非零时，`feed` 将远端 `Internal` 编码进响应；身份超长与非法 UTF-8 分别编码为远端 `Capacity` 和 `InvalidArgument`。成功生成这些错误响应时，本地 `feed` 仍返回 `ES_OK`，主机读取响应后才能判断设备操作是否成功。

## 日志与复位

日志级别为 1…5。Agent FIFO 保存 16 条，target/message 最长为 48/192 个 UTF-8 字节；截断停在字符边界并带 `truncated=true`。队列满时丢弃新记录，后续交付记录报告累计 `dropped`。

`escope_reset` 清理部分 RX、待发 TX、日志和订阅，执行平台 reset 回调并推进 session。断线、重新初始化连接或放弃捕获时，平台需要确保 reset 确实执行。新的主机连接必须重新 Hello。

显示、输入和 LVGL 生命周期与 Rust 接入相同，参见 [Rust 设备接入](./rust.md) 与 [LVGL 接入](./lvgl.md)。
