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
    }

    if (false === usePort) {
      throw new Error('Invalid listen argument, please use numeric port to listen.');
    }

    if (usePort > 0 && usePort in _portsMap) {
      return;
    }

    _portsMap[usePort] = -1;
    __listen.call(_self, 0, function () {
      var mapPort = _self.address().port;
      _portsMap[usePort] = mapPort;
      debug('mapping port %d to %d', usePort, mapPort);
      askMaster({
        'type' : 'event',
        'data' : {
          'name' : 'listen',
          'port' : usePort,
          'file' : mapPort,
        }
      });
    });
  };

  return _sandboxNet;
};

