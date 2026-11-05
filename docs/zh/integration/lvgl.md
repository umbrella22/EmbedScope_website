---
title: "LVGL 接入"
description: "使用 rs_lvgl_sys 0.4 导出原生控件与布局类型，在 UI 线程维护树和 revision，并接入显示捕获与输入。"
---

# LVGL 接入

`escope-lvgl` 将应用已有的 UI 对象导出为 EmbedScope 节点。对象树描述类型、几何、状态和父子关系；屏幕捕获与输入分别连接平台显示输出和输入路由。

## 选择对象树适配方式

| 方式 | 适用场景 | 提供的接口 |
| --- | --- | --- |
| 自定义元数据 | 已有控件注册表，或需要名称、语义类型等应用信息 | `TreeSource`、`UiBridge`、`NodeRegistry` |
| 原生 LVGL 对象 | 使用 `rs_lvgl_sys` / `rs_lvgl` / `rs_lvgl_ui` 0.4.0 的 LVGL 9.6 应用 | `native::NativeTree`，启用 `native` feature |

默认依赖不链接 LVGL：

```toml
[dependencies]
escope-lvgl = { version = "0.2.0" }
```

使用原生适配器时增加 `features = ["native"]`。适配器直接依赖 `rs_lvgl_sys` 0.4.0，与应用共享同一 LVGL provider、ABI 和配置。它不需要高层 `rs_lvgl` 样式 API。

从 EmbedScope 0.1.x 升级原生适配器时，需要同时将应用的 0.3 provider 升级到 0.4.0。仍使用旧 provider 的应用可以继续使用 SDK 0.1.x。自定义 `TreeSource` 不受这一 native 依赖变更影响；协议仍为 v1，旧版设备可以继续连接新 CLI 和 Inspector。

## 接入 UI 线程

1. 在 UI 线程创建 `TreeSource` 与 `UiBridge`。
2. 通信任务收到 UiTree 请求后，将工作投递到 UI 队列。
3. UI loop 在布局和对象变更完成后的安全点，调用 `bridge.tree(payload, reply)`。
4. 将编码响应交给 TX 任务完整发送。

`UiBridge` 不是 `Send` 或 `Sync`。读取期间应避免对象删除、并发布局、回调重入和 LVGL deinit。

自定义元数据实现以下接口：

```rust
pub trait TreeSource {
    fn revision(&self) -> u32;
    fn read_node(&mut self, cursor: u32)
        -> Result<escope_protocol::UiNode<'_>, escope_protocol::Status>;
}
```

`read_node` 返回当前 cursor 的节点与下一 cursor，结束时将 `next_cursor` 设为 `None`。节点必须使用非零 ID，根节点的 parent 为 0。

## 使用 NativeTree

在 UI 线程取得已有根对象的 `NonNull<rs_lvgl::sys::lv_obj_t>`，然后创建桥：

```rust
use escope_lvgl::{native::NativeTree, UiBridge};

// root 是应用已有且持续有效的 LVGL 根对象。
let source = unsafe { NativeTree::<128>::new(root) };
let mut bridge = UiBridge::new(source);
```

`128` 是本次树遍历的节点容量；超出时返回 `Capacity`。root 必须持续有效，直到适配器销毁；停止适配器后再删除 root 或 deinit LVGL。

NativeTree 根据应用实际启用的 LVGL 控件输出 `label`、`button`、`slider`、`image` 等类型。普通对象使用 Flex 或 Grid 布局时显示为 `row`、`column` 或 `grid`，其余对象显示为 `lv_obj`。控件类型优先于布局：带有 Flex 的按钮仍显示为 `button`。关闭 Flex 或 Grid 的配置也可使用适配器。

树保留原生 host 对象和控件内部节点；节点几何来自完成布局后的原生对象，state 使用原生位值。名称为空，label 文本、声明式 View key 和组件边界由应用的自定义 `TreeSource` 提供。

## 维护 revision 与节点身份

使用 NativeTree 时，节点、布局、属性或状态改变后，在提供下一次树查询前调用：

```rust
bridge.source_mut().changed()?;
```

自定义 TreeSource 自行维护 revision。树从 `cursor=0, revision=0` 开始读取，后续查询保持首节点给出的非零 revision。变化会使旧查询返回 `Stale`；主机最多重新遍历三次。revision 耗尽时更换会话和适配器。

自定义节点注册表使用 `NodeRegistry` 时，在删除钩子调用 `remove`，再允许原生地址被复用。节点 ID 与 session/revision 共同确定身份。

## 接入屏幕捕获

平台实现 `CaptureStart`、`CaptureRead` 和 `CaptureEnd`：

1. Start 保存固定帧，返回 capture/frame ID、尺寸、stride、格式和字节数。
2. Read 使用同一 ID 和 offset 读取该帧。
3. End 或连接 reset 释放捕获资源。

支持 RGB565 little endian、RGB888 和 RGBA8888。stride 以字节计，满足 `total_bytes=stride×height`；RGBA 导出时直接使用 RGB 通道。

捕获来源应覆盖最终显示输出。对于直接绘制或转场合成画面，只读取 LVGL shadow 可能遗漏内容。读取期间保留 buffer lease 或在安全点复制，确保渲染/DMA 不会覆写固定帧；慢速传输宜使用独立捕获缓存。

## 接入输入并调试

平台将 `InputTap` 的逻辑像素坐标转换为有序 press/release，通过应用统一输入路由分发。检查坐标和 hold 时长；reset 释放未完成的合成按下。

固件接入后，使用设备入口检查树、画面和点击效果：

```sh
escope -d tcp://127.0.0.1:9337 ui tree
escope -d tcp://127.0.0.1:9337 display capture before.png
escope -d tcp://127.0.0.1:9337 input tap 100 140
escope -d tcp://127.0.0.1:9337 display capture after.png
```

把示例入口和点击坐标替换为目标设备的实际值，PNG 文件名需尚不存在。使用 [Inspector](../guide/basic/inspector.md) 可同时查看对象边界与画面；原生适配器测试见 [构建与测试](../development/testing.md)，团子的平台入口见 [团子 OS](./dango.md)。

## 运行 rs_lvgl 接入示例

[rs_lvgl 的 EmbedScope 指南](https://umbrella22.github.io/rs_lvgl_website/guide/embedscope.html)提供基于已发布依赖的真实原生示例，包括 UI 线程接入、固定显示帧、原生指针输入，以及调试开启与正式构建关闭的命令。`embedscope` 是应用拥有的可选 feature；`--release` 不会自动关闭它。
