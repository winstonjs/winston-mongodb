/**
 * @module winston-mongodb-preconnected-test
 * @fileoverview Tests for instances of the MongoDB transport
 * @license MIT
 * @author 0@39.yt (Yurij Mikhalevich)
 */

var vows = require('vows');
var mongodb = require('mongodb');
var transport = require('winston/test/transports/transport');
var MongoDB = require('../lib/winston-mongodb').MongoDB;


mongodb.MongoClient.connect('mongodb://localhost/winston', function(err, db) {
  if (err) {
    console.error('winston-mongodb-preconnected-test: error initialising db',
        err);
    return;
  }
  vows.describe('winston-mongodb').addBatch({
    'And instance of the MongoDB Transport with preconnected db object':
        transport(MongoDB, {
          db: db
        })
  }).run();
});

