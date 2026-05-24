---
title: First Project Checklist
type: checklist
word_page_size: A4
word_ready: true
units: mm
---

# First Project Checklist

Use this checklist before making the first cut with a new file, new material, or new user.

## CAM File

- Units are millimeters.
- Post processor is GRBL-compatible.
- Work origin is known.
- Tool diameter matches the installed tool.
- Cutting depth is shallow enough for the first test.
- Toolpath does not cross clamps.

## Machine Setup

- Stock is clamped.
- Tool is tight in the collet.
- Router/spindle is off during setup.
- Probe cable is clear.
- Emergency stop is reachable.
- Dust collection is ready if used.

## CNCjs Setup

- CNCjs server is running.
- Desktop workspace is open.
- Machine is connected to GRBL.
- Machine state is Idle.
- Phone pendant is open if needed.
- Visualizer shows the correct file.

## Work Zero

- Correct WCS is active, normally G54.
- Z zero is set.
- X zero is set.
- Y zero is set.
- The DRO makes sense at the stock origin.
- Z is raised before starting the job.

## Dry Run

- Router/spindle is off.
- Z is raised above the stock.
- Job starts in the expected location.
- First moves match the preview.
- No clamp collision is visible.

## First Cut

- Eye protection is on.
- Ear protection is on.
- Router/spindle is running.
- Dust collection is running if used.
- Feed Hold is reachable.
- Emergency stop is reachable.
- Operator watches the first plunge and first pass.

## After The Cut

- Motion has stopped.
- Router/spindle is off.
- Z is raised.
- Chips are cleared before unclamping.
- Result is inspected.
- Notes are saved for feed, speed, probing, and setup changes.

