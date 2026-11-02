---
title: "桌面 Inspector"
description: "在原生桌面窗口中连接设备，联动查看 UI 对象、显示、指标和日志，并保存截图。"
---

# 桌面 Inspector

Inspector 在同一个窗口提供对象树、显示画面、运行指标和结构化日志。它与 CLI 使用同一设备协议和主机 SDK。

![Inspector 连接团子 OS 并检查真实设置页](/images/inspector-dango.jpg)

## 启动程序

在 EmbedScope 源码根目录执行：

```sh
cargo run -p escope-desktop -- tcp://127.0.0.1:9337
```

参考设备需先在另一个终端运行 `escope simulate`。macOS 可生成本地开发应用包：

```sh
bash scripts/package-macos.sh
```

产物位于 `target/EmbedScope Inspector.app`。桌面平台依赖见[构建与测试](../../development/testing.md)。

## 连接设备

在顶部填写 TCP 入口或串口路径。串口波特率使用 115200；需要 CDC DTR 的设备先勾选 `DTR`，再点击 `Connect`。未勾选时使用串口打开器的默认 DTR 策略。

连接后确认右侧设备名称与 build_id。串口由 Inspector 独占；使用 CLI 之前先点击 `Disconnect`。

## 检查对象与画面

1. 在左侧对象树选择节点，查看中央边界和右侧几何属性。
2. 默认点击中央画面选择对象，不向设备发送输入。
3. 点击 `Refresh` 获取新树、指标和画面，或启用 `Refresh every second`。

页面切换时，等布局完成后刷新。树与显示是独立采样，刷新会在 revision 变化时清除旧选择。系统缺测指标显示 `Unavailable`。

中文标签使用系统已安装的 CJK 字体回退；程序不会下载或安装字体。自绘画面和字体已烘焙在设备截图内，与桌面对象树的文字显示分别处理。

## 复现点击

勾选 `Send taps to device` 后，点击画面会转换为设备逻辑坐标，发送 60 ms 的模拟点击并更新采样。使用完毕可取消勾选，恢复对象选择。

底部日志窗口最多保留最近 512 条。长期日志采集使用 CLI，并检查设备 dropped 与主机接收缺口。

## 保存 PNG

填写新的文件路径，点击 `Save PNG`。程序在后台保存提交时的固定截图，期间显示 `Saving`，完成后显示 `Saved` 或具体错误。保存期间可以刷新、断开或重新连接，重复保存按钮会暂时禁用。

默认路径位于 Pictures 或系统临时目录。已有文件会返回错误并保持原内容；选择新路径后再保存。断线清除设备视图和节点上下文，已经开始的保存任务继续执行，保存结果仍显示在窗口中。
