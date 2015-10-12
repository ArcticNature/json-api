var Promise = require("../../module/node_modules/bluebird");


/**
 * Mock connection pool so that tests can avoid calling the
 * daemon.
 *
 * Request mocks is very simple:
 *   - A list of requests is collected to assert later on.
 *   - A list of responses is provided, one for each request done.
 *   - Requests without responses will fail.
 */
var MockPool = module.exports = function MockPool() {
  this._requests  = [];
  this._responses = [];
  this._response_idx = 0;
};

MockPool.prototype.addResponse = function addResponse(message) {
  this._responses.push(message);
};

MockPool.prototype.request = function request(message) {
  this._requests.push(message);
  return new Promise(function(resolve) {
    resolve();
  });
};

MockPool.prototype.requestResponse = function request(message) {
  var _this = this;
  this._requests.push(message);

  return new Promise(function(resolve, reject) {
    // Fail if there are not enough responses.
    if (_this._response_idx >= _this._responses.length) {
      reject(new Error("Request not expected"));
      return;
    }

    var response = _this._responses[_this._response_idx];
    _this._response_idx += 1;
    resolve(response);
  });
};
