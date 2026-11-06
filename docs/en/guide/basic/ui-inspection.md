---
title: "Inspect the UI tree"
description: "Relate UI constructors to native widget kinds, inspect layout, search with hierarchy context, select overlapping objects, and compare revisions."
---

# Inspect the UI tree

Read the UI tree to locate objects, inspect layout, or identify the control involved in an interaction. The device must advertise `UI_TREE`.

## Read objects and geometry

```sh
escope -d tcp://127.0.0.1:9337 info
escope -d tcp://127.0.0.1:9337 ui tree
escope --json -d tcp://127.0.0.1:9337 ui tree > tree-before.json
```

The text view lists each node's ID, parent, kind, position, size, and name. JSON also retains flags and revision. Positions and sizes use logical display pixels; `parent=0` marks a root.

Find the target by its device-provided name, kind, or geometry. A name can be empty when the platform has no semantic metadata for the object.

## Compare a page change

Save the current capture, perform one input action, and read the tree again:

```sh
escope -d tcp://127.0.0.1:9337 display capture before-01.png
escope -d tcp://127.0.0.1:9337 input tap 100 140
escope --json -d tcp://127.0.0.1:9337 ui tree > tree-after.json
escope -d tcp://127.0.0.1:9337 display capture after-01.png
```

These coordinates select the reference device's counter. For hardware, inspect its current geometry before choosing coordinates. The tree and capture are separate requests. During a transition, a tree can describe an earlier page than the following capture. Read again after the page change and use revision, frame ID, and logs to establish order.

## Interpret revision and identity

A traversal uses one nonzero tree revision. The host follows cursors and restarts a traversal when the platform returns `Stale`, up to three attempts. A continually changing tree can still return `Stale` after those attempts.

Interpret an object ID together with the session and revision. Reconnection or a revision change invalidates the context of an earlier selection. The host rejects duplicate IDs or cursors, missing parents, parent cycles, and trees beyond its traversal limit.

## Understand metadata coverage

In SDK 0.4.0, `NativeTree` exports enabled widget kinds such as `label` and `button`, and `row`, `column`, or `grid` for plain layout containers. Other objects appear as `lv_obj`. Names remain empty; geometry and flags come from native LVGL objects. The tree retains native host objects and internal widget nodes. An application-defined `TreeSource` can supply label text, declarative View keys, and component boundaries.

rs_lvgl_ui typed constructors, conditional children, and component slots appear as the native objects they produce. `App::overlay` dialogs belong to a separate top-layer root and are absent from a traversal rooted at the active screen. See [LVGL integration](../../integration/lvgl.md) for root selection and application metadata.

The rs_lvgl_ui 0.6 constructors include `container()`, `progress_bar(...)`, `message_box(...)`, and `animated_image(...)`. Inspector retains their native kinds: `lv_obj` (or a layout kind), `bar`, `msgbox`, and `animimage`. Higher-level API renames do not rename these native kinds.

The Dango integration uses a custom tree that includes widget kinds and label text for its native and Lua LVGL pages. Its Home character canvas is drawn outside the LVGL object tree, so the display capture provides additional visible content.

Use [Desktop Inspector](./inspector.md) to select a node and see its bounds over captured pixels. See [LVGL integration](../../integration/lvgl.md) for UI-thread access, revisions, and deletion hooks.

Inspector displays each subtree together and preserves provider sibling order. Searching by kind, name, or ID retains matching nodes' ancestor paths. Inspect mode searches overlapping bounds in reverse hierarchy paint order. Exact device input behavior for transparent regions or custom drawing remains defined by the device input system.
