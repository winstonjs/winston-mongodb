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
    transport = require('winston/test/transports/transport'),
    MongoDB = require('../lib/winston-mongodb').MongoDB;

vows.describe('winston-mongodb').addBatch({
  'An instance of the MongoDB Transport': transport(MongoDB, {
    db: 'winston',
    keepAlive: 1000
  })
}).export(module);


//vows.describe('winston-mongodb').addBatch({
//  'Test MongoDB with replica set': transport(MongoDB, {
//    db: 'winston',
//    keepAlive: 1000,
//    replSet: 'rs0',
//    hosts: [
//      {port: 27018},
//      {port: 27019},
//      {port: 27020}
//    ]
//  })
//}).export(module);


//vows.describe('winston-mongodb').addBatch({
//  'Test MongoDB with replica set': transport(MongoDB, {
//    keepAlive: 1000,
//    dbUri: 'mongodb://localhost:27018,localhost:27019,localhost:27020/winston?replicaSet=rs0'
//  })
//}).export(module);
