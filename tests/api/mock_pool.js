var Promise = require("../../module/node_modules/bluebird");

var exceptions = require("../../module/exceptions");
var proto_buf = require("../../module/deps/protocols-daemon/protocols-daemon");
var messages = proto_buf.sf.protocols.daemon;


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
  this.clear();
};

MockPool.prototype.addResponse = function addResponse(message) {
  this._responses.push(message);
};

MockPool.prototype.clear = function clear() {
  this._requests  = [];
  this._responses = [];
  this._response_idx = 0;
};

MockPool.prototype.request = function request(message) {
  this._requests.push(message);
  return new Promise(function(resolve) {
    resolve();
  });
};

MockPool.prototype.requestAck = function requestAck(req) {
  return this.requestResponse(req).then(function(msg) {
    if (msg.code !== messages.Message.Code.Ack) {
      throw exceptions.HTTPError(500, "Unexpected message from server.");
    }

    return { acknowledge: true };
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
