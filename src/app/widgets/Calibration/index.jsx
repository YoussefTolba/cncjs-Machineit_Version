import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Space from 'app/components/Space';
import Widget from 'app/components/Widget';
import { GRBL } from 'app/constants';
import controller from 'app/lib/controller';
import WidgetConfig from '../WidgetConfig';
import styles from './index.styl';

const XY_SKEW_FACTOR_MIN = -0.05;
const XY_SKEW_FACTOR_MAX = 0.05;

const STAGES = {
  setup: 'setup',
  cut: 'cut',
  measure: 'measure',
  review: 'review'
};

const DEFAULT_XY_SKEW = {
  squareSize: 40,
  chamferSize: 4,
  diagonalAC: '',
  diagonalBD: ''
};

const clampXYSkewFactor = (value) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return 0;
  }
  return Math.min(XY_SKEW_FACTOR_MAX, Math.max(XY_SKEW_FACTOR_MIN, numberValue));
};

const factorToAngle = (factor) => {
  const numberValue = Number(factor);
  if (!Number.isFinite(numberValue)) {
    return 0;
  }
  return Math.atan(numberValue) * 180 / Math.PI;
};

const formatNumber = (value, digits = 3) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return '0';
  }
  return numberValue.toFixed(digits);
};

class CalibrationWidget extends PureComponent {
  static propTypes = {
    widgetId: PropTypes.string.isRequired,
    onFork: PropTypes.func.isRequired,
    onRemove: PropTypes.func.isRequired,
    sortable: PropTypes.object
  };

  config = new WidgetConfig(this.props.widgetId);

  state = this.getInitialState();

  controllerEvents = {
    'serialport:open': (options = {}) => {
      const controllerType = options.controllerType || controller.type;
      this.setState({
        connected: true,
        controllerType,
        port: options.port || controller.port,
        status: controllerType === GRBL
          ? 'Connected. Reading GRBL skew settings...'
          : 'Calibration requires a GRBL controller.'
      }, this.refreshGrblSettings);
    },
    'serialport:close': () => {
      this.setState(state => ({
        connected: false,
        controllerType: '',
        port: '',
        status: 'Open a GRBL controller port to calibrate XY skew.',
        xySkew: {
          ...state.xySkew,
          currentLoaded: false
        }
      }));
    },
    'serialport:read': (data) => {
      this.handleSerialData(data);
    },
    'controller:settings': (type, controllerSettings = {}) => {
      if (type === GRBL) {
        this.updateXYSkewFromControllerSettings(controllerSettings);
      }
    }
  };

  componentDidMount() {
    this.addControllerEvents();
    if (controller.port) {
      this.updateXYSkewFromControllerSettings(controller.settings);
      this.refreshGrblSettings();
    }
  }

  componentWillUnmount() {
    this.removeControllerEvents();
  }

  getInitialState() {
    const current = this.readXYSkewSettings(controller.settings);
    return {
      minimized: this.config.get('minimized', false),
      isFullscreen: false,
      activeTab: this.config.get('activeTab', 'xy-skew'),
      connected: !!controller.port,
      controllerType: controller.type,
      port: controller.port,
      status: controller.port
        ? 'Reading GRBL skew settings...'
        : 'Open a GRBL controller port to calibrate XY skew.',
      invalidFields: [],
      xySkew: {
        ...DEFAULT_XY_SKEW,
        ...this.config.get('xySkew', {}),
        stage: STAGES.setup,
        result: null,
        currentEnabled: current.enabled,
        currentFactor: current.factor,
        currentLoaded: current.loaded
      }
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

  canUseGrbl() {
    return !!controller.port && this.state.controllerType === GRBL;
  }

  readXYSkewSettings(controllerSettings = {}) {
    const settings = controllerSettings.settings || {};
    const hasEnabled = Object.prototype.hasOwnProperty.call(settings, '$140');
    const hasFactor = Object.prototype.hasOwnProperty.call(settings, '$141');
    const factor = Number(settings.$141);

    return {
      loaded: hasEnabled || hasFactor,
      enabled: hasEnabled ? String(settings.$140) === '1' : null,
      factor: hasFactor && Number.isFinite(factor) ? factor : 0
    };
  }

  updateXYSkewFromControllerSettings(controllerSettings = {}) {
    const current = this.readXYSkewSettings(controllerSettings);
    if (!current.loaded) {
      return;
    }

    this.setState(state => ({
      status: `GRBL XY skew: $140=${current.enabled ? 1 : 0}, $141=${current.factor.toFixed(6)}`,
      xySkew: {
        ...state.xySkew,
        currentEnabled: current.enabled,
        currentFactor: current.factor,
        currentLoaded: true
      }
    }));
  }

  refreshGrblSettings = () => {
    if (!controller.port) {
      this.setState({ status: 'Open a GRBL controller port first.' });
      return;
    }
    if (this.state.controllerType !== GRBL) {
      this.setState({ status: 'Calibration requires a GRBL controller.' });
      return;
    }

    controller.writeln('$$');
    this.setState({ status: 'Reading GRBL settings...' });
  };

  sendGrblCommands(commands, status) {
    commands.forEach(command => {
      controller.writeln(command);
    });
    this.setState({ status });
  }

  handleSerialData(data) {
    String(data || '').split(/\r?\n/).forEach(line => {
      this.handleSerialLine(line.trim());
    });
  }

  handleSerialLine(line) {
    const match = line.match(/^\$(140|141)=(-?\d+(?:\.\d+)?)/);
    if (!match) {
      return;
    }

    this.setState(state => {
      const xySkew = { ...state.xySkew, currentLoaded: true };
      let status = state.status;

      if (match[1] === '140') {
        xySkew.currentEnabled = String(match[2]) === '1';
        status = `GRBL XY skew enable: $140=${xySkew.currentEnabled ? 1 : 0}`;
      }

      if (match[1] === '141') {
        const factor = Number(match[2]);
        xySkew.currentFactor = Number.isFinite(factor) ? factor : 0;
        status = `GRBL XY skew factor: $141=${xySkew.currentFactor.toFixed(6)}`;
      }

      return { status, xySkew };
    });
  }

  persistXYSkewSettings(xySkew) {
    this.config.set('xySkew', {
      squareSize: xySkew.squareSize,
      chamferSize: xySkew.chamferSize
    });
  }

  toggleFullscreen = () => {
    const { minimized, isFullscreen } = this.state;
    this.setState({
      minimized: isFullscreen ? minimized : false,
      isFullscreen: !isFullscreen
    });
  };

  toggleMinimized = () => {
    const minimized = !this.state.minimized;
    this.setState({ minimized });
    this.config.set('minimized', minimized);
  };

  changeTab = (activeTab) => {
    this.setState({ activeTab });
    this.config.set('activeTab', activeTab);
  };

  changeMeasurement = (key, value) => {
    this.setState(state => {
      const xySkew = {
        ...state.xySkew,
        [key]: value,
        result: null
      };

      if (state.xySkew.stage === STAGES.review) {
        xySkew.stage = STAGES.measure;
      }

      if (key === 'squareSize' || key === 'chamferSize') {
        this.persistXYSkewSettings(xySkew);
      }

      return {
        invalidFields: state.invalidFields.filter(field => field !== key),
        xySkew
      };
    });
  };

  setPresetSquare = (squareSize) => {
    this.setState(state => {
      const xySkew = {
        ...state.xySkew,
        squareSize,
        chamferSize: Math.max(1, Math.round(squareSize / 10)),
        result: null
      };
      this.persistXYSkewSettings(xySkew);

      return {
        invalidFields: state.invalidFields.filter(field => field !== 'squareSize' && field !== 'chamferSize'),
        xySkew
      };
    });
  };

  validateSetup() {
    const { squareSize, chamferSize } = this.state.xySkew;
    const invalidFields = [];
    const square = Number(squareSize);
    const chamfer = Number(chamferSize);

    if (!Number.isFinite(square) || square <= 0) {
      invalidFields.push('squareSize');
    }
    if (!Number.isFinite(chamfer) || chamfer < 0 || chamfer >= square) {
      invalidFields.push('chamferSize');
    }
    if (invalidFields.length > 0) {
      this.setState({
        invalidFields,
        status: 'Enter a valid square size and a smaller chamfer size.'
      });
      return false;
    }

    return true;
  }

  startTestCut = () => {
    if (!this.canUseGrbl()) {
      this.setState({ status: 'Open a GRBL controller port first.' });
      return;
    }
    if (!this.validateSetup()) {
      return;
    }

    this.sendGrblCommands(['$140=0', '$$'], 'XY skew turned off. Load and run the chamfered square G-code.');
    this.setState(state => ({
      xySkew: {
        ...state.xySkew,
        currentEnabled: false,
        currentLoaded: true,
        result: null,
        stage: STAGES.cut
      }
    }));
  };

  markCutDone = () => {
    this.setState(state => ({
      status: 'Enter the measured diagonals from the chamfered square.',
      xySkew: {
        ...state.xySkew,
        stage: STAGES.measure
      }
    }));
  };

  computeResult() {
    const { squareSize, chamferSize, diagonalAC, diagonalBD } = this.state.xySkew;
    const square = Number(squareSize);
    const chamfer = Number(chamferSize);
    const ac = Number(diagonalAC);
    const bd = Number(diagonalBD);
    const invalidFields = [];

    if (!Number.isFinite(square) || square <= 0) {
      invalidFields.push('squareSize');
    }
    if (!Number.isFinite(chamfer) || chamfer < 0 || chamfer >= square) {
      invalidFields.push('chamferSize');
    }
    if (!Number.isFinite(ac) || ac <= 0) {
      invalidFields.push('diagonalAC');
    }
    if (!Number.isFinite(bd) || bd <= 0) {
      invalidFields.push('diagonalBD');
    }
    if (invalidFields.length > 0) {
      return { invalidFields, value: null };
    }

    const effectiveSize = square - chamfer;
    const rawFactor = ((ac * ac) - (bd * bd)) / (4 * effectiveSize * effectiveSize);
    const factor = clampXYSkewFactor(rawFactor);

    return {
      invalidFields: [],
      value: {
        squareSize: square,
        chamferSize: chamfer,
        effectiveSize,
        diagonalAC: ac,
        diagonalBD: bd,
        diagonalDifference: ac - bd,
        rawFactor,
        factor,
        rawAngle: factorToAngle(rawFactor),
        angle: factorToAngle(factor),
        clamped: Math.abs(rawFactor - factor) > 1e-9,
        signFlipped: false
      }
    };
  }

  calculatePreviewResult() {
    const result = this.computeResult();
    return result.value;
  }

  calculate = () => {
    const result = this.computeResult();
    if (!result.value) {
      this.setState({
        invalidFields: result.invalidFields,
        status: 'Enter valid square, chamfer, AC, and BD measurements.'
      });
      return;
    }

    this.setState(state => ({
      invalidFields: [],
      status: `Calculated $141=${result.value.factor.toFixed(6)}, angle=${result.value.angle.toFixed(4)} deg.`,
      xySkew: {
        ...state.xySkew,
        result: result.value,
        stage: STAGES.review
      }
    }));
  };

  flipSign = () => {
    const result = this.state.xySkew.result || this.calculatePreviewResult();
    if (!result) {
      this.setState({ status: 'Enter valid diagonal measurements before flipping sign.' });
      return;
    }

    const rawFactor = -Number(result.rawFactor || 0);
    const factor = clampXYSkewFactor(rawFactor);
    this.setState(state => ({
      status: `Pending $141=${factor.toFixed(6)}, angle=${factorToAngle(factor).toFixed(4)} deg.`,
      xySkew: {
        ...state.xySkew,
        result: {
          ...result,
          rawFactor,
          factor,
          rawAngle: factorToAngle(rawFactor),
          angle: factorToAngle(factor),
          clamped: Math.abs(rawFactor - factor) > 1e-9,
          signFlipped: !result.signFlipped
        },
        stage: STAGES.review
      }
    }));
  };

  applyToGrbl = () => {
    const { result } = this.state.xySkew;
    if (!result) {
      this.setState({ status: 'Calculate a correction before applying it.' });
      return;
    }
    if (!this.canUseGrbl()) {
      this.setState({ status: 'Open a GRBL controller port first.' });
      return;
    }

    const factor = clampXYSkewFactor(result.factor);
    this.sendGrblCommands([
      `$141=${factor.toFixed(6)}`,
      '$140=1',
      '$$'
    ], `Sent $141=${factor.toFixed(6)} and turned XY skew on.`);
    this.setState(state => ({
      xySkew: {
        ...state.xySkew,
        currentEnabled: true,
        currentFactor: factor,
        currentLoaded: true
      }
    }));
  };

  enableXYSkew = () => {
    if (!this.canUseGrbl()) {
      this.setState({ status: 'Open a GRBL controller port first.' });
      return;
    }

    this.sendGrblCommands(['$140=1', '$$'], 'Sent $140=1. Reading back from GRBL...');
    this.setState(state => ({
      xySkew: {
        ...state.xySkew,
        currentEnabled: true,
        currentLoaded: true
      }
    }));
  };

  disableXYSkew = () => {
    if (!this.canUseGrbl()) {
      this.setState({ status: 'Open a GRBL controller port first.' });
      return;
    }

    this.sendGrblCommands(['$140=0', '$$'], 'Sent $140=0. Reading back from GRBL...');
    this.setState(state => ({
      xySkew: {
        ...state.xySkew,
        currentEnabled: false,
        currentLoaded: true
      }
    }));
  };

  resetWizard = () => {
    this.setState(state => ({
      invalidFields: [],
      status: 'Ready to start a new test cut calibration.',
      xySkew: {
        ...state.xySkew,
        diagonalAC: '',
        diagonalBD: '',
        result: null,
        stage: STAGES.setup
      }
    }));
  };

  renderMeasurementField(key, label, step = '0.001') {
    const { invalidFields, xySkew } = this.state;
    return (
      <label className={styles.field}>
        <span>{label}</span>
        <input
          type="number"
          step={step}
          className={invalidFields.includes(key) ? styles.isInvalid : ''}
          value={xySkew[key]}
          onChange={(event) => this.changeMeasurement(key, event.target.value)}
        />
      </label>
    );
  }

  renderCurrentSkewPanel() {
    const { xySkew } = this.state;
    const currentFactor = Number(xySkew.currentFactor) || 0;
    const currentAngle = factorToAngle(currentFactor);
    let enabledValue = '0';
    let enabledText = 'Disabled';
    if (xySkew.currentEnabled === null) {
      enabledValue = 'Unknown';
      enabledText = 'Unknown';
    } else if (xySkew.currentEnabled) {
      enabledValue = '1';
      enabledText = 'Enabled';
    }

    return (
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h3>Current GRBL XY Skew</h3>
          <span className={xySkew.currentEnabled ? styles.badgeOn : styles.badgeOff}>
            {enabledText}
          </span>
        </div>
        <div className={styles.metricGrid}>
          <div className={styles.metric}>
            <span>$140</span>
            <strong>{enabledValue}</strong>
          </div>
          <div className={styles.metric}>
            <span>$141 factor</span>
            <strong>{currentFactor.toFixed(6)}</strong>
          </div>
          <div className={styles.metric}>
            <span>Angle</span>
            <strong>{currentAngle.toFixed(4)} deg</strong>
          </div>
        </div>
        <div className={styles.buttonRow}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            disabled={!this.canUseGrbl()}
            onClick={this.refreshGrblSettings}
          >
            <i className="fa fa-refresh" /> Refresh
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSuccess}`}
            disabled={!this.canUseGrbl()}
            onClick={this.enableXYSkew}
          >
            <i className="fa fa-check" /> Enable
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnDanger}`}
            disabled={!this.canUseGrbl()}
            onClick={this.disableXYSkew}
          >
            <i className="fa fa-ban" /> Disable
          </button>
        </div>
      </div>
    );
  }

  renderStepPanel() {
    const { stage } = this.state.xySkew;
    const steps = [
      ['1', 'Setup', STAGES.setup],
      ['2', 'Cut', STAGES.cut],
      ['3', 'Measure', STAGES.measure],
      ['4', 'Apply', STAGES.review]
    ];

    return (
      <div className={styles.stepRow}>
        {steps.map(([number, label, step]) => (
          <div key={step} className={stage === step ? styles.stepActive : styles.step}>
            <strong>{number}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
    );
  }

  renderSetupPanel() {
    const { xySkew } = this.state;
    if (xySkew.stage !== STAGES.setup) {
      return null;
    }

    return (
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h3>1. Prepare Chamfered Square</h3>
          <span className={styles.badgeWarn}>Skew Off During Cut</span>
        </div>
        <div className={styles.presetRow}>
          {[20, 40, 100].map(size => (
            <button
              key={size}
              type="button"
              className={Number(xySkew.squareSize) === size ? styles.presetActive : styles.preset}
              onClick={() => this.setPresetSquare(size)}
            >
              {size} mm
            </button>
          ))}
        </div>
        <div className={styles.formGrid}>
          {this.renderMeasurementField('squareSize', 'Square side length', '1')}
          {this.renderMeasurementField('chamferSize', 'Chamfer size', '0.1')}
        </div>
        <div className={styles.note}>
          Use any square size the machine can cut cleanly. The chamfer gives repeatable measuring points at A, B, C, and D.
        </div>
        <div className={styles.buttonRow}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnExpand}`}
            disabled={!this.canUseGrbl()}
            onClick={this.startTestCut}
          >
            <i className="fa fa-play" /> Start & Turn Off Skew
          </button>
        </div>
      </div>
    );
  }

  renderCutPanel() {
    if (this.state.xySkew.stage !== STAGES.cut) {
      return null;
    }

    return (
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h3>2. Load and Run the G-code</h3>
          <span className={styles.badgeOff}>$140=0</span>
        </div>
        <div className={styles.cutInstructions}>
          <div>Load your chamfered square test G-code in CNCjs.</div>
          <div>Run the job normally. The wizard has turned firmware skew compensation off for this cut.</div>
          <div>When the job is finished, return here and enter the diagonal measurements.</div>
        </div>
        <div className={styles.buttonRow}>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnExpand}`} onClick={this.markCutDone}>
            <i className="fa fa-check" /> Cut Is Done
          </button>
        </div>
      </div>
    );
  }

  renderMeasurementPanel() {
    const { xySkew } = this.state;
    if (xySkew.stage !== STAGES.measure) {
      return null;
    }

    const result = this.calculatePreviewResult();
    const factor = result ? result.factor : 0;
    const angle = result ? result.angle : 0;

    return (
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h3>3. Measure Corners</h3>
          <span className={styles.badgeWarn}>A B C D</span>
        </div>
        <pre className={styles.diagram}>{'D -------- C\n|          |\n|          |\nA -------- B'}</pre>
        <div className={styles.formGrid}>
          {this.renderMeasurementField('diagonalAC', 'Diagonal A to C')}
          {this.renderMeasurementField('diagonalBD', 'Diagonal B to D')}
        </div>
        <div className={styles.metricGrid}>
          <div className={styles.metric}>
            <span>Calculated factor</span>
            <strong>{factor.toFixed(6)}</strong>
          </div>
          <div className={styles.metric}>
            <span>Calculated angle</span>
            <strong>{angle.toFixed(4)} deg</strong>
          </div>
          <div className={styles.metric}>
            <span>AC - BD</span>
            <strong>{result ? formatNumber(result.diagonalDifference, 3) : '0.000'}</strong>
          </div>
        </div>
        <div className={styles.note}>
          Formula: factor = (AC^2 - BD^2) / (4 * effective size^2), where effective size is side length minus chamfer size.
        </div>
        <div className={styles.buttonRow}>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnExpand}`} onClick={this.calculate}>
            <i className="fa fa-calculator" /> Calculate
          </button>
        </div>
      </div>
    );
  }

  renderResultPanel() {
    const { xySkew } = this.state;
    if (xySkew.stage !== STAGES.review) {
      return null;
    }

    const result = xySkew.result || this.calculatePreviewResult();
    const factor = result ? result.factor : 0;
    const angle = result ? result.angle : 0;

    return (
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h3>4. Review and Apply</h3>
          <span className={result && result.clamped ? styles.badgeWarn : styles.badgeOn}>
            {result && result.clamped ? 'Clamped' : 'Ready'}
          </span>
        </div>
        <div className={styles.metricGrid}>
          <div className={styles.metric}>
            <span>$141 factor</span>
            <strong>{factor.toFixed(6)}</strong>
          </div>
          <div className={styles.metric}>
            <span>Angle</span>
            <strong>{angle.toFixed(4)} deg</strong>
          </div>
          <div className={styles.metric}>
            <span>Limit</span>
            <strong>-0.050000 to 0.050000</strong>
          </div>
        </div>
        {result && (
          <div className={styles.resultDetails}>
            <div>AC {result.diagonalAC.toFixed(3)} / BD {result.diagonalBD.toFixed(3)}</div>
            <div>Effective size {result.effectiveSize.toFixed(3)}</div>
            <div>Raw factor {result.rawFactor.toFixed(6)} ({result.rawAngle.toFixed(4)} deg)</div>
            <div>{result.signFlipped ? 'Sign has been flipped by the user.' : 'Original sign is based on AC minus BD.'}</div>
          </div>
        )}
        <div className={styles.buttonRow}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            disabled={!result}
            onClick={this.flipSign}
          >
            <i className="fa fa-exchange" /> Flip Sign
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnExpand}`}
            disabled={!result || !this.canUseGrbl()}
            onClick={this.applyToGrbl}
          >
            <i className="fa fa-upload" /> Apply & Turn On
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={this.resetWizard}
          >
            <i className="fa fa-repeat" /> New Test
          </button>
        </div>
      </div>
    );
  }

  renderXYSkewWizard() {
    return (
      <div className={styles.widgetContainer}>
        {this.renderCurrentSkewPanel()}
        {this.renderStepPanel()}
        {this.renderSetupPanel()}
        {this.renderCutPanel()}
        {this.renderMeasurementPanel()}
        {this.renderResultPanel()}
      </div>
    );
  }

  render() {
    const { minimized, isFullscreen, activeTab, connected, port, status } = this.state;

    return (
      <Widget fullscreen={isFullscreen}>
        <Widget.Header>
          <Widget.Title style={{ width: 'calc(100% - 120px)' }} title="Calibration">
            <Widget.Sortable className={this.props.sortable.handleClassName}>
              <i className="fa fa-bars" />
              <Space width="8" />
            </Widget.Sortable>
            Calibration
          </Widget.Title>
          <Widget.Controls className={this.props.sortable.filterClassName}>
            <Widget.Button title="Refresh" onClick={this.refreshGrblSettings}>
              <i className="fa fa-refresh" />
            </Widget.Button>
            <Widget.Button title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'} onClick={this.toggleFullscreen}>
              <i className={`fa ${isFullscreen ? 'fa-compress' : 'fa-expand'}`} />
            </Widget.Button>
            <Widget.Button title={minimized ? 'Expand' : 'Collapse'} onClick={this.toggleMinimized}>
              <i className={`fa ${minimized ? 'fa-angle-double-down' : 'fa-angle-double-up'}`} />
            </Widget.Button>
          </Widget.Controls>
        </Widget.Header>

        <Widget.Content style={{ display: minimized ? 'none' : 'block' }}>
          <div className={styles.calibration}>
            <div className={styles.headerBar}>
              <div className={styles.mainTabs}>
                <button type="button" className={`${styles.mainTab} ${activeTab === 'xy-skew' ? styles.activeTab : ''}`} onClick={() => this.changeTab('xy-skew')}>
                  XY Skew
                </button>
              </div>
            </div>
            {activeTab === 'xy-skew' && this.renderXYSkewWizard()}
            <div className={styles.footerStatus}>
              <span>{connected ? `Connected: ${port}` : 'No controller port open'}</span>
              <span>{status}</span>
            </div>
          </div>
        </Widget.Content>
      </Widget>
    );
  }
}

export default CalibrationWidget;
