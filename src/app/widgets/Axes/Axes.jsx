import PropTypes from 'prop-types';
import React from 'react';
import controller from 'app/lib/controller';
import { AXIS_X, AXIS_Y, AXIS_Z } from '../../constants';
import DisplayPanel from './DisplayPanel';
import Keypad from './Keypad';
import MDI from './MDI';
import styles from './index.styl';

const axisHomeCommand = (axis) => {
  const axisLabel = axis.toUpperCase();
  if (axisLabel === 'X' || axisLabel === 'Y') {
    return ['G53 G0 Z-5', '%wait', `$H${axisLabel}`];
  }
  return `$H${axisLabel}`;
};

const Axes = (props) => {
  const { state, actions } = props;
  const canHomeAxis = (axis) => state.canClick && state.axes.indexOf(axis) >= 0;
  const homeAxis = (axis) => {
    controller.command('gcode', axisHomeCommand(axis));
  };

  return (
    <div>
      <DisplayPanel
        canClick={state.canClick}
        units={state.units}
        axes={state.axes}
        machinePosition={state.machinePosition}
        workPosition={state.workPosition}
        jog={state.jog}
        actions={actions}
        controllerType={state.controller.type}
      />
      <div className={styles.axisHomingPanel}>
        <button
          type="button"
          className="btn btn-default btn-sm"
          disabled={!canHomeAxis(AXIS_X)}
          title="Home X axis: G53 G0 Z-5, wait, $HX"
          onClick={() => homeAxis(AXIS_X)}
        >
          <i aria-hidden="true" className="fa fa-home" />
          <span>X</span>
        </button>
        <button
          type="button"
          className="btn btn-default btn-sm"
          disabled={!canHomeAxis(AXIS_Y)}
          title="Home Y axis: G53 G0 Z-5, wait, $HY"
          onClick={() => homeAxis(AXIS_Y)}
        >
          <i aria-hidden="true" className="fa fa-home" />
          <span>Y</span>
        </button>
        <button
          type="button"
          className="btn btn-default btn-sm"
          disabled={!canHomeAxis(AXIS_Z)}
          title="Home Z axis ($HZ)"
          onClick={() => homeAxis(AXIS_Z)}
        >
          <i aria-hidden="true" className="fa fa-home" />
          <span>Z</span>
        </button>
      </div>
      <Keypad
        canClick={state.canClick}
        units={state.units}
        axes={state.axes}
        jog={state.jog}
        actions={actions}
      />
      <MDI
        canClick={state.canClick}
        mdi={state.mdi}
      />
    </div>
  );
};

Axes.propTypes = {
  state: PropTypes.object,
  actions: PropTypes.object
};

export default Axes;
