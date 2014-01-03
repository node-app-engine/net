/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker:
 * nae-net - lib/net.js
 *
 * Copyright(c) nae team and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   aleafs <zhangxc83@gmail.com> (http://aleafs.github.com)
 */

"use strict";

var debug = require('debug')('nae:net');
var fs = require('fs');
var net = require('net');
var path = require('path');
var util = require('util');

var Parser = require('./stack.js').Parser;

var toNumber = function (x) {
  return (x = Number(x)) >= 0 ? x : false;
};

var _sandboxNet = null;
exports.create = function (options) {

  if (_sandboxNet) {
    return _sandboxNet;
  }

  var _options = {
    'socketsPath' : '/tmp',
    'defaultPort' : 8080,
    'allowedPort' : [],
  };
  for (var i in options) {
    _options[i] = options[i];
  }

  _sandboxNet = net;

  /**
   * @ 端口映射表
   */
  var _portsMap = {};

  var Socket = _sandboxNet.Socket;
  Socket.prototype.__defineSetter__('remoteAddress', function (addr) {
    this.__fakeRemoteAddress = addr;
  });
  Socket.prototype.__defineGetter__('remoteAddress', function () {
    return this.__fakeRemoteAddress || this._getpeername().address;
  });

  Socket.prototype.__defineSetter__('remotePort', function (port) {
    this.__fakeRemotePort = port;
  });
  Socket.prototype.__defineGetter__('remotePort', function (port) {
    return this.__fakeRemotePort || this._getpeername().port;
  });

  var Server = _sandboxNet.Server;

  var __listen = Server.prototype.listen;
  Server.prototype.listen = function () {
    var args = Array.prototype.slice.apply(arguments);
    var port = _options.defaultPort;

    if (args.length > 0 && 'function' !== (typeof args[0])) {
      port = toNumber(args[0]);
    }

    if (false === port) {
      throw new Error('Invalid listen argument, please use numeric port to listen.');
    }

    port = port || _options.defaultPort;
    if (port !== _options.defaultPort && _options.allowedPort.indexOf(port) < 0) {
      throw new Error('EACCES, Permission denied (' + port + ').');
    }

    this.__fakePort = port;
    if (_portsMap[port]) {
      if ('function' === (typeof args[args.length - 1])) {
        this.once('listening', args[args.length - 1]);
      }
      return;
    }

    var sktfile = path.join(_options.socketsPath, port + '_' + process.pid + '.sock');
    _portsMap[port] = sktfile;

    var _shutdown = function () {
      _portsMap[port] = null;
      try {
        fs.unlinkSync(sktfile);
      } catch (ex) {
      }
    };

    var that = this;
    fs.unlink(sktfile, function (err) {
      if (err && err.code !== 'ENOENT') {
        that.emit('error', util._errnoException(new Error('EACCES'), 'listen'));
        return;
      }

      that.on('error', _shutdown);
      that.on('close', _shutdown);

      __listen.call(that, sktfile, function () {
        debug('mapping port %d to "%s"', port, sktfile);
        that.on('connection', function (socket) {

          debug('client ondata listeners: %d', socket.listeners('data').length);
          var ondata = socket.listeners('data');
          socket.removeAllListeners('data');

          var skton = socket.on;

          var stack = new Parser();
          stack.on('end', function (data, buffer) {
            data = data || {};
            for (var i in data) {
              socket[i] = data[i];
            }
            socket.removeAllListeners('data');
            socket.on = skton;
            ondata.forEach(function (fn) {
              socket.on('data', fn);
            });
            ondata = [];
            socket.emit('data', buffer);
          });

          socket.on('data', function (data) {
            stack.push(data);
          });

          socket.on = function (evt, cb) {
            if ('data' !== evt) {
              skton.apply(this, arguments);
            } else {
              ondata.push(cb);
            }
          };
        });
        if ('function' === (typeof args[args.length - 1])) {
          args[args.length - 1].apply(that);
        }
      });
    });
  };

  var __address = Server.prototype.address;
  Server.prototype.address = function () {
    if (!this._handle) {
      return null;
    }

    if (this.__fakePort) {
      return {'port' : this.__fakePort, 'address' : _options.address || '0.0.0.0'};
    }

    return __address.call(this);
  };

  var __close = Server.prototype.close;
  Server.prototype.close = function () {
    if (this.__fakePort) {
      debug('close listener on port %d', this.__fakePort);
      _portsMap[this.__fakePort] = null;
      this.__fakePort = null;
    }

    if (this._handle) {
      __close.apply(this, arguments);
    }
  };

  return _sandboxNet;
};

