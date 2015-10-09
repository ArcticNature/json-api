var Promise = require("bluebird");

var exceptions = require("./exceptions");
var Connection = require("./connection");


/**
 * @class Pool
 * Manages a pool of Connections classes for concurrent
 * use and request/response support.
 */
var Pool = module.exports = function Pool(
    host, port, max_connections, ConnectionClass
) {
  this._host = host;
  this._port = port;
  this._ConnectionClass = ConnectionClass || Connection;

  this._instances = [];
  this._total_connections = 0;
  this._max_connections = max_connections || 10;
};


// Returns a connection or create a new one if possible.
Pool.prototype._getConnection = function _getConnection() {
  var _this = this;
  return new Promise(function(resolve, reject) {
    // If a connection is available return that.
    if (_this._instances.length > 0) {
      resolve(_this._instances.shift());
      return;
    }

    // Pool of connection is full?
    if (_this._total_connections >= _this._max_connections) {
      reject(new exceptions.PoolExhaused());
      return;
    }

    // Otherwise create a new one.
    var connection = new _this._ConnectionClass(_this._host, _this._port);
    connection.on("error", reject);
    connection.on("connected", function() {
      connection.removeListener("error", reject);
      connection.on("error", function() {
        var conn_idx = _this._instances.indexOf(connection);
        _this._total_connections -= 1;

        if (conn_idx !== -1) {
          _this._instances.splice(conn_idx, 1);
        }
      });

      _this._total_connections += 1;
      resolve(connection);
    });
  });
};

// Helper function to convert evented connections in promises.
Pool.prototype._request = function _request(
    request, success_event, success_callback
) {
  var _this = this;
  return this._getConnection().then(function(connection) {
    return new Promise(function(resolve, reject) {

      // Send message and waits for errors/responses.
      connection.send(request);
      connection.on("error", reject);

      // On success depends on the interet in response.
      connection.on(success_event, function() {
        var response = success_callback.apply(_this, arguments);
        _this._instances.push(connection);
        resolve(response);
      });

    });
  });
};


/**
 * Sends a message to the server.
 * @param {!Object} message The message to send to the server.
 * @returns {!Promise}
 *   A promise that is fullfilled when the request is sent to
 *   the kernel.
 *   Due to TCP implementation the request may not reach the
 *   server even if the promise is fullfiled.
 */
Pool.prototype.request = function request(req) {
  return this._request(req, "flushed", function() {});
};

/**
 * Sends a message to the server and waits for a response from it.
 * @param {!Object} message The message to send to the server.
 * @returns {!Promise}
 *   A promise that is fullfilled when the response is received.
 */
Pool.prototype.requestResponse = function requestResponse(req) {
  return this._request(req, "message", function(message) {
    return message;
  });
};
