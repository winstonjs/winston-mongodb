/**
 * @module 'winston-mongodb'
 * @fileoverview Winston transport for logging into MongoDB
 * @license MIT
 * @author charlie@nodejitsu.com (Charlie Robbins)
 * @author 0@39.yt (Yurij Mikhalevich)
 */
'use strict';
const util = require('util');
const os = require('os');
const mongodb = require('mongodb');
const winston = require('winston');
const Transport = require('winston-transport');
const Stream = require('stream').Stream;
const helpers = require('./helpers');



/**
 * Constructor for the MongoDB transport object.
 * @constructor
 * @param {Object} options Options
 * @param {string} [options.level=info] Level of messages that this transport
 * should log.
 * @param {boolean} [options.silent=false] Boolean flag indicating whether to
 * suppress output.
 * @param {string|Object} options.db MongoDB connection uri or preconnected db
 * object.
 * @param {string} options.dbName The database name to connect to,
 * defaults to DB name based on connection URI if not provided
 * @param {Object} options.options MongoDB connection parameters
 * (optional, defaults to `{poolSize: 2, autoReconnect: true, useNewUrlParser: true}`).
 * @param {string} [options.collection=log] The name of the collection you want
 * to store log messages in.
 * @param {boolean} [options.storeHost=false] Boolean indicating if you want to
 * store machine hostname in logs entry, if set to true it populates MongoDB
 * entry with 'hostname' field, which stores os.hostname() value.
 * @param {string} options.label Label stored with entry object if defined.
 * @param {string} options.name Transport instance identifier. Useful if you
 * need to create multiple MongoDB transports.
 * @param {boolean} [options.capped=false] In case this property is true,
 * winston-mongodb will try to create new log collection as capped.
 * @param {number} [options.cappedSize=10000000] Size of logs capped collection
 * in bytes.
 * @param {number} options.cappedMax Size of logs capped collection in number
 * of documents.
 * @param {boolean} [options.tryReconnect=false] Will try to reconnect to the
 * database in case of fail during initialization. Works only if `db` is
 * a string.
 * @param {boolean} [options.decolorize=false] Will remove color attributes from
 * the log entry message.
 * @param {boolean} [options.leaveConnectionOpen=false] Will leave MongoClient connected
 * after transport shut down.
 * @param {number} options.expireAfterSeconds Seconds before the entry is removed.
 * Do not use if capped is set.
 */
const MongoDB = exports.MongoDB = function (options) {
  Transport.call(this, options);
  options = (options || {});
  if (!options.db) {
    throw new Error('You should provide db to log to.');
  }
  this.name = options.name || 'mongodb';
  this.db = options.db;
  this.dbName = (options.dbName || undefined);
  this.options = options.options;
  if (!this.options) {
    this.options = {
      poolSize: 2,
      autoReconnect: true,
      useNewUrlParser: true
    };
  }
  this.collection = (options.collection || 'log');
  this.level = (options.level || 'info');
  this.silent = options.silent;
  this.storeHost = options.storeHost;
  this.label = options.label;
  this.capped = options.capped;
  this.cappedSize = (options.cappedSize || 10000000);
  this.cappedMax = options.cappedMax;
  this.decolorize = options.decolorize;
  this.leaveConnectionOpen = options.leaveConnectionOpen;
  this.expireAfterSeconds = !this.capped && options.expireAfterSeconds;
  this.metaKey = options.metaKey || 'metadata';
  if (this.storeHost) {
    this.hostname = os.hostname();
  }
  this._opQueue = [];
  const self = this;

  function setupDatabaseAndEmptyQueue(db) {
    return createCollection(db).then(db => {
      self.logDb = db;
      processOpQueue();
    }, err => {
      if (self.mongoClient && !self.leaveConnectionOpen) {
        self.mongoClient.close();
      }
      console.error('winston-mongodb, initialization error: ', err);
    });
  }
  function processOpQueue() {
    self._opQueue.forEach(operation =>
      self[operation.method].apply(self, operation.args));
    delete self._opQueue;
  }
  function createCollection(db) {
    const opts = Object.assign(
      {},
      self.capped ? { capped: true, size: self.cappedSize, max: self.cappedMax } : {}
    );
    return db.createCollection(self.collection, opts).then(col => {
      const ttlIndexName = 'timestamp_1';
      const indexOpts = { name: ttlIndexName, background: true };
      if (self.expireAfterSeconds) {
        indexOpts.expireAfterSeconds = self.expireAfterSeconds;
      }
      return col.indexInformation({ full: true }).then(info => {
        info = info.filter(i => i.name === ttlIndexName);
        if (info.length === 0) { // if its a new index then create it
          return col.createIndex({ timestamp: -1 }, indexOpts);
        }  // if index existed with the same name check if expireAfterSeconds param has changed
        if (info[0].expireAfterSeconds !== undefined &&
              info[0].expireAfterSeconds !== self.expireAfterSeconds) {
          return col.dropIndex(ttlIndexName)
            .then(() => col.createIndex({ timestamp: -1 }, indexOpts));
        }

      });
    }).catch(err => {
      // Since mongodb@3.6.0 db.createCollection throws an error (48) if the collection already exists
      if (err.code !== 48) throw err;
      return db.collection(self.collection);
    }).then(() => db);
  }
  function connectToDatabase(logger) {
    return mongodb.MongoClient.connect(logger.db, logger.options
    ).then(client => {
      logger.mongoClient = client;
      setupDatabaseAndEmptyQueue(client.db(self.dbName));
    }, err => {
      console.error('winston-mongodb: error initialising logger', err);
      if (options.tryReconnect) {
        console.log('winston-mongodb: will try reconnecting in 10 seconds');
        return new Promise(resolve => setTimeout(resolve, 10000)
        ).then(() => connectToDatabase(logger));
      }
    });
  }

  if (typeof this.db === 'string') {
    connectToDatabase(this);
  } else if (typeof this.db.then === 'function') {
    this.db.then(client => {
      this.mongoClient = client;
      setupDatabaseAndEmptyQueue(client.db(self.dbName));
    }, err => console.error('winston-mongodb: error initialising logger from promise', err));
  } else if (typeof this.db.db === 'function') {
    this.mongoClient = this.db;
    setupDatabaseAndEmptyQueue(this.db.db(self.dbName));
  } else { // preconnected object
    console.warn(
      'winston-mongodb: preconnected object support is deprecated and will be removed in v5');
    setupDatabaseAndEmptyQueue(this.db);
  }
};


/**
 * Inherit from `winston-transport`.
 */
util.inherits(MongoDB, Transport);


/**
 * Define a getter so that `winston.transports.MongoDB`
 * is available and thus backwards compatible.
 */
winston.transports.MongoDB = MongoDB;


/**
 * Closes MongoDB connection so using process would not hang up.
 * Used by winston Logger.close on transports.
 */
MongoDB.prototype.close = function () {
  this.logDb = null;
  if (!this.mongoClient || this.leaveConnectionOpen) {
    return;
  }
  this.mongoClient.close().then(() => { this.mongoClient = null; }).catch(err => {
    console.error('Winston MongoDB transport encountered on error during '
        + 'closing.', err);
  });
};


/**
 * Core logging method exposed to Winston. Metadata is optional.
 * @param {Object} info Logging metadata
 * @param {Function} cb Continuation to respond to when complete.
 * @returns {boolean} Result boolean
 */
MongoDB.prototype.log = function (info, cb) {
  if (!this.logDb) {
    this._opQueue.push({ method: 'log', args: arguments });
    return true;
  }
  if (!cb) {
    cb = () => {};
  }
  // Avoid reentrancy that can be not assumed by database code.
  // If database logs, better not to call database itself in the same call.
  process.nextTick(() => {
    if (this.silent) {
      // eslint-disable-next-line callback-return
      cb(null, true);
    }
    // eslint-disable-next-line no-control-regex
    const decolorizeRegex = new RegExp(/\u001b\[[0-9]{1,2}m/g);
    const entry = { timestamp: new Date(), level: (this.decolorize) ? info.level.replace(decolorizeRegex, '') : info.level };
    const msg = util.format(info.message, ...(info.splat || []));
    entry.message = (this.decolorize) ? msg.replace(decolorizeRegex, '') : msg;
    // get 'meta' object from info object - as per winston doc: Properties besides level and message are considered as "meta".
    const { level, message, ...meta } = info;
    // prepare meta object for storage
    const metaData = helpers.prepareMetaData(meta);
    // if metadata is not empty object add it to entry - makes no sense to store empty object
    if (Object.keys(metaData).length > 0) {
      entry[this.metaKey] = metaData;
    }
    if (this.storeHost) {
      entry.hostname = this.hostname;
    }

    if (this.label) {
      entry.label = this.label;
    }
    this.logDb.collection(this.collection).insertOne(entry).then(() => {
      this.emit('logged');
      cb(null, true);
    }).catch(err => {
      this.emit('error', err);
      cb(err);
    });
  });
  return true;
};


/**
 * Query the transport. Options object is optional.
 * @param {Object=} optOptions Loggly-like query options for this instance.
 * @param {Function} cb Continuation to respond to when complete.
 */
MongoDB.prototype.query = function (optOptions, cb) {
  if (!this.logDb) {
    this._opQueue.push({ method: 'query', args: arguments });
    return;
  }
  if (typeof optOptions === 'function') {
    cb = optOptions;
    optOptions = {};
  }
  const options = this.normalizeQuery(optOptions);
  const query = { timestamp: { $gte: options.from, $lte: options.until }};
  const opt = {
    skip: options.start,
    limit: options.rows,
    sort: { timestamp: options.order === 'desc' ? -1 : 1 }
  };
  if (options.fields) {
    opt.fields = options.fields;
  }
  this.logDb.collection(this.collection).find(query, opt).toArray().then(docs => {
    if (!options.includeIds) {
      docs.forEach(log => delete log._id);
    }
    cb(null, docs);
  }).catch(cb);
};


/**
 * Returns a log stream for this transport. Options object is optional.
 * This will only work with a capped collection.
 * @param {Object} options Stream options for this instance.
 * @param {Stream} stream Pass in a pre-existing stream.
 * @returns {Stream} Log stream for the transport
 */
MongoDB.prototype.stream = function (options, stream) {
  options = options || {};
  stream = stream || new Stream();
  let start = options.start;
  if (!this.logDb) {
    this._opQueue.push({ method: 'stream', args: [options, stream] });
    return stream;
  }
  stream.destroy = function () {
    this.destroyed = true;
  };
  if (start === -1) {
    start = null;
  }
  const col = this.logDb.collection(this.collection);
  if (start !== null) {
    col.find({}, { skip: start }).toArray().then(docs => {
      docs.forEach(doc => {
        if (!options.includeIds) {
          delete doc._id;
        }
        stream.emit('log', doc);
      });
      delete options.start;
      this.stream(options, stream);
    }).catch(err => stream.emit('error', err));
    return stream;
  }
  if (stream.destroyed) {
    return stream;
  }
  col.isCapped().then(capped => {
    if (!capped) {
      return this.streamPoll(options, stream);
    }
    const cursor = col.find({}, { tailable: true });
    stream.destroy = function () {
      this.destroyed = true;
      cursor.destroy();
    };
    cursor.on('data', doc => {
      if (!options.includeIds) {
        delete doc._id;
      }
      stream.emit('log', doc);
    });
    cursor.on('error', err => stream.emit('error', err));
  }).catch(err => stream.emit('error', err));
  return stream;
};


/**
 * Returns a log stream for this transport. Options object is optional.
 * @param {Object} options Stream options for this instance.
 * @param {Stream} stream Pass in a pre-existing stream.
 * @returns {Stream} Log stream for the transport
 */
MongoDB.prototype.streamPoll = function (options, stream) {
  options = options || {};
  stream = stream || new Stream();
  const self = this;
  let start = options.start;
  let last;
  if (!this.logDb) {
    this._opQueue.push({ method: 'streamPoll', args: [options, stream] });
    return stream;
  }
  if (start === -1) {
    start = null;
  }
  if (start === null) {
    last = new Date(new Date() - 1000);
  }
  stream.destroy = function () {
    this.destroyed = true;
  };
  (function check() {
    const query = last ? { timestamp: { $gte: last }} : {};
    self.logDb.collection(self.collection).find(query).toArray().then(docs => {
      if (stream.destroyed) {
        return;
      }
      if (!docs.length) {
        return next();
      }
      if (start === null) {
        docs.forEach(doc => {
          if (!options.includeIds) {
            delete doc._id;
          }
          stream.emit('log', doc);
        });
      } else {
        docs.forEach(doc => {
          if (!options.includeIds) {
            delete doc._id;
          }
          if (!start) {
            stream.emit('log', doc);
          } else {
            start -= 1;
          }
        });
      }
      last = new Date(docs.pop().timestamp);
      next();
    }).catch(err => {
      if (stream.destroyed) {
        return;
      }
      // eslint-disable-next-line callback-return
      next();
      stream.emit('error', err);
    });
    function next() {
      setTimeout(check, 2000);
    }
  }());
  return stream;
};
