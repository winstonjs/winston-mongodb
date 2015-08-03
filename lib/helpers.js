/**
 * @module helpers
 * @fileoverview Helpers for winston-mongodb
 * @license MIT
 * @author 0@39.yt (Yurij Mikhalevich)
 */
var common = require('winston/lib/winston/common');


/**
 * Prepares metadata to store into database.
 * @param {*} meta Metadata
 * @return {*}
 */
exports.prepareMetaData = function(meta) {
  if (typeof meta === 'object' && meta !== null) {
    makeObjectNonCircular(meta);
    cleanFieldNames(meta);
  }
  var prepared = {};
  if (meta instanceof Error) {
    // This needed because Error's message, name and stack isn't
    // accessible through cycling properties and "common.clone" doesn't
    // copies them
    prepared.message = meta.message;
    prepared.name = meta.name;
    prepared.stack = meta.stack;
  } else {
    prepared = common.clone(meta);
  }
  return prepared;
};


/**
 * Removes unexpected characters from metadata field names.
 * @param {Object} object Object to clean
 */
function cleanFieldNames(object) {
  for (var field in object) {
    if (!object.hasOwnProperty(field)) {
      continue;
    }
    var value = object[field];
    if (field.indexOf('.') !== 0) {
      delete object[field];
      field = field.replace('.', '[dot]');
      object[field] = value;
    }
    if (field.indexOf('$') === 0) {
      delete object[field];
      field = field.replace('$', '[$]');
      object[field] = value;
    }
    if (typeof value === 'object') {
      cleanFieldNames(value);
    }
  }
}


/**
 * Cleans object from circular references, replaces them with string
 * "[Circular]"
 * @param {Object} node Current object or its leaf
 * @param {Array=} opt_parents Object's parents
 */
function makeObjectNonCircular(node, opt_parents) {
  opt_parents = opt_parents || [];

  var keys = Object.keys(node);
  var i;
  var value;

  opt_parents.push(node); // add self to current path
  for (i = keys.length - 1; i >= 0; --i) {
    value = node[keys[i]];
    if (value && typeof value === 'object') {
      if (opt_parents.indexOf(value) === -1) {
        // check child nodes
        arguments.callee(value, opt_parents);
      } else {
        // circularity detected!
        node[keys[i]] = '[Circular]';
      }
    }
  }

  opt_parents.pop();
}
