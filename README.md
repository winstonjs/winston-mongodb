# winston
[![Gitter](https://badges.gitter.im/Join Chat.svg)](https://gitter.im/indexzero/winston-mongodb?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

A MongoDB transport for [winston][0].

## Motivation
`tldr;?`: To break the [winston][0] codebase into small modules that work
together.

The [winston][0] codebase has been growing significantly with contributions and
other logging transports. This is **awesome**. However, taking a ton of
additional dependencies just to do something simple like logging to the Console
and a File is overkill.  

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

* __level:__ Level of messages that this transport should log, defaults to
'info'.
* __silent:__ Boolean flag indicating whether to suppress output, defaults to
false.

* __db:__ The name of the database you want to log to.
* __collection__: The name of the collection you want to store log messages in,
defaults to 'logs'.
* __safe:__ Boolean indicating if you want eventual consistency on your log
messages, if set to true it requires an extra round trip to the server to ensure the write was committed, defaults to true.
* __nativeParser:__ Boolean indicating if you want the driver to use native
parser feature or not.
* __host:__ The host running MongoDB, defaults to localhost.
* __port:__ The port on the host that MongoDB is running on, defaults to
MongoDB's default port.
* __username:__ The username to use when logging into MongoDB.
* __password:__ The password to use when logging into MongoDB. If you don't
supply a username and password it will not use MongoDB authentication.
* __errorTimeout:__  Reconnect timeout upon connection error from Mongo,
defaults to 10 seconds (10000).
* __timeout:__ Timeout for keeping idle connection to Mongo alive, defaults to
10 seconds (10000).
* __storeHost:__ Boolean indicating if you want to store machine hostname in
logs entry, if set to true it populates MongoDB entry with 'hostname' field,
which stores os.hostname() value.
* __label:__ Label stored with entry object if defined.
* __ssl:__ Boolean indicating if you want to use SSL connections or not.
* __authDb:__ Authentication database object.
* __replSet:__ Replica set name.
* __hosts:__ Array of replica set hosts (in format
`{host: 'string', port: 'number'}`)
* __dbUri:__ Alternative way of specifying database connection data. Supported
specifying database, host, port, username, password and replica sets.
* __name:__ Transport instance identifier. Useful if you need to create multiple MongoDB transports.

*Notice:* __db__ is required. You should specify it directly or in __dbUri__.

*ReplicaSet Notice:* If you use replica set, __db__, __replSet__ and __hosts__
are required. They may also be specified in __dbUri__.

*Metadata:* Logged as a native JSON object in meta property.

*Logging unhandled exceptions:* For logging unhandled exceptions specify
winston-mongodb as `handleExceptions` logger according to winston documentation.

## Querying and streaming logs

Besides supporting the main options from winston, this transport supports the
following extra options:

* __includeIds:__ Whether the returned logs should include the `_id` attribute
settled by mongodb, defaults to `false`.

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

## Changelog

### Brief 0.5 changelog

* metadata is now stored into separate property `meta`; so, there is no risk
that some of the metadata object's properties will conflict with logging entry
properties.

#### Author: [Charlie Robbins](http://blog.nodejitsu.com)
#### Contributors: [Yurij Mikhalevich](https://github.com/39dotyt), [Kendrick Taylor](https://github.com/sktaylor), [Yosef Dinerstein](https://github.com/yosefd), [Steve Dalby](https://github.com/stevedalby)

[0]: https://github.com/flatiron/winston
