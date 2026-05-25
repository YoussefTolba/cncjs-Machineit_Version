/* eslint-disable no-restricted-globals, no-var, prefer-arrow-callback, strict */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CNCjsMachineCommands = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function toPositiveNumber(value) {
    var number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function buildSpindleCommand(code, speed) {
    var command = String(code || '').toUpperCase();

    if (command !== 'M3' && command !== 'M4' && command !== 'M5') {
      return '';
    }

    if (command === 'M5') {
      return command;
    }

    var spindleSpeed = toPositiveNumber(speed);
    return spindleSpeed > 0 ? command + ' S' + spindleSpeed : command;
  }

  function buildCoolantCommand(code) {
    var command = String(code || '').toUpperCase();
    return ['M7', 'M8', 'M9'].indexOf(command) >= 0 ? command : '';
  }

  return {
    buildCoolantCommand: buildCoolantCommand,
    buildSpindleCommand: buildSpindleCommand,
  };
}));
