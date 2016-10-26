/**
 * @module 'winston-mongodb-preconnected-test'
 * @fileoverview Tests for instances of the MongoDB transport
 * @license MIT
 * @author 0@39.yt (Yurij Mikhalevich)
 */
'use strict';
const vows = require('vows');
const mongodb = require('mongodb');
const transport = require('winston/test/transports/transport');
const MongoDB = require('../lib/winston-mongodb').MongoDB;

vows.describe('winston-mongodb').addBatch({
  'And instance of the MongoDB Transport with preconnected db object': {
    topic: function(){
      mongodb.MongoClient.connect('mongodb://localhost/winston', this.callback);
    },
    prepare: function(db){
      Object.assign(this.context.tests.test, transport(MongoDB, {db}));
    },
    test: {
      dummy: ()=>{}, // hack to be able to execute asynchronously added tests
    },
  }
}).export(module);

