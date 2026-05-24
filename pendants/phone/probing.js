(function () {
  'use strict';

  var defaultSettings = {
    probeDia: 1.92,
    sizeX: 50,
    sizeY: 50,
    probeDeflection: 0.29,
    retract: 3,
    maxTravel: 25,
    safeZ: 20,
    feedSlow: 50,
    feedFast: 200,
    plateThickness: 0.5,
    probeDepth: 3,
    toolProbeX: 618.5,
    toolProbeY: 25,
    toolProbeZ: 0,
    safeZMachine: 0,
    travelSpeed: 500
  };

  function getParams(settings) {
    var s = Object.assign({}, defaultSettings, settings || {});
    var dia = Number(s.probeDia) || 0;
    var deflect = Number(s.probeDeflection) || 0;
    return {
      dia: dia,
      deflect: deflect,
      ret: Number(s.retract) || 0,
      maxTravel: Number(s.maxTravel) || 0,
      safeZ: Number(s.safeZ) || 0,
      sizeX: Number(s.sizeX) || 0,
      sizeY: Number(s.sizeY) || 0,
      probeDepth: Number(s.probeDepth) || 0,
      fast: Number(s.feedFast) || 0,
      slow: Number(s.feedSlow) || 0,
      plateThickness: Number(s.plateThickness) || 0,
      r: (dia / 2) - deflect,
      toolProbeX: Number(s.toolProbeX) || 0,
      toolProbeY: Number(s.toolProbeY) || 0,
      toolProbeZ: Number(s.toolProbeZ) || 0,
      safeZMachine: Number(s.safeZMachine) || 0,
      travelSpeed: Number(s.travelSpeed) || 0
    };
  }

  function generateSurfaceProbe(params) {
    return [
      'G91',
      'G38.2 Z-' + params.maxTravel + ' F' + params.fast,
      'G1 Z' + params.ret,
      'G38.2 Z-5 F' + params.slow,
      'G10 L20 P1 Z0',
      'G0 Z' + params.ret
    ].join('\n');
  }

  function generateEdgeProbe(axis, dir, params) {
    var move = (dir === '+') ? '-' : '+';
    var offset = (dir === '+') ? params.r : -params.r;
    var retractDirection = (move === '-') ? '+' : '-';

    return [
      'G91',
      'G38.2 ' + axis + move + params.maxTravel + ' F' + params.fast,
      'G1 ' + axis + retractDirection + '2',
      'G38.2 ' + axis + move + '5 F' + params.slow,
      'G10 L20 P1 ' + axis + offset,
      'G0 ' + axis + retractDirection + params.ret
    ].join('\n');
  }

  function generateInnerEdgeProbe(axis, dir, params) {
    var offset = (dir === '+') ? -params.r : params.r;
    var retractDirection = (dir === '+') ? '-' : '+';
    var probeMove = (dir === '+') ? '[max_travel]' : '-[max_travel]';
    var slowMove = (dir === '+') ? '[retract + 1]' : '-[retract + 1]';

    return '\n; Inner Edge Probing (' + axis + dir + ')\n' +
      '; WARNING: Probe/set Z first. This routine does not probe Z.\n' +
      '%fast_speed = ' + params.fast + '\n' +
      '%slow_speed = ' + params.slow + '\n' +
      '%retract = ' + params.ret + '\n' +
      '%max_travel = ' + params.maxTravel + '\n' +
      '%effective_rad = ' + params.r + '\n' +
      '%probe_depth = ' + params.probeDepth + '\n\n' +
      'G91\n' +
      'G0 Z-[probe_depth]\n' +
      'G38.2 ' + axis + probeMove + ' F[fast_speed]\n' +
      'G0 ' + axis + retractDirection + '[retract]\n' +
      'G38.2 ' + axis + slowMove + ' F[slow_speed]\n' +
      'G10 L20 P1 ' + axis + offset + '\n' +
      'G0 ' + axis + retractDirection + '[retract]\n' +
      'G0 Z[probe_depth]\n' +
      'G90\n';
  }

  function generateHoleProbe(params) {
    return '\n; Hole Center Probing\n' +
      '%physical_diam = ' + params.dia + '\n' +
      '%deflection = ' + params.deflect + '\n' +
      '%fast_speed = ' + params.fast + '\n' +
      '%slow_speed = ' + params.slow + '\n' +
      '%retract = ' + params.ret + '\n' +
      '%max_travel = ' + params.maxTravel + '\n' +
      '%effective_rad = ' + params.r + '\n\n' +
      'G91\n' +
      'G38.2 X[max_travel] F[fast_speed]\n' +
      'G0 X-[retract]\n' +
      'G38.2 X[retract + 1] F[slow_speed]\n' +
      '%x_left = posx\n' +
      'G0 X-[retract]\n' +
      'G38.2 X-[max_travel] F[fast_speed]\n' +
      'G0 X[retract]\n' +
      'G38.2 X-[retract + 1] F[slow_speed]\n' +
      '%x_right = posx\n' +
      'G0 X[retract]\n' +
      '%x_center = (x_left + x_right) / 2\n' +
      'G90\n' +
      'G0 X[x_center]\n' +
      'G91\n' +
      'G38.2 Y[max_travel] F[fast_speed]\n' +
      'G0 Y-[retract]\n' +
      'G38.2 Y[retract + 1] F[slow_speed]\n' +
      '%y_back = posy\n' +
      'G0 Y-[retract]\n' +
      'G38.2 Y-[max_travel] F[fast_speed]\n' +
      'G0 Y[retract]\n' +
      'G38.2 Y-[retract + 1] F[slow_speed]\n' +
      '%y_front = posy\n' +
      'G0 Y[retract]\n' +
      '%y_center = (y_back + y_front) / 2\n' +
      'G90\n' +
      'G0 Y[y_center]\n' +
      'G10 L20 P1 X0 Y0\n';
  }

  function generateBlockProbe(axis, params) {
    var header = '\n; Boss/Block Probing (' + axis.toUpperCase() + '-Axis)\n' +
      '%approx_width_x = ' + params.sizeX + '\n' +
      '%approx_width_y = ' + params.sizeY + '\n' +
      '%physical_diam = ' + params.dia + '\n' +
      '%deflection = ' + params.deflect + '\n' +
      '%fast_speed = ' + params.fast + '\n' +
      '%slow_speed = ' + params.slow + '\n' +
      '%retract = ' + params.ret + '\n' +
      '%max_travel = ' + params.maxTravel + '\n' +
      '%safe_z_height = ' + params.safeZ + '\n' +
      '%effective_rad = ' + params.r + '\n\n' +
      'G91\n';

    if (axis === 'x') {
      return header +
        'G38.2 X[max_travel] F[fast_speed]\n' +
        'G0 X-[retract]\n' +
        'G38.2 X[max_travel] F[slow_speed]\n' +
        '%x_left = posx\n' +
        'G0 X-[retract]\n' +
        'G0 Z[safe_z_height]\n' +
        'G0 X[approx_width_x + 10]\n' +
        'G0 Z-[safe_z_height]\n' +
        'G38.2 X-[max_travel] F[fast_speed]\n' +
        'G0 X[retract]\n' +
        'G38.2 X-[max_travel] F[slow_speed]\n' +
        '%x_right = posx\n' +
        'G0 X[retract]\n' +
        'G0 Z[safe_z_height]\n' +
        '%x_center = (x_left + x_right) / 2\n' +
        'G90\n' +
        'G0 X[x_center]\n' +
        'G10 L20 P1 X0\n';
    }

    return header +
      'G38.2 Y[max_travel] F[fast_speed]\n' +
      'G0 Y-[retract]\n' +
      'G38.2 Y[max_travel] F[slow_speed]\n' +
      '%y_front = posy\n' +
      'G0 Y-[retract]\n' +
      'G0 Z[safe_z_height]\n' +
      'G0 Y[approx_width_y + 10]\n' +
      'G0 Z-[safe_z_height]\n' +
      'G38.2 Y-[max_travel] F[fast_speed]\n' +
      'G0 Y[retract]\n' +
      'G38.2 Y-[max_travel] F[slow_speed]\n' +
      '%y_back = posy\n' +
      'G0 Y[retract]\n' +
      'G0 Z[safe_z_height]\n' +
      '%y_center = (y_front + y_back) / 2\n' +
      'G90\n' +
      'G0 Y[y_center]\n' +
      'G10 L20 P1 Y0\n';
  }

  function generateZTouchplateProbe(params) {
    return '\n; Z-Touchplate Probing\n' +
      '%plate_thickness = ' + params.plateThickness + '\n' +
      '%fast_speed = ' + params.fast + '\n' +
      '%slow_speed = ' + params.slow + '\n' +
      '%retract = ' + params.ret + '\n' +
      '%max_travel = ' + params.maxTravel + '\n\n' +
      'G91\n' +
      'G38.2 Z-[max_travel] F[fast_speed]\n' +
      'G0 Z[retract]\n' +
      'G38.2 Z-5 F[slow_speed]\n' +
      'G10 L20 P1 Z[plate_thickness]\n' +
      'G0 Z[retract]\n' +
      'G90\n';
  }

  function getCornerDirs(arg) {
    return {
      x: arg.indexOf('L') >= 0 ? -1 : 1,
      y: arg.indexOf('B') >= 0 ? -1 : 1
    };
  }

  function generateCornerProbe(arg, params) {
    var dirs = getCornerDirs(arg);
    return '\n; Corner Probing (' + arg + ')\n' +
      '%physical_diam = ' + params.dia + '\n' +
      '%deflection = ' + params.deflect + '\n' +
      '%fast_speed = ' + params.fast + '\n' +
      '%slow_speed = ' + params.slow + '\n' +
      '%retract = ' + params.ret + '\n' +
      '%max_travel = ' + params.maxTravel + '\n' +
      '%effective_rad = ' + params.r + '\n' +
      '%x_dir = ' + dirs.x + '\n' +
      '%y_dir = ' + dirs.y + '\n' +
      '%safe_z_height = ' + params.safeZ + '\n' +
      '%probe_depth = ' + params.probeDepth + '\n\n' +
      'G91\n' +
      'G38.2 Z-[max_travel] F[fast_speed]\n' +
      'G0 Z[retract]\n' +
      'G38.2 Z-5 F[slow_speed]\n' +
      'G10 L20 P1 Z0\n' +
      'G0 Z[safe_z_height]\n' +
      'G0 X[x_dir * max_travel]\n' +
      'G0 Z-[safe_z_height + probe_depth]\n' +
      'G38.2 X[-x_dir * max_travel] F[fast_speed]\n' +
      'G0 X[x_dir * retract]\n' +
      'G38.2 X[-x_dir * 5] F[slow_speed]\n' +
      'G10 L20 P1 X[x_dir * effective_rad]\n' +
      'G0 X[x_dir * retract]\n' +
      'G0 Z[safe_z_height + probe_depth]\n' +
      'G0 X[-x_dir * max_travel]\n' +
      'G0 Y[y_dir * max_travel]\n' +
      'G0 Z-[safe_z_height + probe_depth]\n' +
      'G38.2 Y[-y_dir * max_travel] F[fast_speed]\n' +
      'G0 Y[y_dir * retract]\n' +
      'G38.2 Y[-y_dir * 5] F[slow_speed]\n' +
      'G10 L20 P1 Y[y_dir * effective_rad]\n' +
      'G0 Y[y_dir * retract]\n' +
      'G0 Z[safe_z_height + probe_depth]\n' +
      'G0 Y[-y_dir * max_travel]\n' +
      'G90\n' +
      'G0 X0 Y0\n';
  }

  function generateInnerCornerProbe(arg, params) {
    var dirs = getCornerDirs(arg);
    return '\n; Inner Corner Probing (' + arg + ')\n' +
      '; WARNING: Probe/set Z first. This routine moves to Corner Depth, then probes X/Y only.\n' +
      '%physical_diam = ' + params.dia + '\n' +
      '%deflection = ' + params.deflect + '\n' +
      '%fast_speed = ' + params.fast + '\n' +
      '%slow_speed = ' + params.slow + '\n' +
      '%retract = ' + params.ret + '\n' +
      '%max_travel = ' + params.maxTravel + '\n' +
      '%effective_rad = ' + params.r + '\n' +
      '%x_dir = ' + dirs.x + '\n' +
      '%y_dir = ' + dirs.y + '\n' +
      '%probe_depth = ' + params.probeDepth + '\n\n' +
      'G91\n' +
      'G0 Z-[probe_depth]\n' +
      'G38.2 X[x_dir * max_travel] F[fast_speed]\n' +
      'G0 X[-x_dir * retract]\n' +
      'G38.2 X[x_dir * (retract + 1)] F[slow_speed]\n' +
      'G10 L20 P1 X[-x_dir * effective_rad]\n' +
      'G0 X[-x_dir * retract]\n' +
      'G38.2 Y[y_dir * max_travel] F[fast_speed]\n' +
      'G0 Y[-y_dir * retract]\n' +
      'G38.2 Y[y_dir * (retract + 1)] F[slow_speed]\n' +
      'G10 L20 P1 Y[-y_dir * effective_rad]\n' +
      'G0 Y[-y_dir * retract]\n' +
      'G0 Z[probe_depth]\n' +
      'G90\n' +
      'G0 X0 Y0\n';
  }

  function generateInnerPocketProbe(params) {
    return '\n; Inner Pocket Center Probing\n' +
      '; WARNING: Probe/set Z first. This routine moves to Corner Depth, then probes X/Y only.\n' +
      '%physical_diam = ' + params.dia + '\n' +
      '%deflection = ' + params.deflect + '\n' +
      '%fast_speed = ' + params.fast + '\n' +
      '%slow_speed = ' + params.slow + '\n' +
      '%retract = ' + params.ret + '\n' +
      '%max_travel = ' + params.maxTravel + '\n' +
      '%probe_depth = ' + params.probeDepth + '\n\n' +
      'G91\n' +
      'G0 Z-[probe_depth]\n' +
      'G38.2 X-[max_travel] F[fast_speed]\n' +
      'G0 X[retract]\n' +
      'G38.2 X-[retract + 1] F[slow_speed]\n' +
      '%x_left = posx\n' +
      'G0 X[retract]\n' +
      'G38.2 X[max_travel] F[fast_speed]\n' +
      'G0 X-[retract]\n' +
      'G38.2 X[retract + 1] F[slow_speed]\n' +
      '%x_right = posx\n' +
      'G0 X-[retract]\n' +
      '%x_center = (x_left + x_right) / 2\n' +
      'G90\n' +
      'G0 X[x_center]\n' +
      'G91\n' +
      'G38.2 Y-[max_travel] F[fast_speed]\n' +
      'G0 Y[retract]\n' +
      'G38.2 Y-[retract + 1] F[slow_speed]\n' +
      '%y_front = posy\n' +
      'G0 Y[retract]\n' +
      'G38.2 Y[max_travel] F[fast_speed]\n' +
      'G0 Y-[retract]\n' +
      'G38.2 Y[retract + 1] F[slow_speed]\n' +
      '%y_back = posy\n' +
      'G0 Y-[retract]\n' +
      '%y_center = (y_front + y_back) / 2\n' +
      'G90\n' +
      'G0 Y[y_center]\n' +
      'G10 L20 P1 X0 Y0\n' +
      'G91\n' +
      'G0 Z[probe_depth]\n' +
      'G90\n';
  }

  function generateToolChangeProbe(params) {
    return '\n; Tool Change & Probe\n' +
      '%SAFE_HEIGHT = ' + params.safeZMachine + '\n' +
      '%TOOL_PROBE_X = ' + params.toolProbeX + '\n' +
      '%TOOL_PROBE_Y = ' + params.toolProbeY + '\n' +
      '%TOOL_PROBE_Z = ' + params.toolProbeZ + '\n' +
      '%PROBE_DISTANCE = 50\n' +
      '%PROBE_FAST_FEEDRATE = ' + params.fast + '\n' +
      '%PROBE_SLOW_FEEDRATE = ' + params.slow + '\n' +
      '%TRAVEL_SPEED = ' + params.travelSpeed + '\n' +
      '%H_TRAVEL_SPEED = ' + params.travelSpeed + '\n' +
      '%RETRACT = ' + params.ret + '\n' +
      '%X0=posx\n' +
      '%Y0=posy\n' +
      '%Z0=posz\n\n' +
      'M5\nG21\nG90\n' +
      'G53 G0 Z[SAFE_HEIGHT] F[TRAVEL_SPEED]\n' +
      'G53 G0 X[TOOL_PROBE_X] Y[TOOL_PROBE_Y] F[H_TRAVEL_SPEED]\n' +
      'M0 (Make sure probe is there)\n' +
      'G53 G0 Z[TOOL_PROBE_Z] F[TRAVEL_SPEED]\n' +
      'G91\nG38.2 Z-[PROBE_DISTANCE] F[PROBE_FAST_FEEDRATE]\n' +
      'G0 Z[RETRACT]\nG38.2 Z-[RETRACT + 2] F[PROBE_SLOW_FEEDRATE]\n' +
      'G90\n%wait\nG4 P0\n%ORIGINAL_TOOL = posz\n' +
      'G91\nG0 Z5\nG90\nG53 G0 Z[SAFE_HEIGHT] F[TRAVEL_SPEED]\n' +
      'M0 (Change tool now)\nG90\n' +
      'G53 G0 X[TOOL_PROBE_X] Y[TOOL_PROBE_Y] F[H_TRAVEL_SPEED]\n' +
      'G53 G0 Z[TOOL_PROBE_Z] F[TRAVEL_SPEED]\n' +
      'G91\nG38.2 Z-[PROBE_DISTANCE] F[PROBE_FAST_FEEDRATE]\n' +
      'G0 Z[RETRACT]\nG38.2 Z-[RETRACT + 2] F[PROBE_SLOW_FEEDRATE]\n' +
      'G90\n%wait\nG4 P0\n%NEW_TOOL_Z = posz\n' +
      'G92 Z[ORIGINAL_TOOL]\nG91\nG0 Z5\nG90\n' +
      'G53 G0 Z[SAFE_HEIGHT] F[TRAVEL_SPEED]\n' +
      'G0 X[X0] Y[Y0] F[H_TRAVEL_SPEED]\n' +
      'G0 F[TRAVEL_SPEED]\n';
  }

  function generateProbe(type, arg, settings, mode, bossAxis) {
    var params = getParams(settings);
    var innerWarning = 'Probe/set Z first before running this inside routine. It will move to Corner Depth, then probe X/Y only.';
    if (type === 'surface') {
      return { title: 'Probe Z Surface', gcode: generateSurfaceProbe(params) };
    }
    if (type === 'edge') {
      if (mode === 'inner') {
        return {
          title: 'Probe Inner ' + arg + ' Edge',
          warning: innerWarning,
          gcode: generateInnerEdgeProbe(arg.charAt(0), arg.charAt(1), params)
        };
      }
      return { title: 'Probe ' + arg + ' Edge', gcode: generateEdgeProbe(arg.charAt(0), arg.charAt(1), params) };
    }
    if (type === 'corner') {
      if (mode === 'inner') {
        return {
          title: 'Probe Inner ' + arg + ' Corner',
          warning: innerWarning,
          gcode: generateInnerCornerProbe(arg, params)
        };
      }
      return { title: 'Probe ' + arg + ' Corner', gcode: generateCornerProbe(arg, params) };
    }
    if (type === 'pocket') {
      return { title: 'Probe Hole Center', gcode: generateHoleProbe(params) };
    }
    if (type === 'boss') {
      if (mode === 'inner') {
        return { title: 'Probe Inner Pocket Center', warning: innerWarning, gcode: generateInnerPocketProbe(params) };
      }
      return { title: 'Probe Block Center (' + bossAxis.toUpperCase() + ')', gcode: generateBlockProbe(bossAxis, params) };
    }
    if (type === 'z_touchplate') {
      return { title: 'Probe Z Touchplate', gcode: generateZTouchplateProbe(params) };
    }
    if (type === 'tool_change') {
      return { title: 'Tool Change & Probe', gcode: generateToolChangeProbe(params) };
    }
    return null;
  }

  window.CNCjsPendantProbing = {
    defaultSettings: defaultSettings,
    generateProbe: generateProbe
  };
}());
