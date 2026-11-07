---
title: "UI 检查"
description: "读取原生控件与布局类型，理解 UI 构造器和 kind 的对应关系，在 Inspector 中沿层级定位对象并比较 revision。"
---

# UI 检查

UI 树将设备对象的层级、名称、位置和尺寸提供给主机。使用它定位控件、检查布局，以及确定模拟输入坐标。设备需要声明 `ui.tree` 能力。

## 读取对象树

```sh
escope -d tcp://127.0.0.1:9337 --json ui tree
```

输出是节点数组。`id` 标识节点，`parent` 指向父节点，根节点的 parent 为 0。`kind`、`name` 由设备适配器提供；`x`、`y`、`width`、`height` 使用显示逻辑像素。`flags` 的位含义由 provider 定义。

对象的范围可写为 `[x, x + width)` 与 `[y, y + height)`。选择范围内的点后，可按[显示与输入](./display-input.md)复现点击。

## 在 Inspector 中定位控件

连接[桌面 Inspector](./inspector.md)，在左侧选择对象，中央画面会标出该对象的边界，右侧显示属性。默认 `Inspect` 模式下点击画面会选择命中的对象；发送触控需要切换到 `Send taps`。

对象树按层级连续显示每个子树，并保留设备提供的同级顺序。按类型、名称或 ID 搜索时，结果包含命中节点的祖先路径。画面中有重叠对象时，选择按层级绘制顺序从后向前查找命中的对象；透明区域和自定义绘制的精确命中规则仍由设备输入系统决定。

画布或直接绘制页面可能只有少量节点。像素画面与对象树表示不同数据，画布中的每个绘制元素不会自动变成 UI 节点。

## 理解 revision

节点身份由 session、revision 和 id 共同确定。树变化时，旧 revision 会失效；SDK 会重新遍历，持续变化超过重试次数时返回错误。

页面切换后等待布局完成，再重新获取树。点击确认表示输入已被设备接受，树和截图分别采样；它们没有跨能力的原子快照保证。需要比较变化时，保存操作前后的身份、树与画面。

## 不同适配器提供的信息

| 适配器 | 元数据 |
| --- | --- |
| 自定义 `TreeSource` | 由应用定义类型、名称和几何 |
| `NativeTree`（SDK 0.5.0） | 启用的控件类型、普通对象的 `row` / `column` / `grid` 布局、几何与 state，名称为空 |
| 团子 OS 平台树 | 真实 LVGL 类名、label 文本、页面名称和几何 |

rs_lvgl_ui 的声明式 View 结构不会自动作为另一棵树导出；typed 构造器、条件子节点和组件插槽显示为它们生成的原生对象。`App::overlay` 的弹窗位于独立 top layer，只遍历活动 screen 时不包含它。根对象选择与应用语义扩展见 [LVGL 与 rs_lvgl 接入](../../integration/lvgl.md)。

rs_lvgl_ui 0.7 使用 `container()`、`progress_bar(...)`、`message_box(...)` 和 `animated_image(...)` 等构造器名称。Inspector 沿用原生类型 `lv_obj`（或布局类型）、`bar`、`msgbox` 和 `animimage`。双端滑块显示为 `slider`，`chart(ChartSpec)` 显示为 `chart`，自定义控件显示其实际创建的 LVGL 类型。图表 series ID、Props 和 View key 不会成为额外节点。
