/*
 * mongodb.js: Transport for outputting to a MongoDB database
 *
 * (C) 2014 Yurij Mikhalevich
 * MIT LICENCE
 *
 */

exports.makeObjectNonCircular = function (node, parents) {
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
};
