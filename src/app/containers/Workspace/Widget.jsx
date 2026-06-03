import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import AxesWidget from 'app/widgets/Axes';
import AutolevelWidget from 'app/widgets/Autolevel';
import CalibrationWidget from 'app/widgets/Calibration';
import ConnectionWidget from 'app/widgets/Connection';
import ConsoleWidget from 'app/widgets/Console';
import GCodeWidget from 'app/widgets/GCode';
import GrblWidget from 'app/widgets/Grbl';
import MacroWidget from 'app/widgets/Macro';
import SpindleWidget from 'app/widgets/Spindle';
import CustomWidget from 'app/widgets/Custom';
import ToolWidget from 'app/widgets/Tool';
import VisualizerWidget from 'app/widgets/Visualizer';
import WebcamWidget from 'app/widgets/Webcam';

const getWidgetByName = (name) => {
  return {
    'autolevel': AutolevelWidget,
    'axes': AxesWidget,
    'calibration': CalibrationWidget,
    'connection': ConnectionWidget,
    'console': ConsoleWidget,
    'gcode': GCodeWidget,
    'grbl': GrblWidget,
    'macro': MacroWidget,
    'spindle': SpindleWidget,
    'custom': CustomWidget,
    'tool': ToolWidget,
    'visualizer': VisualizerWidget,
    'webcam': WebcamWidget
  }[name] || null;
};

class WidgetWrapper extends PureComponent {
    widget = null;

    render() {
      const { widgetId } = this.props;

      if (typeof widgetId !== 'string') {
        return null;
      }

      // e.g. "webcam" or "webcam:d8e6352f-80a9-475f-a4f5-3e9197a48a23"
      const name = widgetId.split(':')[0];
      const Widget = getWidgetByName(name);

      if (!Widget) {
        return null;
      }

      return (
        <Widget
          {...this.props}
          ref={node => {
            this.widget = node;
          }}
        />
      );
    }
}

WidgetWrapper.propTypes = {
  widgetId: PropTypes.string.isRequired
};

export default WidgetWrapper;
