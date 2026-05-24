const GCodeGenerator = {
  generateSurfaceProbe(params) {
    const { maxTravel, fast, slow, ret } = params;
    return [
      'G91',
      `G38.2 Z-${maxTravel} F${fast}`,
      `G1 Z${ret}`,
      `G38.2 Z-5 F${slow}`,
      'G10 L20 P1 Z0',
      `G0 Z${ret}`
    ].join('\n');
  },

  generateEdgeProbe(axis, dir, params) {
    const { maxTravel, fast, slow, ret, r } = params;
    const move = (dir === '+') ? '-' : '+';
    const offset = (dir === '+') ? r : -r;
    const retractDirection = (move === '-') ? '+' : '-';

    return [
      'G91',
      `G38.2 ${axis}${move}${maxTravel} F${fast}`,
      `G1 ${axis}${retractDirection}2`,
      `G38.2 ${axis}${move}5 F${slow}`,
      `G10 L20 P1 ${axis}${offset}`,
      `G0 ${axis}${retractDirection}${ret}`
    ].join('\n');
  },

  generateInnerEdgeProbe(axis, dir, params) {
    const { maxTravel, fast, slow, ret, r, probeDepth } = params;
    const offset = (dir === '+') ? -r : r;
    const retractDirection = (dir === '+') ? '-' : '+';
    const probeMove = (dir === '+') ? '[max_travel]' : '-[max_travel]';
    const slowMove = (dir === '+') ? '[retract + 1]' : '-[retract + 1]';

    return `
; Inner Edge Probing (${axis}${dir})
; WARNING: Probe/set Z first. This routine does not probe Z.
%fast_speed = ${fast}
%slow_speed = ${slow}
%retract = ${ret}
%max_travel = ${maxTravel}
%effective_rad = ${r}
%probe_depth = ${probeDepth}

G91
G0 Z-[probe_depth]
G38.2 ${axis}${probeMove} F[fast_speed]
G0 ${axis}${retractDirection}[retract]
G38.2 ${axis}${slowMove} F[slow_speed]
G10 L20 P1 ${axis}${offset}
G0 ${axis}${retractDirection}[retract]
G0 Z[probe_depth]
G90
`;
  },

  generateHoleProbe(params) {
    const { dia, deflect, fast, slow, ret, maxTravel, r } = params;
    return `
; Hole Center Probing
%physical_diam = ${dia}
%deflection = ${deflect}
%fast_speed = ${fast}
%slow_speed = ${slow}
%retract = ${ret}
%max_travel = ${maxTravel}
%effective_rad = ${r}

G91
G38.2 X[max_travel] F[fast_speed]
G0 X-[retract]
G38.2 X[retract + 1] F[slow_speed]
%x_left = posx
G0 X-[retract]
G38.2 X-[max_travel] F[fast_speed]
G0 X[retract]
G38.2 X-[retract + 1] F[slow_speed]
%x_right = posx
G0 X[retract]
%x_center = (x_left + x_right) / 2
G90
G0 X[x_center]
G91
G38.2 Y[max_travel] F[fast_speed]
G0 Y-[retract]
G38.2 Y[retract + 1] F[slow_speed]
%y_back = posy
G0 Y-[retract]
G38.2 Y-[max_travel] F[fast_speed]
G0 Y[retract]
G38.2 Y-[retract + 1] F[slow_speed]
%y_front = posy
G0 Y[retract]
%y_center = (y_back + y_front) / 2
G90
G0 Y[y_center]
G10 L20 P1 X0 Y0
`;
  },

  generateBlockProbe(axis, params) {
    const { dia, deflect, fast, slow, ret, maxTravel, safeZ, r, sizeX, sizeY } = params;
    const header = `
; Boss/Block Probing (${axis.toUpperCase()}-Axis)
%approx_width_x = ${sizeX}
%approx_width_y = ${sizeY}
%physical_diam = ${dia}
%deflection = ${deflect}
%fast_speed = ${fast}
%slow_speed = ${slow}
%retract = ${ret}
%max_travel = ${maxTravel}
%safe_z_height = ${safeZ}
%effective_rad = ${r}

G91
`;

    if (axis === 'x') {
      return header + `
G38.2 X[max_travel] F[fast_speed]
G0 X-[retract]
G38.2 X[max_travel] F[slow_speed]
%x_left = posx
G0 X-[retract]
G0 Z[safe_z_height]
G0 X[approx_width_x + 10]
G0 Z-[safe_z_height]
G38.2 X-[max_travel] F[fast_speed]
G0 X[retract]
G38.2 X-[max_travel] F[slow_speed]
%x_right = posx
G0 X[retract]
G0 Z[safe_z_height]
%x_center = (x_left + x_right) / 2
G90
G0 X[x_center]
G10 L20 P1 X0
`;
    }

    return header + `
G38.2 Y[max_travel] F[fast_speed]
G0 Y-[retract]
G38.2 Y[max_travel] F[slow_speed]
%y_front = posy
G0 Y-[retract]
G0 Z[safe_z_height]
G0 Y[approx_width_y + 10]
G0 Z-[safe_z_height]
G38.2 Y-[max_travel] F[fast_speed]
G0 Y[retract]
G38.2 Y-[max_travel] F[slow_speed]
%y_back = posy
G0 Y[retract]
G0 Z[safe_z_height]
%y_center = (y_front + y_back) / 2
G90
G0 Y[y_center]
G10 L20 P1 Y0
`;
  },

  generateZTouchplateProbe(params) {
    const { plateThickness, fast, slow, ret, maxTravel } = params;
    return `
; Z-Touchplate Probing
%plate_thickness = ${plateThickness}
%fast_speed = ${fast}
%slow_speed = ${slow}
%retract = ${ret}
%max_travel = ${maxTravel}

G91
G38.2 Z-[max_travel] F[fast_speed]
G0 Z[retract]
G38.2 Z-5 F[slow_speed]
G10 L20 P1 Z[plate_thickness]
G0 Z[retract]
G90
`;
  },

  generateCornerProbe(arg, params) {
    const { dia, deflect, fast, slow, ret, maxTravel, r, safeZ, probeDepth } = params;
    let xDir = 0;
    let yDir = 0;

    if (arg.indexOf('L') >= 0) {
      xDir = -1;
    }
    if (arg.indexOf('R') >= 0) {
      xDir = 1;
    }
    if (arg.indexOf('B') >= 0) {
      yDir = -1;
    }
    if (arg.indexOf('T') >= 0) {
      yDir = 1;
    }

    return `
; Corner Probing (${arg})
%physical_diam = ${dia}
%deflection = ${deflect}
%fast_speed = ${fast}
%slow_speed = ${slow}
%retract = ${ret}
%max_travel = ${maxTravel}
%effective_rad = ${r}
%x_dir = ${xDir}
%y_dir = ${yDir}
%safe_z_height = ${safeZ}
%probe_depth = ${probeDepth}

G91
G38.2 Z-[max_travel] F[fast_speed]
G0 Z[retract]
G38.2 Z-5 F[slow_speed]
G10 L20 P1 Z0
G0 Z[safe_z_height]
G0 X[x_dir * max_travel]
G0 Z-[safe_z_height + probe_depth]
G38.2 X[-x_dir * max_travel] F[fast_speed]
G0 X[x_dir * retract]
G38.2 X[-x_dir * 5] F[slow_speed]
G10 L20 P1 X[x_dir * effective_rad]
G0 X[x_dir * retract]
G0 Z[safe_z_height + probe_depth]
G0 X[-x_dir * max_travel]
G0 Y[y_dir * max_travel]
G0 Z-[safe_z_height + probe_depth]
G38.2 Y[-y_dir * max_travel] F[fast_speed]
G0 Y[y_dir * retract]
G38.2 Y[-y_dir * 5] F[slow_speed]
G10 L20 P1 Y[y_dir * effective_rad]
G0 Y[y_dir * retract]
G0 Z[safe_z_height + probe_depth]
G0 Y[-y_dir * max_travel]
G90
G0 X0 Y0
`;
  },

  generateInnerCornerProbe(arg, params) {
    const { dia, deflect, fast, slow, ret, maxTravel, r, probeDepth } = params;
    let xDir = 0;
    let yDir = 0;

    if (arg.indexOf('L') >= 0) {
      xDir = -1;
    }
    if (arg.indexOf('R') >= 0) {
      xDir = 1;
    }
    if (arg.indexOf('B') >= 0) {
      yDir = -1;
    }
    if (arg.indexOf('T') >= 0) {
      yDir = 1;
    }

    return `
; Inner Corner Probing (${arg})
; WARNING: Probe/set Z first. This routine moves to Corner Depth, then probes X/Y only.
%physical_diam = ${dia}
%deflection = ${deflect}
%fast_speed = ${fast}
%slow_speed = ${slow}
%retract = ${ret}
%max_travel = ${maxTravel}
%effective_rad = ${r}
%x_dir = ${xDir}
%y_dir = ${yDir}
%probe_depth = ${probeDepth}

G91
G0 Z-[probe_depth]
G38.2 X[x_dir * max_travel] F[fast_speed]
G0 X[-x_dir * retract]
G38.2 X[x_dir * (retract + 1)] F[slow_speed]
G10 L20 P1 X[-x_dir * effective_rad]
G0 X[-x_dir * retract]
G38.2 Y[y_dir * max_travel] F[fast_speed]
G0 Y[-y_dir * retract]
G38.2 Y[y_dir * (retract + 1)] F[slow_speed]
G10 L20 P1 Y[-y_dir * effective_rad]
G0 Y[-y_dir * retract]
G0 Z[probe_depth]
G90
G0 X0 Y0
`;
  },

  generateInnerPocketProbe(params) {
    const { dia, deflect, fast, slow, ret, maxTravel, probeDepth } = params;

    return `
; Inner Pocket Center Probing
; WARNING: Probe/set Z first. This routine moves to Corner Depth, then probes X/Y only.
%physical_diam = ${dia}
%deflection = ${deflect}
%fast_speed = ${fast}
%slow_speed = ${slow}
%retract = ${ret}
%max_travel = ${maxTravel}
%probe_depth = ${probeDepth}

G91
G0 Z-[probe_depth]
G38.2 X-[max_travel] F[fast_speed]
G0 X[retract]
G38.2 X-[retract + 1] F[slow_speed]
%x_left = posx
G0 X[retract]
G38.2 X[max_travel] F[fast_speed]
G0 X-[retract]
G38.2 X[retract + 1] F[slow_speed]
%x_right = posx
G0 X-[retract]
%x_center = (x_left + x_right) / 2
G90
G0 X[x_center]
G91
G38.2 Y-[max_travel] F[fast_speed]
G0 Y[retract]
G38.2 Y-[retract + 1] F[slow_speed]
%y_front = posy
G0 Y[retract]
G38.2 Y[max_travel] F[fast_speed]
G0 Y-[retract]
G38.2 Y[retract + 1] F[slow_speed]
%y_back = posy
G0 Y-[retract]
%y_center = (y_front + y_back) / 2
G90
G0 Y[y_center]
G10 L20 P1 X0 Y0
G91
G0 Z[probe_depth]
G90
`;
  },

  generateToolChangeProbe(params) {
    const {
      toolProbeX, toolProbeY, toolProbeZ, safeZMachine,
      travelSpeed, fast, slow, ret
    } = params;

    return `
; Tool Change & Probe
%SAFE_HEIGHT = ${safeZMachine}
%TOOL_PROBE_X = ${toolProbeX}
%TOOL_PROBE_Y = ${toolProbeY}
%TOOL_PROBE_Z = ${toolProbeZ}
%PROBE_DISTANCE = 50
%PROBE_FAST_FEEDRATE = ${fast}
%PROBE_SLOW_FEEDRATE = ${slow}
%TRAVEL_SPEED = ${travelSpeed}
%H_TRAVEL_SPEED = ${travelSpeed}
%RETRACT = ${ret}
%X0=posx
%Y0=posy
%Z0=posz

M5
G21
G90
G53 G0 Z[SAFE_HEIGHT] F[TRAVEL_SPEED]
G53 G0 X[TOOL_PROBE_X] Y[TOOL_PROBE_Y] F[H_TRAVEL_SPEED]
M0 (Make sure probe is there)
G53 G0 Z[TOOL_PROBE_Z] F[TRAVEL_SPEED]
G91
G38.2 Z-[PROBE_DISTANCE] F[PROBE_FAST_FEEDRATE]
G0 Z[RETRACT]
G38.2 Z-[RETRACT + 2] F[PROBE_SLOW_FEEDRATE]
G90
%wait
G4 P0
%ORIGINAL_TOOL = posz
G91
G0 Z5
G90
G53 G0 Z[SAFE_HEIGHT] F[TRAVEL_SPEED]
M0 (Change tool now)
G90
G53 G0 X[TOOL_PROBE_X] Y[TOOL_PROBE_Y] F[H_TRAVEL_SPEED]
G53 G0 Z[TOOL_PROBE_Z] F[TRAVEL_SPEED]
G91
G38.2 Z-[PROBE_DISTANCE] F[PROBE_FAST_FEEDRATE]
G0 Z[RETRACT]
G38.2 Z-[RETRACT + 2] F[PROBE_SLOW_FEEDRATE]
G90
%wait
G4 P0
%NEW_TOOL_Z = posz
G92 Z[ORIGINAL_TOOL]
G91
G0 Z5
G90
G53 G0 Z[SAFE_HEIGHT] F[TRAVEL_SPEED]
G0 X[X0] Y[Y0] F[H_TRAVEL_SPEED]
G0 F[TRAVEL_SPEED]
`;
  }
};

export default GCodeGenerator;
