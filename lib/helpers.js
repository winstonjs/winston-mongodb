/**
 * @module helpers
 * @fileoverview Helpers for winston-mongodb
 * @license MIT
 * @author 0@39.yt (Yurij Mikhalevich)
 */
'use strict';
const common = require('winston/lib/winston/common');
const ObjectID = require('mongodb').ObjectID;
const cycle = require('cycle');


//
// ### function clone (obj)
// #### @obj {Object} Object to clone.
// Helper method for deep cloning pure JSON objects
// i.e. JSON objects that are either literals or objects (no Arrays, etc)
//
function clone (obj) {
  if (obj instanceof Error) {
    // With potential custom Error objects, this might not be exactly correct,
    // but probably close-enough for purposes of this lib.
    var copy = { message: obj.message };
    Object.getOwnPropertyNames(obj).forEach(function (key) {
      copy[key] = obj[key];
    });

    return copy;
  }
  else if (!(obj instanceof Object)) {
    return obj;
  }
  else if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  return cloneRefType(cycle.decycle(obj));
}

function cloneRefType(obj) {
  //
  // We only need to clone reference types (Object)
  //
  var copy = Array.isArray(obj) ? [] : {};

  for (var i in obj) {
    if (Array.isArray(obj[i])) {
      copy[i] = obj[i].slice(0);
    }
    else if (obj[i] instanceof Buffer) {
        copy[i] = obj[i].slice(0);
    }
    else if (typeof obj[i] != 'function') {
      copy[i] = obj[i] instanceof Object ? clone(obj[i]) : obj[i];
    }
    else if (typeof obj[i] === 'function') {
      copy[i] = obj[i];
    }
  }

  return copy;
}

/**
 * Prepares metadata to store into database.
 * @param {*} meta Metadata
 * @return {*}
 */
exports.prepareMetaData = meta=>{
  if (typeof meta === 'object' && meta !== null) {
    meta = makeObjectNonCircular(meta);
    cleanFieldNames(meta);
  }
  meta = clone(meta);
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
  if (node instanceof Error) {
    // This is needed because Error's message, name and stack isn't accessible when cycling through properties
    copy = {message: node.message, name: node.name, stack: node.stack};
  }
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
