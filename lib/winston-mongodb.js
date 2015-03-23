/**
 * @module winston-mongodb
 * @fileoverview Transport for outputting to a MongoDB database
 * @license MIT
 * @author charlie@nodejitsu.com (Charlie Robbins)
 * @author 0@39.yt (Yurij Mikhalevich)
 */
var util = require('util');
var os = require('os');
var mongodb = require('mongodb');
var winston = require('winston');
var Stream = require('stream').Stream;
var helpers = require('./helpers');



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
 */
var MongoDB = exports.MongoDB = function(options) {
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
      db: {
        native_parser: true
      },
      server: {
        poolSize: 2,
        socketOptions: {autoReconnect: true}
      }
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

  if (this.storeHost) {
    this.hostname = os.hostname();
  }

  this._opQueue = [];

  var self = this;

  function setupDatabaseAndEmptyQueue(db) {
    authorizeDb(db, function(err, db) {
      createCollection(db, function(err, db) {
        self.logDb = db;
        processOpQueue();
      });
    });
  }

  function processOpQueue() {
    self._opQueue.forEach(function(operation) {
      self[operation.method].apply(self, operation.args);
    });
    delete self._opQueue;
  }

  function createCollection(db, cb) {
    var opts = {};
    if (self.capped) {
      opts = {capped: true, size: self.cappedSize};
    }
    db.createCollection(self.collection, opts, function() {
      cb(null, db);
    });
  }

  function authorizeDb(db, cb) {
    if (self.username && self.password) {
      db.authenticate(self.username, self.password,
          function(err, result) {
            if (err) {
              console.error('winston-mongodb: error initialising logger', err);
              db.close();
              return;
            }
            if (!result) {
              console.error('winston-mongodb: invalid username or password');
              db.close();
              return;
            }
            cb(null, db);
          }
      );
    }
    cb(null, db);
  }

  if ('string' === typeof this.db) {
    mongodb.MongoClient.connect(this.db, this.options, function(err, db) {
      if (err) {
        console.error('winston-mongodb: error initialising logger', err);
        return;
      }
      setupDatabaseAndEmptyQueue(db);
    });
  } else if ('function' === typeof this.db.then) {
    this.db.then(function(db) {
      setupDatabaseAndEmptyQueue(db);
    }, function(err) {
      console.error(
          'winston-mongodb: error initialising logger from promise', err);
    });
  } else {
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
 * Core logging method exposed to Winston. Metadata is optional.
 * @param {string} level Level at which to log the message.
 * @param {string} msg Message to log
 * @param {Object=} opt_meta Additional metadata to attach
 * @param {Function} callback Continuation to respond to when complete.
 */
MongoDB.prototype.log = function(level, msg, opt_meta, callback) {
  if (!this.logDb) {
    this._opQueue.push({
      method: 'log',
      args: arguments
    });
    return;
  }

  var self = this;

  /**
   * Avoid reentrancy that can be not assumed by database code.
   * If database logs, better not to call database itself in the same call.
   */
  process.nextTick(function() {
    if (self.silent) {
      callback(null, true);
      return;
    }

    function onError(err) {
      self.emit('error', err);
      callback(err, null);
    }

    self.logDb.collection(self.collection, function(err, col) {
      if (err) {
        onError(err);
        return;
      }

      var entry = {};
      entry.message = msg;
      entry.timestamp = new Date();
      entry.level = level;
      entry.meta = helpers.prepareMetaData(opt_meta);
      if (self.storeHost) {
        entry.hostname = self.hostname;
      }
      if (self.label) {
        entry.label = self.label;
      }

      col.insertOne(entry, function(err) {
        if (err) {
          onError(err);
          return;
        }

        self.emit('logged');
        callback(null, true);
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

  var options = this.normalizeQuery(opt_options);

  var query = {
    timestamp: {
      $gte: options.from,
      $lte: options.until
    }
  };

  var opt = {
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
  var self = this;
  var start = options.start;

  if (!this.logDb) {
    this._opQueue.push({
      method: 'stream',
      args: [options, stream]
    });
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
        var cursor = col.find({}, {tailable: true});
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
  var self = this;
  var start = options.start;
  var last;

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

      var query = last ? {timestamp: {$gte: last}} : {};

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
