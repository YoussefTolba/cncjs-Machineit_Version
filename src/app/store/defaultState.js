import {
  IMPERIAL_STEPS,
  METRIC_STEPS
} from '../constants';

const defaultState = {
  session: {
    name: '',
    token: ''
  },
  workspace: {
    container: {
      default: {
        widgets: ['visualizer']
      },
      primary: {
        show: true,
        widgets: [
          'connection', 'console', 'grbl', 'webcam',
        ]
      },
      secondary: {
        show: true,
        widgets: [
          'axes', 'gcode', 'macro', 'autolevel', 'calibration', 'tool', 'spindle',
        ]
      }
    },
    machineProfile: {
      id: null
    }
  },
  widgets: {
    autolevel: {
      minimized: false,
      startX: 0,
      endX: 100,
      stepX: 5,
      startY: 0,
      endY: 100,
      stepY: 5,
      clearanceZ: 10,
      startZ: 5,
      endZ: -10,
      feedrate: 10,
    },
    calibration: {
      minimized: false,
      activeTab: 'xy-skew',
      xySkew: {
        cornerSpacing: 40
      }
    },
    axes: {
      minimized: false,
      axes: ['x', 'y', 'z'],
      jog: {
        keypad: false,
        imperial: {
          step: IMPERIAL_STEPS.indexOf(1), // Defaults to 1 inch
          distances: []
        },
        metric: {
          step: METRIC_STEPS.indexOf(1), // Defaults to 1 mm
          distances: []
        }
      },
      mdi: {
        disabled: false
      },
      shuttle: {
        feedrateMin: 500,
        feedrateMax: 2000,
        hertz: 10,
        overshoot: 1
      }
    },
    connection: {
      minimized: false,
      controller: {
        type: 'Grbl'
      },
      port: '', // will be deprecated in v2
      baudrate: 115200, // will be deprecated in v2
      connection: {
        type: 'serial',
        serial: {
          // RTS/CTS flow control
          rtscts: false,
          pin: {
            // Set DTR line status (default to null)
            dtr: null,
            // Set RTS line status (default to null)
            rts: null,
          },
        },
      },
      autoReconnect: true
    },
    console: {
      minimized: false
    },
    custom: {
      disabled: true,
      minimized: false,
      title: '',
      url: ''
    },
    gcode: {
      minimized: false
    },
    grbl: {
      minimized: false,
      panel: {
        queueReports: {
          expanded: true
        },
        statusReports: {
          expanded: true
        },
        modalGroups: {
          expanded: true
        }
      }
    },
    macro: {
      minimized: false
    },
    spindle: {
      minimized: false,
      speed: 1000
    },
    tool: {
      minimized: false,
    },
    visualizer: {
      minimized: false,

      // 3D View
      disabled: false,
      projection: 'orthographic', // 'perspective' or 'orthographic'
      cameraMode: 'pan', // 'pan' or 'rotate'
      gcode: {
        displayName: true
      },
      objects: {
        limits: {
          visible: true
        },
        coordinateSystem: {
          visible: true
        },
        gridLineNumbers: {
          visible: true
        },
        cuttingTool: {
          visible: true
        }
      }
    },
    webcam: {
      disabled: true,
      minimized: false,

      // local - Use a built-in camera or a connected webcam
      // stream - Use a URL that points to a stream in one of the following formats: Motion JPEG (mjpeg), RTSP, or H264 (MP4)
      mediaSource: 'local',

      // The device id
      deviceId: '',

      // The URL field is required for the M-JPEG stream
      url: '',

      geometry: {
        scale: 1.0,
        rotation: 0, // 0: 0, 1: 90, 2: 180, 3: 270
        flipHorizontally: false,
        flipVertically: false
      },
      crosshair: false,
      muted: false
    }
  }
};

export default defaultState;
