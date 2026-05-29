---
title: CNCjs And Pendant User Manual
type: user-manual
word_page_size: A4
word_ready: true
machine: MKS DLC V2 GRBL hobby CNC router
units: mm
---

# CNCjs And Pendant User Manual

This manual covers the customized CNCjs workspace and phone pendant used with a GRBL-compatible MKS DLC V2 hobby CNC router.

## Machine Scope

| Item | Value |
| --- | --- |
| Controller | Makerbase MKS DLC V2 |
| Firmware | GRBL-compatible |
| Units | Millimeters |
| Default work coordinate | G54 / P1 |
| Probe | 3D touch probe |
| App | Customized CNCjs workspace plus phone pendant |

## Main Screens

The desktop workspace is for detailed setup and job control.

Use it for:

- Connecting to GRBL.
- Reading machine and work coordinates.
- Loading and previewing G-code.
- Running the full Probe widget.
- Watching status and console output.
- Starting and stopping jobs.

The phone pendant is for close-up control near the machine.

Use it for:

- Jogging.
- Homing.
- Probing.
- Feed Hold.
- Resume.
- Abort.

## Main Workspace Complete Button Guide

This section starts with the normal desktop/tablet workspace. The main workspace is the best place to connect the machine, load files, inspect the preview, configure widgets, and run the first job.

### Login Screen Buttons

| Button or control | What it does | Use it when |
| --- | --- | --- |
| Username | User account name field | Sign-in is enabled |
| Password | User account password field | Sign-in is enabled |
| Sign In | Logs into CNCjs and opens the app | You need to enter the workspace |
| Forgot your password? | Opens the CNCjs password help page | You cannot sign in |

### Main Navigation Buttons

| Button or control | What it does | Use it when |
| --- | --- | --- |
| Workspace icon | Opens the main machine workspace | You want to operate the CNC |
| Settings icon | Opens CNCjs settings | You need to change app, controller, workspace, event, account, or machine-profile settings |
| CNCjs logo/version | Opens the CNCjs release page | You want version/release information |
| Mobile navbar toggle | Opens or closes the top navigation on small screens | You are using a narrow tablet/browser window |
| My Account | Opens account options | Session login is enabled |
| Account | Opens account settings | You need to edit user/account details |
| Sign Out | Logs out and disconnects the session | You are finished using the app |
| Options | Opens command/help options | You need custom commands, help, or issue links |
| Show notifications | Requests browser notification permission | You want command completion notifications |
| Custom command item | Runs a configured CNCjs command | Only use commands you recognize |
| Help | Opens CNCjs help/wiki | You need app reference help |
| Report an issue | Opens the CNCjs issue page | You need to report a software problem |

### Main Quick Access Toolbar

The quick access toolbar appears in the top bar when you are on the workspace.

| Button | What it does | Notes |
| --- | --- | --- |
| Cycle Start | Starts motion or resumes a loaded paused job | Equivalent to cycle start/resume behavior |
| Feedhold | Pauses active motion | Use as the first controlled pause |
| Homing | Runs machine homing | Use after power-up when homing is configured |
| Sleep | Sends GRBL sleep command | Use only when you intentionally want GRBL asleep |
| Unlock | Clears GRBL alarm lock | Inspect the machine before unlocking |
| Reset | Sends controller reset | Use when the controller needs a hard reset; expect alarms/state changes |

### Settings Page Buttons

The Settings page is not used for normal jogging or cutting, but it is part of the main app.

| Button or control | What it does | Use it when |
| --- | --- | --- |
| General | Opens general CNCjs settings | You need language or usage settings |
| Workspace | Opens workspace layout import/export/defaults | You need to save or restore layout settings |
| Controller | Opens controller behavior settings | You need to change controller error handling |
| GRBL Settings | Opens the GRBL settings wizard | You need to read, back up, edit, or restore GRBL firmware settings |
| Machine Profiles | Opens machine profile records | You need bed/travel/profile overlays |
| User Accounts | Opens account records | Login/session accounts are enabled |
| Commands | Opens custom command records | You need top-right command menu actions |
| Events | Opens event-triggered command records | You need actions on connection, job events, or status events |
| About | Opens app/version information | You need version/update/help info |
| Save Changes | Saves edits on General or Controller settings | Use after deliberate settings changes |
| Cancel | Discards current modal or setting edit | Use if you changed your mind |
| Restore Defaults | Restores default workspace settings | Use when the workspace layout/config is broken |
| Import | Imports workspace settings | Use to load a saved workspace configuration |
| Export | Exports workspace settings | Use to back up the current workspace configuration |
| Add | Adds a machine profile, command, event, or user record | Use when creating a new record |
| Update | Edits an existing record | Use to change a saved profile/command/event/account |
| Delete | Removes an existing record | Use carefully; deletion is usually permanent |
| OK | Confirms a create, update, delete, or restore dialog | Press only after reading the dialog |
| Check for updates toggle | Enables/disables update checks | In About settings |
| Help buttons | Open help, documentation, or project links | Use for reference information |

### GRBL Settings Wizard

Open Settings > GRBL Settings after connecting to a GRBL controller. The wizard reads the controller with `$$`, displays the settings in grouped tabs, and writes changes as normal `$number=value` GRBL commands.

Do not use the wizard during a running job.

| Tab | What it is for |
| --- | --- |
| Backup | Save the current settings to a backup file, load a previous backup file, and flash settings from that file |
| Motion | Edit steps/mm, max rates, acceleration, travel limits, and steps/mm calibration |
| Homing & Limits | Edit limit switch, homing, debounce, search, feed, and pull-off settings |
| Spindle & Laser | Edit spindle speed range and laser mode |
| Advanced | Edit pulse, invert, report, junction, arc, and unit-reporting settings |

Backup workflow:

1. Connect to the GRBL controller.
2. Open Settings > GRBL Settings.
3. Click Refresh if the settings list is empty or stale.
4. Open the Backup tab.
5. Click Back Up.
6. Keep the downloaded `grbl-settings-YYYYMMDD-HHMMSS.txt` file somewhere safe.

Restore workflow:

1. Connect to the same GRBL controller or a compatible replacement controller.
2. Open Settings > GRBL Settings > Backup.
3. Click Choose Backup File and select the saved settings file.
4. Confirm the displayed file contains the settings you expect.
5. Click Flash Backup.
6. Confirm the inline warning.
7. Wait for the wizard to send the settings and read `$$` back from GRBL.

Only flash backup files you trust. GRBL settings can change steps/mm, axis direction, limit behavior, homing behavior, spindle speed mapping, and laser mode.

Safe editing rules:

1. Back up the current settings before making changes.
2. Change one group of settings at a time.
3. Keep the machine idle and the router/spindle off while changing firmware settings.
4. Test jog direction, travel distance, homing, limits, and probing before cutting again.
5. If a change makes the machine behave incorrectly, reload the backup file and flash it back.

### Workspace Layout Buttons

| Button or control | What it does | Use it when |
| --- | --- | --- |
| Hide left panel | Collapses the left widget column | You need more room for the visualizer |
| Show left panel | Restores the left widget column | You need access to the widgets again |
| Hide right panel | Collapses the right widget column | You need more room for the visualizer |
| Show right panel | Restores the right widget column | You need access to the right-side widgets again |
| Manage Widgets | Opens the widget manager | You want to show or hide widgets |
| Collapse All | Collapses all widgets in that side panel | You want a cleaner view |
| Expand All | Expands all widgets in that side panel | You want to see every widget in that panel |
| Widget drag handle | Lets you reorder widgets | You want to move widgets between panels or change order |
| Widget collapse/expand | Opens or closes one widget | You only need to hide or show one widget |
| Widget More menu | Opens widget options | You need full screen, fork, or remove |
| Enter Full Screen | Expands a widget to full-screen mode | You need more space for that widget |
| Exit Full Screen | Returns the widget to normal size | You are done with the full-screen view |
| Fork Widget | Creates a second copy of that widget | You want the same widget with separate settings |
| Remove Widget | Removes that widget from the workspace | You do not need that widget in the current layout |

The workspace also accepts drag-and-drop G-code files when the machine is connected and the workflow is idle.

### Connection Widget Buttons

Use the Connection widget first. No jogging, probing, or job control works until the serial connection is open.

| Button or control | What it does | Notes |
| --- | --- | --- |
| GRBL | Selects the GRBL controller if the controller selector is visible | This customized build is intended for GRBL |
| Port dropdown | Selects the serial port | Choose the MKS DLC V2 COM port |
| Refresh | Reloads the serial port list | Use after plugging in USB |
| Baud rate dropdown | Selects serial baud rate | Start with `115200` |
| Set DTR line status upon opening | Enables DTR control when opening the port | Advanced serial setting |
| DTR SET | Opens the port with DTR set | Use only if your controller needs it |
| DTR CLR | Opens the port with DTR cleared | Use only if your controller needs it |
| Set RTS line status upon opening | Enables RTS control when opening the port | Advanced serial setting |
| RTS SET | Opens the port with RTS set | Use only if your controller needs it |
| RTS CLR | Opens the port with RTS cleared | Use only if your controller needs it |
| Use RTS/CTS flow control | Enables hardware flow control | Normally off for this GRBL setup |
| Connect automatically | Reconnects automatically when possible | Useful for a fixed shop computer |
| Open | Opens the selected serial port | Press after selecting port and baud |
| Close | Closes the serial connection | Use before unplugging USB or shutting down |

### Visualizer And Job Toolbar Buttons

The Visualizer is the center area that shows the loaded toolpath and job controls.

| Button or control | What it does | Notes |
| --- | --- | --- |
| Upload G-code | Loads a G-code file from the computer | Use before running a job |
| Upload dropdown | Opens extra file-loading options | Includes watch-directory browsing |
| Browse... | Loads from a watched directory workflow | Useful when CAM exports to a folder |
| Run | Starts the loaded G-code job | Only press after checking zero and preview |
| Resume | Continues a paused job | Same button area as Run when paused |
| Pause | Feed-holds the running job | Use when something looks wrong but it is not an instant crash |
| Stop | Stops a paused job | Stop becomes available after pausing |
| Close | Unloads the current G-code file | Use before loading a different file |
| Top View | Changes the camera to top view | Best for checking X/Y position |
| Front View | Changes the camera to front view | Useful for checking Z profile |
| Right Side View | Changes the camera to right-side view | Useful for side clearance checks |
| Left Side View | Changes the camera to left-side view | Useful for side clearance checks |
| 3D View | Changes the camera to perspective 3D view | Good for general preview |
| Zoom to Fit | Fits the whole toolpath in view | Use after loading a file |
| Zoom In | Zooms into the preview | Hold or click repeatedly |
| Zoom Out | Zooms away from the preview | Hold or click repeatedly |
| Camera mode: Pan | Mouse/touch drag moves the camera | Use for sliding the view |
| Camera mode: Rotate | Mouse/touch drag rotates the camera | Use in 3D view |
| Machine profile dropdown | Selects a machine profile overlay | Use to compare job extents with machine travel |
| No machine profile selected / None | Clears the selected profile | Use if the overlay is distracting |

Always inspect the Visualizer before pressing Run. Confirm the job is on the stock, inside travel, and clear of clamps.

### Axes Widget Buttons

The Axes widget shows machine position, work position, jogging, homing, and offset actions.

| Button or control | What it does | Notes |
| --- | --- | --- |
| Home X | Runs `G53 G0 Z-5`, waits, then `$HX` | Use only if machine Z-5 is safe |
| Home Y | Runs `G53 G0 Z-5`, waits, then `$HY` | Use only if machine Z-5 is safe |
| Home Z | Runs `$HZ` | Requires firmware support |
| X- | Jogs X negative by the selected step | Watch machine direction |
| X+ | Jogs X positive by the selected step | Watch machine direction |
| Y- | Jogs Y negative by the selected step | Watch machine direction |
| Y+ | Jogs Y positive by the selected step | Watch machine direction |
| Z- | Jogs Z negative by the selected step | Dangerous near stock |
| Z+ | Jogs Z positive by the selected step | Usually the safest first move |
| Diagonal XY buttons | Jog X and Y together | Use only when clear of clamps and stock |
| X0Y0 | Moves to work X0 Y0 with `G0 X0 Y0` | Raise Z first |
| Z0 | Moves to work Z0 with `G0 Z0` | Dangerous unless the toolpath is clear |
| Units dropdown | Switches between `G20 (inch)` and `G21 (mm)` | This setup normally uses G21 |
| Jog step dropdown | Selects jog distance | Use small steps near stock |
| Step minus | Decreases jog step size | Safer near the workpiece |
| Step plus | Increases jog step size | Use only when clear |

The Axes display table has small action icons and dropdowns for each axis.

| Axis display control | What it does | Notes |
| --- | --- | --- |
| Machine-position home icon | Homes that axis | Uses the axis homing command |
| Machine-position pin icon | Sets machine zero on controllers that support it | GRBL does not normally use this |
| Work-position minus icon | Jogs that axis negative | Uses selected jog step |
| Work-position plus icon | Jogs that axis positive | Uses selected jog step |
| Work-position pin icon | Sets that work axis to zero | Uses the active WCS |
| Work-position pencil icon | Lets you type a work offset value | Use for a known measured offset |
| Axis action menu | Opens all actions for that axis | Contains zero, move, temporary offset, and homing actions |
| Global action menu | Opens actions for all axes | Contains all-axis zero, machine zero, and homing actions |

Common action-menu items:

| Menu item | What it does |
| --- | --- |
| Go To Work Zero | Rapid moves to work zero |
| Zero Out Work Offsets | Sets the current position as work zero with `G10 L20` |
| Zero Out Temporary Offsets | Sets temporary `G92` zero |
| Un-Zero Out Temporary Offsets | Cancels `G92` offsets |
| Go To Machine Zero | Moves in machine coordinates with `G53` |
| Home Machine | Runs the homing command |

### MDI Buttons

MDI buttons are custom quick-command buttons configured in the Axes widget settings.

| Button or control | What it does |
| --- | --- |
| Custom MDI button | Sends the configured G-code command |

Use MDI buttons only when you know what the command does.

### Main Probe Widget Buttons

The main Probe widget uses the same 9-button square layout as the pendant.

| Button | What it does | Direction |
| --- | --- | --- |
| Back Left corner | Probes the back-left corner | `X+` then `Y-` |
| Back edge | Probes the back edge | `Y-` |
| Back Right corner | Probes the back-right corner | `X-` then `Y-` |
| Left edge | Probes the left edge | `X+` |
| Z | Probes Z downward | `Z-` |
| Right edge | Probes the right edge | `X-` |
| Front Left corner | Probes the front-left corner | `X+` then `Y+` |
| Front edge | Probes the front edge | `Y+` |
| Front Right corner | Probes the front-right corner | `X-` then `Y+` |

Probe settings:

| Control | What it changes |
| --- | --- |
| Probe Speed | Feed used by `G38.2` |
| Probe Depth | Search distance |
| Z Probe Offset | Offset applied after Z probing |
| XY Probe Offset | Probe radius/edge offset for X/Y |
| Retraction Distance | Retraction after touching |

All probing values are entered as positive numbers. The selected edge or corner applies the correct sign.

### GRBL Widget Buttons

The GRBL widget gives direct GRBL controller commands and status tools.

| Button or menu item | What it does |
| --- | --- |
| Info | Opens GRBL controller information |
| Status Report (?) | Sends `?` to request current status |
| Check G-code Mode ($C) | Toggles/checks GRBL check mode |
| Homing ($H) | Runs full GRBL homing |
| Kill Alarm Lock ($X) | Unlocks GRBL alarm lock |
| Sleep ($SLP) | Puts GRBL into sleep mode |
| Help ($) | Shows GRBL help |
| Settings ($$) | Prints GRBL settings |
| View G-code Parameters ($#) | Shows offsets and stored parameters |
| View G-code Parser State ($G) | Shows current modal parser state |
| View Build Info ($I) | Shows GRBL build info |
| View Startup Blocks ($N) | Shows GRBL startup blocks |

Do not use GRBL command-menu items casually during a job. Some commands can change modal state or machine behavior.

### G-code Widget Buttons

The G-code widget mainly reports job status and file bounds.

| Button or control | What it does |
| --- | --- |
| Collapse/Expand | Hides or shows the widget |
| More menu | Opens widget options |
| Enter Full Screen | Makes the G-code widget full screen |
| Fork Widget | Creates a copy of the widget |
| Remove Widget | Removes it from the layout |

Use this widget to check sent/received lines, elapsed time, remaining time, and the loaded job extents.

### Console Widget Buttons

The Console widget is the raw GRBL terminal.

| Button or control | What it does |
| --- | --- |
| Clear console | Clears visible console text |
| Collapse/Expand | Hides or shows the console |
| Enter Full Screen | Makes the console larger |
| Select All | Selects console text |
| Clear Selection | Clears selected console text |
| Fork Widget | Creates another console widget |
| Remove Widget | Removes the console widget |
| Terminal input | Sends typed characters/commands to GRBL |

Use the console for diagnostics and known manual commands. Do not send random commands while a job is running.

### Tool Widget Buttons

The Tool widget controls M6 tool-change behavior.

| Button or control | What it does |
| --- | --- |
| Tool Change Policy dropdown | Selects how CNCjs handles `M6` |
| Ignore M6 commands | Skips tool-change commands and leaves the change to the user |
| Send M6 commands | Sends M6 directly to the controller |
| Manual Tool Change (WCS) | Uses a manual tool-change flow that updates work Z |
| Manual Tool Change (TLO) | Uses a tool-length-offset style flow |
| Manual Tool Change (Custom Probing) | Uses custom probing commands |
| Tool Change Position pin | Stores the current machine position for tool change |
| Tool Probe Position pin | Stores the current machine position for tool probing |
| G38.2 | Probe toward workpiece and error if no contact |
| G38.3 | Probe toward workpiece without error behavior |
| G38.4 | Probe away from workpiece and error if contact is not lost |
| G38.5 | Probe away from workpiece without error behavior |
| WCS import | Loads example WCS tool-probe commands |
| TLO import | Loads example TLO tool-probe commands |
| Variable dropdown | Inserts a tool macro variable into custom commands |
| Edit | Edits custom tool-probe commands |
| OK | Saves custom tool-probe command edits |
| Cancel | Cancels custom tool-probe command edits |
| Copy | Copies generated tool-probe commands |

Test tool-change positions in open air before relying on them. Tool-change moves use machine coordinates and can crash if configured incorrectly.

### Spindle Widget Buttons

Use spindle controls carefully. On some routers, spindle control may be manual or may not be wired.

| Button or control | What it sends | What it does |
| --- | --- | --- |
| M3 | `M3 S<speed>` or `M3` | Spindle on clockwise |
| M4 | `M4 S<speed>` or `M4` | Spindle on counterclockwise |
| M5 | `M5` | Spindle off |
| M7 | `M7` | Mist coolant on |
| M8 | `M8` | Flood coolant on |
| M9 | `M9` | Coolant off |
| Spindle Speed | `S` value used with M3/M4 | Sets target RPM command |

For a trim-router style hobby CNC, spindle speed may be set on the router itself instead of through GRBL.

### Autolevel Widget Buttons

The Autolevel widget is for probing a grid and optionally applying compensation to a G-code file.

| Button or control | What it does |
| --- | --- |
| Start New Probe | Begins a new autolevel setup |
| Load Probe Data | Loads a saved `.probe` file |
| Test Probe | Runs one test probe move |
| Start Test Probe | Confirms and starts the test probe |
| Start Probing | Starts the full grid probe |
| Stop Probing | Stops an active grid probe |
| Load G-code file | Loads a file for compensation |
| Clear G-code | Removes the loaded compensation file |
| Export Compensated G-code | Downloads compensated G-code |
| Export Probe Data | Saves measured probe data |
| Cancel | Closes the current confirmation dialog |

Use Autolevel only after normal probing behavior is proven. Do not run grid probing with clamps or stock edges inside the probe area.

### Macro Widget Buttons

Macros are saved command sequences.

| Button or control | What it does |
| --- | --- |
| Run Macro | Opens a confirmation, then runs the macro |
| Load Macro | Loads macro commands without running immediately |
| Run | Confirms and runs the selected macro |
| Cancel | Cancels the macro action |
| OK | Saves a new macro |
| Save Changes | Saves edits to an existing macro |
| Variable dropdown | Inserts macro variables while editing |

Only run macros you trust. A macro can move the machine just like a G-code file.

### Webcam And Custom Widget Buttons

These widgets are optional.

| Widget | Button or control | What it does |
| --- | --- | --- |
| Webcam | Settings | Opens webcam settings |
| Webcam | Save Changes | Saves webcam settings |
| Webcam | Cancel | Closes settings without saving |
| Custom | Enable/Disable | Turns the custom widget connection on or off |
| Custom | Refresh | Refreshes the custom widget frame |
| Custom | Edit | Opens custom widget settings |
| Custom | Toggle | Shows or hides the custom widget content |
| Custom | Save Changes | Saves custom widget settings |
| Custom | Cancel | Closes settings without saving |

## Launch Addresses

| Screen | Address |
| --- | --- |
| Desktop workspace | `http://localhost:8080` |
| Phone pendant | `http://<computer-ip>:8000/pendant/` |

The pendant address uses the computer IP address printed by the CNCjs server window.

## Connection Procedure

1. Power the MKS DLC V2 controller.
2. Connect USB to the CNCjs computer.
3. Start CNCjs with `Launch CNCjs Dev.bat`.
4. Open the desktop workspace.
5. Select the controller serial port.
6. Select GRBL.
7. Use `115200` baud unless configured differently.
8. Click Open.

## Machine States

| State | Meaning | Normal action |
| --- | --- | --- |
| Idle | Connected and ready | Jog, probe, home, or start a job |
| Alarm | GRBL needs attention | Inspect, unlock, or home |
| Run | Motion is active | Watch the machine |
| Hold | Motion is paused | Resume or abort |
| Disconnected | No active GRBL connection | Check USB, power, port, and baud |

## Homing

Use Home Machine after power-up if homing is configured.

Individual axis homing:

| Button | Commands |
| --- | --- |
| Home X | `G53 G0 Z-5`, `%wait`, `$HX` |
| Home Y | `G53 G0 Z-5`, `%wait`, `$HY` |
| Home Z | `$HZ` |

Use individual X/Y homing only if machine-coordinate `Z-5` is safe.

## Jogging

Use small jog steps near stock, clamps, and the probe.

Good jogging habits:

- Home first when possible.
- Raise Z before large X/Y moves.
- Start with small jog steps near the workpiece.
- Watch the real machine, not only the DRO.
- Stop if any axis direction is wrong.

## Probing

The Probe widget and pendant share the same probing layout.

Visible probe variables:

| Variable | Meaning |
| --- | --- |
| Probe Speed | Feed used by `G38.2` |
| Probe Depth | Search distance |
| Z Probe Offset | Applied Z offset after Z probing |
| XY Probe Offset | Probe radius used for X/Y edge compensation |
| Retraction Distance | Move away after a probe touch |

See [[03 - Probing Direction Guide]] for detailed direction behavior.

## Pendant Complete Button Guide

The phone pendant is the close-up machine-control screen. Use it while standing at the machine, but keep the desktop workspace open for preview, console output, and file loading.

### Pendant Top Bar

| Button or display | What it does |
| --- | --- |
| Connect | Connects the pendant web page to the CNCjs server session |
| Connection status | Shows whether the pendant is connected or disconnected |
| Username | Login username field if sign-in is required |
| Password | Login password field if sign-in is required |
| Sign In | Authenticates the pendant session |

### Pendant Status Displays

| Display | Meaning |
| --- | --- |
| Port | Current CNCjs serial port |
| State | Current GRBL machine state |
| Step | Current jog step |
| X | Current displayed X position |
| Y | Current displayed Y position |
| Z | Current displayed Z position |

### Pendant Serial Port Buttons

| Button or control | What it does |
| --- | --- |
| Port dropdown | Selects the serial port |
| Refresh | Reloads available ports |
| Baud dropdown | Selects baud rate |
| Open | Opens the selected serial port |

Use the desktop workspace if you need deeper connection diagnostics.

### Pendant Jog Buttons

| Button | What it does |
| --- | --- |
| X- Y+ diagonal | Jogs X negative and Y positive |
| Y+ | Jogs Y positive |
| X+ Y+ diagonal | Jogs X positive and Y positive |
| Z+ | Jogs Z positive |
| X- | Jogs X negative |
| X0Y0 | Rapid moves to work X0 Y0 |
| X+ | Jogs X positive |
| Z0 | Rapid moves to work Z0 |
| X- Y- diagonal | Jogs X negative and Y negative |
| Y- | Jogs Y negative |
| X+ Y- diagonal | Jogs X positive and Y negative |
| Z- | Jogs Z negative |
| Step minus | Decreases jog step |
| G21 (mm) | Shows millimeter mode |
| Step dropdown | Selects jog distance |
| Step plus | Increases jog step |

Raise Z before pressing X0Y0. Pressing Z0 moves to the current work Z zero and can hit the stock if the machine is not set up correctly.

### Pendant Zero Buttons

| Button | Command | What it does |
| --- | --- | --- |
| Set X0 | `G10 L20 P1 X0` | Sets current X as work X zero |
| Set Y0 | `G10 L20 P1 Y0` | Sets current Y as work Y zero |
| Set Z0 | `G10 L20 P1 Z0` | Sets current Z as work Z zero |
| Set XY0 | `G10 L20 P1 X0 Y0` | Sets current X and Y as work zero |
| Set XYZ0 | `G10 L20 P1 X0 Y0 Z0` | Sets current X, Y, and Z as work zero |
| Go To XY0 | `G0 X0 Y0` | Moves to work X0 Y0 |

Use Set buttons only when the tool or probe is exactly where you want the work zero.

### Pendant Machine Buttons

| Button | What it does |
| --- | --- |
| Home Machine | Runs full machine homing |
| Unlock | Clears GRBL alarm lock with the existing unlock path |
| Home X | Runs `G53 G0 Z-5`, waits, then `$HX` |
| Home Y | Runs `G53 G0 Z-5`, waits, then `$HY` |
| Home Z | Runs `$HZ` |
| Cycle Start | Sends cycle start |
| Resume | Resumes a held or paused job |
| Feed Hold | Pauses active motion |
| Abort Job | Force-stops the running job |

Home X and Home Y assume machine-coordinate `Z-5` is a safe raised position.

### Pendant Probing Pad Buttons

The pendant probing pad matches the main Probe widget.

| Button | What it does | Direction |
| --- | --- | --- |
| Back Left corner | Probes the back-left corner | `X+` then `Y-` |
| Back edge | Probes the back edge | `Y-` |
| Back Right corner | Probes the back-right corner | `X-` then `Y-` |
| Left edge | Probes the left edge | `X+` |
| Z | Probes Z downward | `Z-` |
| Right edge | Probes the right edge | `X-` |
| Front Left corner | Probes the front-left corner | `X+` then `Y+` |
| Front edge | Probes the front edge | `Y+` |
| Front Right corner | Probes the front-right corner | `X-` then `Y+` |

### Pendant Probing Variables

| Control | What it changes |
| --- | --- |
| Probe Speed | Feed used by the probe move |
| Probe Depth | Search distance for probing |
| Z Probe Offset | Offset applied after Z probing |
| XY Probe Offset | Probe radius/edge offset |
| Retraction Distance | Move away after probing |

### Pendant Probing Safety Buttons

| Button | What it does |
| --- | --- |
| Safe Z | Moves or retracts to the configured safe Z behavior |
| Clear State | Clears current probing status text/state |
| Feed Hold | Pauses motion during probing or a job |
| Abort | Sends the reset/abort path |
| Run Probe Cycle | Runs the selected pad probe cycle |
| Probe status display | Shows READY, running status, or errors |

Do not press Run Probe Cycle until the selected pad button, probe variables, and physical probe position are correct.

### Pendant Log

| Display | What it shows |
| --- | --- |
| Log | Pendant connection messages, commands, and status messages |

Use the log to confirm what the pendant sent if a button does not behave as expected.

## Tool Tab

The Tool tab controls what CNCjs does when loaded G-code contains an `M6` tool-change command.

Common policies:

| Policy | Meaning |
| --- | --- |
| Ignore M6 | CNCjs ignores tool-change commands |
| Send M6 | CNCjs sends M6 to GRBL |
| Manual Tool Change (WCS) | CNCjs pauses and uses a work-coordinate tool-change flow |
| Manual Tool Change (TLO) | CNCjs uses a tool-length-offset style workflow |
| Manual Tool Change (Custom Probing) | CNCjs uses the configured custom probing command |

Use tool-change probing only after the tool-change and tool-probe positions are tested in machine coordinates.

## Running A Job

1. Connect and home the machine.
2. Clamp stock securely.
3. Install the correct tool.
4. Set work zero.
5. Load G-code.
6. Inspect the visualizer.
7. Run an air cut if the setup is new.
8. Start the router/spindle.
9. Start the job.
10. Watch the first pass closely.

## Troubleshooting

| Problem | Check |
| --- | --- |
| No serial port | USB cable, controller power, driver, port already open |
| Pendant not loading | IP address, Wi-Fi, server window, firewall |
| Alarm after connect | Limits, unlock, homing state |
| Probe fails | Wiring, probe input, starting position, probe depth |
| Wrong job position | WCS, work zero, CAM origin |
| Toolpath too deep | Z zero, CAM setup, units |
