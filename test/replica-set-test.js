/*
 * replica-set-test.js: Tests for instances of the MongoDB transport, configured
 * for replica sets. Make sure, that replica set is properly configured.
 *
 * (C) 2014 Yurij Mikhalevich
 *
 */

var vows = require('vows'),
    winston = require('winston'),
    transport = require('winston/test/transports/transport'),
    MongoDB = require('../lib/winston-mongodb').MongoDB;


vows.describe('winston-mongodb').addBatch({
  'With replica set, configured via object': transport(MongoDB, {
    db: 'winston',
    keepAlive: 1000,
    replSet: 'rs0',
    hosts: [
      {port: 27018},
      {port: 27019},
      {port: 27020}
    ]
  }),
  'With replica set, configured via connection string': transport(MongoDB, {
    keepAlive: 1000,
    dbUri: 'mongodb://localhost:27018,localhost:27019,localhost:27020/winston?replicaSet=rs0'
  })
}).export(module);
