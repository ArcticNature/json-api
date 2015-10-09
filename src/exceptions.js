var util = require("util");
var Exceptions = module.exports = {};


/*!
 * @class HTTPError
 * The server encountered an error that should be comunicated
 * to the HTTP client.
 */
Exceptions.HTTPError = function HTTPError(code, message) {
  // Call super constructor.
  Error.apply(this);
  Error.captureStackTrace(this, Exceptions.HTTPError);

  // Set attributes.
  this.message    = message;
  this.statusCode = code;
};
util.inherits(Exceptions.HTTPError, Error);


/*!
 * @class PoolExhaused
 * A new connection could not be created because the
 * connection pool is exhausted.
 */
Exceptions.PoolExhausted = function PoolExhaused() {
  // Call super constructor.
  Error.apply(this);
  Error.captureStackTrace(this, Exceptions.HTTPError);

  this.message = "Connection pool exhausted.";
};
util.inherits(Exceptions.PoolExhausted, Error);
