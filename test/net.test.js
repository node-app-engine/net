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
  'socketsPath' : __dirname + '/tmp/',
  'address' : 'www.taobao.com',
  'allowedPort' : [11222, 11233],
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

describe('net stack parser interface', function () {

  var Stack = require(__dirname + '/../lib/stack.js');

  /* {{{ should_unmatched_package_head_works_fine() */
  it('should_unmatched_package_head_works_fine', function (done) {
    var _me = new Stack.Parser();
    _me.once('end', function (mix, buf) {
      mix.should.eql({});
      buf.toString().should.eql('hello');
      done();
    });
    _me.push(new Buffer('hello'), true);
  });
  /* }}} */

  /* {{{ should_too_small_package_head_works_fine() */
  it('should_too_small_package_head_works_fine', function (done) {
    var _me = new Stack.Parser();
    _me.once('end', function (mix, buf) {
      mix.should.eql({});
      buf.toString().should.eql('hel');
      done();
    });
    _me.push(new Buffer('hel'), true);
  });
  /* }}} */

  /* {{{ should_invalid_data_length_works_fine() */
  it('should_invalid_data_length_works_fine', function (done) {
    var _me = new Stack.Parser();
    _me.once('end', function (mix, buf) {
      mix.should.eql({});
      buf.toString().should.eql('[NAE]:3');
      done();
    });
    _me.push(new Buffer('[NAE]'));
    _me.push(new Buffer(':3'), true);
  });
  /* }}} */

  /* {{{ should_uncomplete_data_length_works_fine() */
  it('should_uncomplete_data_length_works_fine', function (done) {
    var _me = new Stack.Parser();
    _me.once('end', function (mix, buf) {
      mix.should.eql({'a' : 'b'});
      buf.toString().should.eql('');
      done();
    });
    _me.push(new Buffer('[NAE]:'));

    var buf = new Buffer(4);
    buf.writeUInt8(12, 0);
    _me.push(buf);
    _me.push(new Buffer('{"a":"b"}'), true);
  });
  /* }}} */

  /* {{{ should_json_parse_error_works_fine() */
  it('should_json_parse_error_works_fine', function (done) {
    var _me = new Stack.Parser();
    _me.once('end', function (mix, buf) {
      mix.should.eql({});
      buf.toString().should.eql('[NAE]:\u0007\u0000\u0000\u0000{\"a\":\"b\"');
      done();
    });
    _me.push(new Buffer('[NAE]:'));

    var buf = new Buffer(4);
    buf.writeUInt8(7, 0);
    _me.push(buf);
    _me.push(new Buffer('{"a":"b"'), true);
  });
  /* }}} */

  /* {{{ should_normal_package_works_fine() */
  it('should_normal_package_works_fine', function (done) {
    var _me = new Stack.Parser();
    _me.once('end', function (mix, buf) {
      mix.should.eql({'a' : 'b'});
      buf.toString().should.eql('GET / HTTP1.1\r\n');
      done();
    });
    _me.push(new Buffer('[NAE]:'));

    var buf = new Buffer(4);
    buf.writeUInt8(9, 0);
    _me.push(buf);
    _me.push(new Buffer('{"a":"b"}GET / HTTP1.1\r\n'));
  });
  /* }}} */

});

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

        var str = JSON.stringify({
          'remoteAddress' : '220.37.24.113',
          'remotePort' : 77291,
        });

        var buf = new Buffer(10 + str.length + 3);
        buf.write('[NAE]:');
        buf.writeUInt8(str.length, 6);
        buf.write(str, 10);
        buf.write('779', 10 + str.length);

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

  /* {{{ should_invalid_tcp_request_works_fine() */
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
  /* }}} */

  /* {{{ should_listen_to_0_works_fine() */
  it('should_listen_to_0_works_fine', function (done) {
    net.createServer(function (socket) {
      socket.close();
    }).listen(0, function () {
      this.address().should.eql({
         port: 8080, address: 'www.taobao.com'
      });
      this.close();
      done();
    });
  });
  /* }}} */

  /* {{{ */
  it('clean', function () {
  });
  /* }}} */

});

