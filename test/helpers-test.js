/**
 * @module 'helpers-test'
 * @fileoverview Tests for winston-mongodb internal helpers methods
 * @license MIT
 * @author 0@39.yt (Yurij Mikhalevich)
 */
'use strict';
const assert = require('assert');
const helpers = require('../lib/helpers');

class CustomError extends Error {
  constructor() {
    super();
    this.testField = 'custom error';
  }
}

const originalData = {
  customDate: new Date(),
  standardError: new Error('some error'),
  customError: new CustomError()
};

describe('winston-mongodb-helpers', function() {
  describe('#prepareMetaData()', function() {
    let preparedData = helpers.prepareMetaData(originalData);
    it('should preserve Date instances', function() {
      assert(preparedData.customDate instanceof Date);
      assert.equal(+preparedData.customDate, +originalData.customDate);
    });
    it('should store Error objects', function() {
      assert(preparedData.standardError instanceof Object);
      assert(!(preparedData.standardError instanceof Error));
      assert.equal(preparedData.standardError.message, originalData.standardError.message);
      assert.equal(preparedData.standardError.name, originalData.standardError.name);
      assert.equal(preparedData.standardError.stack, originalData.standardError.stack);
    });
    it('should store extra fields for custom Error objects', function() {
      assert(preparedData.customError instanceof Object);
      assert(!(preparedData.customError instanceof Error));
      assert.equal(preparedData.customError.message, originalData.customError.message);
      assert.equal(preparedData.customError.name, originalData.customError.name);
      assert.equal(preparedData.customError.stack, originalData.customError.stack);
      assert.equal(preparedData.customError.testField, originalData.customError.testField);
    });
  });
});
