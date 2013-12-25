nae-net
=======

## About

* mapping port listening to unix domain;
* `remoteAddress` , `remotePort` parse;

## Usage

```javascript

var net = require('nae-net').init(options);
net.createServer(function (c) {
  c.end('hello world');
}).listen(8080);

```
