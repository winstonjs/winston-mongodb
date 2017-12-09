/**
 * @module 'winston-mongodb-test'
 * @fileoverview Tests for instances of the MongoDB transport
 * @license MIT
 * @author charlie@nodejitsu.com (Charlie Robbins)
 * @author 0@39.yt (Yurij Mikhalevich)
 */
'use strict';
const mongodb = require('mongodb');
const test_suite = require('abstract-winston-transport');
const MongoDB = require('../lib/winston-mongodb').MongoDB;
const dbUrl = process.env.USER_WINSTON_MONGODB_URL
    ||process.env.WINSTON_MONGODB_URL||'mongodb://localhost/winston';

test_suite({name: '{db: url}', Transport: MongoDB, construct: {db: dbUrl}});
test_suite({name: '{db: url} on capped collection', Transport: MongoDB,
    construct: {db: dbUrl, capped: true, collection: 'cappedLog'}});
test_suite({name: '{db: promise}', Transport: MongoDB,
    construct: {db: mongodb.MongoClient.connect(dbUrl)}});
