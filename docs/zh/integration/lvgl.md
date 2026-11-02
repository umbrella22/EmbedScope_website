---
title: "LVGL 接入"
description: "在 UI 线程导出 LVGL 对象树，维护节点 revision，并接入固定帧显示捕获与统一输入路由。"
---

# LVGL 接入

`escope-lvgl` 将应用已有的 UI 对象导出为 EmbedScope 节点。对象树描述类型、几何、状态和父子关系；屏幕捕获与输入分别连接平台显示输出和输入路由。

## 选择对象树适配方式

| 方式 | 适用场景 | 提供的接口 |
| --- | --- | --- |
| 自定义元数据 | 已有控件注册表，或需要名称、语义类型等应用信息 | `TreeSource`、`UiBridge`、`NodeRegistry` |
| 原生 LVGL 对象 | 使用 `rs_lvgl 0.3.1` / LVGL 9.6 的现有应用 | `native::NativeTree`，启用 `native` feature |

默认依赖不链接 LVGL：

```toml
[dependencies]
escope-lvgl = { path = "../EmbedScope/crates/escope-lvgl" }
```

使用原生适配器时增加 `features = ["native"]`。适配器与应用必须使用相同的 LVGL native provider、ABI 和配置。

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

NativeTree 返回通用 `lv_obj` 类型、空名称、几何和原生 state 位。若需要 label 文本或声明式 View 信息，使用自定义 `TreeSource` 导出对应元数据。

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
