/*
 * mongodb.js: Transport for outputting to a MongoDB database
 *
 * (C) 2014 Yurij Mikhalevich
 * MIT LICENCE
 *
 */
var common = require('winston/lib/winston/common');


//
// ### function prepareMetaData (meta)
// #### @meta {*} Metadata
// Prepares metadata to store into database.
//
exports.prepareMetaData = function (meta) {
  if (typeof meta === 'object' && meta !== null) {
    makeObjectNonCircular(meta);
    cleanFieldNames(meta);
  }
  var prepared = common.clone(meta);
  if (meta instanceof Error) {
    // This needed because Error's message, name and stack isn't
    // accessible through cycling properties and "common.clone" doesn't
    // copies them
    prepared.message = meta.message;
    prepared.name = meta.name;
    prepared.stack = meta.stack;
  }
  return prepared;
};


//
// ### function cleanFieldNames (object)
// #### @object {Object} Object to clean
// Removes unexpected characters from metadata field names.
//
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
    if (typeof value === 'object' && value !== null && Object.getPrototypeOf(value) !== null) {
      cleanFieldNames(value);
    }
  }
}


//
// ### function makeObjectNonCircular (node, [parents])
// #### @node {Object} Current object or its leaf
// #### @parents {array} Object's parents
// Cleans object from circular references, replaces them with string
// "[Circular]"
//
function makeObjectNonCircular(node, parents) {
  parents = parents || [];

  var keys = Object.keys(node);
  var i;
  var value;

  parents.push(node); // add self to current path
  for (i = keys.length - 1; i >= 0; --i) {
    value = node[keys[i]];
    if (value && typeof value === 'object') {
      if (parents.indexOf(value) === -1) {
        // check child nodes
        arguments.callee(value, parents);
      } else {
        // circularity detected!
        node[keys[i]] = '[Circular]';
      }
    }
  }

  parents.pop();
}
