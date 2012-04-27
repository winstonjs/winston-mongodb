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
  self.name = 'mongodb';
  self.db = options.db;
  self.host = options.host || 'localhost';
  self.port = options.port || mongodb.Connection.DEFAULT_PORT;
  self.collection = options.collection || "log";
  self.safe = options.safe || true;
  self.level = options.level || 'info';
  self.silent = options.silent || false;
  self.username = options.username || null;
  self.password = options.password || null;
  self.errortimeout = options.errortimeout || 10000;
  if (options.keepAlive !== true) {
    // Backward compatibility for timeout delivered in keepAlive parameter.
    self.timeout = options.timeout || options.keepAlive || 10000;
  }
  self.state = 'unopened';
  self.timeoutId = null;
  self.pending = [];

  self.server = new mongodb.Server(self.host, self.port, {});
  self.client = new mongodb.Db(self.db, self.server, {
    native_parser: false
  });

  self.server.on('error', function (err) {
    // Close session. Next log will reopen.
    self.close();
  });
  self.client.on('error', function (err) {
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

MongoDB.prototype.close = function () {
  var self = this;
  // Reset session if it is opened.
  if (self.state === 'opened') {
    if (self.timeoutId) {
      clearTimeout(self.timeoutId);
    }
    // Next time try to open new session.
    self.client.close();
    self.state = 'unopened';
  }
}

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
      // This is the only exit from error state.
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