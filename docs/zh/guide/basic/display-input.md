---
title: "显示与输入"
description: "保存固定显示帧，通过逻辑像素坐标复现点击，并比较交互前后的树与画面。"
---

# 显示与输入

显示捕获保存设备适配器提供的固定帧；输入能力通过平台路由发送一次按压与释放。先在 `info` 中确认 `display.capture` 和 `input.tap`。

## 保存显示画面

```sh
escope -d tcp://127.0.0.1:9337 display capture before.png
```

主机完成 CaptureStart、分块读取和 CaptureEnd，将像素转换为 RGB PNG。使用新的文件名，已有文件不会被覆盖。

一次捕获的所有分块来自同一固定帧，`frame_id` 标识平台帧。它可能是 LVGL 输出、应用快照或平台最终显示，取决于设备适配器。团子 OS 的适配器读取最后完成上传的显示平面，包含主页、原生/Lua 页面和转场；这不是屏幕 GRAM 回读或摄像头图像。

## 发送点击

```sh
escope -d tcp://127.0.0.1:9337 input tap 100 140 --hold-ms 60
```

坐标使用设备显示的逻辑像素，按压时长以毫秒计。CLI 允许 1–5000 ms，平台还会检查坐标和自身限制。参考设备中的 `(100, 140)` 位于计数按钮内。

输入返回表示设备接受操作，页面和渲染可能随后完成。操作一次后等待目标页面稳定，再采集结果；不要在不确定时重复发送副作用操作。

## 比较操作结果

```sh
escope -d tcp://127.0.0.1:9337 ui tree
escope -d tcp://127.0.0.1:9337 display capture after.png
```

结合树中的标签、revision、画面的变化和日志判断操作是否生效。树与显示分别采样；需要更连续的观察可打开 [Inspector](./inspector.md)。

## 断线与捕获清理

正常采集结束会释放固定帧。捕获开始后，如果请求超时或取消而主机还不知道 capture ID，SDK 会关闭 Session，以便平台 reset 回收资源；重新连接后再采集。已知 ID 时会先尝试结束捕获。平台还需要在断线时释放未完成的模拟按压。

遇到 Busy 或连接关闭时，按[故障排查](../advanced/troubleshooting.md)确认资源状态。完整生命周期见[架构](../../development/architecture.md)。
