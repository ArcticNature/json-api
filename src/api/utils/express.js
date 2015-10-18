var exceptions    = require("../../exceptions");
var express_utils = module.exports = {};


/**
 * Generic error handler middleware for express.js
 * Should be used at the root of the API routing to ensure that all
 * errors are reported correctly.
 */
express_utils.errorHandler = function errorHandler(err, req, res, next) {
  if (err instanceof exceptions.HTTPError) {
    res.status(err.statusCode);
    if (err.json) {
      res.json(err.json);
    } else {
      res.send(err.message);
    }

    if (err.statusCode >= 500) {
      console.error(
        "Internal HTTP error returned to client: %d %s\nTrace: %s",
        err.statusCode, err.message, err.stack
      );

    } else {
      console.warn(
        "HTTP error returned to client: %d %s\nTrace: %s",
        err.statusCode, err.message, err.stack
      );

    }

  } else {
    res.status(500).send("Unable to recover from an error: " + err.message);
    console.error(
        "Unhandler error in API request: {%s} %s\nTrace: %s",
        err.name, err.message, err.stack
    );
  }

  // Proceed in the error handling.
  if (next) {
    next(err);
  }
};

/**
 * Promise handling middleware for express.js
 *
 * Endoints that work with promises instead of callbacks can
 * attach a `_promise` object to the `response`.
 *
 * If they do so, this handler takes care of waiting for the
 * promise to be fulfilled or rejected and invokes the
 * callback for express.js.
 *
 * It is assumed that the endpoint will return JSON out of the
 * value returned by the promise.
 */
express_utils.promiseHandler = function errorHandler(req, res, next) {
  next();

  if (res._promise && typeof res._promise.then === "function") {
    res._promise.then(function(data) {
      res.json(data);

    }).catch(function(err) {
      express_utils.errorHandler(err, req, res, next);
    });
  }
};
