import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Space from 'app/components/Space';
import Widget from 'app/components/Widget';
import controller from 'app/lib/controller';
import WidgetConfig from '../WidgetConfig';
import MeshVisualizer from './MeshVisualizer';
import ProbingShared from '../../../shared/autolevel/probingShared';
import styles from './index.styl';
import imgBoss from './img/instruction-boss.png';
import imgCorner from './img/instruction-corner.png';
import imgHole from './img/instruction-hole.png';
import imgInnerCorner from './img/probing-inner-corner.png';
import imgSide from './img/instruction-side.png';
import imgTouchplate from './img/instruction-touchplate.png';
import imgToolChange from './img/change-tool.png';

const {
  defaultSettings,
  settingGroups,
  probeButtons,
  toolChangeButton
} = ProbingShared;

const modalVisuals = {
  corner: {
    image: imgCorner,
    text: ProbingShared.modalVisuals.corner.text
  },
  boss: {
    image: imgBoss,
    text: ProbingShared.modalVisuals.boss.text
  },
  pocket: {
    image: imgHole,
    text: ProbingShared.modalVisuals.pocket.text
  },
  edge: {
    image: imgSide,
    text: ProbingShared.modalVisuals.edge.text
  },
  skew: {
    image: imgSide,
    text: ProbingShared.modalVisuals.skew.text
  },
  inner_corner: {
    image: imgInnerCorner,
    text: ProbingShared.modalVisuals.inner_corner.text
  },
  inner_boss: {
    image: imgBoss,
    text: ProbingShared.modalVisuals.inner_boss.text
  },
  inner_edge: {
    image: imgSide,
    text: ProbingShared.modalVisuals.inner_edge.text
  },
  z_touchplate: {
    image: imgTouchplate,
    text: ProbingShared.modalVisuals.z_touchplate.text
  },
  surface: {
    image: imgCorner,
    text: ProbingShared.modalVisuals.surface.text
  },
  tool_change: {
    image: imgToolChange,
    text: ProbingShared.modalVisuals.tool_change.text
  },
  autolevel: {
    image: imgCorner,
    text: ProbingShared.modalVisuals.autolevel.text
  }
};

class AutolevelWidget extends PureComponent {
  static propTypes = {
    widgetId: PropTypes.string.isRequired,
    onFork: PropTypes.func.isRequired,
    onRemove: PropTypes.func.isRequired,
    sortable: PropTypes.object
  };

  config = new WidgetConfig(this.props.widgetId);

  state = this.getInitialState();

  collapse = () => {
    this.setState({ minimized: true });
  };

  expand = () => {
    this.setState({ minimized: false });
  };

  controllerEvents = {
    'serialport:open': (options = {}) => {
      this.setState({
        connected: true,
        port: options.port || controller.port,
        status: `Connected to ${options.port || controller.port}`
      }, this.refreshExtensionState);
    },
    'serialport:close': () => {
      this.setState({
        connected: false,
        port: '',
        status: 'Open a controller port to enable autolevel probing.'
      });
    },
    'serialport:read': (data) => {
      this.handleSerialData(data);
    },
    'serialport:write': (data) => {
      this.handleSerialData(data);
    },
    'gcode:load': (name) => {
      this.setState({
        loadedFile: name || 'Loaded file',
        gcodeLoaded: true
      });
      this.sendAutolevelCommand('(autolevel_fetch_settings)', 'Refreshing loaded file state...');
    },
    'gcode:unload': () => {
      this.setState({
        loadedFile: '',
        gcodeLoaded: false
      });
    }
  };

  actions = {
    toggleFullscreen: () => {
      const { minimized, isFullscreen } = this.state;
      this.setState({
        minimized: isFullscreen ? minimized : false,
        isFullscreen: !isFullscreen
      });
    },
    toggleMinimized: () => {
      this.setState({ minimized: !this.state.minimized });
    },
    changeTab: (activeTab) => {
      this.setState({ activeTab });
      this.config.set('activeTab', activeTab);
    },
    toggleSettings: () => {
      const showSettings = !this.state.showSettings;
      this.setState({ showSettings });
      this.config.set('showSettings', showSettings);
    },
    changeSetting: (key, value) => {
      const numberValue = Number(value);
      this.setState(state => ({
        settings: {
          ...state.settings,
          [key]: Number.isFinite(numberValue) ? numberValue : value
        },
        invalidFields: state.invalidFields.filter(field => field !== key),
        saved: false
      }));
    },
    toggleToolChange: () => {
      this.setState(state => ({
        settings: {
          ...state.settings,
          showToolChange: !state.settings.showToolChange
        },
        saved: false
      }));
    },
    setProbeMode: (probeMode) => {
      this.setState({ probeMode });
      this.config.set('probeMode', probeMode);
    },
    saveSettings: () => {
      if (!this.validateInputs()) {
        this.setState({ status: 'Fix the highlighted probing settings first.' });
        return;
      }
      const { settings } = this.state;
      this.config.set('settings', settings);
      this.sendAutolevelCommand(
        `(autolevel_save_settings settings ${JSON.stringify(settings)})`,
        'Saving settings...'
      );
      this.setState({ saved: true });
    },
    refresh: () => {
      this.refreshExtensionState();
    },
    stop: () => {
      controller.write('!');
      this.sendAutolevelCommand('(autolevel_stop)', 'Stopping... finishing current motion if needed.');
      setTimeout(() => {
        controller.write('~');
      }, 250);
      this.setState(state => ({
        skewState: {
          ...state.skewState,
          active: false,
          step: 0,
          probeCount: 0
        },
        modal: state.modal && state.modal.type === 'running' ? null : state.modal
      }));
    },
    clearMesh: () => {
      this.openConfirm({
        title: 'Clear Mesh Data?',
        body: 'This clears the stored surface mesh from the local autolevel service.',
        type: 'clear-mesh',
        confirmLabel: 'Clear Mesh',
        onConfirm: () => this.sendAutolevelCommand('(autolevel_clear_mesh)', 'Clearing mesh...')
      });
    },
    applyMesh: () => {
      this.openConfirm({
        title: 'Apply Surface Map?',
        body: 'Apply the current mesh to the loaded G-code file.',
        type: 'apply-mesh',
        confirmLabel: 'Apply Mesh',
        onConfirm: () => this.sendAutolevelCommand('(autolevel_apply_mesh)', 'Applying mesh...')
      });
    },
    clearSkew: () => {
      this.openConfirm({
        title: 'Clear Skew?',
        body: 'Reset the stored skew angle to zero.',
        type: 'clear-skew',
        confirmLabel: 'Clear Skew',
        onConfirm: () => this.sendAutolevelCommand('(autolevel_skew A0)', 'Clearing skew...')
      });
    },
    applySkew: () => {
      this.openConfirm({
        title: 'Apply Skew?',
        body: 'Apply the stored skew angle to the loaded G-code file.',
        type: 'apply-skew',
        confirmLabel: 'Apply Skew',
        onConfirm: () => this.sendAutolevelCommand('(autolevel_apply_skew)', 'Applying skew...')
      });
    },
    measureSkew: () => {
      if (!this.validateInputs()) {
        this.setState({ status: 'Fix the highlighted probing settings first.' });
        return;
      }
      this.openConfirm({
        title: 'Measure Skew',
        body: 'The machine will probe the current edge point, move along X by Skew Spacing, probe the second edge point, then calculate and store the skew angle.',
        type: 'skew',
        confirmLabel: 'Measure Skew',
        closeOnConfirm: false,
        onConfirm: () => this.startSkewProbe(Number(this.state.settings.probeSpacing) || 50)
      });
    },
    probeMesh: () => {
      if (!this.validateInputs()) {
        this.setState({ status: 'Fix the highlighted probing settings first.' });
        return;
      }
      const { height, margin, grid, feedSlow } = this.state.settings;
      let command = `(autolevel F${feedSlow} H${height} M${margin} P1`;
      if (grid) {
        command += ` GRID${grid}`;
      }
      command += ')';

      this.openConfirm({
        title: 'Start Surface Mapping?',
        body: 'This will start a surface map probing cycle using the current settings.',
        type: 'autolevel',
        confirmLabel: 'Probe Mesh',
        closeOnConfirm: false,
        onConfirm: () => {
          this.setState({ meshPoints: [], meshActive: true, meshSummary: 'Starting mesh probe...' });
          this.sendAutolevelCommand(command, 'Starting mesh probe...');
          this.openRunningModal('Surface Mapping', 'Starting surface map probe...');
        }
      });
    },
    runProbe: (type, arg) => {
      if (!this.validateInputs()) {
        this.setState({ status: 'Fix the highlighted probing settings first.' });
        return;
      }
      const generated = this.generateProbe(type, arg);
      if (!generated) {
        return;
      }

      this.openConfirm({
        title: generated.title,
        body: generated.gcode,
        type: generated.modalType || type,
        warning: generated.warning,
        confirmLabel: generated.confirmLabel || 'Run Probe',
        preformatted: true,
        onConfirm: () => this.sendGcode(generated.gcode, `${generated.title} sent.`)
      });
    },
    setBossAxis: (bossAxis) => {
      this.setState({ bossAxis });
      this.config.set('bossAxis', bossAxis);
    },
    closeModal: () => {
      this.setState({ modal: null });
    },
    confirmModal: () => {
      const { modal } = this.state;
      if (modal && modal.onConfirm) {
        modal.onConfirm();
      }
      if (!modal || modal.closeOnConfirm !== false) {
        this.setState({ modal: null });
      }
    }
  };

  componentDidMount() {
    this.addControllerEvents();
    if (controller.port) {
      this.refreshExtensionState();
    }
  }

  componentWillUnmount() {
    this.removeControllerEvents();
  }

  getInitialState() {
    return {
      minimized: this.config.get('minimized', false),
      isFullscreen: false,
      activeTab: this.config.get('activeTab', 'compensation'),
      showSettings: this.config.get('showSettings', false),
      settings: {
        ...defaultSettings,
        ...this.config.get('settings', {})
      },
      probeMode: this.config.get('probeMode', 'outer'),
      bossAxis: this.config.get('bossAxis', 'x'),
      connected: !!controller.port,
      port: controller.port,
      gcodeLoaded: controller.gcode.loaded,
      loadedFile: '',
      status: controller.port ? `Connected to ${controller.port}` : 'Open a controller port to enable autolevel probing.',
      meshPoints: [],
      meshActive: false,
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
      invalidFields: [],
      saved: false,
      modal: null
    };
  }

  addControllerEvents() {
    Object.keys(this.controllerEvents).forEach(eventName => {
      controller.addListener(eventName, this.controllerEvents[eventName]);
    });
  }

  removeControllerEvents() {
    Object.keys(this.controllerEvents).forEach(eventName => {
      controller.removeListener(eventName, this.controllerEvents[eventName]);
    });
  }

  openConfirm(modal) {
    this.setState({ modal });
  }

  openRunningModal(title, detail) {
    this.setState({
      modal: {
        title,
        type: 'running',
        body: detail,
        progressCurrent: 0,
        progressTotal: 0,
        confirmLabel: 'Stop'
      }
    });
  }

  validateInputs() {
    const invalidFields = ProbingShared.validateSettings(this.state.settings);
    this.setState({ invalidFields });
    return invalidFields.length === 0;
  }

  updateRunningModal(body, progressCurrent, progressTotal) {
    this.setState(state => {
      if (!state.modal || state.modal.type !== 'running') {
        return null;
      }
      return {
        modal: {
          ...state.modal,
          body: body || state.modal.body,
          progressCurrent: progressCurrent || state.modal.progressCurrent,
          progressTotal: progressTotal || state.modal.progressTotal
        }
      };
    });
  }

  buildSkewProbeGcode(includeMove) {
    return ProbingShared.buildSkewProbeGcode(this.state.settings, includeMove);
  }

  startSkewProbe(spacing) {
    this.setState({
      skewState: {
        active: true,
        step: 1,
        probeCount: 0,
        spacing,
        p1: null,
        p2: null
      },
      skewResult: null,
      status: 'Skew: Probing Point 1...'
    }, () => {
      this.openRunningModal('Measuring Skew', 'Skew: Probing Point 1...');
      this.updateRunningModal('Skew: Probing Point 1...', 1, 2);
      this.sendGcode(this.buildSkewProbeGcode(false), 'Skew: Probing Point 1...');
    });
  }

  processSkewProbe(line) {
    const { skewState } = this.state;
    if (!skewState.active) {
      return false;
    }

    const match = /\[PRB:\s*([.\+\-\d]+)\s*,\s*([.\+\-\d]+)\s*,\s*([.\+\-\d]+)/.exec(line);
    if (!match) {
      return false;
    }

    const point = {
      x: Number(match[1]),
      y: Number(match[2]),
      z: Number(match[3])
    };
    const probeCount = (skewState.probeCount || 0) + 1;

    if (skewState.step === 1 && probeCount < 2) {
      this.setState({ skewState: { ...skewState, probeCount } });
      return true;
    }

    if (skewState.step === 1) {
      this.setState({
        skewState: {
          ...skewState,
          step: 2,
          probeCount: 0,
          p1: point
        },
        status: 'Skew: Moving to Point 2...'
      }, () => {
        this.updateRunningModal('Skew: Moving to Point 2...', 2, 2);
        this.sendGcode(this.buildSkewProbeGcode(true), 'Skew: Moving to Point 2...');
      });
      return true;
    }

    if (skewState.step === 2 && probeCount < 2) {
      this.setState({ skewState: { ...skewState, probeCount } });
      return true;
    }

    if (skewState.step === 2) {
      this.finishSkewProbe(point);
      return true;
    }

    return false;
  }

  finishSkewProbe(p2) {
    const { skewState } = this.state;
    const p1 = skewState.p1;
    if (!p1) {
      return;
    }

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const skewResult = { p1, p2, angle };

    this.setState({
      skewState: {
        ...skewState,
        active: false,
        step: 0,
        probeCount: 0,
        p2
      },
      skewAngle: angle,
      skewResult,
      status: `Skew measured: ${angle.toFixed(4)} deg`
    }, () => {
      this.sendAutolevelCommand(`(autolevel_skew A${angle.toFixed(5)})`, 'Skew angle stored.');
      this.openConfirm({
        title: 'Skew Measurement Result',
        type: 'skew-result',
        body: 'Apply this skew angle to your loaded G-code?',
        confirmLabel: 'Apply Skew',
        onConfirm: () => this.sendAutolevelCommand('(autolevel_apply_skew)', 'Applying skew...')
      });
    });
  }

  getProbeParams() {
    return ProbingShared.getProbeParams(this.state.settings);
  }

  generateProbe(type, arg) {
    return ProbingShared.generateProbe(type, arg, this.state.settings, this.state.probeMode, this.state.bossAxis);
  }

  sendAutolevelCommand(command, status) {
    if (!controller.port) {
      this.setState({ status: 'Open a controller port first.' });
      return;
    }

    controller.write(`${command}\n`);
    if (status) {
      this.setState({ status });
    }
  }

  sendGcode(gcode, status) {
    if (!controller.port) {
      this.setState({ status: 'Open a controller port first.' });
      return;
    }

    controller.command('gcode', gcode);
    if (status) {
      this.setState({ status });
    }
  }

  refreshExtensionState = () => {
    if (!controller.port) {
      return;
    }
    this.sendAutolevelCommand('(autolevel_get_mesh)', 'Refreshing mesh...');
    this.sendAutolevelCommand('(autolevel_fetch_settings)', 'Refreshing settings...');
    this.sendAutolevelCommand('(autolevel_skew)', 'Refreshing skew...');
  };

  handleSerialData(data) {
    let text = data;
    if (data && typeof data === 'object' && data.data) {
      text = data.data;
    }
    if (typeof text !== 'string') {
      return;
    }

    text.split('\n').forEach(line => {
      const clean = line.trim();
      if (!clean) {
        return;
      }

      if (this.processSkewProbe(clean)) {
        return;
      }
      this.handleAutolevelLine(clean);
    });
  }

  handleAutolevelLine(line) {
    if (line.indexOf('(AL: SETTINGS') === 0) {
      const json = line.replace(/^\(AL: SETTINGS\s*/, '').replace(/\)$/, '');
      try {
        const settings = {
          ...defaultSettings,
          ...this.state.settings,
          ...JSON.parse(json || '{}')
        };
        this.config.set('settings', settings);
        this.setState({ settings, status: 'Settings loaded.' });
      } catch (err) {
        this.setState({ status: `Could not parse settings: ${err.message}` });
      }
      return;
    }

    if (line.indexOf('(AL: D ') === 0) {
      const points = line
        .replace(/^\(AL: D\s*/, '')
        .replace(/\)$/, '')
        .split(/\s+/)
        .map(part => part.split(',').map(Number))
        .filter(values => values.length === 3 && values.every(Number.isFinite))
        .map(([x, y, z]) => ({ x, y, z }));

      if (points.length > 0) {
        this.setState(state => ({
          meshPoints: state.meshPoints.concat(points),
          meshSummary: `Receiving mesh data... ${state.meshPoints.length + points.length} points`
        }));
      }
      return;
    }

    if (line.indexOf('(AL: dumping mesh start)') === 0) {
      this.setState({ meshPoints: [], meshSummary: 'Receiving mesh data...' });
      return;
    }

    if (line.indexOf('(AL: no mesh data') === 0 || line.indexOf('(AL: no previous autolevel points') === 0) {
      this.setState({ meshPoints: [], meshSummary: 'No mesh data.' });
      return;
    }

    if (line.indexOf('(AL: finished)') === 0 || line.indexOf('(AL: dz_avg=') === 0) {
      this.setState(state => ({
        meshActive: false,
        meshSummary: state.meshPoints.length > 0
          ? `Mesh ready: ${state.meshPoints.length} points`
          : 'Autolevel complete.',
        modal: state.modal && state.modal.type === 'running' ? {
          title: 'Probe Complete',
          type: 'apply-mesh',
          body: 'Surface mesh generated successfully. Do you want to apply this compensation to your currently loaded G-code?',
          confirmLabel: 'Apply Mesh',
          onConfirm: () => this.sendAutolevelCommand('(autolevel_apply_mesh)', 'Applying mesh...')
        } : state.modal
      }));
      return;
    }

    if (line.indexOf('(AL: PROBED ') === 0) {
      const match = /\(AL: PROBED ([.\+\-\d]+) ([.\+\-\d]+) ([.\+\-\d]+)\)/.exec(line);
      if (match) {
        const point = {
          x: Number(match[1]),
          y: Number(match[2]),
          z: Number(match[3])
        };
        this.setState(state => ({
          meshPoints: state.meshPoints.concat(point),
          meshSummary: `Probing mesh... ${state.meshPoints.length + 1} points`
        }));
      }
      return;
    }

    if (line.indexOf('(AL: progress') === 0) {
      const match = /progress\s+(\d+)\s+(\d+)/.exec(line);
      if (match) {
        const current = Number(match[1]);
        const total = Number(match[2]);
        const message = `Probing point ${current} / ${total}`;
        this.setState({ meshSummary: message });
        this.updateRunningModal(message, current, total);
      }
      return;
    }

    if (line.indexOf('AL: Current Skew:') >= 0 || line.indexOf('AL: Skew angle set to') >= 0) {
      const match = /([.\+\-\d]+)\s*deg/.exec(line);
      if (match) {
        this.setState({ skewAngle: Number(match[1]) });
      }
    }

    if (line.indexOf('AL: Loaded File:') >= 0) {
      const match = /Loaded File:\s*(.*)\)/.exec(line);
      if (match) {
        this.setState({ loadedFile: match[1].trim(), gcodeLoaded: true });
      }
    }

    if (line.indexOf('(AL:') === 0) {
      this.setState({ status: line.replace(/^\(AL:\s*/, '').replace(/\)$/, '') });
    }
  }

  getMeshStats() {
    const { meshPoints } = this.state;
    if (meshPoints.length === 0) {
      return null;
    }
    const zValues = meshPoints.map(point => point.z);
    const minZ = Math.min(...zValues);
    const maxZ = Math.max(...zValues);
    return {
      count: meshPoints.length,
      minZ,
      maxZ,
      range: maxZ - minZ
    };
  }

  renderNumberInput(key, label, tooltip) {
    const value = this.state.settings[key];
    const isInvalid = this.state.invalidFields.indexOf(key) >= 0;
    return (
      <label className={styles.field} key={key}>
        <span title={tooltip}>
          {label} <i className={`fa fa-question-circle ${styles.tooltipIcon}`} />
        </span>
        <input
          id={key}
          type="number"
          className={isInvalid ? styles.isInvalid : ''}
          value={value}
          step="0.01"
          onChange={(event) => this.actions.changeSetting(key, event.target.value)}
        />
      </label>
    );
  }

  renderSettings() {
    const { showToolChange } = this.state.settings;
    return (
      <div className={styles.settings}>
        {settingGroups.map(group => (
          <div key={group.title} className={styles.settingsGroup}>
            {group.title === 'Tool Change' ? (
              <div className={styles.toolChangeHeader}>
                <h5>{group.title}</h5>
                <label className={styles.switch} title="Show/Hide Tool Change Button">
                  <input type="checkbox" checked={!!showToolChange} onChange={this.actions.toggleToolChange} />
                  <span className={styles.slider} />
                </label>
              </div>
            ) : (
              <h5>{group.title}</h5>
            )}
            <div className={styles.settingsGrid}>
              {group.fields.map(([key, label, tooltip]) => this.renderNumberInput(key, label, tooltip))}
            </div>
          </div>
        ))}
        <div className={styles.settingsActions}>
          <button type="button" className={styles.primaryButton} onClick={this.actions.saveSettings}>
            <i className="fa fa-save" /> Save Settings
          </button>
          {this.state.saved && <span className={styles.saved}>Saved</span>}
        </div>
      </div>
    );
  }

  renderCompensation() {
    const { connected, gcodeLoaded, meshSummary, skewAngle } = this.state;
    const stats = this.getMeshStats();
    const hasSkew = Math.abs(Number(skewAngle || 0)) > 0.0001;
    return (
      <div className={styles.widgetContainer}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>Skew Compensation</h3>
            {hasSkew && (
              <div className={styles.skewStatus}>
                Skew: <span>{Number(skewAngle || 0).toFixed(3)}</span>&deg;
              </div>
            )}
          </div>
          <div className={styles.buttonRow}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary} ${styles.btnExpand}`}
              disabled={!connected}
              onClick={this.actions.measureSkew}
            >
              <i className="fa fa-random" /> Measure Skew
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnDanger}`}
              disabled={!connected}
              onClick={this.actions.clearSkew}
              title="Clear Skew"
              aria-label="Clear Skew"
            >
              <i className="fa fa-ban" />
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary} ${styles.btnExpand}`}
              disabled={!connected || !gcodeLoaded}
              onClick={this.actions.applySkew}
              title="Apply Skew Only"
            >
              <i className="fa fa-check" /> Apply Skew
            </button>
          </div>
        </div>

        <div className={`${styles.panel} ${styles.visualizerPanel}`}>
          <div className={styles.panelHeader}>
            <h3>Surface Map / Visualizer</h3>
          </div>
          <div className={styles.buttonRow}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary} ${styles.btnExpand}`}
              disabled={!connected || !gcodeLoaded}
              onClick={this.actions.probeMesh}
            >
              <i className="fa fa-map-o" /> Probe New Mesh
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnDanger}`}
              disabled={!connected || !stats}
              onClick={this.actions.clearMesh}
              title="Clear Mesh Data"
              aria-label="Clear Mesh Data"
            >
              <i className="fa fa-ban" />
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary} ${styles.btnExpand}`}
              disabled={!connected || !gcodeLoaded || !stats}
              onClick={this.actions.applyMesh}
              title="Apply Surface Map to G-code"
            >
              <i className="fa fa-check" /> Apply Mesh
            </button>
          </div>
          <div className={styles.visualizerContainer}>
            {stats ? (
              <MeshVisualizer points={this.state.meshPoints} />
            ) : (
              <span className={styles.visualizerEmpty}>No mesh data</span>
            )}
          </div>
          {stats && (
            <div className={styles.meshStats}>
              <div><strong>{stats.count}</strong><span>points</span></div>
              <div><strong>{stats.minZ.toFixed(3)}</strong><span>min Z</span></div>
              <div><strong>{stats.maxZ.toFixed(3)}</strong><span>max Z</span></div>
              <div><strong>{stats.range.toFixed(3)}</strong><span>range</span></div>
            </div>
          )}
          <div className={styles.statusText}>
            {stats ? meshSummary : 'No mesh data.'}
          </div>
        </div>
      </div>
    );
  }

  renderProbing() {
    const { connected, probeMode, bossAxis } = this.state;
    const isInner = probeMode === 'inner';
    const visibleButtons = this.state.settings.showToolChange
      ? probeButtons.concat([toolChangeButton])
      : probeButtons;

    return (
      <div>
        <div className={styles.probeModeBar}>
          <span>Probe mode</span>
          <button
            type="button"
            className={probeMode === 'outer' ? styles.selectedMode : ''}
            onClick={() => this.actions.setProbeMode('outer')}
          >
            Outer
          </button>
          <button
            type="button"
            className={isInner ? styles.selectedMode : ''}
            onClick={() => this.actions.setProbeMode('inner')}
          >
            Inner
          </button>
        </div>
        {!isInner && (
          <div className={styles.probeAxisBar}>
            <span>Boss axis</span>
            <button
              type="button"
              className={bossAxis === 'x' ? styles.selectedMode : ''}
              onClick={() => this.actions.setBossAxis('x')}
            >
              X
            </button>
            <button
              type="button"
              className={bossAxis === 'y' ? styles.selectedMode : ''}
              onClick={() => this.actions.setBossAxis('y')}
            >
              Y
            </button>
          </div>
        )}
        <div className={styles.probeGrid}>
          {visibleButtons.map((button, index) => {
            const label = isInner && button.type === 'boss' ? 'Pocket' : button.label;
            let title = button.title;
            if (isInner && button.type === 'boss') {
              title = 'Inner Pocket Center';
            } else if (isInner && (button.type === 'corner' || button.type === 'edge')) {
              title = `Inner ${button.title}`;
            }

            return (
              <button
                type="button"
                key={`${button.type}-${button.arg || index}`}
                className={[
                  button.center ? styles.btnCenter : '',
                  button.shape ? styles.btnShape : '',
                  button.full ? styles.fullProbeButton : ''
                ].filter(Boolean).join(' ')}
                disabled={!connected}
                title={title}
                onClick={() => this.actions.runProbe(button.type, button.arg)}
              >
                {button.icon && <i className={`fa ${button.icon}`} />}
                {button.shape ? label : <span className={styles.icon}>{label}</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  renderModal() {
    const { modal } = this.state;
    if (!modal) {
      return null;
    }
    const visual = modalVisuals[modal.type] || null;
    const isDanger = modal.type && modal.type.indexOf('clear') === 0;
    const isRunning = modal.type === 'running';
    const progressPercent = modal.progressTotal
      ? Math.min(100, Math.max(0, (modal.progressCurrent / modal.progressTotal) * 100))
      : 0;
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modal}>
          <div className={styles.modalHeader}>{modal.title}</div>
          <div className={styles.modalBody}>
            {isRunning && (
              <div>
                <i className={`fa fa-spinner fa-spin ${styles.modalIcon}`} />
                <div>{modal.body}</div>
                {modal.progressTotal > 0 && (
                  <div className={styles.progressContainer}>
                    <div className={styles.progressBar} style={{ width: `${progressPercent}%` }} />
                  </div>
                )}
              </div>
            )}
            {visual && (
              <div>
                <img src={visual.image} alt="" className={styles.instructionImg} />
                <div>{visual.text}</div>
              </div>
            )}
            {modal.type === 'skew' && (
              <div className={styles.skewSpacing}>
                Skew Spacing: <strong>{Number(this.state.settings.probeSpacing || 0).toFixed(2)}</strong> mm
              </div>
            )}
            {modal.type === 'skew-result' && this.state.skewResult && (
              <div className={styles.skewResult}>
                <div><strong>P1:</strong> X{this.state.skewResult.p1.x.toFixed(3)} Y{this.state.skewResult.p1.y.toFixed(3)}</div>
                <div><strong>P2:</strong> X{this.state.skewResult.p2.x.toFixed(3)} Y{this.state.skewResult.p2.y.toFixed(3)}</div>
                <div><strong>Angle:</strong> {this.state.skewResult.angle.toFixed(4)}&deg;</div>
              </div>
            )}
            {modal.type === 'tool_change' && (
              <div className={styles.toolWarning}>
                <strong>Tool Change Sequence</strong><br />
                1. Moves to Tool Probe Location.<br />
                2. Probes CURRENT tool length.<br />
                3. Pauses for manual tool change.<br />
                4. Probes NEW tool length.<br />
                5. Updates Z offset to match original tool.<br />
                <br />
                <strong>WARNING: Ensure tool setter is in place!</strong>
              </div>
            )}
            {modal.warning && (
              <div className={styles.probeWarning}>
                <strong>WARNING:</strong> {modal.warning}
              </div>
            )}
            {!visual && !isRunning && modal.type !== 'skew-result' && (
              <div>
                <i className={`fa ${isDanger ? 'fa-ban' : 'fa-check-square-o'} ${styles.modalIcon}`} />
                <div><strong>{modal.title}</strong></div>
              </div>
            )}
            {!modal.preformatted && !isRunning && <div className={styles.modalText}>{modal.body}</div>}
          </div>
          <div className={styles.modalFooter}>
            {!isRunning && (
              <button type="button" className={styles.modalButton} onClick={this.actions.closeModal}>Cancel</button>
            )}
            <button
              type="button"
              className={`${styles.modalButton} ${isDanger || isRunning ? styles.modalDanger : styles.modalPrimary}`}
              onClick={isRunning ? this.actions.stop : this.actions.confirmModal}
            >
              {isRunning ? 'Stop' : (modal.confirmLabel || 'Run')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  renderHiddenHelpTemplates() {
    return (
      <div className={styles.hiddenTemplates} aria-hidden="true">
        <div id="tab-corner"><img src={imgCorner} alt="" />Position above the corner, within Max Travel distance.</div>
        <div id="tab-inner-corner"><img src={imgInnerCorner} alt="" />Position the probe inside the corner.</div>
        <div id="tab-block"><img src={imgBoss} alt="" />Position outside the block: Left side (for X) or Front side (for Y).</div>
        <div id="tab-hole"><img src={imgHole} alt="" />Position inside the hole, approximately centered.</div>
        <div id="tab-edge"><img src={imgSide} alt="" />Position outside the stock, facing the target edge.</div>
        <div id="tab-skew"><img src={imgSide} alt="" />Position probe at the left-most point of the front edge.</div>
        <div id="tab-touchplate"><img src={imgTouchplate} alt="" />Position directly above the touchplate surface.</div>
        <div id="tab-tool-change"><img src={imgToolChange} alt="" />Tool change sequence instructions.</div>
      </div>
    );
  }

  render() {
    const { minimized, isFullscreen, activeTab, showSettings, connected, port, status } = this.state;
    const actions = { ...this.actions };

    return (
      <Widget fullscreen={isFullscreen}>
        <Widget.Header>
          <Widget.Title
            style={{ width: 'calc(100% - 120px)' }}
            title="Autolevel"
          >
            <Widget.Sortable className={this.props.sortable.handleClassName}>
              <i className="fa fa-bars" />
              <Space width="8" />
            </Widget.Sortable>
            Autolevel
          </Widget.Title>
          <Widget.Controls className={this.props.sortable.filterClassName}>
            <Widget.Button title="Refresh" onClick={actions.refresh}>
              <i className="fa fa-refresh" />
            </Widget.Button>
            <Widget.Button title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'} onClick={actions.toggleFullscreen}>
              <i className={`fa ${isFullscreen ? 'fa-compress' : 'fa-expand'}`} />
            </Widget.Button>
            <Widget.Button title={minimized ? 'Expand' : 'Collapse'} onClick={actions.toggleMinimized}>
              <i className={`fa ${minimized ? 'fa-angle-double-down' : 'fa-angle-double-up'}`} />
            </Widget.Button>
          </Widget.Controls>
        </Widget.Header>

        <Widget.Content
          style={{ display: minimized ? 'none' : 'block' }}
        >
          <div className={styles.autolevel}>
            <div className={styles.headerBar}>
              <div className={styles.mainTabs}>
                <button
                  type="button"
                  className={`${styles.mainTab} ${activeTab === 'compensation' ? styles.activeTab : ''}`}
                  onClick={() => actions.changeTab('compensation')}
                >
                  Compensation
                </button>
                <button
                  type="button"
                  className={`${styles.mainTab} ${activeTab === 'probing' ? styles.activeTab : ''}`}
                  onClick={() => actions.changeTab('probing')}
                >
                  Probing
                </button>
              </div>
              <span className={`${styles.savedMsg} ${this.state.saved ? styles.show : ''}`}>
                Saved <i className="fa fa-check" />
              </span>
              <button
                type="button"
                className={`${styles.btnIcon} ${showSettings ? styles.activeIcon : ''}`}
                onClick={actions.toggleSettings}
                title="Global Settings"
                aria-label="Global Settings"
              >
                <i className="fa fa-cog" />
              </button>
            </div>

            {showSettings && this.renderSettings()}

            {activeTab === 'compensation' ? this.renderCompensation() : this.renderProbing()}

            <div className={styles.footerStatus}>
              <span>{connected ? `Connected: ${port}` : 'No controller port open'}</span>
              <span>{status}</span>
              <button
                type="button"
                className={styles.stopLink}
                disabled={!connected}
                onClick={actions.stop}
              >
                Stop
              </button>
            </div>
          </div>
        </Widget.Content>
        {this.renderModal()}
        {this.renderHiddenHelpTemplates()}
      </Widget>
    );
  }
}

export default AutolevelWidget;
