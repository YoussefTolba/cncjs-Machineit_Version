(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../tool-probe'));
  } else {
    root.CNCjsAutolevelProbing = factory(root.CNCjsToolProbe);
  }
}(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function (toolProbe) {
  'use strict';

  var defaultSettings = {
    height: 2,
    margin: 10,
    grid: 3,
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
    probeSpacing: 50,
    probeDepth: 3,
    toolProbeX: 618.5,
    toolProbeY: 25,
    toolProbeZ: 0,
    safeZMachine: 0,
    travelSpeed: 500,
    showToolChange: false
  };

  var settingGroups = [
    {
      title: 'Compensation / Surface Map',
      fields: [
        ['height', 'Height (H)', 'Z travel height between points'],
        ['margin', 'Margin (M)', 'Edge offset for mesh grid'],
        ['grid', 'Grid Size', 'Number of X/Y grid points']
      ]
    },
    {
      title: 'Probe',
      fields: [
        ['probeDia', 'Probe Dia', 'Diameter of probe tip/shank'],
        ['sizeX', 'Stock X', 'Approx. workpiece Width (X)'],
        ['sizeY', 'Stock Y', 'Approx. workpiece Depth (Y)'],
        ['probeDeflection', 'Deflection', 'Probe trigger overshoot offset'],
        ['retract', 'Retract', 'Retract distance after touch'],
        ['maxTravel', 'Max Travel', 'Max probe distance limit'],
        ['safeZ', 'Safe Z', 'Safe height for rapids'],
        ['feedSlow', 'Slow Feed', 'Fine probing feedrate'],
        ['feedFast', 'Fast Feed', 'Initial probing feedrate'],
        ['plateThickness', 'Plate Thick.', 'Touch plate Z-height param'],
        ['probeSpacing', 'Skew Spacing', 'X offset for skew measurement'],
        ['probeDepth', 'Corner Depth', 'Plunge depth for corner probing']
      ]
    },
    {
      title: 'Tool Change',
      fields: [
        ['toolProbeX', 'Tool Probe X', 'Machine X coordinate of tool probe'],
        ['toolProbeY', 'Tool Probe Y', 'Machine Y coordinate of tool probe'],
        ['toolProbeZ', 'Tool Probe Z', 'Machine Z height to approach probe'],
        ['safeZMachine', 'Safe Z (Mach)', 'Machine Z safe travel height'],
        ['travelSpeed', 'Travel Speed', 'Rapid travel speed']
      ]
    }
  ];

  var probeButtons = [
    { label: '\u250c', title: 'Back Left Corner', type: 'corner', arg: 'TL' },
    { label: 'T', title: 'Back Edge', type: 'edge', arg: 'Y+' },
    { label: '\u2510', title: 'Back Right Corner', type: 'corner', arg: 'TR' },
    { label: 'Z Touchplate', title: 'Z Touchplate', type: 'z_touchplate', shape: true, icon: 'fa-arrow-down' },
    { label: '\u251c', title: 'Left Edge', type: 'edge', arg: 'X-' },
    { label: 'Z', title: 'Probe Z Surface', type: 'surface', center: true },
    { label: '\u2524', title: 'Right Edge', type: 'edge', arg: 'X+' },
    { label: 'Block', title: 'Block/Boss Center', type: 'boss', shape: true, icon: 'fa-square-o' },
    { label: '\u2514', title: 'Front Left Corner', type: 'corner', arg: 'BL' },
    { label: '\u2534', title: 'Front Edge', type: 'edge', arg: 'Y-' },
    { label: '\u2518', title: 'Front Right Corner', type: 'corner', arg: 'BR' },
    { label: 'Hole', title: 'Hole Center', type: 'pocket', shape: true, icon: 'fa-circle-o' }
  ];

  var toolChangeButton = {
    label: 'Tool Change',
    title: 'Tool Change & Probe',
    type: 'tool_change',
    shape: true,
    icon: 'fa-exchange',
    full: true
  };

  var modalVisuals = {
    corner: {
      image: 'instruction-corner.png',
      text: 'Position above the corner, within Max Travel distance.'
    },
    boss: {
      image: 'instruction-boss.png',
      text: 'Position outside the block: Left side (for X) or Front side (for Y).'
    },
    pocket: {
      image: 'instruction-hole.png',
      text: 'Position inside the hole, approximately centered.'
    },
    edge: {
      image: 'instruction-side.png',
      text: 'Position outside the stock, facing the target edge.'
    },
    skew: {
      image: 'instruction-side.png',
      text: 'Position the probe at the left-most point of the front edge.'
    },
    inner_corner: {
      image: 'probing-inner-corner.png',
      text: 'Position the probe inside the corner, within Max Travel distance of both inside walls.'
    },
    inner_boss: {
      image: 'instruction-boss.png',
      text: 'Position the probe inside the pocket, roughly near the center of the rectangular feature.'
    },
    inner_edge: {
      image: 'instruction-side.png',
      text: 'Position the probe inside the feature, facing the inside wall to probe.'
    },
    z_touchplate: {
      image: 'instruction-touchplate.png',
      text: 'Position directly above the touchplate surface.'
    },
    surface: {
      image: 'instruction-corner.png',
      text: 'Position directly above the workpiece surface.'
    },
    tool_change: {
      image: 'change-tool.png',
      text: 'Make sure the tool setter is in place before starting the tool change sequence.'
    },
    autolevel: {
      image: 'instruction-corner.png',
      text: 'Position the probe above the front-left corner of the mapping area.'
    }
  };

  function getProbeParams(settings) {
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
      spacing: Number(s.probeSpacing) || 0,
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

  function validateSettings(settings) {
    var invalidFields = [];
    var finiteFields = ['toolProbeX', 'toolProbeY', 'toolProbeZ', 'safeZMachine'];
    var nonNegativeFields = [
      'margin', 'probeDeflection', 'retract', 'safeZ', 'plateThickness', 'probeSpacing', 'probeDepth'
    ];
    var positiveFields = [
      'height', 'probeDia', 'sizeX', 'sizeY', 'maxTravel', 'feedSlow', 'feedFast', 'travelSpeed'
    ];

    finiteFields.forEach(function (key) {
      var value = Number(settings[key]);
      if (!Number.isFinite(value)) {
        invalidFields.push(key);
      }
    });

    nonNegativeFields.forEach(function (key) {
      var value = Number(settings[key]);
      if (!Number.isFinite(value) || value < 0) {
        invalidFields.push(key);
      }
    });

    positiveFields.forEach(function (key) {
      var value = Number(settings[key]);
      if (!Number.isFinite(value) || value <= 0) {
        invalidFields.push(key);
      }
    });

    var grid = Number(settings.grid);
    if (!Number.isFinite(grid) || grid < 2) {
      invalidFields.push('grid');
    }

    var probeRadius = (Number(settings.probeDia) / 2) - Number(settings.probeDeflection);
    if (!Number.isFinite(probeRadius) || probeRadius < 0) {
      invalidFields.push('probeDia', 'probeDeflection');
    }

    return invalidFields.filter(function (field, index) {
      return invalidFields.indexOf(field) === index;
    });
  }

  var GCodeGenerator = {
    generateSurfaceProbe: function (params) {
      return [
        'G91',
        'G38.2 Z-' + params.maxTravel + ' F' + params.fast,
        'G1 Z' + params.ret,
        'G38.2 Z-5 F' + params.slow,
        'G10 L20 P1 Z0',
        'G0 Z' + params.ret
      ].join('\n');
    },

    generateEdgeProbe: function (axis, dir, params) {
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
    },

    generateInnerEdgeProbe: function (axis, dir, params) {
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
    },

    generateHoleProbe: function (params) {
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
    },

    generateBlockProbe: function (axis, params) {
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
    },

    generateZTouchplateProbe: function (params) {
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
    },

    generateCornerProbe: function (arg, params) {
      var xDir = arg.indexOf('L') >= 0 ? -1 : 1;
      var yDir = arg.indexOf('B') >= 0 ? -1 : 1;

      return '\n; Corner Probing (' + arg + ')\n' +
        '%physical_diam = ' + params.dia + '\n' +
        '%deflection = ' + params.deflect + '\n' +
        '%fast_speed = ' + params.fast + '\n' +
        '%slow_speed = ' + params.slow + '\n' +
        '%retract = ' + params.ret + '\n' +
        '%max_travel = ' + params.maxTravel + '\n' +
        '%effective_rad = ' + params.r + '\n' +
        '%x_dir = ' + xDir + '\n' +
        '%y_dir = ' + yDir + '\n' +
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
    },

    generateInnerCornerProbe: function (arg, params) {
      var xDir = arg.indexOf('L') >= 0 ? -1 : 1;
      var yDir = arg.indexOf('B') >= 0 ? -1 : 1;

      return '\n; Inner Corner Probing (' + arg + ')\n' +
        '; WARNING: Probe/set Z first. This routine moves to Corner Depth, then probes X/Y only.\n' +
        '%physical_diam = ' + params.dia + '\n' +
        '%deflection = ' + params.deflect + '\n' +
        '%fast_speed = ' + params.fast + '\n' +
        '%slow_speed = ' + params.slow + '\n' +
        '%retract = ' + params.ret + '\n' +
        '%max_travel = ' + params.maxTravel + '\n' +
        '%effective_rad = ' + params.r + '\n' +
        '%x_dir = ' + xDir + '\n' +
        '%y_dir = ' + yDir + '\n' +
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
    },

    generateInnerPocketProbe: function (params) {
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
    },

    generateToolChangeProbe: function (params) {
      return toolProbe.buildPendantToolChangeProbeGcode(params);
    }
  };

  function generateProbe(type, arg, settings, mode, bossAxis) {
    var params = getProbeParams(settings);
    var isInner = mode === 'inner';
    var innerWarning = 'Probe/set Z first before running this inside routine. It will move to Corner Depth, then probe X/Y only.';

    if (type === 'surface') {
      return { title: 'Probe Z Surface', gcode: GCodeGenerator.generateSurfaceProbe(params) };
    }
    if (type === 'edge') {
      if (isInner) {
        return {
          title: 'Probe Inner ' + arg + ' Edge',
          modalType: 'inner_edge',
          warning: innerWarning,
          gcode: GCodeGenerator.generateInnerEdgeProbe(arg.charAt(0), arg.charAt(1), params)
        };
      }
      return { title: 'Probe ' + arg + ' Edge', gcode: GCodeGenerator.generateEdgeProbe(arg.charAt(0), arg.charAt(1), params) };
    }
    if (type === 'corner') {
      if (isInner) {
        return {
          title: 'Probe Inner ' + arg + ' Corner',
          modalType: 'inner_corner',
          warning: innerWarning,
          gcode: GCodeGenerator.generateInnerCornerProbe(arg, params)
        };
      }
      return { title: 'Probe ' + arg + ' Corner', gcode: GCodeGenerator.generateCornerProbe(arg, params) };
    }
    if (type === 'pocket') {
      return { title: 'Probe Hole Center', gcode: GCodeGenerator.generateHoleProbe(params) };
    }
    if (type === 'boss') {
      if (isInner) {
        return {
          title: 'Probe Inner Pocket Center',
          modalType: 'inner_boss',
          warning: innerWarning,
          gcode: GCodeGenerator.generateInnerPocketProbe(params)
        };
      }
      return {
        title: 'Probe Block Center (' + String(bossAxis || 'x').toUpperCase() + ')',
        gcode: GCodeGenerator.generateBlockProbe(bossAxis || 'x', params)
      };
    }
    if (type === 'z_touchplate') {
      return { title: 'Probe Z Touchplate', gcode: GCodeGenerator.generateZTouchplateProbe(params) };
    }
    if (type === 'tool_change') {
      return {
        title: 'Tool Change & Probe',
        confirmLabel: 'Change Tool',
        gcode: GCodeGenerator.generateToolChangeProbe(params)
      };
    }
    return null;
  }

  function buildSkewProbeGcode(settings, includeMove) {
    var params = getProbeParams(settings);
    var gcode = ['G91'];
    if (includeMove) {
      gcode.push('G0 X' + params.spacing);
    }
    gcode.push(
      'G38.2 Y' + params.maxTravel + ' F' + params.fast,
      'G0 Y-' + params.ret,
      'G38.2 Y' + (params.ret + 1) + ' F' + params.slow,
      'G0 Y-' + params.ret,
      'G90'
    );
    return gcode.join('\n');
  }

  function getVisibleProbeButtons(settings) {
    return settings && settings.showToolChange ? probeButtons.concat([toolChangeButton]) : probeButtons.slice();
  }

  function prefixModalVisualImages(prefix) {
    var imagePrefix = prefix || '';
    var result = {};
    Object.keys(modalVisuals).forEach(function (key) {
      result[key] = Object.assign({}, modalVisuals[key], {
        image: imagePrefix + modalVisuals[key].image
      });
    });
    return result;
  }

  return {
    defaultSettings: defaultSettings,
    settingGroups: settingGroups,
    probeButtons: probeButtons,
    toolChangeButton: toolChangeButton,
    modalVisuals: modalVisuals,
    GCodeGenerator: GCodeGenerator,
    getProbeParams: getProbeParams,
    validateSettings: validateSettings,
    generateProbe: generateProbe,
    buildSkewProbeGcode: buildSkewProbeGcode,
    getVisibleProbeButtons: getVisibleProbeButtons,
    prefixModalVisualImages: prefixModalVisualImages
  };
}));
