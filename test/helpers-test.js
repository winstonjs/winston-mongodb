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

describe('winston-mongodb-helpers', function() {
  describe('#prepareMetaData()', function() {
    it('should preserve Date instances', function() {
      const originalData = { customDate: new Date() };

      const preparedData = helpers.prepareMetaData(originalData);

      assert(preparedData.customDate instanceof Date);
      assert.strictEqual(+preparedData.customDate, +originalData.customDate);
    });
    it('should store Error objects', function() {
      const originalData = { standardError: new Error('some error') };

      const preparedData = helpers.prepareMetaData(originalData);

      assert(preparedData.standardError instanceof Object);
      assert(!(preparedData.standardError instanceof Error));
      assert.strictEqual(preparedData.standardError.message, originalData.standardError.message);
      assert.strictEqual(preparedData.standardError.name, originalData.standardError.name);
      assert.strictEqual(preparedData.standardError.stack, originalData.standardError.stack);
    });
    it('should store extra fields for custom Error objects', function() {
      const originalData = { customError: new CustomError() };
      
      const preparedData = helpers.prepareMetaData(originalData);

      assert(preparedData.customError instanceof Object);
      assert(!(preparedData.customError instanceof Error));
      assert.strictEqual(preparedData.customError.message, originalData.customError.message);
      assert.strictEqual(preparedData.customError.name, originalData.customError.name);
      assert.strictEqual(preparedData.customError.stack, originalData.customError.stack);
      assert.strictEqual(preparedData.customError.testField, originalData.customError.testField);
    });
  });
});
