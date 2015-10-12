var Long = require("long");
var ApiUtils = module.exports = {};


/**
 * Formats a value as a long integer, if possible.
 * @param {!Object|number|string} val The value to process.
 * @param {?Bool} precise
 *    True to return a precise long, false to return a number.
 * @returns {!Object|number} The formatted value.
 */
ApiUtils.int64 = function int64(val, precise) {
  var converted = Long.fromValue(val);

  // Is it an object for a precise 64 int?
  if (typeof val === "object") {
    return !precise ? converted.toNumber() : val;
  }

  // Was it converted from an invalid input?
  if (converted.isZero() && val !== 0) {
    throw new Error("Invalid input for int64");
  }

  // Otherwise conversion was successfull.
  // Return the most appropriate value.
  if (!precise) {
    return converted.toNumber();
  }

  return {
    low:  converted.low,
    high: converted.high,
    unsigned: converted.unsigned
  };
};
