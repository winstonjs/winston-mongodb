/**
 * @module helpers
 * @fileoverview Helpers for winston-mongodb
 * @license MIT
 * @author 0@39.yt (Yurij Mikhalevich)
 */
'use strict';
const common = require('winston/lib/winston/common');
const ObjectID = require('mongodb').ObjectID;


/**
 * Prepares metadata to store into database.
 * @param {*} meta Metadata
 * @return {*}
 */
exports.prepareMetaData = meta=>{
  if (meta instanceof Error) {
    // This is needed because Error's message, name and stack isn't accessible
    // through cycling properties and `common.clone` doesn't copies them
    return {message: meta.message, name: meta.name, stack: meta.stack};
  }
  if (typeof meta === 'object' && meta !== null) {
    meta = makeObjectNonCircular(meta);
    cleanFieldNames(meta);
  }
  meta = common.clone(meta);
  return meta;
};


/**
 * Removes unexpected characters from metadata field names.
 * @param {Object} object Object to clean
 */
function cleanFieldNames(object) {
  for (let field in object) {
    if (!Object.prototype.hasOwnProperty.call(object, field)) {
      continue;
    }
    let value = object[field];
    if (field.includes('.') || field.includes('$')) {
      delete object[field];
      object[field.replace(/\./g, '[dot]').replace(/\$/g, '[$]')] = value;
    }
    if (typeof value === 'object') {
      cleanFieldNames(value);
    }
  }
}


/**
 * Cleans object from circular references, replaces them with string
 * '[Circular]'
 * @param {Object} node Current object or its leaf
 * @param {Array=} opt_parents Object's parents
 */
function makeObjectNonCircular(node, opt_parents) {
  opt_parents = opt_parents || [];
  opt_parents.push(node);
  let copy = Array.isArray(node) ? [] : {};
  for (let key in node) {
    if (!Object.prototype.hasOwnProperty.call(node, key)) {
      continue;
    }
    let value = node[key];
    if (typeof value === 'object' && !(value instanceof ObjectID) && !(value instanceof Date)) {
      if (opt_parents.indexOf(value) === -1) {
        copy[key] = makeObjectNonCircular(value, opt_parents);
      } else {
        copy[key] = '[Circular]';
      }
    } else {
      copy[key] = value;
    }
  }
  opt_parents.pop();
  return copy;
}
