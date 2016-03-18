# winston
[![Gitter](https://badges.gitter.im/Join Chat.svg)](https://gitter.im/indexzero/winston-mongodb?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

A MongoDB transport for [winston][0].

Current version supports only mongodb driver version 2.x. If you want to use
winston-mongodb with mongodb version 1.4.x use winston-mongodb <1.x.

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
  
  /**
   * Requiring `winston-mongodb` will expose
   * `winston.transports.MongoDB`
   */
  require('winston-mongodb').MongoDB;
  
  winston.add(winston.transports.MongoDB, options);
```

The MongoDB transport takes the following options. 'db' is required:

* __level:__ Level of messages that this transport should log, defaults to
'info'.
* __silent:__ Boolean flag indicating whether to suppress output, defaults to
false.
* __db:__ MongoDB connection uri, pre-connected db object or promise object
which will be resolved with pre-connected db object.
* __options:__ MongoDB connection parameters (optional, defaults to
`{db: {native_parser: true}, server: {poolSize: 2, socketOptions: {autoReconnect: true}}}`).
* __collection__: The name of the collection you want to store log messages in,
defaults to 'log'.
* __storeHost:__ Boolean indicating if you want to store machine hostname in
logs entry, if set to true it populates MongoDB entry with 'hostname' field,
which stores os.hostname() value.
* __username:__ The username to use when logging into MongoDB.
* __password:__ The password to use when logging into MongoDB. If you don't
supply a username and password it will not use MongoDB authentication.
* __label:__ Label stored with entry object if defined.
* __name:__ Transport instance identifier. Useful if you need to create multiple
MongoDB transports.
* __capped:__ In case this property is true, winston-mongodb will try to create
new log collection as capped, defaults to false.
* __cappedSize:__ Size of logs capped collection in bytes, defaults to 10000000.
* __cappedMax:__ Size of logs capped collection in number of documents.
* __tryReconnect:__ Will try to reconnect to the database in case of fail during
initialization. Works only if __db__ is a string. Defaults to false.

*Metadata:* Logged as a native JSON object in 'meta' property.

*Logging unhandled exceptions:* For logging unhandled exceptions specify
winston-mongodb as `handleExceptions` logger according to winston documentation.

## Querying and streaming logs

Besides supporting the main options from winston, this transport supports the
following extra options:

* __includeIds:__ Whether the returned logs should include the `_id` attribute
settled by mongodb, defaults to `false`.

## Installation

``` bash
  $ npm install winston
  $ npm install winston-mongodb
```

## Changelog

### Brief 1.1.0 changelog

* added support of passing promises objects which will be resolved with
pre-connected db object in options.db;
* fixed issue when events logged sometime between authorizeDb and
processOpQuery calls may be lost;
* renamed default log collection to 'log' because it makes more sense than
'logs' ('log' is a list of messages already, plural form would imply
multiple of such lists).

### Brief 1.0.0 changelog

* migrated to mongodb 2.x driver;
* changed configuration format to MongoDB uri string;
* added support of passing pre-connected db object instead of MongoDB uri string;
* added support of passing MongoDB connection parameters in options property;
* added support of replica sets through new options and db properties;
* migrated to [Semantic Versioning](http://semver.org/) in package versions names;
* changed comments format to JSDoc;
* removed authDb from configuration options (it's impossible to handle all
possible authorization scenarios, so, if you need to use complicated
authorization pattern, please provide winston-mongodb with already prepared
db connection object).

### Brief 0.5 changelog

* metadata is now stored into separate property `meta`; so, there is no risk
that some of the metadata object's properties will conflict with logging entry
properties.

#### Author: [Charlie Robbins](http://blog.nodejitsu.com)
#### Contributors: [Yurij Mikhalevich](https://github.com/39dotyt), [Kendrick Taylor](https://github.com/sktaylor), [Yosef Dinerstein](https://github.com/yosefd), [Steve Dalby](https://github.com/stevedalby)

[0]: https://github.com/flatiron/winston
