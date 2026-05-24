---
title: Probing Direction Guide
type: technical-reference
word_page_size: A4
word_ready: true
units: mm
---

# Probing Direction Guide

The Probe widget exposes one Z probe button and a square stock selector with four clickable edges and four clickable corners.

## Square Map

| Square area | Function |
| --- | --- |
| Top-left corner | Back Left Corner |
| Top edge | Back edge, `Y-` |
| Top-right corner | Back Right Corner |
| Left edge | Left edge, `X+` |
| Center | Z probe |
| Right edge | Right edge, `X-` |
| Bottom-left corner | Front Left Corner |
| Bottom edge | Front edge, `Y+` |
| Bottom-right corner | Front Right Corner |

The square bottom maps to front. The square top maps to back.

## Variables

| Variable | Purpose |
| --- | --- |
| Probe Speed | Feed used by `G38.2` |
| Probe Depth | Search distance used by `G38.2` |
| Z Probe Offset | Value applied by `G10 L20` after Z probing |
| XY Probe Offset | Probe radius used for X/Y probing |
| Retraction Distance | Distance moved away after touching |

All user-entered distances are positive. The selected direction decides the sign used in the generated G-code.

## Direction Rules

| Button | Probe move | WCS offset | Retract move |
| --- | --- | --- | --- |
| Probe Z | `Z-depth` | `Z + zProbeOffset` | `Z+retract` |
| Probe X+ | `X+depth` | `X - xyProbeOffset` | `X-retract` |
| Probe X- | `X-depth` | `X + xyProbeOffset` | `X+retract` |
| Probe Y+ | `Y+depth` | `Y - xyProbeOffset` | `Y-retract` |
| Probe Y- | `Y-depth` | `Y + xyProbeOffset` | `Y+retract` |

## Corner Direction Rules

| Corner | X probe | Y probe |
| --- | --- | --- |
| Front Left | `X+` | `Y+` |
| Front Right | `X-` | `Y+` |
| Back Left | `X+` | `Y-` |
| Back Right | `X-` | `Y-` |

## Z Probe Cycle

```gcode
G91
G38.2 Z-{probeDepth} F{probeSpeed}
G90
G10 L20 P1 Z{zProbeOffset}
G91
G0 Z{retractionDistance}
G90
```

## X+ Probe Cycle

```gcode
G91
G38.2 X{probeDepth} F{probeSpeed}
G90
G10 L20 P1 X-{xyProbeOffset}
G91
G0 X-{retractionDistance}
G90
```

## X- Probe Cycle

```gcode
G91
G38.2 X-{probeDepth} F{probeSpeed}
G90
G10 L20 P1 X{xyProbeOffset}
G91
G0 X{retractionDistance}
G90
```

## Y+ Probe Cycle

```gcode
G91
G38.2 Y{probeDepth} F{probeSpeed}
G90
G10 L20 P1 Y-{xyProbeOffset}
G91
G0 Y-{retractionDistance}
G90
```

## Y- Probe Cycle

```gcode
G91
G38.2 Y-{probeDepth} F{probeSpeed}
G90
G10 L20 P1 Y{xyProbeOffset}
G91
G0 Y{retractionDistance}
G90
```

## Corner Cycle Shape

Each corner routine follows the same shape:

1. Probe Z.
2. Set active WCS Z0 using Z probe offset.
3. Retract Z by the retraction distance.
4. Move away from the selected X edge.
5. Move to the side probing Z height.
6. Probe the selected X edge.
7. Set active WCS X0 using the signed XY probe offset.
8. Retract from the X wall.
9. Raise to the Z retract height.
10. Move to the Y probing start.
11. Probe the selected Y edge.
12. Set active WCS Y0 using the signed XY probe offset.
13. Retract from the Y wall.
14. Move up to Z+5.
15. Move to X0 Y0.
