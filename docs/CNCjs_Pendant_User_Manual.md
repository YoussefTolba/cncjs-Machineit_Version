---
title: CNCjs + Phone Pendant User Manual
machine: Hobby CNC router, MKS DLC V2, GRBL-compatible firmware
units: millimeters
work_coordinate: G54 / P1 by default
updated: 2026-05-17
---

# CNCjs + Phone Pendant User Manual

This manual covers the customized CNCjs workspace and phone pendant used with a GRBL-compatible MKS DLC V2 hobby CNC router. It starts at launching the app and ends with a safe first project workflow.

> **Machine scope:** This guide assumes a wood/plastic/aluminum hobby CNC router, millimeters, a 3D touch probe, and the customized GRBL-only CNCjs build in this workspace.

> **Safety rule:** The software can move a real machine. Keep the router/spindle off while setting up, keep one hand near the emergency stop, and never trust a probing or homing routine until it has been tested in open air.

## Quick Start Route

1. Launch CNCjs with `Launch CNCjs Dev.bat`.
2. Open the desktop workspace at `http://localhost:8080`.
3. Open the phone pendant at `http://<computer-ip>:8000/pendant/`.
4. Connect the MKS DLC V2 serial port with the GRBL controller selected.
5. Unlock and home the machine.
6. Jog to the stock and set the work zero manually or with the Probe widget.
7. Load the first G-code file and inspect the preview.
8. Run an air cut or dry run if the setup is new.
9. Start the job and watch the first pass closely.

## User Startup Guide

Use this section as the normal daily startup procedure. It is written for a user who just walked up to the machine and wants to get CNCjs, the pendant, and the router ready without guessing what comes next.

### 1. Start with the machine safe

1. Make sure the router/spindle is off.
2. Make sure the emergency stop is released but easy to reach.
3. Clear loose tools, screws, wrenches, and offcuts from the table.
4. Check that the tool is tight in the collet.
5. Move the probe cable so it cannot catch on the gantry.

### 2. Power the controller and computer

1. Turn on the CNC controller power.
2. Connect the USB cable between the MKS DLC V2 and the CNCjs computer.
3. Turn on the CNCjs computer if it is not already running.
4. Wait a few seconds for Windows to see the serial port.

### 3. Launch CNCjs

1. Double-click `Launch CNCjs Dev.bat`.
2. Leave the server window open.
3. Open the desktop workspace at `http://localhost:8080`.
4. Note the network IP printed by CNCjs if you want to use the phone pendant.

### 4. Open the phone pendant

1. Connect the phone to the same Wi-Fi network as the CNCjs computer.
2. Open `http://<computer-ip>:8000/pendant/`.
3. Keep the phone screen awake while you are jogging or probing.
4. Use the pendant only while you can see the machine.

### 5. Connect GRBL

1. In the desktop workspace, select the controller serial port.
2. Use the GRBL controller option.
3. Use `115200` baud unless your machine is configured differently.
4. Click Open.
5. Confirm CNCjs shows a real machine state such as Idle or Alarm.

### 6. Unlock and home

1. If GRBL starts in Alarm, inspect the machine before unlocking.
2. Press Unlock only when the machine is physically clear.
3. Press Home Machine if your limits and homing are configured.
4. Use Home X, Home Y, or Home Z only if your firmware supports individual axis homing.

### 7. Jog test before setup

1. Select a small jog step.
2. Jog X a short distance and confirm the machine moves the expected way.
3. Jog Y a short distance and confirm the machine moves the expected way.
4. Jog Z up before any larger X/Y move.
5. Stop and fix the setup if any axis direction feels wrong.

### 8. Prepare the workpiece

1. Clamp the stock firmly.
2. Confirm clamps are outside the expected toolpath.
3. Install the correct tool for the CAM file.
4. Attach the probe if you will use probing.
5. Confirm the probe triggers before sending a probing move.

### 9. Set the work zero

1. Confirm the active WCS is G54 unless you intentionally use another WCS.
2. Use Z probe for the top surface.
3. Use the square probing pad for an edge or corner.
4. Confirm the DRO reads X0, Y0, and Z0 where you expect the job origin.
5. Retract Z to a safe height before loading or starting a job.

### 10. Load and run the first motion carefully

1. Load the G-code file.
2. Inspect the Visualizer before pressing Start.
3. Check that the job extents fit inside the stock.
4. Start with the router/spindle off for an air cut if this setup is new.
5. When you are ready to cut, start the router/spindle and begin the job.
6. Watch the first plunge and first pass closely.

### 11. Shutdown after a job

1. Wait for all motion to stop.
2. Turn off the router/spindle.
3. Raise Z or move to a safe parking position.
4. Close the G-code job if you are finished.
5. Disconnect CNCjs from the controller.
6. Power off the controller after the machine is stationary.

## Before Powering Motion

Use this checklist before any live machine movement:

- Emergency stop is reachable and tested.
- Router/spindle is off while connecting, homing, jogging, and probing.
- Workpiece and wasteboard clamps are clear of the toolpath.
- Probe wire is connected and the probe input changes state when touched.
- Tool is tight in the collet.
- The selected work coordinate system is the one you intend to use, normally G54.
- Jog step is small before moving close to stock.
- The phone running the pendant is on the same network as the CNCjs computer.

## Launch CNCjs

The workspace includes a Windows launcher:

```text
Launch CNCjs Dev.bat
```

When started, the launcher does three things:

1. Builds the CNCjs development files.
2. Starts the desktop web app on port 8080.
3. Starts the CNCjs server on port 8000 and mounts the phone pendant at `/pendant/`.

Open these addresses:

| Screen | Address | Use |
| --- | --- | --- |
| Desktop workspace | `http://localhost:8080` | Main setup, preview, job control, probing, console, and settings |
| Phone pendant | `http://<computer-ip>:8000/pendant/` | Jogging, homing, probing, feed hold, resume, and abort while standing at the machine |

If the phone cannot open the pendant, check that the phone and computer are on the same Wi-Fi network and use the computer IP address printed in the CNCjs server window.

## Connect The Machine

1. Power the MKS DLC V2 controller.
2. Connect the USB cable to the CNCjs computer.
3. In CNCjs, open the connection panel.
4. Select the serial port for the controller.
5. Use GRBL as the controller.
6. Start with `115200` baud unless the controller was configured differently.
7. Click Open and wait for CNCjs to show a machine state.

This customized build is intended for GRBL-compatible firmware. Laser, Marlin, Smoothie, and TinyG paths were removed from the normal machine workflow.

Common states:

| State | Meaning | Normal action |
| --- | --- | --- |
| Idle | GRBL is connected and ready | Safe to jog, probe, or start a job |
| Alarm | GRBL needs attention, often after power-up or a limit event | Inspect the machine, then unlock or home |
| Run | A program or motion command is active | Watch the machine |
| Hold | Motion is paused | Resume or abort after checking the machine |
| Disconnected | CNCjs is not connected to GRBL | Check USB, port, power, and baud rate |

## Workspace Overview

The normal desktop/tablet workspace is the best place to set up a job. Use it when you need a larger preview, console output, or detailed controls.

| Area | What it is for |
| --- | --- |
| Axes / DRO | Read machine position and work position, jog, home, and zero axes |
| Visualizer | Inspect the loaded G-code toolpath before running |
| Probe widget | Z probing, X/Y edge probing, and corner probing with the square pad |
| Tool tab | Controls M6 tool-change behavior and optional tool probing positions |
| Console | Send or inspect raw GRBL commands and responses |
| Jobs / Files | Load, preview, start, pause, and stop G-code jobs |

## Phone Pendant Overview

The phone pendant is for standing near the CNC while you jog, touch off, or pause motion. It mirrors the important machine actions without the dense desktop UI.

Use the pendant for:

- Jogging X, Y, and Z.
- Homing all axes or one axis at a time.
- Running the 9-button probing pad.
- Changing probing variables.
- Feed hold, resume, and abort.

Do not use the pendant as a substitute for watching the machine. Keep the screen awake during motion and do not put the phone in a pocket while connected.

## Homing

Use Home Machine after power-up if your GRBL configuration supports homing. Homing establishes machine coordinates, which makes safe machine-coordinate moves possible.

The individual axis buttons use these command sequences:

| Button | Commands |
| --- | --- |
| Home X | `G53 G0 Z-5`, `%wait`, `$HX` |
| Home Y | `G53 G0 Z-5`, `%wait`, `$HY` |
| Home Z | `$HZ` |

> **Important:** `G53 G0 Z-5` moves in machine coordinates before X or Y homing. Use Home X or Home Y only if machine-coordinate Z-5 is a safe raised position on your router.

If your GRBL firmware does not support `$HX`, `$HY`, or `$HZ`, use the normal Home Machine command or update the firmware homing setup before relying on individual axis homing.

## Jogging

Jogging moves the machine manually. Use small steps near the workpiece and larger steps only when the tool is clear.

Good jogging habits:

- Home first when possible.
- Raise Z before large X/Y moves.
- Start with a small jog step near clamps, stock, or the probe.
- Watch the actual machine, not only the DRO.
- If an axis moves opposite of what you expect, stop and fix the machine direction before cutting.

On the phone pendant, the jog pad is arranged to match the master workspace. X/Y moves are grouped as a square pad and Z moves sit beside it.

## Probe Widget Basics

The Probe widget has a Z button and a square 3x3 stock pad. The pad is visual so you can select the edge or corner you are touching.

Square map:

| Back Left | Back Edge `Y-` | Back Right |
| --- | --- | --- |
| Left Edge `X+` | Z | Right Edge `X-` |
| Front Left | Front Edge `Y+` | Front Right |

Corner direction map:

| Corner | X probe | Y probe |
| --- | --- | --- |
| Front Left | X+ | Y+ |
| Front Right | X- | Y+ |
| Back Left | X+ | Y- |
| Back Right | X- | Y- |

All entered distances are positive numbers. The selected button decides whether the routine sends a positive or negative axis move.

## Probe Variables

The workspace and pendant use the same visible probing variables:

| Variable | Meaning | Typical starting value |
| --- | --- | --- |
| Probe Speed | Feed used by `G38.2`, in mm/min | 20 |
| Probe Depth | Search distance for the probing move | 10 |
| Z Probe Offset | Z value applied after a Z touch | 0 for direct 3D probe touch |
| XY Probe Offset | Probe radius used when touching an X/Y edge | Probe ball radius |
| Retraction Distance | Move away from the touched surface after probing | 4 or 5 |

Use conservative values first. A smaller probe depth reduces crash risk if the probe starts in the wrong place.

## Basic Probing Cycles

The simple working cycles are intentionally direct. Each one probes, applies the active G54/P1 work offset, then retracts away from the touched surface.

Z probe:

```gcode
G91
G38.2 Z-{probeDepth} F{probeSpeed}
G90
G10 L20 P1 Z{zProbeOffset}
G91
G0 Z{retractionDistance}
G90
```

X+ probe:

```gcode
G91
G38.2 X{probeDepth} F{probeSpeed}
G90
G10 L20 P1 X-{xyProbeOffset}
G91
G0 X-{retractionDistance}
G90
```

X- probe:

```gcode
G91
G38.2 X-{probeDepth} F{probeSpeed}
G90
G10 L20 P1 X{xyProbeOffset}
G91
G0 X{retractionDistance}
G90
```

Y+ probe:

```gcode
G91
G38.2 Y{probeDepth} F{probeSpeed}
G90
G10 L20 P1 Y-{xyProbeOffset}
G91
G0 Y-{retractionDistance}
G90
```

Y- probe:

```gcode
G91
G38.2 Y-{probeDepth} F{probeSpeed}
G90
G10 L20 P1 Y{xyProbeOffset}
G91
G0 Y{retractionDistance}
G90
```

If a probe fails to trigger, do not continue the setup. Stop, retract safely, inspect the wiring and starting position, then try again.

## Corner Probing

Corner probing starts with a Z touch-off, retracts, moves away from the selected X edge, lowers to the side-probing height, probes X, moves to a Y starting position, probes Y, raises to Z+5, then returns to X0 Y0.

The first corner that was built and tested was Front Left:

1. Probe Z normally.
2. Set Z0 using the Z probe offset.
3. Retract Z by the retraction distance.
4. Move in negative X by the probe depth value.
5. Move to the side probing Z height.
6. Probe X+ and set X0 using negative XY probe offset.
7. Retract from the X wall.
8. Raise to the Z probe retract height.
9. Move to X0+10.
10. Move in negative Y by the probe depth value.
11. Move to the side probing Z height.
12. Probe Y+ and set Y0 using negative XY probe offset.
13. Retract from the Y wall.
14. Move to Z+5.
15. Move to X0 Y0.

The other corners use the same shape with changed X/Y directions:

| Corner | Backoff before X probe | X probe | Y setup move | Y probe |
| --- | --- | --- | --- | --- |
| Front Left | X negative | X+ | Y negative | Y+ |
| Front Right | X positive | X- | Y negative | Y+ |
| Back Left | X negative | X+ | Y positive | Y- |
| Back Right | X positive | X- | Y positive | Y- |

Before using a corner routine, jog the probe so the routine has room to search in both directions. The routine cannot know where clamps, screws, or stock overhangs are.

## Tool Tab

The Tool tab controls what CNCjs does when loaded G-code contains an M6 tool-change command.

Common policies:

| Policy | What happens |
| --- | --- |
| Ignore M6 | CNCjs ignores tool-change commands. This is the safe default for simple hobby jobs. |
| Send M6 | CNCjs sends M6 to the controller. Use only if your firmware handles it correctly. |
| Manual Tool Change (WCS) | CNCjs pauses, moves to the configured tool-change/probe positions, and adjusts work Z through the WCS method. |
| Manual Tool Change (TLO) | CNCjs uses a tool length offset style workflow. |
| Manual Tool Change (Custom Probing) | CNCjs uses the custom probing command configured in the Tool tab. |

Use the Tool tab only after the tool-change position and tool-probe position have been tested in machine coordinates. A bad machine-coordinate tool-change position can move through clamps or stock.

## First Project Walkthrough

This is a conservative first-cut workflow for a simple CAM file.

### 1. Prepare the CAM file

- Set CAM units to millimeters.
- Use a GRBL-compatible post processor.
- Put the work origin where you can probe it. A common choice is the front-left top of the stock.
- Keep the first project shallow and simple.
- Save the G-code file somewhere easy to find.

### 2. Prepare the machine

1. Mount the workpiece securely.
2. Install the correct tool.
3. Keep the router/spindle off.
4. Connect the probe if you will probe.
5. Move the dust hose and clamps clear of the expected toolpath.

### 3. Launch and connect

1. Run `Launch CNCjs Dev.bat`.
2. Open the desktop workspace.
3. Connect the serial port.
4. Unlock or home if GRBL starts in Alarm.
5. Open the phone pendant if you will stand at the machine.

### 4. Home and jog

1. Press Home Machine if the machine supports full homing.
2. Jog near the stock with large steps while Z is high.
3. Switch to small jog steps near the final setup position.
4. Stop if an axis moves in the wrong direction.

### 5. Set work zero

For a front-left top origin:

1. Jog the probe or tool near the top surface.
2. Run Z probe.
3. Jog to the selected front-left corner start area.
4. Run Front Left corner probe, or use X+ and Y+ edge probes manually.
5. Confirm the DRO reads close to X0, Y0, Z0 when the tool is at the work origin.

If you are not using the probe, jog manually and use the axis zero buttons instead.

### 6. Load and inspect G-code

1. Load the G-code file in CNCjs.
2. Inspect the Visualizer.
3. Confirm the toolpath is above the stock where expected.
4. Confirm the job extents fit inside the workpiece.
5. Look for moves that go through clamps.

### 7. Run the first job

1. Put on eye and ear protection.
2. Start dust collection if used.
3. Start the router/spindle if your workflow requires manual spindle control.
4. Press Start.
5. Watch the first plunge and first pass closely.
6. Use Feed Hold if anything looks wrong but there is no immediate danger.
7. Use Abort or the physical emergency stop if there is immediate danger.

### 8. Finish safely

1. Wait until motion stops.
2. Turn off the router/spindle.
3. Raise Z if needed.
4. Remove dust and chips before unclamping.
5. Save any notes about feed, speed, zeroing, or probing values that worked.

## Troubleshooting

| Problem | Likely cause | What to do |
| --- | --- | --- |
| Alarm after probing | Probe stayed triggered, retract was too small, limit was hit, or GRBL reported a probing error | Stop, retract manually only when safe, clear the probe, unlock, and reduce probe depth or speed |
| Probe does not stop | Probe wiring or GRBL probe input is wrong | Test the probe input before motion and verify `$6` invert setting if needed |
| Probe stops too late | Feed too high, controller latency, loose probe, or mechanical flex | Use slow probe speed and short depth, check probe mount and wiring |
| Corner result is wrong | Wrong corner selected or machine front/back convention misunderstood | Use the visual square map and verify with air probing |
| Pendant will not load | Wrong IP, phone not on same Wi-Fi, server not running, or firewall blocked port 8000 | Use the IP printed by CNCjs, keep the server window open, and allow local network access |
| Serial port missing | USB cable, driver, controller power, or port already open elsewhere | Replug USB, power cycle controller, close other sender software |
| `$HX` or `$HY` fails | Firmware does not support individual axis homing | Use Home Machine or update GRBL firmware/configuration |
| Job starts in wrong place | Work zero was set on the wrong corner or wrong WCS | Stop, verify G54, re-zero, reload/preview the job |

## Good Defaults To Start With

| Setting | Conservative value |
| --- | --- |
| Probe Speed | 20 mm/min |
| Probe Depth | 10 mm |
| Z Probe Offset | 0 mm for direct stock touch |
| XY Probe Offset | Actual probe ball radius |
| Retraction Distance | 4 mm or 5 mm |
| Work Coordinate | G54 / P1 |

Change one value at a time and write down what changed. That makes it much easier to find the cause if a probe or first cut goes wrong.

## Operator Notes

- Keep the normal workspace open even when using the pendant. It gives you the larger visualizer and console.
- Use the pendant for close-up control, not for unattended operation.
- Always test a new probing routine in free space first.
- When in doubt, raise Z, feed hold, and think before sending the next command.
- For a first project, choose a file that removes very little material and has plenty of clearance from clamps.
