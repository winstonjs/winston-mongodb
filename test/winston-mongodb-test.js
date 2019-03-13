/**
 * @module 'winston-mongodb-test'
 * @fileoverview Tests for instances of the MongoDB transport
 * @license MIT
 * @author charlie@nodejitsu.com (Charlie Robbins)
 * @author 0@39.yt (Yurij Mikhalevich)
 */
'use strict';
const mongodb = require('mongodb');
const mongoose = require('mongoose');
const test_suite = require('abstract-winston-transport');

const MongoDB = require('../lib/winston-mongodb').MongoDB;

const dbUrl = process.env.USER_WINSTON_MONGODB_URL
    ||process.env.WINSTON_MONGODB_URL||'mongodb://localhost:27017/winston';

mongoose.connect(dbUrl);

describe('winston-mongodb-manual-tests', function() {
  describe('winston-mongodb', function() {
    let transport = new MongoDB({db: dbUrl});
    it('should be closeable', function() {
      transport.close();
    });
  });
});

test_suite({name: '{db: url}', Transport: MongoDB, construct: {db: dbUrl}});
test_suite({name: '{db: url} on capped collection', Transport: MongoDB,
    construct: {db: dbUrl, capped: true, collection: 'cappedLog'}});
test_suite({name: '{db: client promise}', Transport: MongoDB,
    construct: {db: mongodb.MongoClient.connect(dbUrl, {useNewUrlParser: true})}});
test_suite({name: '{db: mongoose client}', Transport: MongoDB,
    construct: {db: mongoose.connection}});
