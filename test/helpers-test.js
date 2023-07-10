/**
 * @module 'helpers-test'
 * @fileoverview Tests for winston-mongodb internal helpers methods
 * @license MIT
 * @author 0@39.yt (Yurij Mikhalevich)
 */
'use strict';
const assert = require('assert');
const ObjectID = require('mongodb').ObjectID;
const helpers = require('../lib/helpers');

class CustomError extends Error {
  constructor() {
    super();
    this.testField = 'custom error';
  }
}

describe('winston-mongodb-helpers', function () {
  describe('#prepareMetaData()', function () {
    it('should preserve Date instances', function () {
      const originalData = { customDate: new Date() };

      const preparedData = helpers.prepareMetaData(originalData);

      assert(preparedData.customDate instanceof Date);
      assert.strictEqual(+preparedData.customDate, +originalData.customDate);
    });
    it('should store Error objects', function () {
      const originalData = { standardError: new Error('some error') };

      const preparedData = helpers.prepareMetaData(originalData);

      assert(preparedData.standardError instanceof Object);
      assert(!(preparedData.standardError instanceof Error));
      assert.strictEqual(preparedData.standardError.message, originalData.standardError.message);
      assert.strictEqual(preparedData.standardError.name, originalData.standardError.name);
      assert.strictEqual(preparedData.standardError.stack, originalData.standardError.stack);
    });
    it('should store extra fields for custom Error objects', function () {
      const originalData = { customError: new CustomError() };

      const preparedData = helpers.prepareMetaData(originalData);

      assert(preparedData.customError instanceof Object);
      assert(!(preparedData.customError instanceof Error));
      assert.strictEqual(preparedData.customError.message, originalData.customError.message);
      assert.strictEqual(preparedData.customError.name, originalData.customError.name);
      assert.strictEqual(preparedData.customError.stack, originalData.customError.stack);
      assert.strictEqual(preparedData.customError.testField, originalData.customError.testField);
    });
    it('should preserve ObjectIds', function () {
      const originalData = { objectId: new ObjectID() };

      const preparedData = helpers.prepareMetaData(originalData);

      assert.strictEqual(preparedData.objectId, originalData.objectId);
    });
    it('should preserve Buffers', function () {
      const originalData = { buffer: new Buffer.from('test') };

      const preparedData = helpers.prepareMetaData(originalData);

      assert.strictEqual(preparedData.buffer, originalData.buffer);
    });
    it('should handle objects containing all kinds of values, including arrays, nested objects and functions', function () {
      const originalData = {
        undefinedValue: undefined,
        nullValue: null,
        booleanValue: true,
        numberValue: 1,
        bigIntValue: BigInt(9007199254740991),
        stringValue: 'test',
        symbolValue: Symbol(),
        arrayValue: ['this', 'is', 'an', 'array'],
        nestedObjectValue: { objectKey: true },
        functionValue: (a, b) => a + b
      };

      const preparedData = helpers.prepareMetaData(originalData);

      const expected = { ...originalData, functionValue: {}};
      assert.deepStrictEqual(preparedData, expected);
    });
    it('should handle arrays containing all kinds of values, including objects, nested arrays and functions', function () {
      const originalData = [
        undefined,
        null,
        true,
        1,
        BigInt(9007199254740991),
        'test',
        Symbol(),
        { objectKey: true },
        ['this', 'is', 'an', 'array'],
        (a, b) => a + b
      ];

      const preparedData = helpers.prepareMetaData(originalData);

      const expected = [...originalData];
      expected[expected.length - 1] = {}; // function gets converted to empty object
      assert.deepStrictEqual(preparedData, expected);
    });
    it('should replace dots and dollar signs in object keys', function () {
      const originalData = { 'key.with.dots': true, '$test$': true };

      const preparedData = helpers.prepareMetaData(originalData);

      const expected = { 'key[dot]with[dot]dots': true, '[$]test[$]': true };
      assert.deepStrictEqual(preparedData, expected);
    });
    it('should break circular dependencies', function () {
      const originalData = {};
      originalData.nestedObjectValue = { nestedKey: originalData };
      originalData.arrayValue = [originalData, 'test', { nestedKey: originalData }];

      const preparedData = helpers.prepareMetaData(originalData);

      const expected = {
        nestedObjectValue: { nestedKey: '[Circular]' },
        arrayValue: ['[Circular]', 'test', { nestedKey: '[Circular]' }]
      };

      assert.deepStrictEqual(preparedData, expected);
    });
    it('should handle objects with null prototype', function () {
      const originalData = Object.create(null);
      originalData['key.with.dots'] = true;
      originalData.$test$ = true;
      originalData.nestedObjectValue = { nestedKey: originalData };
      originalData.arrayValue = [originalData, 'test', { nestedKey: originalData }];

      const preparedData = helpers.prepareMetaData(originalData);

      const expected = {
        'key[dot]with[dot]dots': true,
        '[$]test[$]': true,
        'nestedObjectValue': { nestedKey: '[Circular]' },
        'arrayValue': ['[Circular]', 'test', { nestedKey: '[Circular]' }]
      };

      assert.deepStrictEqual(preparedData, expected);
    });
  });
});
