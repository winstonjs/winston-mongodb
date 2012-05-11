/*
 * mongodb.js: Transport for outputting to a MongoDB database
 *
 * (C) 2010 Charlie Robbins, Kendrick Taylor
 * MIT LICENCE
 *
 */

var util = require('util'),
    mongodb = require('mongodb'),
    winston = require('winston');
    
//
// ### function MongoDB (options)
// Constructor for the MongoDB transport object.
//
var MongoDB = exports.MongoDB = function (options) {
  options = options || {};
  
  if (!options.db) { 
    throw new Error("Cannot log to MongoDB without database name.");
  }
  
  this.name       = 'mongodb';
  this.db         = options.db;
  this.host       = options.host       || 'localhost';
  this.port       = options.port       || 27017;
  this.collection = options.collection || "log";
  this.safe       = options.safe       || true;
  this.level      = options.level      || 'info';
  this.silent     = options.silent     || false;
  this.username   = options.username   || null;
  this.password   = options.password   || null;
  this.keepAlive  = options.keepAlive  || 10000;
  this.state      = 'unopened';
  this.formatter  = options.formatter  || null;
  this.pending    = [];
  
  this.client = new mongodb.Db(this.db, new mongodb.Server(this.host, this.port, {}), { 
    native_parser : false
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
  var entry;
  
  if (this.silent) {
    return callback(null, true);
  }
    
  this.open(function (err) {
    if (err) {
      self.emit('error', err);
    }
    
    self._db.collection(self.collection, function (err, col) {
      if (err) {
        self.emit('error', err);
      }


    if(typeof self.formatter === 'function'){
        entry = self.formatter(level, msg, meta);
    }else{
          entry = {
            timestamp: new Date(), // RFC3339/ISO8601 format instead of common.timestamp()
            level: level, 
            message: msg, 
            meta: meta
          };
     }
      
      col.save(entry, { safe: self.safe }, function (err, doc) {
        if (err) {
          self.emit('error', err);
        }

        self.emit('logged');
      });
    });
  });
  
  callback(null, true);
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
    return callback(err);
  }
  
  function flushPending (err, db) {
    self._db = db;
    self.state = 'opened';
    
    //
    // Iterate over all callbacks that have accumulated during
    // the creation of the TCP socket.
    //
    for (var i = 0; i < self.pending.length; i++) {
      self.pending[i]();
    }
    
    // Quickly truncate the Array (this is more performant).
    self.pending.length = 0;
  }
  
  function onError (err) {
    self.state = 'error';
    self.error = err;
    flushPending(err, false);
  }
    
  this.state = 'opening';
  this.client.open(function (err, db) {
    if (err) {
      return onError(err);
    }
    else if (self.username && self.password) {
      return self.client.authenticate(self.username, self.password, function (err) {
        return err ? onError(err) : flushPending(null, db);
      });
    }
    
    flushPending(null, db)
  });
  
  //
  // Set a timeout to close the client connection unless `this.keepAlive`
  // has been set to true in which case it is the responsibility of the 
  // programmer to close the underlying connection.
  //
  if (!(this.keepAlive === true)) {
    setTimeout(function () {
      self.state = 'unopened';
      return self._db ? self._db.close() : null
    }, this.keepAlive);
  }
};
