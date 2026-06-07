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
    autolevelTab: localStorage.getItem('cncjsPendantAutolevelTab') || 'compensation',
    autolevelSettings: {},
    customCommands: [],
    gcodeLoaded: false,
    spindleSpeed: Number(localStorage.getItem('cncjsPendantSpindleSpeed') || 1000),
    spindleState: '',
    coolantState: [],
    meshPoints: [],
    meshSummary: 'No mesh data.',
    skewAngle: 0,
    skewState: {
      active: false,
      step: 0,
      probeCount: 0,
      spacing: 0,
      p1: null,
      p2: null
    },
    skewResult: null,
    modal: null
  };

  var $ = function (id) {
    return document.getElementById(id);
  };

  var logEl = $('log');
  var buttons = Array.prototype.slice.call(document.querySelectorAll('button'));
  var probing = window.CNCjsAutolevelProbing || window.CNCjsPendantProbing || null;
  var machineCommands = window.CNCjsMachineCommands || {
    buildCoolantCommand: function (code) {
      return String(code || '').toUpperCase();
    },
    buildSpindleCommand: function (code, speed) {
      var commandText = String(code || '').toUpperCase();
      var spindleSpeed = Number(speed);
      if ((commandText === 'M3' || commandText === 'M4') && Number.isFinite(spindleSpeed) && spindleSpeed > 0) {
        commandText += ' S' + spindleSpeed;
      }
      return commandText;
    }
  };
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
    renderProbeButtons();
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
      var modal = controllerState && controllerState.modal;
      var activeState = status && status.activeState;
      var wpos = status && status.wpos;

      $('machineState').textContent = activeState || 'Unknown';
      state.spindleState = (modal && modal.spindle) || state.spindleState;
      state.coolantState = normalizeGcodeLines(modal && modal.coolant);
      renderSpindleState();
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
        handleSerialLine(part.trim());
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

  function writeRaw(data) {
    if (!state.socket || !state.port) {
      log('No open port');
      return;
    }
    state.socket.emit('write', state.port, data);
  }

  function sendAutolevelCommand(commandText, status) {
    writeRaw(commandText + '\n');
    if (status) {
      $('probeStatus').textContent = status;
      log(status);
    }
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

  function sendSpindleCommand(code) {
    var commandText = machineCommands.buildSpindleCommand(code, $('spindleSpeed').value || state.spindleSpeed || 0);
    sendGcode(commandText);
  }

  function sendCoolantCommand(code) {
    sendGcode(machineCommands.buildCoolantCommand(code));
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
    sendAutolevelCommand('(autolevel_get_mesh)', 'Refreshing mesh...');
    sendAutolevelCommand('(autolevel_fetch_settings)', 'Refreshing settings...');
    sendAutolevelCommand('(autolevel_skew)', 'Refreshing skew...');
  }

  function handleSerialLine(line) {
    if (!line) {
      return;
    }
    if (processSkewProbe(line)) {
      return;
    }
    handleAutolevelLine(line);
  }

  function handleAutolevelLine(line) {
    if (line.indexOf('(AL: SETTINGS') !== 0) {
      if (line.indexOf('(AL: D ') === 0) {
        handleMeshDataLine(line);
        return;
      }
      if (line.indexOf('(AL: dumping mesh start)') === 0) {
        state.meshPoints = [];
        state.meshSummary = 'Receiving mesh data...';
        renderMeshState();
        return;
      }
      if (line.indexOf('(AL: no mesh data') === 0 || line.indexOf('(AL: no previous autolevel points') === 0) {
        state.meshPoints = [];
        state.meshSummary = 'No mesh data.';
        renderMeshState();
        return;
      }
      if (line.indexOf('(AL: finished)') === 0 || line.indexOf('(AL: dz_avg=') === 0) {
        state.meshSummary = state.meshPoints.length > 0 ? 'Mesh ready: ' + state.meshPoints.length + ' points' : 'Autolevel complete.';
        renderMeshState();
        if (state.modal && state.modal.type === 'running') {
          openModal({
            title: 'Probe Complete',
            type: 'apply-mesh',
            body: 'Surface mesh generated successfully. Do you want to apply this compensation to your currently loaded G-code?',
            confirmLabel: 'Apply Mesh',
            onConfirm: function () {
              sendAutolevelCommand('(autolevel_apply_mesh)', 'Applying mesh...');
            }
          });
        }
        return;
      }
      if (line.indexOf('(AL: PROBED ') === 0) {
        handleProbedPointLine(line);
        return;
      }
      if (line.indexOf('(AL: progress') === 0) {
        handleProgressLine(line);
        return;
      }
      if (line.indexOf('AL: Current Skew:') >= 0 || line.indexOf('AL: Skew angle set to') >= 0) {
        handleSkewLine(line);
      }
      if (line.indexOf('AL: Loaded File:') >= 0) {
        var loaded = /Loaded File:\s*(.*)\)/.exec(line);
        if (loaded) {
          state.gcodeLoaded = true;
          log('Loaded file: ' + loaded[1].trim());
        }
      }
      if (line.indexOf('(AL:') === 0) {
        $('probeStatus').textContent = line.replace(/^\(AL:\s*/, '').replace(/\)$/, '');
      }
      return;
    }
    var json = line.replace(/^\(AL: SETTINGS\s*/, '').replace(/\)$/, '');
    try {
      state.autolevelSettings = Object.assign(
        {},
        probing ? probing.defaultSettings : {},
        JSON.parse(json || '{}')
      );
      renderProbeSettings();
      applyProbeSettingsToInputs();
      renderProbeButtons();
      log('Autolevel settings loaded');
    } catch (err) {
      log('Could not parse autolevel settings: ' + err.message);
    }
  }

  function handleMeshDataLine(line) {
    var points = line
      .replace(/^\(AL: D\s*/, '')
      .replace(/\)$/, '')
      .split(/\s+/)
      .map(function (part) {
        return part.split(',').map(Number);
      })
      .filter(function (values) {
        return values.length === 3 && values.every(Number.isFinite);
      })
      .map(function (values) {
        return { x: values[0], y: values[1], z: values[2] };
      });
    if (points.length > 0) {
      state.meshPoints = state.meshPoints.concat(points);
      state.meshSummary = 'Receiving mesh data... ' + state.meshPoints.length + ' points';
      renderMeshState();
    }
  }

  function handleProbedPointLine(line) {
    var match = /\(AL: PROBED ([.\+\-\d]+) ([.\+\-\d]+) ([.\+\-\d]+)\)/.exec(line);
    if (!match) {
      return;
    }
    state.meshPoints.push({
      x: Number(match[1]),
      y: Number(match[2]),
      z: Number(match[3])
    });
    state.meshSummary = 'Probing mesh... ' + state.meshPoints.length + ' points';
    renderMeshState();
  }

  function handleProgressLine(line) {
    var match = /progress\s+(\d+)\s+(\d+)/.exec(line);
    if (!match) {
      return;
    }
    var current = Number(match[1]);
    var total = Number(match[2]);
    var message = 'Probing point ' + current + ' / ' + total;
    state.meshSummary = message;
    renderMeshState();
    updateRunningModal(message, current, total);
  }

  function handleSkewLine(line) {
    var match = /([.\+\-\d]+)\s*deg/.exec(line);
    if (!match) {
      return;
    }
    state.skewAngle = Number(match[1]);
    renderSkewState();
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
        if (element.type === 'checkbox') {
          element.checked = !!settings[key];
        } else {
          element.value = settings[key];
        }
      }
    });
  }

  function validateProbeSettings(settings) {
    var invalid = probing && probing.validateSettings ? probing.validateSettings(settings) : [];

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
    renderProbeButtons();
  }

  function renderProbeButtons() {
    var grid = $('probeGrid');
    if (!grid || !probing) {
      return;
    }
    var settings = Object.assign({}, probing.defaultSettings || {}, state.autolevelSettings);
    var buttonsToRender = probing.getVisibleProbeButtons
      ? probing.getVisibleProbeButtons(settings)
      : (probing.probeButtons || []);

    grid.innerHTML = '';
    buttonsToRender.forEach(function (button, index) {
      var label = state.probeMode === 'inner' && button.type === 'boss' ? 'Pocket' : button.label;
      var title = button.title;
      if (state.probeMode === 'inner' && button.type === 'boss') {
        title = 'Inner Pocket Center';
      } else if (state.probeMode === 'inner' && (button.type === 'corner' || button.type === 'edge')) {
        title = 'Inner ' + button.title;
      }

      var el = document.createElement('button');
      el.type = 'button';
      el.disabled = !state.connected;
      el.title = title;
      el.setAttribute('data-probe-type', button.type);
      if (button.arg) {
        el.setAttribute('data-probe-arg', button.arg);
      }
      if (button.center) {
        el.classList.add('probe-center');
      }
      if (button.shape) {
        el.classList.add('probe-shape');
      }
      if (button.full) {
        el.classList.add('full-probe-button');
      }

      if (button.shape) {
        el.appendChild(renderShapeIcon(button));
        var span = document.createElement('span');
        if (button.type === 'boss') {
          span.id = 'bossProbeLabel';
        }
        span.textContent = label;
        el.appendChild(span);
      } else {
        var icon = document.createElement('span');
        icon.className = 'probe-icon';
        icon.textContent = label;
        el.appendChild(icon);
      }

      el.setAttribute('data-probe-index', String(index));
      grid.appendChild(el);
    });
  }

  function renderShapeIcon(button) {
    var icon = document.createElement('i');
    if (button.icon === 'fa-arrow-down') {
      icon.className = 'probe-arrow';
      icon.textContent = '\u2193';
    } else if (button.icon === 'fa-circle-o') {
      icon.className = 'probe-circle';
    } else if (button.icon === 'fa-square-o') {
      icon.className = 'probe-square';
    } else if (button.icon === 'fa-exchange') {
      icon.className = 'probe-exchange';
      icon.textContent = '\u21c4';
    }
    return icon;
  }

  function renderProbeSettings() {
    var container = $('probeSettingsGroups');
    if (!container || !probing) {
      return;
    }
    container.innerHTML = '';
    (probing.settingGroups || []).forEach(function (group) {
      var groupEl = document.createElement('div');
      groupEl.className = 'settings-group';
      var header = document.createElement('div');
      header.className = 'settings-group-header';
      var title = document.createElement('h5');
      title.textContent = group.title;
      header.appendChild(title);

      if (group.title === 'Tool Change') {
        var switchLabel = document.createElement('label');
        switchLabel.className = 'switch';
        switchLabel.title = 'Show/Hide Tool Change Button';
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'showToolChange';
        checkbox.checked = !!state.autolevelSettings.showToolChange;
        checkbox.addEventListener('change', function () {
          state.autolevelSettings.showToolChange = checkbox.checked;
          renderProbeButtons();
        });
        var slider = document.createElement('span');
        slider.className = 'slider';
        switchLabel.appendChild(checkbox);
        switchLabel.appendChild(slider);
        header.appendChild(switchLabel);
      }

      groupEl.appendChild(header);

      var grid = document.createElement('div');
      grid.className = 'settings-grid';
      group.fields.forEach(function (field) {
        var key = field[0];
        var label = field[1];
        var tooltip = field[2];
        var fieldLabel = document.createElement('label');
        fieldLabel.className = 'field';
        var span = document.createElement('span');
        span.title = tooltip;
        span.textContent = label;
        var input = document.createElement('input');
        input.id = key;
        input.type = 'number';
        input.step = key === 'grid' ? '1' : '0.01';
        fieldLabel.appendChild(span);
        fieldLabel.appendChild(input);
        grid.appendChild(fieldLabel);
      });

      groupEl.appendChild(grid);
      container.appendChild(groupEl);
    });
  }

  function updateAutolevelTab(tab) {
    state.autolevelTab = tab || state.autolevelTab;
    localStorage.setItem('cncjsPendantAutolevelTab', state.autolevelTab);
    Array.prototype.slice.call(document.querySelectorAll('[data-autolevel-tab]')).forEach(function (button) {
      button.classList.toggle('active', button.getAttribute('data-autolevel-tab') === state.autolevelTab);
    });
    if ($('autolevelCompensation')) {
      $('autolevelCompensation').classList.toggle('hidden', state.autolevelTab !== 'compensation');
    }
  }

  function renderSpindleState() {
    if ($('spindleM3')) {
      $('spindleM3').classList.toggle('active', state.spindleState === 'M3');
    }
    if ($('spindleM4')) {
      $('spindleM4').classList.toggle('active', state.spindleState === 'M4');
    }
    if ($('spindleM5')) {
      $('spindleM5').classList.toggle('active', state.spindleState === 'M5');
    }
    if ($('coolantM7')) {
      $('coolantM7').classList.toggle('active', state.coolantState.indexOf('M7') >= 0);
    }
    if ($('coolantM8')) {
      $('coolantM8').classList.toggle('active', state.coolantState.indexOf('M8') >= 0);
    }
  }

  function getMeshStats() {
    if (state.meshPoints.length === 0) {
      return null;
    }
    var zValues = state.meshPoints.map(function (point) {
      return point.z;
    });
    var minZ = Math.min.apply(null, zValues);
    var maxZ = Math.max.apply(null, zValues);
    return {
      count: state.meshPoints.length,
      minZ: minZ,
      maxZ: maxZ,
      range: maxZ - minZ
    };
  }

  function renderMeshState() {
    var stats = getMeshStats();
    $('meshStatus').textContent = stats ? (stats.count + ' points') : 'No mesh data';
    $('meshStats').textContent = stats
      ? stats.count + ' points | min Z ' + stats.minZ.toFixed(3) + ' | max Z ' + stats.maxZ.toFixed(3) + ' | range ' + stats.range.toFixed(3)
      : state.meshSummary;
  }

  function renderSkewState() {
    $('skewStatus').innerHTML = 'Skew: ' + Number(state.skewAngle || 0).toFixed(3) + '&deg;';
  }

  var modalVisuals = probing && probing.prefixModalVisualImages
    ? probing.prefixModalVisualImages('images/')
    : {};

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char];
    });
  }

  function openModal(modal) {
    state.modal = modal;
    renderModal();
  }

  function closeModal() {
    state.modal = null;
    $('probeModal').classList.add('hidden');
  }

  function renderModal() {
    var modal = state.modal;
    if (!modal) {
      closeModal();
      return;
    }
    var visual = modalVisuals[modal.type] || null;
    var isRunning = modal.type === 'running';
    var progressPercent = modal.progressTotal
      ? Math.min(100, Math.max(0, (modal.progressCurrent / modal.progressTotal) * 100))
      : 0;
    var body = '';

    if (isRunning) {
      body += '<div><strong>' + escapeHtml(modal.body) + '</strong></div>';
      body += '<div class="progress-shell"><div class="progress-fill" style="width:' + progressPercent + '%"></div></div>';
    }
    if (visual) {
      body += '<img src="' + visual.image + '" alt="">';
      body += '<div>' + escapeHtml(visual.text) + '</div>';
    }
    if (modal.type === 'skew') {
      body += '<div class="running-progress">Skew Spacing: <strong>' + Number(state.autolevelSettings.probeSpacing || 0).toFixed(2) + '</strong> mm</div>';
    }
    if (modal.type === 'skew-result' && state.skewResult) {
      body += '<div class="skew-result">';
      body += '<div><strong>P1:</strong> X' + state.skewResult.p1.x.toFixed(3) + ' Y' + state.skewResult.p1.y.toFixed(3) + '</div>';
      body += '<div><strong>P2:</strong> X' + state.skewResult.p2.x.toFixed(3) + ' Y' + state.skewResult.p2.y.toFixed(3) + '</div>';
      body += '<div><strong>Angle:</strong> ' + state.skewResult.angle.toFixed(4) + '&deg;</div>';
      body += '</div>';
    }
    if (modal.type === 'tool_change') {
      body += '<div class="tool-warning"><strong>Tool Change Sequence</strong><br>';
      body += '1. Moves to Tool Probe Location.<br>2. Probes CURRENT tool length.<br>3. Pauses for manual tool change.<br>4. Probes NEW tool length.<br>5. Updates Z offset to match original tool.<br><br>';
      body += '<strong>WARNING: Ensure tool setter is in place!</strong></div>';
    }
    if (modal.warning) {
      body += '<div class="modal-warning"><strong>WARNING:</strong> ' + escapeHtml(modal.warning) + '</div>';
    }
    if (modal.body && !isRunning) {
      body += modal.preformatted ? '<pre>' + escapeHtml(modal.body) + '</pre>' : '<div class="running-progress">' + escapeHtml(modal.body) + '</div>';
    }

    $('modalTitle').textContent = modal.title || 'Probe';
    $('modalBody').innerHTML = body;
    $('modalConfirm').textContent = isRunning ? 'Stop' : (modal.confirmLabel || 'Run');
    $('modalConfirm').classList.toggle('danger', isRunning || (modal.type || '').indexOf('clear') === 0);
    $('modalCancel').classList.toggle('hidden', isRunning);
    $('probeModal').classList.remove('hidden');
  }

  function confirmModal() {
    var modal = state.modal;
    if (!modal) {
      return;
    }
    if (modal.onConfirm) {
      modal.onConfirm();
    }
    if (modal.closeOnConfirm !== false) {
      closeModal();
    }
  }

  function updateRunningModal(body, progressCurrent, progressTotal) {
    if (!state.modal || state.modal.type !== 'running') {
      return;
    }
    state.modal.body = body || state.modal.body;
    state.modal.progressCurrent = progressCurrent || state.modal.progressCurrent;
    state.modal.progressTotal = progressTotal || state.modal.progressTotal;
    renderModal();
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
    openModal({
      title: generated.title,
      body: generated.gcode,
      type: generated.modalType || type,
      warning: generated.warning,
      confirmLabel: 'Run Probe',
      preformatted: true,
      onConfirm: function () {
        $('probeStatus').textContent = 'SENT: ' + generated.title + '\n' + generated.gcode;
        sendGcode(generated.gcode);
      }
    });
  }

  function saveAutolevelSettings() {
    var settings = getProbeSettingsFromInputs();
    if (!validateProbeSettings(settings)) {
      $('probeStatus').textContent = 'Fix highlighted probing settings first.';
      return;
    }
    sendAutolevelCommand(
      '(autolevel_save_settings settings ' + JSON.stringify(settings) + ')',
      'Saving settings...'
    );
  }

  function clearMesh() {
    openModal({
      title: 'Clear Mesh Data?',
      body: 'This clears the stored surface mesh from the local autolevel service.',
      type: 'clear-mesh',
      confirmLabel: 'Clear Mesh',
      onConfirm: function () {
        sendAutolevelCommand('(autolevel_clear_mesh)', 'Clearing mesh...');
      }
    });
  }

  function applyMesh() {
    openModal({
      title: 'Apply Surface Map?',
      body: 'Apply the current mesh to the loaded G-code file.',
      type: 'apply-mesh',
      confirmLabel: 'Apply Mesh',
      onConfirm: function () {
        sendAutolevelCommand('(autolevel_apply_mesh)', 'Applying mesh...');
      }
    });
  }

  function clearSkew() {
    openModal({
      title: 'Clear Skew?',
      body: 'Reset the stored skew angle to zero.',
      type: 'clear-skew',
      confirmLabel: 'Clear Skew',
      onConfirm: function () {
        sendAutolevelCommand('(autolevel_skew A0)', 'Clearing skew...');
      }
    });
  }

  function applySkew() {
    openModal({
      title: 'Apply Skew?',
      body: 'Apply the stored skew angle to the loaded G-code file.',
      type: 'apply-skew',
      confirmLabel: 'Apply Skew',
      onConfirm: function () {
        sendAutolevelCommand('(autolevel_apply_skew)', 'Applying skew...');
      }
    });
  }

  function probeMesh() {
    var settings = getProbeSettingsFromInputs();
    if (!validateProbeSettings(settings)) {
      $('probeStatus').textContent = 'Fix highlighted probing settings first.';
      return;
    }
    var commandText = '(autolevel F' + settings.feedSlow + ' H' + settings.height + ' M' + settings.margin + ' P1';
    if (settings.grid) {
      commandText += ' GRID' + settings.grid;
    }
    commandText += ')';
    openModal({
      title: 'Start Surface Mapping?',
      body: 'This will start a surface map probing cycle using the current settings.',
      type: 'autolevel',
      confirmLabel: 'Probe Mesh',
      closeOnConfirm: false,
      onConfirm: function () {
        state.meshPoints = [];
        state.meshSummary = 'Starting mesh probe...';
        renderMeshState();
        sendAutolevelCommand(commandText, 'Starting mesh probe...');
        openModal({
          title: 'Surface Mapping',
          type: 'running',
          body: 'Starting surface map probe...',
          progressCurrent: 0,
          progressTotal: 0,
          confirmLabel: 'Stop',
          closeOnConfirm: false,
          onConfirm: stopAutolevel
        });
      }
    });
  }

  function buildSkewProbeGcode(includeMove) {
    var settings = getProbeSettingsFromInputs();
    return probing.buildSkewProbeGcode(settings, includeMove);
  }

  function measureSkew() {
    var settings = getProbeSettingsFromInputs();
    if (!validateProbeSettings(settings)) {
      $('probeStatus').textContent = 'Fix highlighted probing settings first.';
      return;
    }
    openModal({
      title: 'Measure Skew',
      body: 'The machine will probe the current edge point, move along X by Skew Spacing, probe the second edge point, then calculate and store the skew angle.',
      type: 'skew',
      confirmLabel: 'Measure Skew',
      closeOnConfirm: false,
      onConfirm: function () {
        startSkewProbe(Number(settings.probeSpacing) || 50);
      }
    });
  }

  function startSkewProbe(spacing) {
    state.skewState = {
      active: true,
      step: 1,
      probeCount: 0,
      spacing: spacing,
      p1: null,
      p2: null
    };
    state.skewResult = null;
    openModal({
      title: 'Measuring Skew',
      type: 'running',
      body: 'Skew: Probing Point 1...',
      progressCurrent: 1,
      progressTotal: 2,
      confirmLabel: 'Stop',
      closeOnConfirm: false,
      onConfirm: stopAutolevel
    });
    sendGcode(buildSkewProbeGcode(false));
    $('probeStatus').textContent = 'Skew: Probing Point 1...';
  }

  function processSkewProbe(line) {
    if (!state.skewState.active) {
      return false;
    }
    var match = /\[PRB:\s*([.\+\-\d]+)\s*,\s*([.\+\-\d]+)\s*,\s*([.\+\-\d]+)/.exec(line);
    if (!match) {
      return false;
    }
    var point = {
      x: Number(match[1]),
      y: Number(match[2]),
      z: Number(match[3])
    };
    var probeCount = (state.skewState.probeCount || 0) + 1;

    if (state.skewState.step === 1 && probeCount < 2) {
      state.skewState.probeCount = probeCount;
      return true;
    }
    if (state.skewState.step === 1) {
      state.skewState.step = 2;
      state.skewState.probeCount = 0;
      state.skewState.p1 = point;
      updateRunningModal('Skew: Moving to Point 2...', 2, 2);
      sendGcode(buildSkewProbeGcode(true));
      $('probeStatus').textContent = 'Skew: Moving to Point 2...';
      return true;
    }
    if (state.skewState.step === 2 && probeCount < 2) {
      state.skewState.probeCount = probeCount;
      return true;
    }
    if (state.skewState.step === 2) {
      finishSkewProbe(point);
      return true;
    }
    return false;
  }

  function finishSkewProbe(p2) {
    var p1 = state.skewState.p1;
    if (!p1) {
      return;
    }
    var dx = p2.x - p1.x;
    var dy = p2.y - p1.y;
    var angle = Math.atan2(dy, dx) * 180 / Math.PI;
    state.skewState.active = false;
    state.skewState.step = 0;
    state.skewState.probeCount = 0;
    state.skewState.p2 = p2;
    state.skewAngle = angle;
    state.skewResult = { p1: p1, p2: p2, angle: angle };
    renderSkewState();
    sendAutolevelCommand('(autolevel_skew A' + angle.toFixed(5) + ')', 'Skew angle stored.');
    openModal({
      title: 'Skew Measurement Result',
      type: 'skew-result',
      body: 'Apply this skew angle to your loaded G-code?',
      confirmLabel: 'Apply Skew',
      onConfirm: function () {
        sendAutolevelCommand('(autolevel_apply_skew)', 'Applying skew...');
      }
    });
  }

  function stopAutolevel() {
    writeRaw('!');
    sendAutolevelCommand('(autolevel_stop)', 'Stopping... finishing current motion if needed.');
    setTimeout(function () {
      writeRaw('~');
    }, 250);
    state.skewState.active = false;
    state.skewState.step = 0;
    state.skewState.probeCount = 0;
    closeModal();
  }

  function runAutolevelAction(action) {
    ({
      'save-settings': saveAutolevelSettings,
      'refresh': refreshAutolevelSettings,
      'measure-skew': measureSkew,
      'clear-skew': clearSkew,
      'apply-skew': applySkew,
      'probe-mesh': probeMesh,
      'clear-mesh': clearMesh,
      'apply-mesh': applyMesh
    }[action] || function () {})();
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
    var autolevelTab = button.getAttribute('data-autolevel-tab');
    var autolevelAction = button.getAttribute('data-autolevel-action');
    var customCommand = button.getAttribute('data-custom-command');
    var spindleCommand = button.getAttribute('data-spindle');
    var coolantCommand = button.getAttribute('data-coolant');
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
    } else if (autolevelTab) {
      updateAutolevelTab(autolevelTab);
    } else if (autolevelAction) {
      runAutolevelAction(autolevelAction);
    } else if (probeType) {
      runPendantProbe(probeType, probeArg);
    } else if (customCommand) {
      runCustomCommand(customCommand);
    } else if (spindleCommand) {
      sendSpindleCommand(spindleCommand);
    } else if (coolantCommand) {
      sendCoolantCommand(coolantCommand);
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
  $('modalCancel').addEventListener('click', closeModal);
  $('modalConfirm').addEventListener('click', confirmModal);

  $('spindleSpeed').addEventListener('change', function () {
    state.spindleSpeed = Number($('spindleSpeed').value) || 0;
    localStorage.setItem('cncjsPendantSpindleSpeed', String(state.spindleSpeed));
  });

  $('portSelect').addEventListener('change', function () {
    state.port = $('portSelect').value;
  });

  $('baudSelect').value = state.baudrate;
  state.autolevelSettings = Object.assign({}, probing ? probing.defaultSettings : {});
  renderProbeSettings();
  renderProbeButtons();
  applyProbeSettingsToInputs();
  updateProbeMode(state.probeMode);
  updateAutolevelTab(state.autolevelTab);
  renderMeshState();
  renderSkewState();
  $('spindleSpeed').value = String(state.spindleSpeed);
  renderSpindleState();
  selectStep(state.step);
  setConnected(false);
  signin().then(connect).catch(function () {
    $('signinPanel').classList.remove('hidden');
    setStatus('Sign in needed');
  });
}());
