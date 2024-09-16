# winston-mongodb

A MongoDB transport for [winston][0].

Current version supports only mongodb driver version 3.x and newer and winston 3.x and newer.
If you want to use winston-mongodb with mongodb version 1.4.x use winston-mongodb <1.x. 
For mongodb 2.x use winston-mongodb <3.x.

## Motivation
`tldr;?`: To break the [winston][0] codebase into small modules that work
together.

The [winston][0] codebase has been growing significantly with contributions and
other logging transports. This is **awesome**. However, taking a ton of
additional dependencies just to do something simple like logging to the Console
and a File is overkill.  

## Usage
``` js
const winston = require('winston');
// Requiring `winston-mongodb` will expose winston.transports.MongoDB`
require('winston-mongodb');

const log = winston.createLogger({
  level: 'info',
  transports: [
    // write errors to console too
    new winston.transports.Console({format: winston.format.simple(), level:'error'})
  ],
});

// logging to console so far
log.info('Connecting to database...');

const MongoClient = require('mongodb').MongoClient;
const url = "mongodb://localhost:27017/mydb";

const client = new MongoClient(url);
await client.connect();

const transportOptions = {
  db: await Promise.resolve(client),
  collection: 'log'
};

log.add(new winston.transports.MongoDB(transportOptions));

// following entry should appear in log collection and will contain
// metadata JSON-property containing url field
log.info('Connected to database.',{url});

```

The MongoDB transport takes the following options. Only option `db` is required:

| Option |  Description                                     |
| ------ | :----------------------------------------------- |
| db     | **REQUIRED**. MongoDB connection uri, pre-connected `MongoClient` object or promise which resolves to a pre-connected `MongoClient` object. |
| dbname | The database name to connect to, defaults to DB name based on connection URI if not provided, ignored if using a pre-connected connection. |
| options| MongoDB connection parameters.<br/>Defaults to `{maxPoolSize: 2}`). |
| collection | The name of the collection you want to store log messages in.<br/>Defaults to `log`. |
| level  | Level of messages that this transport should log.<br/>Defaults to `info`. |
| silent | Boolean flag indicating whether to suppress output.<br/>Defaults to `false`. |
| storeHost | Boolean indicating if you want to store machine hostname in logs entry, if set to true it populates MongoDB entry with 'hostname' field, which stores os.hostname() value. |
| label  | If set to true, then label attribute content will be stored in `label` field, if detected in meta-data. |
| name | Transport instance identifier. Useful if you need to create multiple MongoDB transports. |
| capped | In case this property is true, winston-mongodb will try to create new log collection as capped.<br/>Defaults to `false`. |
| cappedSize | Size of logs capped collection in bytes.<br/>Defaults to 10,000,000. |
| cappedMax | Size of logs capped collection in number of documents. |
| tryReconnect | Will try to reconnect to the database in case of fail during initialization. Works only if __db__ is a string.<br/>Defaults to `false`. |
| decolorize | Will remove color attributes from the log entry message.<br/>Defaults to `false`. |
| leaveConnectionOpen| Will leave MongoClient connected after transport shuts down. |
| metaKey | Configure name of the field which is used to store metadata in the logged info object.<br/>Defaults to `metadata` to remain compatible with the [metadata format](https://github.com/winstonjs/logform/blob/master/examples/metadata.js) |
| expireAfterSeconds |Seconds before the entry is removed. Works only if __capped__ is not set. |

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

## [Changelog](https://github.com/winstonjs/winston-mongodb/releases)

#### Author: [Charlie Robbins](http://blog.nodejitsu.com)
#### Contributors: [Yurij Mikhalevich](https://github.com/yurijmikhalevich), [Kendrick Taylor](https://github.com/sktaylor), [Yosef Dinerstein](https://github.com/yosefd), [Steve Dalby](https://github.com/stevedalby)

[0]: https://github.com/winstonjs/winston
