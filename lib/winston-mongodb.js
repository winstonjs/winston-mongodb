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
const Stream = require('stream').Stream;
const helpers = require('./helpers');



/**
 * Constructor for the MongoDB transport object.
 * @constructor
 * @param {Object} options
 * @param {string=info} options.level Level of messages that this transport
 * should log.
 * @param {boolean=false} options.silent Boolean flag indicating whether to
 * suppress output.
 * @param {string|Object} options.db MongoDB connection uri or preconnected db
 * object.
 * @param {Object} options.options MongoDB connection parameters
 * (optional, defaults to `{db: {native_parser: true},
 * server: {poolSize: 2, socketOptions: {autoReconnect: true}}}`).
 * @param {string=logs} options.collection The name of the collection you want
 * to store log messages in.
 * @param {boolean=false} options.storeHost Boolean indicating if you want to
 * store machine hostname in logs entry, if set to true it populates MongoDB
 * entry with 'hostname' field, which stores os.hostname() value.
 * @param {string} options.username The username to use when logging into
 * MongoDB.
 * @param {string} options.password The password to use when logging into
 * MongoDB. If you don't supply a username and password it will not use MongoDB
 * authentication.
 * @param {string} options.label Label stored with entry object if defined.
 * @param {string} options.name Transport instance identifier. Useful if you
 * need to create multiple MongoDB transports.
 * @param {boolean=false} options.capped In case this property is true,
 * winston-mongodb will try to create new log collection as capped.
 * @param {number=10000000} options.cappedSize Size of logs capped collection
 * in bytes.
 * @param {number} options.cappedMax Size of logs capped collection in number
 * of documents.
 * @param {boolean=false} options.tryReconnect Will try to reconnect to the
 * database in case of fail during initialization. Works only if `db` is
 * a string.
 * @param {boolean=false} options.decolorize Will remove color attributes from
 * the log entry message.
 * @param {number} options.expireAfterSeconds Seconds before the entry is removed. Do not use if capped is set.
 */
let MongoDB = exports.MongoDB = function(options) {
  winston.Transport.call(this, options);
  options = (options || {});
  if (!options.db) {
    throw new Error('You should provide db to log to.');
  }
  this.name = options.name || 'mongodb';
  this.db = options.db;
  this.options = options.options;
  if (!this.options) {
    this.options = {
      db: {native_parser: true},
      server: {poolSize: 2, socketOptions: {autoReconnect: true}}
    };
  }
  this.collection = (options.collection || 'log');
  this.level = (options.level || 'info');
  this.silent = options.silent;
  this.username = options.username;
  this.password = options.password;
  this.storeHost = options.storeHost;
  this.label = options.label;
  this.capped = options.capped;
  this.cappedSize = (options.cappedSize || 10000000);
  this.cappedMax = options.cappedMax;
  this.decolorize = options.decolorize;
  this.expireAfterSeconds = !this.capped && options.expireAfterSeconds;
  if (this.storeHost) {
    this.hostname = os.hostname();
  }
  this._opQueue = [];
  let self = this;

  function setupDatabaseAndEmptyQueue(db) {
    return authorizeDb(db).then(createCollection, err=>{
      db.close();
      console.error('winston-mongodb, initialization error: ', err);
    }).then(db=>{
      self.logDb = db;
      processOpQueue();
    });
  }
  function processOpQueue() {
    self._opQueue.forEach(operation=>
      self[operation.method].apply(self, operation.args));
    delete self._opQueue;
  }
  function createCollection(db) {
    let opts = self.capped ?
      {capped: true, size: self.cappedSize, max: self.cappedMax} : {};
    return db.createCollection(self.collection, opts).then(col=>{
      const ttlIndexName = 'timestamp_1';
      let indexOpts = {name: ttlIndexName, background: true};
      if (self.expireAfterSeconds) {
        indexOpts.expireAfterSeconds = self.expireAfterSeconds;
      }
      return col.indexInformation({full: true}).then(info=>{
        info = info.filter(i=>i.name === ttlIndexName);
        if (info.length === 0) { // if its a new index then create it
          return col.createIndex({timestamp: -1}, indexOpts);
        } else { // if index existed with the same name check if expireAfterSeconds param has changed
          if (info[0].expireAfterSeconds !== self.expireAfterSeconds) {
            return col.dropIndex(ttlIndexName)
            .then(()=>col.createIndex({timestamp: -1}, indexOpts));
          }
        }
      });
    }).then(()=>db);
  }
  function authorizeDb(db) {
    if (self.username && self.password) {
      return db.authenticate(self.username, self.password).then(ok=>{
        if (!ok) {
          throw new Error('invalid username or password');
        }
        return db;
      });
    } else {
      return new Promise(resolve=>resolve(db));
    }
  }
  function connectToDatabase(logger) {
    return mongodb.MongoClient.connect(logger.db, logger.options
    ).then(setupDatabaseAndEmptyQueue, err=>{
      console.error('winston-mongodb: error initialising logger', err);
      if (options.tryReconnect) {
        console.log('winston-mongodb: will try reconnecting in 10 seconds');
        return new Promise(resolve=>setTimeout(resolve, 10000)
        ).then(()=>connectToDatabase(logger));
      }
    });
  }

  if ('string' === typeof this.db) {
    connectToDatabase(this);
  } else if ('function' === typeof this.db.then) {
    this.db.then(setupDatabaseAndEmptyQueue, err=>console.error(
        'winston-mongodb: error initialising logger from promise', err));
  } else { // preconnected object
    setupDatabaseAndEmptyQueue(this.db);
  }
};


/**
 * Inherit from `winston.Transport`.
 */
util.inherits(MongoDB, winston.Transport);


/**
 * Define a getter so that `winston.transports.MongoDB`
 * is available and thus backwards compatible.
 */
winston.transports.MongoDB = MongoDB;


/**
 * Closes MongoDB connection so using process would not hang up.
 * Used by winston Logger.close on transports.
 */
MongoDB.prototype.close = function() {
  if (!this.logDb) {
    return;
  }
  this.logDb.close(err=>{
    if (err) {
      console.error('Winston MongoDB transport encountered on error during' +
          ' closing.', err);
    } else {
      this.logDb = null;
    }
  });
};


/**
 * Core logging method exposed to Winston. Metadata is optional.
 * @param {string} level Level at which to log the message.
 * @param {string} msg Message to log
 * @param {Object=} opt_meta Additional metadata to attach
 * @param {Function} cb Continuation to respond to when complete.
 */
MongoDB.prototype.log = function(level, msg, opt_meta, cb) {
  if (!this.logDb) {
    this._opQueue.push({method: 'log', args: arguments});
    return;
  }
  /**
   * Avoid reentrancy that can be not assumed by database code.
   * If database logs, better not to call database itself in the same call.
   */
  process.nextTick(()=>{
    if (this.silent) {
      cb(null, true);
      return;
    }
    function onError(err) {
      this.emit('error', err);
      cb(err, null);
    }
    this.logDb.collection(this.collection, (err, col)=>{
      if (err) {
        onError(err);
        return;
      }
      let entry = {};
      entry.message = this.decolorize ? msg.replace(/\u001b\[[0-9]{1,2}m/g, '') : msg;
      entry.timestamp = new Date();
      entry.level = level;
      entry.meta = helpers.prepareMetaData(opt_meta);
      if (this.storeHost) {
        entry.hostname = this.hostname;
      }
      if (this.label) {
        entry.label = this.label;
      }
      col.insertOne(entry, err=>{
        if (err) {
          onError(err);
          return;
        }
        this.emit('logged');
        cb(null, true);
      });
    });
  });
};


/**
 * Query the transport. Options object is optional.
 * @param {Object=} opt_options Loggly-like query options for this instance.
 * @param {Function} callback Continuation to respond to when complete.
 * @return {*}
 */
MongoDB.prototype.query = function(opt_options, callback) {
  if (!this.logDb) {
    this._opQueue.push({
      method: 'query',
      args: arguments
    });
    return;
  }
  if ('function' === typeof opt_options) {
    callback = opt_options;
    opt_options = {};
  }
  let options = this.normalizeQuery(opt_options);
  let query = {timestamp: {$gte: options.from, $lte: options.until}};
  let opt = {
    skip: options.start,
    limit: options.rows,
    sort: {timestamp: options.order === 'desc' ? -1 : 1}
  };
  if (options.fields) {
    opt.fields = options.fields;
  }
  this.logDb.collection(this.collection, function(err, col) {
    if (err) {
      callback(err);
      return;
    }
    col.find(query, opt).toArray(function(err, docs) {
      if (err) {
        callback(err);
        return;
      }
      if (!options.includeIds) {
        docs.forEach(function(log) {
          delete log._id;
        });
      }
      if (callback) {
        callback(null, docs);
      }
    });
  });
};


/**
 * Returns a log stream for this transport. Options object is optional.
 * This will only work with a capped collection.
 * @param {Object} options Stream options for this instance.
 * @param {Stream} stream Pass in a pre-existing stream.
 * @return {Stream}
 */
MongoDB.prototype.stream = function(options, stream) {
  options = options || {};
  stream = stream || new Stream;
  let self = this;
  let start = options.start;
  if (!this.logDb) {
    this._opQueue.push({method: 'stream', args: [options, stream]});
    return stream;
  }
  stream.destroy = function() {
    this.destroyed = true;
  };
  if (start === -1) {
    start = null;
  }
  if (start != null) {
    this.logDb.collection(this.collection, function(err, col) {
      if (err) {
        stream.emit('error', err);
        return;
      }
      col.find({}, {skip: start}).toArray(function(err, docs) {
        if (err) {
          stream.emit('error', err);
          return;
        }
        docs.forEach(function(doc) {
          if (!options.includeIds) {
            delete doc._id;
          }
          stream.emit('log', doc);
        });
        delete options.start;
        self.stream(options, stream);
      });
    });
    return stream;
  }
  this.logDb.collection(this.collection, function(err, col) {
    if (err) {
      stream.emit('error', err);
      return;
    }
    if (stream.destroyed) {
      return;
    }
    col.isCapped(function(err, capped) {
      if (err) {
        stream.emit('error', err);
        return;
      }
      if (capped) {
        let cursor = col.find({}, {tailable: true});
        stream.destroy = function() {
          this.destroyed = true;
          cursor.destroy();
        };
        cursor.on('data', function(doc) {
          if (!options.includeIds) {
            delete doc._id;
          }
          stream.emit('log', doc);
        });
        cursor.on('error', function(err) {
          stream.emit('error', err);
        });
      } else {
        self.streamPoll(options, stream);
      }
    });
  });
  return stream;
};


/**
 * Returns a log stream for this transport. Options object is optional.
 * @param {Object} options Stream options for this instance.
 * @param {Stream} stream Pass in a pre-existing stream.
 * @return {Stream}
 */
MongoDB.prototype.streamPoll = function(options, stream) {
  options = options || {};
  stream = stream || new Stream;
  let self = this;
  let start = options.start;
  let last;
  if (!this.logDb) {
    this._opQueue.push({
      method: 'streamPoll',
      args: [options, stream]
    });
    return stream;
  }
  if (start === -1) {
    start = null;
  }
  if (start == null) {
    last = new Date(new Date - 1000);
  }
  stream.destroy = function() {
    this.destroyed = true;
  };
  (function check() {
    self.logDb.collection(self.collection, function(err, col) {
      if (err) {
        stream.emit('error', err);
        return;
      }
      let query = last ? {timestamp: {$gte: last}} : {};
      col.find(query).toArray(function(err, docs) {
        if (stream.destroyed) {
          return;
        }
        if (err) {
          next();
          stream.emit('error', err);
          return;
        }
        if (!docs.length) {
          return next();
        }
        if (start == null) {
          docs.forEach(function(doc) {
            if (!options.includeIds) {
              delete doc._id;
            }
            stream.emit('log', doc);
          });
        } else {
          docs.forEach(function(doc) {
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
      });
    });
    function next() {
      setTimeout(check, 2000);
    }
  })();
  return stream;
};
