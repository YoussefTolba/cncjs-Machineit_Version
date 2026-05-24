---
title: Startup Guide - Launch To First Cuts
type: user-guide
word_page_size: A4
word_ready: true
machine: MKS DLC V2 GRBL hobby CNC router
units: mm
---

# Startup Guide - Launch To First Cuts

This guide walks a new user from opening the customized CNCjs app to making the first safe cuts on the CNC router.

## 1. Before You Launch Anything

Start with the machine physically safe.

1. Make sure the router/spindle is off.
2. Make sure the emergency stop is reachable.
3. Remove loose tools, screws, clamps, and offcuts from the bed.
4. Check that the cutter is tight in the collet.
5. Check that the stock is clamped firmly.
6. Check that the probe cable is clear of the gantry if you will probe.
7. Keep the first job simple: shallow cut, soft material, and plenty of clearance.

Do not start with the router running. Launch, connect, home, jog, and probe with the spindle off.

## 2. Start CNCjs

From the project folder, run:

```text
Launch CNCjs Dev.bat
```

The launcher will:

1. Build the CNCjs development files.
2. Start the desktop workspace on port `8080`.
3. Start the CNCjs server on port `8000`.
4. Mount the phone pendant at `/pendant/`.

Leave the CNCjs server window open while using the machine.

## 3. Open The Desktop Workspace

Open this in the CNCjs computer browser:

```text
http://localhost:8080
```

Use the desktop workspace for connecting to GRBL, reading coordinates, loading G-code, previewing toolpaths, probing, and starting jobs.

## 4. Open The Phone Pendant

On the phone, connect to the same Wi-Fi network as the CNCjs computer.

Open:

```text
http://<computer-ip>:8000/pendant/
```

Replace `<computer-ip>` with the IP address printed in the CNCjs server window.

Use the pendant for close-up machine control:

- Jogging.
- Homing.
- Probing with the 9-button square pad.
- Feed Hold.
- Resume.
- Abort.

Keep the phone screen awake while using the machine.

## 5. Connect To The Controller

In the desktop workspace:

1. Open the connection panel.
2. Select the serial port for the MKS DLC V2.
3. Use the GRBL controller.
4. Use `115200` baud unless your machine is configured differently.
5. Click Open.
6. Wait for CNCjs to show a machine state.

## 6. Unlock And Home

After power-up, GRBL may start in Alarm.

1. Inspect the machine before unlocking.
2. Make sure the gantry is not against a hard stop.
3. Click Unlock only when the machine is clear.
4. Press Home Machine if your limit switches and homing are configured.

Individual axis homing buttons are available:

| Button | Commands |
| --- | --- |
| Home X | `G53 G0 Z-5`, `%wait`, `$HX` |
| Home Y | `G53 G0 Z-5`, `%wait`, `$HY` |
| Home Z | `$HZ` |

Only use Home X or Home Y if machine-coordinate `Z-5` is a safe raised Z position on your machine.

## 7. Jog Test

Before moving near the stock, confirm the machine moves the way you expect.

1. Select a small jog step.
2. Jog X a short distance.
3. Jog Y a short distance.
4. Jog Z up a short distance.
5. Confirm each axis moves in the expected direction.

If any axis moves the wrong way, stop and fix the machine or GRBL configuration before cutting.

## 8. Prepare The First Job

For the first cut, use a simple CAM file.

Good first project rules:

- Units are millimeters.
- Post processor is GRBL-compatible.
- Work zero is at a clear, reachable point.
- Toolpath is shallow.
- No clamps are inside the toolpath.
- First cut is in easy material, such as wood or plastic.

For a simple first setup, use the top front-left corner of the stock as work zero.

## 9. Set Work Zero

The customized Probe widget has a visual 9-button square pad.

Pad layout:

| Back Left | Back Edge `Y-` | Back Right |
| --- | --- | --- |
| Left Edge `X+` | Z | Right Edge `X-` |
| Front Left | Front Edge `Y+` | Front Right |

Corner mapping:

| Corner | Probes |
| --- | --- |
| Front Left | `X+` then `Y+` |
| Front Right | `X-` then `Y+` |
| Back Left | `X+` then `Y-` |
| Back Right | `X-` then `Y-` |

Typical front-left setup:

1. Jog the probe above the stock top.
2. Run Z probe.
3. Confirm Z retracts after probing.
4. Jog near the front-left corner start position.
5. Run Front Left corner probe.
6. Confirm the DRO reads near X0, Y0, Z0 at the stock origin.
7. Raise Z before any long XY move.

## 10. Load The G-Code

In the desktop workspace:

1. Load your G-code file.
2. Inspect the Visualizer.
3. Confirm the toolpath appears on the stock, not far away.
4. Check the job extents.
5. Check that Z moves look reasonable.
6. Check that clamps are outside the path.

Do not press Start until the preview makes sense.

## 11. Dry Run Or Air Cut

For a first setup, run one safe test before cutting.

1. Raise Z above the stock.
2. Leave the router/spindle off.
3. Start the job.
4. Watch the first motions.
5. Stop after confirming the toolpath is in the expected area.

## 12. Make The First Cut

When ready:

1. Put on eye and ear protection.
2. Close enclusore Door
3. Press Start
4. Watch the first plunge.
5. Watch the first side load cut.
6. Use Feed Hold if something looks wrong but there is no immediate crash.
7. Use Abort or the physical emergency stop if there is danger.

Do not walk away during the first cut.

## 13. After The Cut

1. Wait for all motion to stop.
2. Vacuum chips before unclamping.
3. Remove the part only when the cutter is stopped.
4. Save notes about feeds, speeds, probe values, and anything that went wrong.

