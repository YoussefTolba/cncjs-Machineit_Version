/* eslint-disable no-restricted-globals, no-var, prefer-arrow-callback, strict */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CNCjsToolProbe = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function () {
  'use strict';

  var GRBL = 'Grbl';
  var MARLIN = 'Marlin';
  var SMOOTHIE = 'Smoothie';
  var TINYG = 'TinyG';

  var TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS = 2;
  var TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO = 3;
  var TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING = 4;

  function splitLines(value) {
    if (Array.isArray(value)) {
      return value.slice();
    }

    return String(value || '').split('\n');
  }

  function mapWCSToPValue(wcs) {
    return {
      G54: 1,
      G55: 2,
      G56: 3,
      G57: 4,
      G58: 5,
      G59: 6
    }[wcs] || 0;
  }

  function buildToolChangeContext(settings) {
    var s = settings || {};
    return {
      tool_change_x: s.toolChangeX,
      tool_change_y: s.toolChangeY,
      tool_change_z: s.toolChangeZ,
      tool_probe_x: s.toolProbeX,
      tool_probe_y: s.toolProbeY,
      tool_probe_z: s.toolProbeZ,
      tool_probe_command: s.toolProbeCommand,
      tool_probe_distance: s.toolProbeDistance,
      tool_probe_feedrate: s.toolProbeFeedrate,
      touch_plate_height: s.touchPlateHeight,
      mapWCSToPValue: mapWCSToPValue
    };
  }

  function pushComment(lines, text, includeComments) {
    if (includeComments) {
      lines.push(text);
    }
  }

  function buildToolProbeCommands(controllerType, toolChangePolicy, options) {
    var includeComments = !!(options && options.includeComments);
    var lines = [];

    if (controllerType === MARLIN) {
      pushComment(lines, '; Probe the tool', includeComments);
      lines.push('G91 [tool_probe_command] F[tool_probe_feedrate] Z[tool_probe_z - posz - tool_probe_distance]');
      if (toolChangePolicy === TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS) {
        pushComment(lines, '; Set the current work Z position (posz) to the touch plate height', includeComments);
        lines.push('G92 Z[touch_plate_height]');
      } else if (toolChangePolicy === TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO) {
        pushComment(lines, '; Pause for 1 second', includeComments);
        lines.push('%wait 1');
        pushComment(lines, '; Adjust the work Z position by subtracting the touch plate height from the current work Z position (posz)', includeComments);
        lines.push('G92 Z[posz - touch_plate_height]');
      }
      return lines;
    }

    if (controllerType === GRBL || controllerType === SMOOTHIE) {
      pushComment(lines, '; Probe the tool', includeComments);
      lines.push('G91 [tool_probe_command] F[tool_probe_feedrate] Z[tool_probe_z - mposz - tool_probe_distance]');
      if (toolChangePolicy === TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS) {
        pushComment(lines, '; Set coordinate system offset', includeComments);
        lines.push('G10 L20 P[mapWCSToPValue(modal.wcs)] Z[touch_plate_height]');
      } else if (toolChangePolicy === TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO) {
        pushComment(lines, '; Pause for 1 second', includeComments);
        lines.push('%wait 1');
        pushComment(lines, '; Set tool length offset', includeComments);
        lines.push('G43.1 Z[posz - touch_plate_height]');
      }
      return lines;
    }

    if (controllerType === TINYG) {
      pushComment(lines, '; Probe the tool', includeComments);
      lines.push('G91 [tool_probe_command] F[tool_probe_feedrate] Z[tool_probe_z - mposz - tool_probe_distance]');
      if (toolChangePolicy === TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS) {
        pushComment(lines, '; Set coordinate system offset', includeComments);
        lines.push('G10 L20 P[mapWCSToPValue(modal.wcs)] Z[touch_plate_height]');
      } else if (toolChangePolicy === TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO) {
        pushComment(lines, '; Pause for 1 second', includeComments);
        lines.push('%wait 1');
        pushComment(lines, '; Set tool length offset', includeComments);
        lines.push('{tofz:[posz - touch_plate_height]}');
      }
      return lines;
    }

    return lines;
  }

  function buildToolProbeCommandText(controllerType, toolChangePolicy, options) {
    return buildToolProbeCommands(controllerType, toolChangePolicy, options).join('\n');
  }

  function buildToolChangeGcode(controllerType, toolChangePolicy, customCommands) {
    var lines = [];

    lines.push('%wait');
    lines.push('%_posx=posx');
    lines.push('%_posy=posy');
    lines.push('%_posz=posz');
    lines.push('%_modal_spindle=modal.spindle');
    lines.push('M5');
    lines.push('G90');
    lines.push('G53 G0 Z[tool_change_z]');
    lines.push('G53 G0 X[tool_change_x] Y[tool_change_y]');
    lines.push('%wait');
    lines.push('%msg Tool Change T[tool]');
    lines.push('M0');
    lines.push('G53 G0 X[tool_probe_x] Y[tool_probe_y]');
    lines.push('G53 G0 Z[tool_probe_z]');
    lines.push('%wait');

    if (toolChangePolicy === TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING) {
      lines.push.apply(lines, splitLines(customCommands));
    } else {
      lines.push.apply(lines, buildToolProbeCommands(controllerType, toolChangePolicy));
    }

    lines.push('G53 G0 Z[tool_change_z]');
    lines.push('G53 G0 X[tool_change_x] Y[tool_change_y]');
    lines.push('%wait');
    lines.push('%msg Restart Spindle');
    lines.push('M0');
    lines.push('G90');
    lines.push('G0 X[_posx] Y[_posy]');
    lines.push('G0 Z[_posz]');
    lines.push('[_modal_spindle]');
    lines.push('%wait 5');

    return lines;
  }

  function buildPendantToolChangeProbeGcode(params) {
    var p = params || {};
    return '\n; Tool Change & Probe\n' +
      '%SAFE_HEIGHT = ' + p.safeZMachine + '\n' +
      '%TOOL_PROBE_X = ' + p.toolProbeX + '\n' +
      '%TOOL_PROBE_Y = ' + p.toolProbeY + '\n' +
      '%TOOL_PROBE_Z = ' + p.toolProbeZ + '\n' +
      '%PROBE_DISTANCE = 50\n' +
      '%PROBE_FAST_FEEDRATE = ' + p.fast + '\n' +
      '%PROBE_SLOW_FEEDRATE = ' + p.slow + '\n' +
      '%TRAVEL_SPEED = ' + p.travelSpeed + '\n' +
      '%H_TRAVEL_SPEED = ' + p.travelSpeed + '\n' +
      '%RETRACT = ' + p.ret + '\n' +
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

  var toolProbeOverrideExamples = {
    wcs: buildToolProbeCommandText(GRBL, TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS, { includeComments: true }),
    tlo: buildToolProbeCommandText(GRBL, TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO, { includeComments: true })
  };

  return {
    controllers: {
      GRBL: GRBL,
      MARLIN: MARLIN,
      SMOOTHIE: SMOOTHIE,
      TINYG: TINYG
    },
    policies: {
      TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS: TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_WCS,
      TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO: TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_TLO,
      TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING: TOOL_CHANGE_POLICY_MANUAL_TOOL_CHANGE_CUSTOM_PROBING
    },
    toolProbeOverrideExamples: toolProbeOverrideExamples,
    mapWCSToPValue: mapWCSToPValue,
    buildToolChangeContext: buildToolChangeContext,
    buildToolProbeCommands: buildToolProbeCommands,
    buildToolProbeCommandText: buildToolProbeCommandText,
    buildToolChangeGcode: buildToolChangeGcode,
    buildPendantToolChangeProbeGcode: buildPendantToolChangeProbeGcode
  };
}));
