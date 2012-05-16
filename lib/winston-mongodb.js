/*
 * mongodb.js: Transport for outputting to a MongoDB database
 *
 * (C) 2010 Charlie Robbins, Kendrick Taylor
 * MIT LICENCE
 *
 */

var util = require('util');
var mongodb = require('mongodb');
var winston = require('winston');

//
// ### function MongoDB (options)
// Constructor for the MongoDB transport object.
//
var MongoDB = exports.MongoDB = function (options) {
  options = options || {};

  if (!options.db) {
    throw new Error("Cannot log to MongoDB without database name.");
  }

  var self = this;

  this.name         = 'mongodb';
  this.db           = options.db;
  this.host         = options.host || 'localhost';
  this.port         = options.port || mongodb.Connection.DEFAULT_PORT;
  this.collection   = options.collection || "log";
  this.safe         = options.safe || true;
  this.level        = options.level || 'info';
  this.silent       = options.silent || false;
  this.username     = options.username || null;
  this.password     = options.password || null;
  this.errorTimeout = options.errorTimeout || 10000;

  if (options.keepAlive !== true) {
    //
    // Backward compatibility for timeout delivered in keepAlive parameter.
    //
    this.timeout = options.timeout || options.keepAlive || 10000;
  }

  this.state     = 'unopened';
  this.timeoutId = null;
  this.pending   = [];

  this.server = new mongodb.Server(this.host, this.port, {});
  this.client = new mongodb.Db(this.db, this.server, {
    native_parser: false
  });

  this.server.on('error', function (err) {
    // Close session. Next log will reopen.
    self.close();
  });

  this.client.on('error', function (err) {
    // Close session. Next log will reopen.
    self.close();
  });
};

//
// Inherit from `winston.Transport`.
//
util.inherits(MongoDB, winston.Transport);

//
// Define a getter so that `winston.transports.MongoDB`
// is available and thus backwards compatible.
//
winston.transports.MongoDB = MongoDB;

//
// ### function log (level, msg, [meta], callback)
// #### @level {string} Level at which to log the message.
// #### @msg {string} Message to log
// #### @meta {Object} **Optional** Additional metadata to attach
// #### @callback {function} Continuation to respond to when complete.
// Core logging method exposed to Winston. Metadata is optional.
//
MongoDB.prototype.log = function (level, msg, meta, callback) {
  var self = this;

  //
  // Avoid reentrancy that can be not assumed by database code.
  // If database logs, better not to call database itself in the same call.
  //
  process.nextTick(function () {
    if (self.silent) {
      return callback(null, true);
    }

    self.open(function (err) {
      if (err) {
        self.emit('error', err);
        return callback(err, null);
      }

      // Set a timeout to close the client connection unless `self.keepAlive`
      // has been set to true in which case it is the responsibility of the
      // programmer to close the underlying connection.
      if (self.timeout) {
        if (self.timeoutId) {
          clearTimeout(self.timeoutId);
        }

        self.timeoutId = setTimeout(function () {
          // The session is idle. Closing it.
          self.close();
        }, self.timeout);
      }

      function onError(err) {
        self.close();
        self.emit('error', err);
        callback(err, null);
      }

      self._db.collection(self.collection, function (err, col) {
        if (err) {
          return onError(err);
        }

        var entry = {
          timestamp: new Date(), // RFC3339/ISO8601 format instead of common.timestamp()
          level: level,
          message: msg,
          meta: meta
        };

        col.save(entry, { safe: self.safe }, function (err) {
          if (err) {
            return onError(err);
          }

          self.emit('logged');
          callback(null, true);
        });
      });
    });
  });
};

//
// ### function query (options, callback)
// #### @options {Object} Loggly-like query options for this instance.
// #### @callback {function} Continuation to respond to when complete.
// Query the transport. Options object is optional.
//
MongoDB.prototype.query = function (options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  var self = this,
      options = this.normalizeQuery(options),
      query = {},
      opt = {},
      fields;

  if (options.fields) {
    fields = {};
    options.fields.forEach(function (key) {
      fields[key] = 1;
    });
  }

  query = {
    timestamp: {
      $gte: options.from,
      $lte: options.until
    }
  };

  opt = {
    skip: options.start,
    limit: options.rows,
    sort: { timestamp: options.order === 'desc' ? -1 : 1 }
  };

  if (fields) {
    opt.fields = fields;
  }

  this._db.collection(this.collection, function (err, col) {
    col.find(query, opt).toArray(function (err, docs) {
      if (callback) {
        if (err) return callback(err);
        callback(null, docs);
      }
    });
  });
};

//
// ### function stream (options)
// #### @options {Object} Stream options for this instance.
// Returns a log stream for this transport. Options object is optional.
//
MongoDB.prototype.stream = function (options) {
  var self = this,
      options = options || {},
      stream = new Stream,
      last,
      start = options.start,
      row = 0;

  if (start === -1) {
    start = null;
  }

  if (start == null) {
    last = new Date(0);
  }

  stream.destroy = function() {
    this.destroyed = true;
  };

  (function check() {
    self._db.collection(self.collection, function (err, col) {
      col.find({ timestamp: { $gte: last } }).toArray(function (err, docs) {
        if (err) return stream.emit('error', err);
        if (!docs.length) return;
        docs.forEach(function (log) {
          stream.emit('log', log);
        });
        last = new Date(docs.pop().timestamp);
      });
    });
  })();

  return stream;
};

//
// ### function open (callback)
// #### @callback {function} Continuation to respond to when complete
// Attempts to open a new connection to MongoDB. If one has not opened yet
// then the callback is enqueued for later flushing.
//
MongoDB.prototype.open = function (callback) {
  var self = this;

  if (this.state === 'opening' || this.state === 'unopened') {
    //
    // While opening our MongoDB connection, append any callback
    // to a list that is managed by this instance.
    //
    this.pending.push(callback);

    if (this.state === 'opening') {
      return;
    }
  }
  else if (this.state === 'opened') {
    return callback();
  }
  else if (this.state === 'error') {
    return callback(this.error);
  }

  //
  // Flushes any pending log messages to MongoDB.
  //
  function flushPending(err) {
    //
    // Iterate over all callbacks that have accumulated during
    // the creation of the TCP socket.
    //
    for (var i = 0; i < self.pending.length; i++) {
      self.pending[i](err);
    }

    //
    // Quickly truncate the Array (this is more performant).
    //
    self.pending.length = 0;
  }

  //
  // Helper function which executes if there is an error
  // establishing the connection.
  //
  function onError(err) {
    self.state = 'error';
    self.error = err;
    flushPending(err);

    //
    // Close to be able to attempt opening later.
    //
    self.client.close();

    //
    // Retry new connection upon following request after error timeout expired.
    //
    setTimeout(function () {
      //
      // This is the only exit from error state.
      //
      self.state = 'unopened';
    }, self.errorTimeout);
  }

  //
  // Helper function which executes if the connection
  // is established.
  //
  function onSuccess(db) {
    self.state = 'opened';
    self._db = db;
    flushPending();
  }

  this.state = 'opening';
  this.client.open(function (err, db) {
    if (err) {
      return onError(err);
    }

    if (self.username && self.password) {
      return self.client.authenticate(self.username, self.password, function (err) {
        return err ? onError(err) : onSuccess(db);
      });
    }

    onSuccess(db);
  });
};

//
// ### function close ()
// Cleans up resources (streams, event listeners) for
// this instance (if necessary).
//
MongoDB.prototype.close = function () {
  //
  // Reset session if it is opened.
  //
  if (this.state === 'opened') {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    //
    // Next time try to open new session.
    //
    this.client.close();
    this.state = 'unopened';
  }
};
