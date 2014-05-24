# winston

A MongoDB transport for [winston][0].

## Motivation
`tldr;?`: To break the [winston][0] codebase into small modules that work together.

The [winston][0] codebase has been growing significantly with contributions and other logging transports. This is **awesome**. However, taking a ton of additional dependencies just to do something simple like logging to the Console and a File is overkill.  

## Usage
``` js
  var winston = require('winston');
  
  //
  // Requiring `winston-mongodb` will expose 
  // `winston.transports.MongoDB`
  //
  require('winston-mongodb').MongoDB;
  
  winston.add(winston.transports.MongoDB, options);
```

The MongoDB transport takes the following options. 'db' is required:

* __level:__ Level of messages that this transport should log, defaults to 'info'.
* __silent:__ Boolean flag indicating whether to suppress output, defaults to false.

* __db:__ The name of the database you want to log to.
* __collection__: The name of the collection you want to store log messages in, defaults to 'logs'.
* __safe:__ Boolean indicating if you want eventual consistency on your log messages, if set to true it requires an extra round trip to the server to ensure the write was committed, defaults to true.
* __nativeParser:__ Boolean indicating if you want the driver to use native parser feature or not.
* __host:__ The host running MongoDB, defaults to localhost.
* __port:__ The port on the host that MongoDB is running on, defaults to MongoDB's default port.
* __username:__ The username to use when logging into MongoDB.
* __password:__ The password to use when logging into MongoDB. If you don't supply a username and password it will not use MongoDB authentication.
* __errorTimeout:__  Reconnect timeout upon connection error from Mongo, defaults to 10 seconds (10000).
* __timeout:__ Timeout for keeping idle connection to Mongo alive, defaults to 10 seconds (10000).
* __storeHost:__ Boolean indicating if you want to store machine hostname in logs entry, if set to true it populates MongoDB entry with 'hostname' field, which stores os.hostname() value.
* __ssl:__ Boolean indicating if you want to use SSL connections or not.
* __authDb:__ Authentication database object.
* __dbUri:__ Alternative way of specifying database connection data. Note, that __replica sets are unsupported__. If you specify a replica set or multiple databases, will be used first database connection data.

*Notice:* __db__ is required. You should specify it directly or in __dbUri__.

*Metadata:* Logged as a native JSON object.

## Querying and streaming logs

Besides supporting the main options from winston, this transport supports the following extra options:

* __includeIds:__ Whether the returned logs should include the `_id` attribute settled by mongodb, defaults to `false`.

## Installation

### Installing npm (node package manager)

``` bash
  $ curl http://npmjs.org/install.sh | sh
```

### Installing winston-mongodb

``` bash
  $ npm install winston
  $ npm install winston-mongodb
```

#### Author: [Charlie Robbins](http://blog.nodejitsu.com)
#### Contributors: [Kendrick Taylor](https://github.com/sktaylor), [Yosef Dinerstein](https://github.com/yosefd), [Yurij Mikhalevich](https://github.com/39dotyt), [Steve Dalby](https://github.com/stevedalby)

[0]: https://github.com/flatiron/winston
