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

  this.name = 'mongodb';
  this.db = options.db;
  this.host = options.host || 'localhost';
  this.port = options.port || mongodb.Connection.DEFAULT_PORT;
  this.collection = options.collection || "log";
  this.safe = options.safe || true;
  this.level = options.level || 'info';
  this.silent = options.silent || false;
  this.username = options.username || null;
  this.password = options.password || null;
  this.errortimeout = options.errortimeout || 10000;
  if (options.keepAlive !== true) {
    // Backward compatibility for timeout delivered in keepAlive parameter.
    this.timeout = options.timeout || options.keepAlive || 10000;
  }
  this.state = 'unopened';
  this.timeoutId = null;
  this.pending = [];

  this.server = new mongodb.Server(this.host, this.port, {});
  this.client = new mongodb.Db(this.db, this.server, {
    native_parser: false
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

  // Avoid reentrancy that can be not assumed by database code.
  // If database logs, better not to call database itself in the same call.
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
          self.client.close();
          self.state = 'unopened';
        }, self.timeout);
      }

      function onError(err) {
        self.emit('error', err);
        if (self.timeoutId) {
          clearTimeout(self.timeoutId);
        }
        // Next time try to open new session.
        self.client.close();
        self.state = 'unopened';
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

        col.save(entry, { safe: self.safe }, function (err, doc) {
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
// ### function open (callback)
// #### @callback {function} Continuation to respond to when complete
// Attempts to open a new connection to MongoDB. If one has not opened yet
// then the callback is enqueued for later flushing.
//
MongoDB.prototype.open = function (callback) {
  var self = this;

  if (self.state === 'opening' || self.state === 'unopened') {
    //
    // While opening our MongoDB connection, append any callback
    // to a list that is managed by this instance.
    //
    self.pending.push(callback);

    if (self.state === 'opening') {
      return;
    }
  }
  else if (self.state === 'opened') {
    return callback();
  }
  else if (self.state === 'error') {
    return callback(self.error);
  }

  function flushPending(err) {
    //
    // Iterate over all callbacks that have accumulated during
    // the creation of the TCP socket.
    //
    for (var i = 0; i < self.pending.length; i++) {
      self.pending[i](err);
    }

    // Quickly truncate the Array (this is more performant).
    self.pending.length = 0;
  }

  function onError(err) {
    self.state = 'error';
    self.error = err;
    flushPending(err);
    // Close to be able to attempt opening later.
    self.client.close();
    // Retry new connection upon following request after error timeout expired.
    setTimeout(function () {
      self.state = 'unopened';
    }, self.errortimeout);
  }

  function onSuccess(db) {
    self.state = 'opened';
    self._db = db;
    flushPending();
  }

  self.state = 'opening';
  self.client.open(function (err, db) {
    if (err) {
      return onError(err);
    }
    if (self.username && self.password) {
      return self.client.authenticate(self.username, self.password, function (err) {
        err ? onError(err) : onSuccess(db);
      });
    }
    onSuccess(db);
  });
};