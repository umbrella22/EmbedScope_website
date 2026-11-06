---
title: "故障排查"
description: "排查连接超时、端口占用、原生 provider 不匹配、空节点名称、日志空缺、Busy 和截图异常。"
---

# 故障排查

先保存当前入口、build_id、boot_id 和失败命令。一次只调整一个相关条件，修正后用相同操作确认结果。

## 能枚举端口，但 info 超时

枚举只证明系统看到了串口。确认固件含 EmbedScope Agent，选择其诊断接口，再核对 DTR 与波特率。

```sh
escope --json devices
escope -d /dev/cu.usbmodem-example --dtr on --timeout-ms 5000 info
```

团子 OS 的原 CDC 是文本控制台，第二路才承载 Agent。官方 v0.4.0 固件只提供原控制台，需要先安装包含 `embedscope` feature 的固件。多接口选择见[团子 OS 接入](../../integration/dango.md)。

## 串口提示 Busy 或 Permission denied

检查 Inspector、CLI、串口监视器或其他进程的占用，先关闭当前连接。Linux 还需按系统规则授予当前用户串口访问权限。端口独占不支持两个独立进程同时操作；自定义工具可复用同一个 [SDK Session](../../reference/sdk.md)。

## 日志没有输出

先取消 target 过滤、使用包含目标级别的 max level，并让设备产生一次相关操作。有限日志等待超时表示没有收到足够的匹配记录；`--follow` 可持续等待。

```sh
escope -d tcp://127.0.0.1:9337 logs --follow --level 5
```

检查 `logs` 能力、连接状态、设备 dropped 和 `host_log_gap`。无输出不能单独证明设备正常。

## 指标为 null 或 Unavailable

平台没有提供该测量值。按设备适配器核对可用字段，保留缺测值。团子 OS 当前不提供 allocator 历史最低空闲水位，因此 `heap_min_free` 为 null。字段含义见[日志与指标](../basic/logs-metrics.md)。

## UI 树反复 Stale

树在遍历期间变化。等待页面稳定后再次读取；主机最多重试三轮。接入代码需要在 UI 线程读取并维护一致 revision，节点删除后旧引用不可继续使用。连续动画并不要求每次像素更新都改变对象树。

SDK 0.4.0 的 NativeTree 会识别已启用的控件和普通 Flex/Grid 布局，其余原生对象显示为 `lv_obj`。名称为空是原生适配器的正常输出；文本、View key 与组件边界由应用 TreeSource 提供。旧接入只显示 `lv_obj` 时，先检查 SDK 版本及实际 provider；EmbedScope 0.4.x 的 native 适配器与应用需统一使用 0.6.x provider，兼容矩阵见 [LVGL 接入](../../integration/lvgl.md)。

## 点击成功但界面没有变化

确认坐标位于当前显示逻辑尺寸内，并检查页面是否接受该输入。输入返回表示已接受，随后等待事件处理与渲染完成，再刷新树和截图。Inspector 默认处于 `Inspect` 模式，需要切换到 `Send taps` 才发送点击。

## 捕获返回 Busy 或连接关闭

Busy 表示平台资源暂不可用，SDK 不自动重放。结束其他捕获后重新尝试。Start 的结果不明且 ID 未知时，SDK 会关闭 Session 来触发平台 reset；重新连接并确认身份后再采集，避免在旧会话反复请求。

如果每次都会复现，检查固定帧缓冲、显示任务就绪和 reset 回收，参见[捕获生命周期](../../development/architecture.md)。

## PNG 不存在或保存失败

确认父目录存在、文件名尚未使用、路径可写。CLI 的文件错误输出到 stderr；Inspector 在保存状态行显示错误。Inspector 保存期间显示 Saving，慢磁盘或挂载卷可能延迟完成，界面仍可继续操作。

macOS 保存到外置卷时可能等待系统的文件访问授权。处理系统提示，或改用已获授权的目录；等待授权期间会持续显示 Saving。

## 诊断报告不完整

查看 `complete`、`issues` 和命令退出状态。保留已经成功采集的证据，并针对失败能力单独复测。日志收集的每条等待为 3 秒，增加 RPC timeout 不会改变它。报告结构见[导出诊断](../basic/diagnose.md)。
