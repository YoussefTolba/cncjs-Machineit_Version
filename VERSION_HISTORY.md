# Version History

This file records the practical work completed in each local version of this customized CNCjs workspace.

## v0.1.0 - Customized CNCjs Baseline

This is the first version captured under Git. It records the complete customized workspace as one baseline version before new work such as backlash compensation. Earlier edits were made before Git tracking existed, so they are grouped here as a retrospective inventory instead of a step-by-step change history.

Included in this baseline:

- GRBL-focused CNCjs workspace for a hobby CNC router using an MKS DLC V2 / GRBL-compatible controller.
- Local Windows launch workflow through `Launch CNCjs Dev.bat`, including development build startup, CNCjs server startup on port 8000, web app startup on port 8080, and phone pendant mounting at `/pendant/`.
- Customized phone pendant in `pendants/phone` with mobile-friendly connect/open-port flow, jog controls, zeroing controls, machine controls, feed hold/resume/abort actions, and status/position display.
- Machine It branding on the phone pendant, including the pendant logo asset.
- Phone pendant probing support with outer/inner probing modes, edge/corner probing, Z touchplate, surface probing, block/boss centering, hole/pocket centering, tool change probing, configurable probe settings, and validation for unsafe probe values.
- Phone pendant support for loading and running enabled CNCjs custom commands from the server.
- Autolevel/probing workspace additions in `src/app/widgets/Autolevel`, including probe setting controls, probing routines, mesh probing, mesh visualization, skew workflow, and probe compensation controls.
- Server-side GRBL autolevel/probe handling, including probe point tracking, probe result collection, mesh save/load support, and applying probe compensation to loaded G-code.
- Autolevel compensation support connected to the visualizer workflow so compensated G-code state can be preserved.
- GRBL-oriented operator documentation in `docs`, including startup guidance, pendant/user manual material, probing direction guidance, homing/jogging guidance, first project checklist, generated DOCX manuals, and the manual build script.
- Documentation scope narrowed around the actual machine workflow: GRBL-compatible firmware, millimeters, 3D touch probe, safe startup, jogging, probing, and first-cut procedure.
- Default workspace setup that includes the key machine widgets: connection, console, GRBL, axes, G-code, macro, autolevel, tool, spindle, visualizer, and webcam configuration.
- Local development/build helpers, including the Windows PowerShell development build script and package scripts for `win-dev`, `start-app-dev`, and `start-server-dev`.
- Initial professional version-control setup: Git repository on `main`, GitHub remote backup, `v0.1.0` tag, and this plain-language version history file.
