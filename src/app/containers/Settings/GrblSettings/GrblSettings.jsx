/* eslint react/jsx-no-bind: 0 */
import _find from 'lodash/find';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Space from 'app/components/Space';
import { GRBL } from 'app/constants';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import styles from './index.styl';

const AXES = [
  { axis: 'X', bit: 1 },
  { axis: 'Y', bit: 2 },
  { axis: 'Z', bit: 4 }
];

const TABS = [
  { id: 'backup', label: 'Backup' },
  { id: 'motion', label: 'Motion' },
  { id: 'homing', label: 'Homing & Limits' },
  { id: 'spindle', label: 'Spindle & Laser' },
  { id: 'advanced', label: 'Advanced' }
];

const STEP_SETTINGS = {
  X: '$100',
  Y: '$101',
  Z: '$102'
};

const BACKUP_FLASH_DELAY = 75;

const SETTINGS = [
  { setting: '$0', group: 'advanced', label: 'Step pulse time', units: 'microseconds', type: 'number', min: 3, description: 'Sets the step pulse length. GRBL requires at least 3 microseconds.' },
  { setting: '$1', group: 'advanced', label: 'Step idle delay', units: 'milliseconds', type: 'number', min: 0, description: 'Delay before disabling steppers after motion stops. Use 255 to keep motors energized.' },
  { setting: '$2', group: 'advanced', label: 'Step pulse invert', units: 'mask', type: 'axisMask', description: 'Inverts the step pulse signal for selected axes.' },
  { setting: '$3', group: 'advanced', label: 'Step direction invert', units: 'mask', type: 'axisMask', description: 'Inverts the direction signal for selected axes.' },
  { setting: '$4', group: 'advanced', label: 'Invert step enable pin', units: 'boolean', type: 'boolean', description: 'Inverts the stepper driver enable signal.' },
  { setting: '$5', group: 'homing', label: 'Invert limit pins', units: 'boolean', type: 'boolean', description: 'Inverts the limit input pins.' },
  { setting: '$6', group: 'homing', label: 'Invert probe pin', units: 'boolean', type: 'boolean', description: 'Inverts the probe input pin.' },
  { setting: '$10', group: 'advanced', label: 'Status report options', units: 'mask', type: 'number', min: 0, description: 'Controls which fields GRBL includes in status reports.' },
  { setting: '$11', group: 'motion', label: 'Junction deviation', units: 'millimeters', type: 'number', min: 0, description: 'Controls how quickly GRBL moves through corners. Lower values slow corners down.' },
  { setting: '$12', group: 'motion', label: 'Arc tolerance', units: 'millimeters', type: 'number', min: 0, description: 'Controls G2/G3 arc tracing accuracy.' },
  { setting: '$13', group: 'advanced', label: 'Report in inches', units: 'boolean', type: 'boolean', description: 'Reports position and rate values in inches instead of millimeters.' },
  { setting: '$20', group: 'homing', label: 'Soft limits enable', units: 'boolean', type: 'boolean', description: 'Checks motion commands against configured travel limits. Requires homing.' },
  { setting: '$21', group: 'homing', label: 'Hard limits enable', units: 'boolean', type: 'boolean', description: 'Stops motion immediately when a limit switch is triggered.' },
  { setting: '$22', group: 'homing', label: 'Homing cycle enable', units: 'boolean', type: 'boolean', description: 'Enables the GRBL homing cycle.' },
  { setting: '$23', group: 'homing', label: 'Homing direction invert', units: 'mask', type: 'axisMask', description: 'Selects which axes home toward the negative direction.' },
  { setting: '$24', group: 'homing', label: 'Homing locate feed rate', units: 'mm/min', type: 'number', min: 0, description: 'Slow feed rate used to locate switches accurately during homing.' },
  { setting: '$25', group: 'homing', label: 'Homing search seek rate', units: 'mm/min', type: 'number', min: 0, description: 'Fast seek rate used to find switches during homing.' },
  { setting: '$26', group: 'homing', label: 'Homing debounce delay', units: 'milliseconds', type: 'number', min: 0, description: 'Delay used to let switches debounce during homing.' },
  { setting: '$27', group: 'homing', label: 'Homing pull-off distance', units: 'millimeters', type: 'number', min: 0, description: 'Distance to retract after triggering a homing switch.' },
  { setting: '$30', group: 'spindle', label: 'Maximum spindle speed', units: 'RPM', type: 'number', min: 0, description: 'Spindle speed that maps to full PWM output.' },
  { setting: '$31', group: 'spindle', label: 'Minimum spindle speed', units: 'RPM', type: 'number', min: 0, description: 'Spindle speed that maps to minimum PWM output.' },
  { setting: '$32', group: 'spindle', label: 'Laser mode enable', units: 'boolean', type: 'boolean', description: 'Enables GRBL laser mode for dynamic spindle power during motion.' },
  { setting: '$100', group: 'motion', label: 'X-axis travel resolution', units: 'steps/mm', type: 'number', min: 0, description: 'X-axis steps per millimeter.' },
  { setting: '$101', group: 'motion', label: 'Y-axis travel resolution', units: 'steps/mm', type: 'number', min: 0, description: 'Y-axis steps per millimeter.' },
  { setting: '$102', group: 'motion', label: 'Z-axis travel resolution', units: 'steps/mm', type: 'number', min: 0, description: 'Z-axis steps per millimeter.' },
  { setting: '$110', group: 'motion', label: 'X-axis maximum rate', units: 'mm/min', type: 'number', min: 0, description: 'X-axis maximum rapid/feed rate.' },
  { setting: '$111', group: 'motion', label: 'Y-axis maximum rate', units: 'mm/min', type: 'number', min: 0, description: 'Y-axis maximum rapid/feed rate.' },
  { setting: '$112', group: 'motion', label: 'Z-axis maximum rate', units: 'mm/min', type: 'number', min: 0, description: 'Z-axis maximum rapid/feed rate.' },
  { setting: '$120', group: 'motion', label: 'X-axis acceleration', units: 'mm/sec^2', type: 'number', min: 0, description: 'X-axis acceleration limit.' },
  { setting: '$121', group: 'motion', label: 'Y-axis acceleration', units: 'mm/sec^2', type: 'number', min: 0, description: 'Y-axis acceleration limit.' },
  { setting: '$122', group: 'motion', label: 'Z-axis acceleration', units: 'mm/sec^2', type: 'number', min: 0, description: 'Z-axis acceleration limit.' },
  { setting: '$130', group: 'motion', label: 'X-axis maximum travel', units: 'millimeters', type: 'number', min: 0, description: 'Maximum X travel used by soft limits and homing.' },
  { setting: '$131', group: 'motion', label: 'Y-axis maximum travel', units: 'millimeters', type: 'number', min: 0, description: 'Maximum Y travel used by soft limits and homing.' },
  { setting: '$132', group: 'motion', label: 'Z-axis maximum travel', units: 'millimeters', type: 'number', min: 0, description: 'Maximum Z travel used by soft limits and homing.' }
];

const sortBySetting = (records) => records.sort((a, b) => (
  Number(String(a.setting).replace('$', '')) - Number(String(b.setting).replace('$', ''))
));

const displayValue = (value) => {
  if (value === undefined || value === null || value === '') {
    return 'Not loaded';
  }
  return String(value);
};

const isBooleanOn = (value) => String(value) === '1' || value === true;

const hasMaskBit = (mask, bit) => {
  const normalized = Math.max(0, Math.round(Number(mask) || 0));
  return Math.floor(normalized / bit) % 2 === 1;
};

const setMaskBit = (mask, bit, checked) => {
  const normalized = Math.max(0, Math.round(Number(mask) || 0));
  const hasBit = hasMaskBit(normalized, bit);
  if (checked && !hasBit) {
    return normalized + bit;
  }
  if (!checked && hasBit) {
    return normalized - bit;
  }
  return normalized;
};

const padTimestampPart = (value) => String(value).padStart(2, '0');

const getBackupTimestamp = () => {
  const date = new Date();
  const day = [
    date.getFullYear(),
    padTimestampPart(date.getMonth() + 1),
    padTimestampPart(date.getDate())
  ].join('');
  const time = [
    padTimestampPart(date.getHours()),
    padTimestampPart(date.getMinutes()),
    padTimestampPart(date.getSeconds())
  ].join('');

  return `${day}-${time}`;
};

class GrblSettings extends PureComponent {
    static propTypes = {
      initialState: PropTypes.object,
      state: PropTypes.object,
      stateChanged: PropTypes.bool,
      actions: PropTypes.object
    };

    state = {
      activeTab: 'motion',
      selectedSetting: '$100',
      connected: !!controller.port,
      controllerType: controller.type,
      port: controller.port,
      settings: {
        ...((controller.settings || {}).settings || {})
      },
      pendingValues: {},
      status: controller.port
        ? i18n._('Ready to read GRBL settings.')
        : i18n._('Open a GRBL controller port to edit firmware settings.'),
      backupFileName: '',
      backupFileText: '',
      backupCommands: [],
      confirmingFlash: false,
      flashingBackup: false,
      stepsCalibration: {
        axis: 'X',
        commandedDistance: '100',
        measuredDistance: ''
      }
    };

    controllerEvents = {
      'serialport:open': (options = {}) => {
        const controllerType = options.controllerType || controller.type;
        this.setState({
          connected: true,
          controllerType,
          port: options.port || controller.port,
          status: controllerType === GRBL
            ? i18n._('Connected. Reading GRBL settings...')
            : i18n._('The connected controller is not GRBL.')
        }, this.refreshSettings);
      },
      'serialport:close': () => {
        this.clearFlashBackupTimer();
        this.setState({
          connected: false,
          controllerType: '',
          port: '',
          settings: {},
          pendingValues: {},
          backupFileName: '',
          backupFileText: '',
          backupCommands: [],
          confirmingFlash: false,
          flashingBackup: false,
          status: i18n._('Open a GRBL controller port to edit firmware settings.')
        });
      },
      'controller:settings': (type, controllerSettings = {}) => {
        if (type !== GRBL) {
          return;
        }
        this.setState({
          controllerType: type,
          settings: {
            ...((controllerSettings || {}).settings || {})
          },
          status: i18n._('GRBL settings loaded.')
        });
      }
    };

    componentDidMount() {
      Object.keys(this.controllerEvents).forEach(eventName => {
        controller.addListener(eventName, this.controllerEvents[eventName]);
      });

      if (this.canUseGrbl()) {
        this.refreshSettings();
      }
    }

    componentWillUnmount() {
      this.clearFlashBackupTimer();
      Object.keys(this.controllerEvents).forEach(eventName => {
        controller.removeListener(eventName, this.controllerEvents[eventName]);
      });
    }

    clearFlashBackupTimer() {
      if (this.flashBackupTimer) {
        window.clearTimeout(this.flashBackupTimer);
        this.flashBackupTimer = null;
      }
    }

    canUseGrbl() {
      return !!controller.port && (controller.type === GRBL || this.state.controllerType === GRBL);
    }

    refreshSettings = () => {
      if (!controller.port) {
        this.setState({ status: i18n._('Open a controller port first.') });
        return;
      }
      if (!this.canUseGrbl()) {
        this.setState({ status: i18n._('The connected controller is not GRBL.') });
        return;
      }

      controller.writeln('$$');
      this.setState({ status: i18n._('Reading GRBL settings...') });
    };

    changeTab = (activeTab) => {
      const records = this.getSettingsForTab(activeTab);
      this.setState({
        activeTab,
        selectedSetting: records[0] ? records[0].setting : this.state.selectedSetting
      });
    };

    selectSetting = (selectedSetting) => {
      this.setState({ selectedSetting });
    };

    updatePendingValue = (setting, value) => {
      this.setState(state => ({
        pendingValues: {
          ...state.pendingValues,
          [setting]: value
        }
      }));
    };

    updateAxisMask = (setting, bit, checked) => {
      const current = Number(this.getValue(setting)) || 0;
      this.updatePendingValue(setting, String(setMaskBit(current, bit, checked)));
    };

    updateStepsCalibration = (key, value) => {
      this.setState(state => ({
        stepsCalibration: {
          ...state.stepsCalibration,
          [key]: value
        }
      }));
    };

    getSettingsForTab(tab) {
      return sortBySetting(SETTINGS.filter(item => item.group === tab));
    }

    getValue(setting) {
      if (Object.prototype.hasOwnProperty.call(this.state.pendingValues, setting)) {
        return this.state.pendingValues[setting];
      }
      return this.state.settings[setting];
    }

    normalizeValue(definition, value) {
      if (definition.type === 'boolean') {
        return isBooleanOn(value) ? '1' : '0';
      }
      const numberValue = Number(value);
      if (!Number.isFinite(numberValue)) {
        return null;
      }
      if (Number.isFinite(definition.min) && numberValue < definition.min) {
        return null;
      }
      if (definition.type === 'axisMask') {
        return String(Math.round(numberValue));
      }
      return String(numberValue);
    }

    applySetting = (setting, value) => {
      if (!this.canUseGrbl()) {
        this.setState({ status: i18n._('Open a GRBL controller port first.') });
        return;
      }

      controller.writeln(`${setting}=${value}`);
      controller.writeln('$$');
      this.setState(state => {
        const pendingValues = { ...state.pendingValues };
        delete pendingValues[setting];
        return {
          pendingValues,
          status: i18n._('Sent {{command}}. Reading settings back...', {
            command: `${setting}=${value}`
          })
        };
      });
    };

    applySelectedSetting = () => {
      const definition = _find(SETTINGS, { setting: this.state.selectedSetting });
      if (!definition) {
        return;
      }

      const value = this.normalizeValue(definition, this.getValue(definition.setting));
      if (value === null) {
        this.setState({ status: i18n._('Enter a valid value before applying this setting.') });
        return;
      }
      this.applySetting(definition.setting, value);
    };

    calculateStepsCalibration() {
      const { axis, commandedDistance, measuredDistance } = this.state.stepsCalibration;
      const setting = STEP_SETTINGS[axis];
      const currentSteps = Number(this.state.settings[setting]);
      const commanded = Number(commandedDistance);
      const measured = Number(measuredDistance);

      if (!setting || !Number.isFinite(currentSteps) || currentSteps <= 0) {
        return null;
      }
      if (!Number.isFinite(commanded) || commanded <= 0) {
        return null;
      }
      if (!Number.isFinite(measured) || measured <= 0) {
        return null;
      }

      return {
        setting,
        nextValue: (currentSteps * commanded / measured).toFixed(3)
      };
    }

    applyStepsCalibration = () => {
      const result = this.calculateStepsCalibration();
      if (!result) {
        this.setState({ status: i18n._('Enter valid commanded and measured distances.') });
        return;
      }
      this.setState({
        selectedSetting: result.setting,
        pendingValues: {
          ...this.state.pendingValues,
          [result.setting]: result.nextValue
        }
      });
      this.applySetting(result.setting, result.nextValue);
    };

    getBackupFileText() {
      const backupText = this.getBackupText();
      if (!backupText) {
        return '';
      }

      return [
        '# CNCjs GRBL Settings Backup',
        `# Created: ${new Date().toISOString()}`,
        `# Controller: ${this.state.controllerType || GRBL}${this.state.port ? ` ${this.state.port}` : ''}`,
        '# Flashable lines are the $n=value entries below.',
        '',
        backupText
      ].join('\n');
    }

    parseBackupCommands(backupText) {
      return String(backupText || '').split(/\r?\n/).reduce((commands, line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed[0] === '#' || trimmed[0] === ';') {
          return commands;
        }

        const match = trimmed.match(/^(\$\d{1,3})\s*=\s*([-+]?(?:\d+\.?\d*|\.\d+))/);
        if (match) {
          commands.push(`${match[1]}=${match[2]}`);
        }
        return commands;
      }, []);
    }

    createBackupFile = () => {
      const backupFileText = this.getBackupFileText();
      if (!backupFileText) {
        this.setState({ status: i18n._('Read GRBL settings before creating a backup.') });
        return;
      }

      const backupFileName = `grbl-settings-${getBackupTimestamp()}.txt`;
      const blob = new Blob([backupFileText], { type: 'text/plain;charset=utf-8' });
      const urlApi = window.URL || window.webkitURL;
      const url = urlApi.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = backupFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => urlApi.revokeObjectURL(url), 0);

      this.setState({
        backupFileName,
        backupFileText,
        backupCommands: this.parseBackupCommands(backupFileText),
        confirmingFlash: false,
        status: i18n._('Saved GRBL backup file {{file}}.', { file: backupFileName })
      });
    };

    loadBackupFile = (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const backupFileText = String(reader.result || '');
        const backupCommands = this.parseBackupCommands(backupFileText);
        this.setState({
          backupFileName: file.name,
          backupFileText,
          backupCommands,
          confirmingFlash: false,
          status: i18n._('Loaded {{count}} GRBL settings from {{file}}.', {
            count: backupCommands.length,
            file: file.name
          })
        });
      };
      reader.onerror = () => {
        this.setState({ status: i18n._('Could not read the selected backup file.') });
      };
      reader.readAsText(file);
    };

    flashBackupFile = () => {
      const { backupCommands, backupFileName } = this.state;
      if (!this.canUseGrbl()) {
        this.setState({ status: i18n._('Open a GRBL controller port first.') });
        return;
      }
      if (!backupCommands.length) {
        this.setState({ status: i18n._('Choose a GRBL backup file before flashing settings.') });
        return;
      }
      if (this.state.flashingBackup) {
        return;
      }

      this.setState({
        confirmingFlash: true,
        status: i18n._('Confirm flashing {{count}} settings from {{file}}.', {
          count: backupCommands.length,
          file: backupFileName || i18n._('the selected backup file')
        })
      });
    };

    confirmFlashBackupFile = () => {
      const { backupCommands } = this.state;
      if (!this.canUseGrbl()) {
        this.setState({
          confirmingFlash: false,
          status: i18n._('Open a GRBL controller port first.')
        });
        return;
      }
      if (!backupCommands.length) {
        this.setState({
          confirmingFlash: false,
          status: i18n._('Choose a GRBL backup file before flashing settings.')
        });
        return;
      }

      this.setState({
        confirmingFlash: false,
        flashingBackup: true
      }, () => {
        this.flashBackupCommands(backupCommands.slice(), backupCommands.length);
      });
    };

    flashBackupCommands(commands, total) {
      if (!this.canUseGrbl()) {
        this.clearFlashBackupTimer();
        this.setState({
          flashingBackup: false,
          status: i18n._('Open a GRBL controller port first.')
        });
        return;
      }

      const command = commands.shift();
      if (!command) {
        controller.writeln('$$');
        this.clearFlashBackupTimer();
        this.setState({
          flashingBackup: false,
          status: i18n._('Sent {{count}} backup settings. Reading settings back...', {
            count: total
          })
        });
        return;
      }

      controller.writeln(command);
      this.setState({
        status: i18n._('Flashing backup settings {{sent}} of {{total}}...', {
          sent: total - commands.length,
          total
        })
      });
      this.flashBackupTimer = window.setTimeout(() => {
        this.flashBackupCommands(commands, total);
      }, BACKUP_FLASH_DELAY);
    }

    cancelFlashBackupFile = () => {
      this.setState({
        confirmingFlash: false,
        status: i18n._('Backup flash cancelled.')
      });
    };

    getBackupText() {
      const records = Object.keys(this.state.settings).map(setting => {
        const definition = _find(SETTINGS, { setting }) || {
          setting,
          label: 'Unknown GRBL setting',
          units: ''
        };
        const suffix = definition.units
          ? ` (${definition.label}, ${definition.units})`
          : ` (${definition.label})`;
        return {
          setting,
          line: `${setting}=${this.state.settings[setting]}${suffix}`
        };
      });

      return sortBySetting(records).map(record => record.line).join('\n');
    }

    renderStatusBar() {
      const { connected, controllerType, port, status } = this.state;
      const title = connected
        ? `${controllerType || i18n._('Controller')} ${port ? `(${port})` : ''}`
        : i18n._('No controller connected');

      return (
        <div className={styles.statusBar}>
          <div>
            <div className={styles.statusTitle}>{title}</div>
            <div className={styles.statusDetail}>{status}</div>
          </div>
          <button
            type="button"
            className="btn btn-default"
            disabled={!this.canUseGrbl()}
            onClick={this.refreshSettings}
          >
            <i className="fa fa-refresh" />
            <Space width="8" />
            {i18n._('Refresh')}
          </button>
        </div>
      );
    }

    renderTabs() {
      return (
        <div className={styles.tabs}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={this.state.activeTab === tab.id ? styles.activeTab : styles.tab}
              onClick={() => this.changeTab(tab.id)}
            >
              {i18n._(tab.label)}
            </button>
          ))}
        </div>
      );
    }

    renderBackup() {
      const generatedBackupText = this.getBackupFileText();
      const backupText = this.state.backupFileText || generatedBackupText;
      const backupFileName = this.state.backupFileName || i18n._('No backup file selected');
      const backupCommandCount = this.state.backupCommands.length;
      const { flashingBackup } = this.state;

      return (
        <div className={styles.panel}>
          <h5>{i18n._('GRBL Settings Backup')}</h5>
          <div className={styles.backupHeader}>
            <div className={styles.backupMeta}>
              <span>{i18n._('File')}</span>
              <strong>{backupFileName}</strong>
            </div>
            <label className={styles.fileButton}>
              <i className="fa fa-folder-open" />
              <Space width="8" />
              {i18n._('Choose Backup File')}
              <input
                type="file"
                accept=".txt,.nc,.gcode"
                disabled={flashingBackup}
                onChange={this.loadBackupFile}
              />
            </label>
          </div>
          <textarea
            ref={(node) => {
              this.backupTextarea = node;
            }}
            className={styles.backupTextarea}
            readOnly
            value={backupText}
          />
          <div className={styles.actions}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!generatedBackupText || flashingBackup}
              onClick={this.createBackupFile}
            >
              <i className="fa fa-download" />
              <Space width="8" />
              {i18n._('Back Up')}
            </button>
            <button
              type="button"
              className="btn btn-warning"
              disabled={!backupCommandCount || !this.canUseGrbl() || flashingBackup}
              onClick={this.flashBackupFile}
            >
              <i className="fa fa-bolt" />
              <Space width="8" />
              {i18n._('Flash Backup')}
            </button>
          </div>
          {this.state.confirmingFlash && (
            <div className={styles.flashConfirm}>
              <span>
                {i18n._('Flash {{count}} settings from {{file}} to GRBL?', {
                  count: backupCommandCount,
                  file: this.state.backupFileName || i18n._('the selected backup file')
                })}
              </span>
              <button
                type="button"
                className="btn btn-warning btn-sm"
                onClick={this.confirmFlashBackupFile}
              >
                {i18n._('Flash Now')}
              </button>
              <button
                type="button"
                className="btn btn-default btn-sm"
                onClick={this.cancelFlashBackupFile}
              >
                {i18n._('Cancel')}
              </button>
            </div>
          )}
          <div className={styles.helperText}>
            {backupCommandCount
              ? i18n._('{{count}} flashable settings found in the displayed file.', {
                count: backupCommandCount
              })
              : i18n._('Create or choose a backup file to flash settings.')}
          </div>
        </div>
      );
    }

    renderStepsCalibration() {
      const result = this.calculateStepsCalibration();
      const { axis, commandedDistance, measuredDistance } = this.state.stepsCalibration;
      const setting = STEP_SETTINGS[axis];

      return (
        <div className={styles.panel}>
          <h5>{i18n._('Steps/mm Calibration')}</h5>
          <div className={styles.inputRow}>
            <label className={styles.field}>
              <span>{i18n._('Axis')}</span>
              <select
                value={axis}
                onChange={(event) => this.updateStepsCalibration('axis', event.target.value)}
              >
                {Object.keys(STEP_SETTINGS).map(axisName => (
                  <option key={axisName} value={axisName}>{axisName}</option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>{i18n._('Commanded distance')}</span>
              <input
                type="number"
                min="0"
                step="0.001"
                value={commandedDistance}
                onChange={(event) => this.updateStepsCalibration('commandedDistance', event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>{i18n._('Measured distance')}</span>
              <input
                type="number"
                min="0"
                step="0.001"
                value={measuredDistance}
                onChange={(event) => this.updateStepsCalibration('measuredDistance', event.target.value)}
              />
            </label>
            <div className={styles.field}>
              <span>{i18n._('New value')}</span>
              <div className={styles.readout}>
                {result ? result.nextValue : i18n._('Not ready')}
              </div>
            </div>
          </div>
          <div className={styles.helperText}>
            {i18n._('Current {{setting}} value: {{value}}', {
              setting,
              value: displayValue(this.state.settings[setting])
            })}
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!result || !this.canUseGrbl()}
              onClick={this.applyStepsCalibration}
            >
              <i className="fa fa-upload" />
              <Space width="8" />
              {i18n._('Apply')}
            </button>
          </div>
        </div>
      );
    }

    renderSettingControl(definition) {
      const value = this.getValue(definition.setting);

      if (definition.type === 'boolean') {
        return (
          <div className={styles.booleanField}>
            <label>
              <input
                type="checkbox"
                checked={isBooleanOn(value)}
                onChange={(event) => this.updatePendingValue(
                  definition.setting,
                  event.target.checked ? '1' : '0'
                )}
              />
              {isBooleanOn(value) ? i18n._('Enabled') : i18n._('Disabled')}
            </label>
          </div>
        );
      }

      if (definition.type === 'axisMask') {
        const mask = Number(value) || 0;
        return (
          <div className={styles.axisMask}>
            {AXES.map(axis => (
              <label key={axis.axis}>
                <input
                  type="checkbox"
                  checked={hasMaskBit(mask, axis.bit)}
                  onChange={(event) => this.updateAxisMask(
                    definition.setting,
                    axis.bit,
                    event.target.checked
                  )}
                />
                {axis.axis}
              </label>
            ))}
          </div>
        );
      }

      return (
        <label className={styles.field}>
          <span>{definition.units || i18n._('Value')}</span>
          <input
            type="number"
            min={Number.isFinite(definition.min) ? definition.min : undefined}
            step="0.001"
            value={value === undefined ? '' : value}
            onChange={(event) => this.updatePendingValue(definition.setting, event.target.value)}
          />
        </label>
      );
    }

    renderEditor() {
      const records = this.getSettingsForTab(this.state.activeTab);
      const selected = _find(records, { setting: this.state.selectedSetting }) || records[0];
      const value = this.getValue(selected.setting);
      const normalizedValue = this.normalizeValue(selected, value);
      const command = normalizedValue === null
        ? `${selected.setting}=...`
        : `${selected.setting}=${normalizedValue}`;

      return (
        <div className={styles.editorLayout}>
          <div className={styles.settingList}>
            {records.map(record => (
              <button
                key={record.setting}
                type="button"
                className={selected.setting === record.setting
                  ? styles.settingButtonActive
                  : styles.settingButton}
                onClick={() => this.selectSetting(record.setting)}
              >
                <span className={styles.settingCode}>{record.setting}</span>
                <span className={styles.settingName}>{i18n._(record.label)}</span>
                <span className={styles.settingValue}>
                  {displayValue(this.state.settings[record.setting])}
                </span>
              </button>
            ))}
          </div>
          <div className={styles.editor}>
            <div className={styles.settingTitle}>
              <h4>{i18n._(selected.label)}</h4>
              <span>{selected.setting}</span>
            </div>
            <div className={styles.settingDescription}>{i18n._(selected.description)}</div>
            <div className={styles.inputRow}>
              {this.renderSettingControl(selected)}
              <div className={styles.field}>
                <span>{i18n._('Current value')}</span>
                <div className={styles.readout}>
                  {displayValue(this.state.settings[selected.setting])}
                </div>
              </div>
            </div>
            <div className={styles.commandPreview}>{command}</div>
            {normalizedValue === null && (
              <div className={styles.textDanger}>
                {i18n._('This value is outside the allowed range.')}
              </div>
            )}
            <div className={styles.actions}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!this.canUseGrbl() || normalizedValue === null}
                onClick={this.applySelectedSetting}
              >
                <i className="fa fa-upload" />
                <Space width="8" />
                {i18n._('Apply')}
              </button>
              <button
                type="button"
                className="btn btn-default"
                disabled={!this.canUseGrbl()}
                onClick={this.refreshSettings}
              >
                <i className="fa fa-refresh" />
                <Space width="8" />
                {i18n._('Refresh')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    render() {
      return (
        <div className={styles.grblSettings}>
          {this.renderStatusBar()}
          {this.renderTabs()}
          {this.state.activeTab === 'backup'
            ? this.renderBackup()
            : (
              <div>
                {this.state.activeTab === 'motion' && this.renderStepsCalibration()}
                {this.renderEditor()}
              </div>
            )}
        </div>
      );
    }
}

export default GrblSettings;
