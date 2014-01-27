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
var net = require('net');

var toNumber = function (x) {
  return (x = Number(x)) >= 0 ? x : false;
};

var askMaster = function () {};
if ('function' === (typeof process.send)) {
  askMaster = function () {
    process.send.apply(process, arguments);
  };
}

var _sandboxNet = null;
exports.create = function (options) {

  if (_sandboxNet) {
    return _sandboxNet;
  }

  var _options = {
    'appname' : 'demo',
  };
  for (var i in options) {
    _options[i] = options[i];
  }

  _sandboxNet = net;

  var Socket = _sandboxNet.Socket;
  Socket.prototype.__defineGetter__('remoteAddress', function () {
    return this.__fakeRemoteAddress || this._getpeername().address;
  });
  Socket.prototype.__defineGetter__('remotePort', function (port) {
    return this.__fakeRemotePort || this._getpeername().port;
  });

  /**
   * @ 端口映射表
   */
  var _portsMap = {};

  var Server = _sandboxNet.Server;

  var __listen = Server.prototype.listen;
  Server.prototype.listen = function () {

    var _self = this;
    var lastArg = arguments[arguments.length - 1];
    if ('function' === (typeof lastArg)) {
      _self.once('listening', lastArg);
    }

    var usePort = 0;
    if (arguments.length > 0 && 'function' !== (typeof arguments[0])) {
      usePort = toNumber(arguments[0]);
      arguments[0] = 0;
    }

    if (false === usePort) {
      throw new Error('Invalid listen argument, please use numeric port to listen.');
    }

    var who = ['0.0.0.0', usePort];
    if (arguments.length > 1 && 'string' === (typeof arguments[1])) {
      who[0] = arguments[1];
    }

    var idx = who.join(':');
    if (usePort > 0 && _portsMap[idx]) {
      return;
    }

    _self.on('close', function () {
      askMaster({
        'type' : 'net',
        'data' : ['-'].concat(who),
      });
      _portsMap[idx] = undefined;
    });

    _portsMap[idx] = -1;
    arguments[arguments.length - 1] = function () {
      var $ = _self.address() || {};
      debug('mapping port %s to %s:%d', idx, $.address, $.port);
      askMaster({
        'type' : 'net',
        'data' : ['+', $.address, usePort, $.port]
      });
      _portsMap[idx] = $.port;
    };
    __listen.apply(_self, arguments);
  };

  return _sandboxNet;
};

