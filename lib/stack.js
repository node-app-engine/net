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

var util = require('util');
var Emitter = require('events').EventEmitter;

var _HEADER = '[NAE]:';

var Parser = exports.Parser = function () {
  Emitter.call(this);

  var _buffer = [];

  var _stoped = false;

  var _self = this;
  var _stackParse = function (end) {
    if (_stoped) {
      return;
    }

    var off = _HEADER.length;
    var buf = Buffer.concat(_buffer);
    if (!end && buf.length < off) {
      return;
    }

    if (_HEADER !== buf.toString('utf8', 0, off)) {
      _stoped = true;
      _self.emit('end', {}, buf);
      return;
    }

    if (buf.length < off + 4) {
      if (end) {
        _stoped = true;
        _self.emit('end', {}, buf);
      }
      return;
    }

    var len = buf.readUInt8(off);

    off += 4;
    if (!end && buf.length < off + len) {
      return;
    }

    var mix = {};
    try {
      mix = JSON.parse(buf.toString('utf8', off, off + len));
      off += len;
    } catch (e) {
      off = 0;
    }

    _stoped = true;
    _self.emit('end', mix, buf.slice(off));
  };

  this.push = function (buf, end) {
    _buffer.push(buf);
    _stackParse(end);
  };

  return this;
};
util.inherits(Parser, Emitter);

