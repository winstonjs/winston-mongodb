/*
 * mongodb-test.js: Tests for instances of the MongoDB transport
 *
 * (C) 2011 Charlie Robbins, Kendrick Taylor
 * MIT LICENSE
 *
 */

var path = require('path'),
    vows = require('vows'),
    assert = require('assert'),
    winston = require('winston'),
    helpers = require('winston/test/helpers'),
    MongoDB = require('../lib/winston-mongodb').MongoDB;
    
function assertMongoDB (transport) {
  assert.instanceOf(transport, MongoDB);
  assert.isFunction(transport.log);
};

var config = helpers.loadConfig(__dirname),
    transport = new (MongoDB)(config.transports.mongodb);
    
vows.describe('winston-mongodb').addBatch({
 "An instance of the MongoDB Transport": {
   "should have the proper methods defined": function () {
     assertMongoDB(transport);
   },
   "the log() method": helpers.testNpmLevels(transport, "should log messages to MongoDB", function (ign, err, logged) {
     assert.isTrue(!err);
     assert.isTrue(logged);
   })
 }
}).addBatch({
  "An instance of the MongoDB Transport": {
    "when the timeout has fired": {
      topic: function () {
        setTimeout(this.callback, config.transports.mongodb.keepAlive);
      },
      "the log() method": helpers.testNpmLevels(transport, "should log messages to MongoDB", function (ign, err, logged) {
        assert.isTrue(!err);
        assert.isTrue(logged);
      })
    }
  }
}).export(module);