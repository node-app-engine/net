nae-net
=======

[![Build Status](https://secure.travis-ci.org/node-app-engine/net.png)](http://travis-ci.org/node-app-engine/net) [![Coverage Status](https://coveralls.io/repos/node-app-engine/net/badge.png)](https://coveralls.io/r/node-app-engine/net) [![Dependency Status](https://gemnasium.com/node-app-engine/net.png)](https://gemnasium.com/node-app-engine/net)

[![NPM](https://nodei.co/npm/nae-net.png?downloads=true&stars=true)](https://nodei.co/npm/nae-net/)

![logo](https://raw.github.com/node-app-engine/net/master/logo.png)

## About

* mapping port listening to unix domain;
* `remoteAddress` , `remotePort` parse;

## Usage

```javascript

var net = require('nae-net').create(options);
net.createServer(function (c) {
  c.end('hello world');
}).listen(8080);

```

## License

(The MIT License)

Copyright (c) nae team and other contributors.

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
