import jwt from 'jsonwebtoken';
import io from 'socket.io-client';
import { ensureArray } from 'ensure-type';
import config from '../configstore';
import settings from '../../config/settings';
import logger from '../../lib/logger';

const Autolevel = require('./autolevel.js');

const log = logger('service:autolevel-extension');

let socket = null;
let autolevel = null;
let mountedPort = null;
let retryTimer = null;
let runtimeOptions = null;
let serialportWriteHandler = null;

const generateAccessToken = (payload, secret, expiration) => {
  return jwt.sign(payload, secret, {
    expiresIn: expiration
  });
};

const getInternalUser = () => {
  const users = ensureArray(config.get('users', []));

  return users[0] || {};
};

const getPortName = (port) => {
  return port && (port.port || port.comName);
};

const clearRetryTimer = () => {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
};

const requestPortList = () => {
  if (!socket || runtimeOptions.port) {
    return;
  }

  socket.emit('list');
};

const schedulePortList = () => {
  clearRetryTimer();
  retryTimer = setTimeout(requestPortList, 2000);
};

const attachAutolevel = (port) => {
  if (autolevel || !socket || !port) {
    return;
  }

  runtimeOptions.port = port;
  mountedPort = port;
  autolevel = new Autolevel(socket, runtimeOptions);

  serialportWriteHandler = (data, context) => {
    if ((data.indexOf('(autolevel_reapply)') >= 0 || data.indexOf('#autolevel_reapply') >= 0) && context) {
      autolevel.reapply(data, context);
    } else if ((data.indexOf('(autolevel_get_mesh)') >= 0 || data.indexOf('#autolevel_get_mesh') >= 0) && context) {
      autolevel.dumpMesh();
    } else if ((data.indexOf('(autolevel') >= 0 || data.indexOf('#autolevel') >= 0) && context) {
      if (data.indexOf('apply_skew') >= 0) {
        autolevel.applyCompensation({ skew: true, mesh: false });
      } else if (data.indexOf('apply_mesh') >= 0) {
        autolevel.applyCompensation({ skew: false, mesh: true });
      } else if (data.indexOf('clear_mesh') >= 0) {
        autolevel.clearMesh();
      } else if (data.indexOf('skew') >= 0) {
        autolevel.setSkew(data, context);
      } else if (data.indexOf('fetch_settings') >= 0) {
        autolevel.fetchSettings();
      } else if (data.indexOf('save_settings') >= 0) {
        autolevel.saveSettings(data);
      } else if (data.indexOf('stop') >= 0) {
        autolevel.stop();
      } else {
        autolevel.start(data, context);
      }
    } else if (data.indexOf('PROBEOPEN') > 0) {
      const start = data.indexOf('PROBEOPEN') + 9;
      const end = data.indexOf(')');

      if (end > 0) {
        autolevel.fileOpen(data.substring(start, end).trim());
      }
    } else if (data.indexOf('PROBECLOSE') > 0) {
      autolevel.fileClose();
    } else {
      autolevel.updateContext(context);
    }
  };

  socket.on('serialport:write', serialportWriteHandler);

  socket.emit('write', port, '(AL: connected)\n');
  log.info(`Autolevel extension attached to ${port}`);
};

const start = ({ host = 'localhost', port = 8000, controllerType = 'Grbl' } = {}) => {
  if (socket) {
    return;
  }

  const user = getInternalUser();
  const token = generateAccessToken(
    { id: user.id, name: user.name },
    config.get('secret') || settings.secret,
    settings.accessTokenLifetime
  );
  const socketHost = (!host || host === '0.0.0.0' || host === '::') ? 'localhost' : host;
  const socketUrl = `ws://${socketHost}:${port}`;

  runtimeOptions = {
    id: user.id,
    name: user.name,
    secret: config.get('secret') || settings.secret,
    port: null,
    baudrate: 115200,
    outDir: '',
    socketAddress: socketHost,
    socketPort: port,
    controllerType: controllerType || 'Grbl',
    accessTokenLifetime: settings.accessTokenLifetime
  };

  socket = io.connect(socketUrl, {
    query: `token=${token}`
  });

  socket.on('connect', () => {
    log.info(`Autolevel extension connected to ${socketUrl}`);
    requestPortList();
  });

  socket.on('serialport:list', (ports = []) => {
    if (runtimeOptions.port) {
      clearRetryTimer();
      return;
    }

    const activePort = ensureArray(ports).find(port => port.inuse || port.isOpen);
    const portName = getPortName(activePort);

    if (!portName) {
      schedulePortList();
      return;
    }

    clearRetryTimer();
    socket.emit('open', portName, {
      baudrate: Number(runtimeOptions.baudrate),
      controllerType: runtimeOptions.controllerType
    });
  });

  socket.on('serialport:open', (connectionOptions = {}) => {
    const portName = connectionOptions.port;

    if (!portName || mountedPort === portName) {
      return;
    }

    if (connectionOptions.baudrate) {
      runtimeOptions.baudrate = connectionOptions.baudrate;
    }

    socket.emit('open', portName, {
      baudrate: Number(runtimeOptions.baudrate),
      controllerType: runtimeOptions.controllerType
    });
    attachAutolevel(portName);
  });

  socket.on('serialport:error', (connectionOptions = {}) => {
    log.error(`Error opening serial port "${connectionOptions.port || ''}"`);
  });

  socket.on('serialport:close', (connectionOptions = {}) => {
    if (runtimeOptions.port !== connectionOptions.port) {
      return;
    }

    mountedPort = null;
    runtimeOptions.port = null;
    if (serialportWriteHandler) {
      socket.removeListener('serialport:write', serialportWriteHandler);
      serialportWriteHandler = null;
    }
    autolevel = null;
    requestPortList();
  });

  socket.on('connect_error', (err) => {
    log.error('Autolevel extension connection error:', err);
  });

  socket.on('error', (err) => {
    log.error('Autolevel extension socket error:', err);
  });

  socket.on('close', () => {
    mountedPort = null;
    runtimeOptions.port = null;
    if (serialportWriteHandler) {
      socket.removeListener('serialport:write', serialportWriteHandler);
      serialportWriteHandler = null;
    }
    autolevel = null;
  });
};

export default {
  start
};
