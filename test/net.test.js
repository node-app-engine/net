/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

"use strict";

var fs = require('fs');
var path = require('path');
var should = require('should');

var getModule = function (options) {
  return require(__dirname + '/../').create(options);
};

var NET = require('net');
var net = getModule({
  'appname' : 'test'
});

describe('sandbox modules interface', function () {

  /* {{{ should_net_interface_works_fine() */
  it('should_net_interface_works_fine', function (done) {
    Object.keys(NET).should.eql(Object.keys(net));

    var _me = net.createServer(function (req) {
      req.on('data', function (data) {
        req.end('hello [' + req.remoteAddress + ':' + req.remotePort +  ']:' + data);
      });
    });

    _me.on('error', function (err) {
      done();
    });

    should.ok(!_me.address());

    (function () {
      _me.listen({
        'fd' : 2
      });
    }).should.throw('Invalid listen argument, please use numeric port to listen.');

    var __message = [];
    _me.listen(11222, function () {
      __message.push('listen1');
    });
    _me.listen(11222);
    _me.listen(11222, function () {
      var mapPort = _me.address().port;
      NET.createConnection(mapPort, function (err) {
        should.ok(!err);
        this.on('close', function () {
          _me.close();
          __message.should.include('listen1');
          done();
        });
        this.write('hello');
      });
    });
  });
  /* }}} */

});

