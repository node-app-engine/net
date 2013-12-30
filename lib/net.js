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

var toNumber = function (x) {
  return (x = Number(x)) >= 0 ? x : false;
};

var _sandboxNet = null;
exports.init = function (options) {

  if (_sandboxNet) {
    return _sandboxNet;
  }

  var _options = {
    'socketsPath' : '/tmp',
    'defaultPort' : 8080,
    'deniedPorts' : [],
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

    if (!port) {
      throw new Error('Invalid listen argument, please use numeric port to listen.');
    }

    if (_options.deniedPorts.indexOf(port) > -1) {
      throw new Error('EACCES, Permission denied (' + port + ').');
    }

    this.__fakePort = port;
    if (_portsMap[port]) {
      if ('function' === (typeof args[args.length - 1])) {
        this.once('listening', args[args.length - 1]);
      }
      return;
    }

    var sock = path.join(_options.socketsPath, port + '_' + process.pid + '.sock');
    _portsMap[port] = sock;

    var _shutdown = function () {
      _portsMap[port] = null;
      try {
        fs.unlinkSync(sock);
      } catch (ex) {
      }
    };

    var that = this;
    fs.unlink(sock, function (err) {
      if (err && err.code !== 'ENOENT') {
        that.emit('error', util._errnoException(new Error('EACCES'), 'listen'));
        return;
      }

      that.on('error', _shutdown);
      that.on('close', _shutdown);

      __listen.call(that, sock, function () {
        that.on('connection', function (socket) {

          /**
           * @ see: src/proxy/http/index.js:56
           */
          var buffer = [];
          var buflen = 0;

          var ondata = socket.listeners('data');
          socket.removeAllListeners('data');

          var on = socket.on;
          socket.on('data', function (buf) {
            buffer.push(buf);
            buflen += buf.length;
            if (buflen < 12) {
              return;
            }
 
            buf = Buffer.concat(buffer);
            var len = buf.readUInt8(0);
            if (buf.length < 4 + len) {
              return;
            }

            var tmp = String(buf.slice(4, 4 + len)).split(':');
            socket.remoteAddress = tmp[0];
            socket.remotePort = parseInt(tmp[1], 10);
            socket.removeAllListeners('data');
            socket.on = on;
            ondata.forEach(function (fn) {
              socket.on('data', fn);
            });
            ondata = [];
            socket.emit('data', buf.slice(4 + len));
          });
          socket.on = function (evt, cb) {
            if ('data' !== evt) {
              on.apply(this, arguments);
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
      return {'port' : this.__fakePort, 'address' : _options.address || '127.0.0.1'};
    }

    return __address.call(this);
  };

  var __close = Server.prototype.close;
  Server.prototype.close = function () {
    if (this.__fakePort) {
      _portsMap[this.__fakePort] = null;
      this.__fakePort = null;
    }

    if (this._handle) {
      __close.apply(this, arguments);
    }
  };

  return _sandboxNet;
};

