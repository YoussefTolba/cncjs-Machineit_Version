(function () {
  'use strict';

  var state = {
    token: localStorage.getItem('cncjsPendantToken') || '',
    socket: null,
    port: localStorage.getItem('cncjsPendantPort') || '',
    controllerType: 'Grbl',
    baudrate: localStorage.getItem('cncjsPendantBaudrate') || '115200',
    step: Number(localStorage.getItem('cncjsPendantStep') || 1),
    connected: false,
    probeMode: localStorage.getItem('cncjsPendantProbeMode') || 'outer',
    autolevelSettings: {},
    customCommands: []
  };

  var $ = function (id) {
    return document.getElementById(id);
  };

  var logEl = $('log');
  var buttons = Array.prototype.slice.call(document.querySelectorAll('button'));
  var probing = window.CNCjsPendantProbing || null;
  var jogSteps = [
    0.001, 0.002, 0.003, 0.005,
    0.01, 0.02, 0.03, 0.05,
    0.1, 0.2, 0.3, 0.5,
    1, 2, 3, 5, 10, 20, 30, 50, 100, 200, 300, 500
  ];

  function log(message) {
    var time = new Date().toLocaleTimeString();
    logEl.textContent = '[' + time + '] ' + message + '\n' + logEl.textContent;
  }

  function setStatus(message) {
    $('connectionStatus').textContent = message;
  }

  function setConnected(connected) {
    state.connected = connected;
    $('connectButton').textContent = connected ? 'Reconnect' : 'Connect';
    buttons.forEach(function (button) {
      if (button.id === 'connectButton' || button.id === 'signinButton') {
        return;
      }
      button.disabled = !connected && button.id !== 'refreshPortsButton';
    });
    renderCustomCommands();
  }

  function signin(name, password) {
    return fetch('/api/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: state.token,
        name: name || '',
        password: password || ''
      })
    }).then(function (res) {
      if (!res.ok) {
        throw new Error('Sign in failed');
      }
      return res.json();
    }).then(function (data) {
      state.token = data.token;
      localStorage.setItem('cncjsPendantToken', state.token);
      $('signinPanel').classList.add('hidden');
      return data;
    });
  }

  function connect() {
    if (state.socket) {
      state.socket.disconnect();
      state.socket = null;
    }

    setStatus('Connecting...');
    var socket = io({
      path: '/socket.io',
      query: 'token=' + encodeURIComponent(state.token),
      transports: ['websocket', 'polling']
    });
    state.socket = socket;

    socket.on('connect', function () {
      setConnected(true);
      setStatus('Connected to CNCjs');
      log('Connected');
      refreshPorts();
      loadCustomCommands();
    });

    socket.on('connect_error', function () {
      setConnected(false);
      setStatus('Connection failed');
      $('signinPanel').classList.remove('hidden');
    });

    socket.on('disconnect', function () {
      setConnected(false);
      setStatus('Disconnected');
      $('portStatus').textContent = 'None';
    });

    socket.on('serialport:list', updatePorts);

    socket.on('serialport:open', function (data) {
      state.port = data.port;
      localStorage.setItem('cncjsPendantPort', state.port);
      $('portStatus').textContent = state.port;
      log('Using ' + state.port);
    });

    socket.on('serialport:close', function () {
      $('portStatus').textContent = 'None';
      log('Port closed');
    });

    socket.on('controller:state', function (type, controllerState) {
      state.controllerType = type;
      var status = controllerState && controllerState.status;
      var activeState = status && status.activeState;
      var wpos = status && status.wpos;

      $('machineState').textContent = activeState || 'Unknown';
      if (wpos) {
        $('posX').textContent = wpos.x || '0.000';
        $('posY').textContent = wpos.y || '0.000';
        $('posZ').textContent = wpos.z || '0.000';
      }
    });

    socket.on('workflow:state', function (workflowState) {
      log('Workflow: ' + workflowState);
    });

    socket.on('serialport:read', function (line) {
      if (typeof line !== 'string') {
        return;
      }
      line.split('\n').forEach(function (part) {
        handleAutolevelLine(part.trim());
      });
    });
  }

  function refreshPorts() {
    if (!state.socket) {
      return;
    }
    state.socket.emit('list');
  }

  function updatePorts(ports) {
    var select = $('portSelect');
    select.innerHTML = '';

    ports.forEach(function (item) {
      var option = document.createElement('option');
      option.value = item.port;
      option.textContent = item.port + (item.inuse ? ' (in use)' : '');
      select.appendChild(option);
    });

    if (state.port) {
      select.value = state.port;
    } else if (ports[0]) {
      state.port = ports[0].port;
      select.value = state.port;
    }
  }

  function openPort() {
    if (!state.socket) {
      return;
    }

    state.port = $('portSelect').value || state.port;
    state.baudrate = $('baudSelect').value || state.baudrate;
    localStorage.setItem('cncjsPendantPort', state.port);
    localStorage.setItem('cncjsPendantBaudrate', state.baudrate);

    state.socket.emit('open', state.port, {
      controllerType: 'Grbl',
      baudrate: Number(state.baudrate)
    }, function (err) {
      if (err) {
        log('Open failed: ' + (err.message || err));
        return;
      }
      $('portStatus').textContent = state.port;
      refreshAutolevelSettings();
    });
  }

  function command(cmd) {
    var args = Array.prototype.slice.call(arguments, 1);
    if (!state.socket || !state.port) {
      log('No open port');
      return;
    }
    state.socket.emit.apply(state.socket, ['command', state.port, cmd].concat(args));
  }

  function normalizeGcodeLines(lines) {
    if (Array.isArray(lines)) {
      return lines;
    }
    if (typeof lines === 'string') {
      return [lines];
    }
    return [];
  }

  function sendGcode(lines) {
    var block = normalizeGcodeLines(lines);
    if (block.length === 0) {
      return;
    }
    command('gcode', block.length === 1 ? block[0] : block);
    log('G-code sent: ' + block.join(' | '));
  }

  function sendControllerCommand(cmd, args) {
    command.apply(null, [cmd].concat(args || []));
    log('Command sent: ' + cmd);
  }

  function num(id, fallback) {
    var element = $(id);
    var value = Number(element ? element.value : fallback);
    return Number.isFinite(value) ? value : fallback;
  }

  function authFetch(url, options) {
    var requestOptions = options || {};
    requestOptions.headers = Object.assign({
      'Authorization': 'Bearer ' + state.token,
      'Cache-Control': 'no-cache',
      'X-Requested-With': 'XMLHttpRequest'
    }, requestOptions.headers || {});
    return fetch(url, requestOptions).then(function (res) {
      if (!res.ok) {
        throw new Error('Request failed: ' + res.status);
      }
      return res.json();
    });
  }

  function refreshAutolevelSettings() {
    if (!state.socket || !state.port) {
      return;
    }
    state.socket.emit('write', state.port, '(autolevel_fetch_settings)\n');
  }

  function handleAutolevelLine(line) {
    if (line.indexOf('(AL: SETTINGS') !== 0) {
      return;
    }
    var json = line.replace(/^\(AL: SETTINGS\s*/, '').replace(/\)$/, '');
    try {
      state.autolevelSettings = Object.assign(
        {},
        probing ? probing.defaultSettings : {},
        JSON.parse(json || '{}')
      );
      applyProbeSettingsToInputs();
      log('Autolevel settings loaded');
    } catch (err) {
      log('Could not parse autolevel settings: ' + err.message);
    }
  }

  function getProbeSettingsFromInputs() {
    var settings = Object.assign({}, probing ? probing.defaultSettings : {}, state.autolevelSettings);
    Object.keys(settings).forEach(function (key) {
      var element = $(key);
      if (!element) {
        return;
      }
      var value = Number(element.value);
      if (Number.isFinite(value)) {
        settings[key] = value;
      }
    });
    state.autolevelSettings = settings;
    return settings;
  }

  function applyProbeSettingsToInputs() {
    var settings = Object.assign({}, probing ? probing.defaultSettings : {}, state.autolevelSettings);
    Object.keys(settings).forEach(function (key) {
      var element = $(key);
      if (element) {
        element.value = settings[key];
      }
    });
  }

  function validateProbeSettings(settings) {
    var invalid = [];
    var positiveFields = ['probeDia', 'sizeX', 'sizeY', 'maxTravel', 'feedSlow', 'feedFast', 'travelSpeed'];
    var nonNegativeFields = ['probeDeflection', 'retract', 'safeZ', 'plateThickness', 'probeDepth'];

    positiveFields.forEach(function (key) {
      if (!Number.isFinite(Number(settings[key])) || Number(settings[key]) <= 0) {
        invalid.push(key);
      }
    });
    nonNegativeFields.forEach(function (key) {
      if (!Number.isFinite(Number(settings[key])) || Number(settings[key]) < 0) {
        invalid.push(key);
      }
    });
    if ((Number(settings.probeDia) / 2) - Number(settings.probeDeflection) <= 0) {
      invalid.push('probeDia');
      invalid.push('probeDeflection');
    }

    Array.prototype.slice.call(document.querySelectorAll('.settings-grid input')).forEach(function (input) {
      input.classList.toggle('invalid', invalid.indexOf(input.id) >= 0);
    });
    return invalid.length === 0;
  }

  function updateProbeMode(mode) {
    state.probeMode = mode || state.probeMode;
    localStorage.setItem('cncjsPendantProbeMode', state.probeMode);
    Array.prototype.slice.call(document.querySelectorAll('[data-probe-mode]')).forEach(function (button) {
      button.classList.toggle('active', button.getAttribute('data-probe-mode') === state.probeMode);
    });
    if ($('bossProbeLabel')) {
      $('bossProbeLabel').textContent = state.probeMode === 'inner' ? 'Pocket' : 'Block';
    }
  }

  function runPendantProbe(type, arg) {
    if (!probing) {
      log('Pendant probing module is not loaded');
      return;
    }
    var settings = getProbeSettingsFromInputs();
    if (!validateProbeSettings(settings)) {
      $('probeStatus').textContent = 'Fix highlighted probe settings first.';
      return;
    }
    var bossAxis = $('pendantBossAxis') ? $('pendantBossAxis').value : 'x';
    var generated = probing.generateProbe(type, arg || '', settings, state.probeMode, bossAxis);
    if (!generated) {
      return;
    }
    var prompt = generated.title;
    if (generated.warning) {
      prompt += '\n\nWARNING: ' + generated.warning;
    }
    prompt += '\n\n' + generated.gcode;
    if (!window.confirm(prompt)) {
      return;
    }
    $('probeStatus').textContent = 'SENT: ' + generated.title + '\n' + generated.gcode;
    sendGcode(generated.gcode);
  }

  function loadCustomCommands() {
    if (!state.token) {
      return;
    }
    authFetch('/api/commands')
      .then(function (data) {
        state.customCommands = (data.records || []).filter(function (record) {
          return record.enabled !== false;
        });
        renderCustomCommands();
      })
      .catch(function (err) {
        log('Could not load custom commands: ' + err.message);
      });
  }

  function renderCustomCommands() {
    var container = $('customCommands');
    if (!container) {
      return;
    }
    container.innerHTML = '';
    if (state.customCommands.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'empty-note';
      empty.textContent = 'No enabled custom commands';
      container.appendChild(empty);
      return;
    }
    state.customCommands.forEach(function (record) {
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = record.title || 'Custom Command';
      button.setAttribute('data-custom-command', record.id);
      button.disabled = !state.connected;
      container.appendChild(button);
    });
  }

  function runCustomCommand(id) {
    var record = state.customCommands.find(function (item) {
      return item.id === id;
    });
    var title = record ? record.title : 'Custom command';
    if (!window.confirm('Run custom command?\n\n' + title)) {
      return;
    }
    authFetch('/api/commands/run/' + encodeURIComponent(id), { method: 'POST' })
      .then(function () {
        log('Custom command started: ' + title);
      })
      .catch(function (err) {
        log('Custom command failed: ' + err.message);
      });
  }

  function jog(spec) {
    var words = spec.split(/\s+/).map(function (word) {
      var axis = word.charAt(0);
      var sign = word.charAt(1) === '-' ? -1 : 1;
      return axis + (sign * state.step);
    });

    sendGcode([
      'G91',
      'G0 ' + words.join(' '),
      'G90'
    ]);
  }

  function selectStep(step) {
    state.step = Number(step);
    if (!Number.isFinite(state.step)) {
      state.step = 1;
    }
    localStorage.setItem('cncjsPendantStep', state.step);
    $('stepLabel').textContent = state.step + ' mm';
    $('stepSelect').value = String(state.step);
    Array.prototype.slice.call(document.querySelectorAll('[data-step]')).forEach(function (button) {
      button.classList.toggle('active', Number(button.getAttribute('data-step')) === state.step);
    });
  }

  function selectStepByDelta(delta) {
    var index = jogSteps.indexOf(state.step);
    if (index < 0) {
      index = jogSteps.indexOf(1);
    }
    index = Math.max(0, Math.min(jogSteps.length - 1, index + delta));
    selectStep(jogSteps[index]);
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest('button');
    if (!button) {
      return;
    }

    var step = button.getAttribute('data-step');
    var stepDelta = button.getAttribute('data-step-delta');
    var probeMode = button.getAttribute('data-probe-mode');
    var probeType = button.getAttribute('data-probe-type');
    var probeArg = button.getAttribute('data-probe-arg');
    var customCommand = button.getAttribute('data-custom-command');
    var jogSpec = button.getAttribute('data-jog');
    var gcode = button.getAttribute('data-gcode');
    var cmd = button.getAttribute('data-command');
    var commandArgs = button.getAttribute('data-command-args');

    if (step) {
      selectStep(step);
    } else if (stepDelta) {
      selectStepByDelta(Number(stepDelta));
    } else if (probeMode) {
      updateProbeMode(probeMode);
    } else if (probeType) {
      runPendantProbe(probeType, probeArg);
    } else if (customCommand) {
      runCustomCommand(customCommand);
    } else if (jogSpec) {
      jog(jogSpec);
    } else if (gcode) {
      sendGcode(gcode);
    } else if (cmd) {
      sendControllerCommand(cmd);
    } else if (commandArgs) {
      var args = JSON.parse(commandArgs);
      sendControllerCommand(args[0], args.slice(1));
    }
  });

  $('connectButton').addEventListener('click', function () {
    signin().then(connect).catch(function () {
      $('signinPanel').classList.remove('hidden');
      setStatus('Sign in needed');
    });
  });

  $('signinButton').addEventListener('click', function () {
    signin($('username').value, $('password').value).then(connect).catch(function (err) {
      log(err.message);
    });
  });

  $('refreshPortsButton').addEventListener('click', refreshPorts);
  $('openPortButton').addEventListener('click', openPort);
  $('stepSelect').addEventListener('change', function () {
    selectStep($('stepSelect').value);
  });
  if ($('refreshCommandsButton')) {
    $('refreshCommandsButton').addEventListener('click', loadCustomCommands);
  }

  $('portSelect').addEventListener('change', function () {
    state.port = $('portSelect').value;
  });

  $('baudSelect').value = state.baudrate;
  state.autolevelSettings = Object.assign({}, probing ? probing.defaultSettings : {});
  applyProbeSettingsToInputs();
  updateProbeMode(state.probeMode);
  selectStep(state.step);
  setConnected(false);
  signin().then(connect).catch(function () {
    $('signinPanel').classList.remove('hidden');
    setStatus('Sign in needed');
  });
}());
