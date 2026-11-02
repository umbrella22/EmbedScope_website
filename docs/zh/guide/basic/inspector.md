---
title: "桌面 Inspector"
description: "在原生桌面窗口中连接设备，联动查看 UI 对象、显示、指标和日志，并保存截图。"
---

# 桌面 Inspector

Inspector 是 EmbedScope 的原生桌面调试工具，提供 UI 检查、结构化日志、系统指标和设备信息。它与 CLI 使用同一设备协议和主机 SDK。

![Inspector 连接软件参考设备，联动检查对象树、显示画面和属性](/images/inspector-reference.jpg)

图中连接的是软件参考设备，画面与指标为合成数据。连接实机的方法见[团子 OS 接入](../../integration/dango.md)。

## 启动程序

在 EmbedScope 源码根目录执行：

```sh
cargo run -p escope-desktop -- tcp://127.0.0.1:9337
```

参考设备需先在另一个终端运行 `escope simulate`，完整步骤见[快速开始](../start/quick-start.md)。macOS 可生成本地开发应用包：

```sh
bash scripts/package-macos.sh
```

产物位于 `target/EmbedScope Inspector.app`。桌面平台依赖见[构建与测试](../../development/testing.md)。

## 连接设备

在顶部填写 TCP 入口或串口路径。串口波特率使用 115200；需要 CDC DTR 的设备先勾选 `DTR`，再点击 `Connect`。未勾选时使用串口打开器的默认 DTR 策略。

连接后在左侧 `Device` 页面确认设备名称、型号、build、boot ID 和会话。窗口底部显示当前连接状态与最近采样时间。串口由 Inspector 独占；使用 CLI 之前先点击 `Disconnect`。

## 选择工作页面

左侧图标导航提供四个页面，悬停可查看名称。底部的主题按钮用于切换深色与浅色外观。

| 页面 | 用途 |
| --- | --- |
| UI Inspector | 在对象树、显示画面与属性之间定位控件 |
| Event logs | 查看事件时间、等级、target、消息和丢失标记 |
| System metrics | 查看内存、帧耗时、队列等最近采样值 |
| Device | 核对设备身份、连接信息和已声明能力 |

`Refresh` 和 `Live · 1s` 在各页面均可使用。UI Inspector 的 `Logs` 按钮可展开或收起底部日志抽屉。

## 检查对象与画面

1. 在 `Objects` 中按类型、名称或 ID 搜索并选择节点。
2. 在中央画面查看选择边界，在右侧 `Properties` 查看坐标、尺寸、父节点、flags 和 revision。
3. 默认 `Inspect` 模式下，点击画面也可以选择命中的对象。
4. 点击 `Refresh` 获取新树、指标和画面，或启用 `Live · 1s` 每秒刷新。

页面切换后，等布局完成再刷新。树、指标和显示分别顺序采样；revision 变化时会清除旧选择。系统缺测指标显示 `Unavailable`。

中文标签使用系统已安装的 CJK 字体回退；程序不会下载或安装字体。自绘画面和字体已烘焙在设备截图内，与桌面对象树的文字显示分别处理。

## 复现点击

设备声明输入能力后，可切换到 `Send taps`。此时界面以琥珀色提示输入模式，点击画面会转换为设备逻辑坐标，发送 60 ms 的模拟点击并更新采样。完成后切回 `Inspect`，继续检查对象。

输入确认后，设备可能仍在处理导航或渲染。等待页面稳定再刷新；需要其他按住时长时，使用 CLI 的 `input tap --hold-ms`。

## 查看与筛选日志

`Event logs` 页面与 Inspector 日志抽屉共享最近 512 条记录。可按 target 或消息文本搜索，并选择最低显示等级。`Follow` 控制自动滚动到最新匹配记录；`Clear` 清空窗口的本地日志缓存，设备采集继续运行。

记录上的 `Device dropped` 是发送该记录时的订阅累计丢失数，`Record fields truncated` 表示记录字段发生截断。主机接收缺口会单独显示为会话提示，并保留到下一次连接。长期采集使用 [CLI 日志](./logs-metrics.md)。

## 保存 PNG

填写新的文件路径，点击 `Save PNG`。程序在后台保存提交时的固定截图，期间显示 `Saving`，完成后显示 `Saved` 或具体错误。保存期间可以刷新、断开或重新连接，重复保存按钮会暂时禁用。

默认路径位于 Pictures 或系统临时目录。已有文件会返回错误并保持原内容；选择新路径后再保存。断线清除设备视图和节点上下文，已经开始的保存任务继续执行，保存结果仍显示在窗口中。

断线也会关闭输入模式与自动刷新。窗口保留已接收的日志供查看；重新连接后开始新的设备会话。
