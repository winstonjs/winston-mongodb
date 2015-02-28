/**
 * @module winston-mongodb-test
 * @fileoverview Tests for instances of the MongoDB transport
 * @license MIT
 * @author charlie@nodejitsu.com (Charlie Robbins)
 * @author 0@39.yt (Yurij Mikhalevich)
 */

var vows = require('vows');
var transport = require('winston/test/transports/transport');
var MongoDB = require('../lib/winston-mongodb').MongoDB;

vows.describe('winston-mongodb').addBatch({
  'An instance of the MongoDB Transport': transport(MongoDB, {
    db: 'mongodb://localhost/winston'
  }),
  'And instance of the MongoDB Transport on capped collection':
      transport(MongoDB, {
        db: 'mongodb://localhost/winston',
        capped: true,
        collection: 'cappedLogs'
      })
}).export(module);
