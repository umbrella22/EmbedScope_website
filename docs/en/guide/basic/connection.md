---
title: "Connect a device"
description: "Find the correct serial endpoint, complete the Agent handshake, configure DTR, and switch between serial and TCP connections."
---

# Connect a device

Use an endpoint that carries the EmbedScope binary protocol. The firmware must already include an Agent; the [software reference device](../start/quick-start.md) provides a TCP endpoint for trying the host tools.

## Find the serial port

```sh
escope devices
escope --json devices
```

Enumeration reads available port and USB metadata without opening a port. Compare manufacturer, product, serial number, VID/PID, and interface with the expected device. Missing fields are `null`. Metadata identifies a port candidate; only a successful handshake identifies an EmbedScope Agent.

USB devices can expose several serial interfaces. Choose the diagnostic interface, then refresh the enumeration after unplugging or changing firmware. The reported interface is the CDC communication interface on Linux and Windows and the data interface on macOS. See [Dango OS](../../integration/dango.md) for its two CDC functions.

## Complete the handshake

Replace the example port with an enumerated path:

```sh
escope -d /dev/cu.usbmodem-example info
```

`-d serial:///dev/cu.usbmodem-example` is equivalent. Windows endpoints can use a port name such as `COM3`. Omitting `-d` selects a serial port only when exactly one is enumerated.

Inspect name, model, firmware, build, boot, session, and capabilities in the result. Run this check again after reconnecting or deploying another firmware build. Node IDs and capture IDs from an earlier session do not identify current resources.

## Set the serial line policy

```sh
escope -d /dev/cu.usbmodem-example --baud 115200 --dtr on info
```

Some USB CDC receivers, including the Dango diagnostic adapter, wait for asserted DTR before receiving. `on` asserts it and `off` explicitly clears it. The default `preserve` policy leaves the underlying opener's policy in effect; it does not guarantee that a physical line never changes during opening. The board determines whether a line change causes a reset.

The Inspector uses baud 115200. Its **DTR** checkbox chooses assert-on-open when checked and preserve when unchecked. Use CLI or SDK for a different baud or explicit DTR off.

## Connect over TCP

```sh
escope -d tcp://127.0.0.1:9337 info
```

Use the actual listen address of the Agent or reference device. Serial baud and DTR settings do not apply to TCP. Protocol 1 provides frame integrity without authentication or encryption, so network access control belongs to the deployment.

## Switch tools on one port

Close a serial monitor, CLI follower, or Inspector before another process connects to the same physical port. Concurrent SDK calls share one `Session`; EmbedScope does not provide a broker that shares a serial connection among processes.

For a timeout, first confirm the selected interface, line policy, baud, running firmware, and any process already using the port. See [Troubleshooting](../advanced/troubleshooting.md) for errors and [CLI reference](../../reference/cli.md) for all connection options.
