# CNCjs Machine It Version

This repository is a customized CNCjs build for the Machine It CNC workflow. It is based on the open-source CNCjs project, but this repo is not meant to be a plain mirror of upstream CNCjs. It carries local machine workflow changes, a custom phone pendant, probing/autolevel tools, and launcher scripts specific to this setup.

Upstream CNCjs is here: https://github.com/cncjs/cncjs

## What This Version Adds

- Machine It phone pendant at `/pendant/`
- Windows launch scripts for the local workspace and phone pendant
- GRBL-focused startup workflow for the local machine
- Autolevel and probing controls for both workspace and pendant
- Surface mesh probing, skew measurement, and compensation tools
- Tool-change and touch-probe routines
- Shared spindle/coolant command builder used by both workspace and pendant
- Local operator documentation in `docs/`

## Shared Command Logic

Workspace and pendant both use the same spindle/coolant command builder:

```text
src/shared/machine-commands.js
```

That file is served to the browser at:

```text
/shared/machine-commands.js
```

The idea is the same as keeping common C logic in one function: update the shared command builder once, and both the desktop workspace and phone pendant use the same command behavior.

## Running Locally On Windows

Use this for the normal build-and-run flow:

```bat
Launch CNCjs Dev.bat
```

After a successful build, use this for run-only starts:

```bat
Run CNCjs Dev.bat
```

The launcher starts:

- CNCjs server on port `8000`
- Workspace asset server on port `8080`
- Phone pendant mounted at `/pendant/`

It opens:

```text
http://<192.168.1.x>:8000/
http://<192.168.1.x>:8000/pendant/
```

## Development Commands

Windows development build:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build-dev.ps1
```

Node/package script:

```bash
npm run win-dev
```

Targeted checks used during recent spindle and pendant work:

```bash
npm test -- src/server/controllers/utils/__tests__/gcode.test.js --runInBand
node --check pendants/phone/app.js
node --check src/shared/machine-commands.js
```

## Important Project Areas

- Desktop workspace app: `src/app/`
- Server/controllers: `src/server/`
- Shared browser/server command helpers: `src/shared/`
- Phone pendant: `pendants/phone/`
- Autolevel server extension: `src/server/services/autolevel-extension/`
- Operator docs: `docs/`
- Local version notes: `VERSION_HISTORY.md`

## Build Notes

The build scripts copy `src/shared` into the built CNCjs output so pendant pages can load shared command helpers:

- `scripts/build-dev.ps1`
- `scripts/build-dev.sh`
- `scripts/build-prod.sh`
- `scripts/build-latest.sh`

If shared browser files are added later, make sure they stay under `src/shared` so they are included by those scripts.

## Upstream Credit

This project is built on CNCjs, originally created by Cheton Wu and contributors. CNCjs is licensed under the MIT License. This repository keeps the original license file and should continue to respect the upstream project license and attribution.

## License

Licensed under the MIT License. See `LICENSE`.
