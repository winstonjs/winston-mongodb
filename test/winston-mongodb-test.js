/**
 * @module 'winston-mongodb-test'
 * @fileoverview Tests for instances of the MongoDB transport
 * @license MIT
 * @author charlie@nodejitsu.com (Charlie Robbins)
 * @author 0@39.yt (Yurij Mikhalevich)
 */
'use strict';
require('dotenv').config();
const mongodb = require('mongodb');
const mongoose = require('mongoose');
const testSuite = require('abstract-winston-transport');

const MongoDB = require('../lib/winston-mongodb').MongoDB;

const dbUrl = process.env.USER_WINSTON_MONGODB_URL
    || process.env.WINSTON_MONGODB_URL || 'mongodb://localhost:27017/winston';
const dbName = process.env.WINSTON_MONGODB_DBNAME
    || 'otherWinston';

mongoose.connect(dbUrl, { useNewUrlParser: true });

describe('winston-mongodb-manual-tests', function () {
  describe('winston-mongodb', function () {
    const transport = new MongoDB({ db: dbUrl });
    it('should be closeable', function () {
      transport.close();
    });
  });
});

testSuite({ name: '{db: url}', Transport: MongoDB, construct: { db: dbUrl }});
testSuite({ name: '{db: url, dbName: string}', Transport: MongoDB,
  construct: { db: dbUrl, dbName }});
testSuite({ name: '{db: url} on capped collection', Transport: MongoDB,
  construct: { db: dbUrl, capped: true, collection: 'cappedLog' }});
testSuite({ name: '{db: url, dbName: string} on capped collection', Transport: MongoDB,
  construct: { db: dbUrl, dbName, capped: true, collection: 'cappedLog' }});
testSuite({ name: '{db: client promise}', Transport: MongoDB,
  construct: { db: mongodb.MongoClient.connect(dbUrl, { useNewUrlParser: true }) }});
testSuite({ name: '{db: client promise, dbName: string}', Transport: MongoDB,
  construct: {
    dbName,
    db: mongodb.MongoClient.connect(dbUrl, { useNewUrlParser: true }) }
});
testSuite({ name: '{db: mongoose client}', Transport: MongoDB,
  construct: { db: mongoose.connection }});
