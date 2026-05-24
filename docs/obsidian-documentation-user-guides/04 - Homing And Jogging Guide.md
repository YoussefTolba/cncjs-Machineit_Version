---
title: Homing And Jogging Guide
type: user-guide
word_page_size: A4
word_ready: true
units: mm
---

# Homing And Jogging Guide

This guide explains the homing and jogging controls in the customized CNCjs workspace and phone pendant.

## Full Machine Homing

Use Home Machine after powering the controller if homing is configured in GRBL.

Home Machine should:

1. Move the machine toward its homing switches.
2. Establish machine coordinates.
3. Leave the machine ready for safe jogging and work setup.

Do not use homing if switches are disconnected or configured incorrectly.

## Individual Axis Homing

The workspace and pendant include individual homing controls.

| Button | Command sequence |
| --- | --- |
| Home X | `G53 G0 Z-5`, `%wait`, `$HX` |
| Home Y | `G53 G0 Z-5`, `%wait`, `$HY` |
| Home Z | `$HZ` |

For Home X and Home Y, the first command moves to machine-coordinate Z-5 before homing the selected axis.

Use this only if Z-5 is a known safe raised machine position.

## Jogging Rules

Use these habits every time:

1. Raise Z before large X/Y moves.
2. Use small steps near the stock.
3. Use larger steps only when the tool is clear.
4. Watch the machine instead of only the screen.
5. Keep one hand near Feed Hold or emergency stop during risky moves.

## Pendant Jogging

The pendant jog layout matches the master workspace layout.

Use it when you are standing near the machine and need close-up control.

Before using the pendant:

1. Confirm the phone is on the same Wi-Fi network.
2. Confirm the pendant page is connected.
3. Confirm the jog step is small.
4. Confirm you can see the tool and stock clearly.

## Feed Hold, Resume, And Abort

| Control | Use |
| --- | --- |
| Feed Hold | Pause controlled motion when something looks wrong |
| Resume | Continue after a safe pause |
| Abort | Stop the job when continuing is unsafe |
| Emergency stop | Use for immediate physical danger |

Feed Hold is for controlled pauses. Emergency stop is for real danger.

