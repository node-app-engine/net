/* vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker: */

"use strict";

var fs = require('fs');
var path = require('path');
var should = require('should');

var getModule = function (options) {
  return require(__dirname + '/../').init(options);
};

var NET = require('net');
var net = getModule({
  'socketsPath' : __dirname + '/tmp/',
  'address' : 'www.taobao.com',
  'deniedPorts' : [11211, 7899],
});

var cleanFiles = function (dir, pattern) {
  try {
    fs.readdirSync(dir).forEach(function (fn) {
      if (pattern.test(fn)) {
        fs.unlinkSync(path.join(dir, fn));
      }
    });
  } catch (ex) {
    if ('ENOENT' === ex.code) {
      fs.mkdirSync(dir);
    }
  }
};

describe('sandbox modules interface', function () {

  beforeEach(function () {
    cleanFiles(__dirname + '/tmp', /.+?\.sock$/);
  });

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

    (function () {
      _me.listen(11211);
    }).should.throw('EACCES, Permission denied (11211).');

    var __message = [];
    _me.close();
    _me.listen(11222, function () {
      __message.push('listen1');
    });
    _me.listen(11222);
    _me.listen(11222, function () {
      _me.address().should.eql({
        'port' : 11222, 'address' : 'www.taobao.com'
      });

      NET.createConnection({'path' : _me._pipeName}, function (err) {
        should.ok(!err);

        var str = '220.37.24.113:77291';
        var buf = new Buffer(4 + str.length + 3);
        buf.writeUInt8(str.length, 0);
        buf.write(str, 4);
        buf.write('779', 4 + str.length);

        this.write(buf);
        this.end(', to be end.');
        this.on('data', function (data) {
          String(data).should.eql('hello [220.37.24.113:77291]:779, to be end.');
          _me.close(function () {
            __message.should.include('listen1');
            done();
          });
        });
      });
    });
  });
  /* }}} */

  it('should_invalid_tcp_request_works_fine', function (done) {
    var _me = net.createServer(function (socket) {
      socket.pipe(socket);
    });

    var num = 0;
    var alldone = function () {
      if (0 === (--num)) {
        _me.close();
        done();
      }
    };
    _me.listen(11233, function () {
      num++;
      NET.createConnection({'path' : _me._pipeName}, function (err) {
        should.ok(!err);
        this.end('abcdefghijk');    // 11 characters
        this.on('data', function (data) {
          //console.log('' + data);
        });
        this.on('close', alldone);
      });

      num++;
      NET.createConnection({'path' : _me._pipeName}, function (err) {
        should.ok(!err);
        var str = '110.23.1.1:4434';
        var buf = new Buffer(4 + str.length - 1);
        buf.writeUInt8(str.length, 0);
        buf.write(str, 4);
        this.end(buf);
        this.on('data', function (data) {
          //console.log('' + data);
        });
        this.on('close', alldone);
      });
    });
  });

  /* {{{ */
  it('clean', function () {
  });
  /* }}} */

});

