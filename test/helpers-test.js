/**
 * @module 'helpers-test'
 * @fileoverview Tests for winston-mongodb internal helpers methods
 * @license MIT
 * @author 0@39.yt (Yurij Mikhalevich)
 */
'use strict';
const vows = require('vows');
const assert = require('assert');
const helpers = require('../lib/helpers');

const originalData = {customDate: new Date()};

vows.describe('winston-mongodb-helpers').addBatch({
  'prepareMetaData': {
    topic: helpers.prepareMetaData(originalData),
    'should preserve Date instances': function(preparedData) {
      assert.isTrue(preparedData.customDate instanceof Date);
      assert.equal(+preparedData.customDate, +originalData.customDate);
    }
  }
}).export(module);
