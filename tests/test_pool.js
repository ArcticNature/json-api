var assert = require("assert");
var util   = require("util");

var Pool = require("../module/pool");
var exceptions = require("../module/exceptions");

var proto_buf = require("../module/deps/protocols-daemon/protocols-daemon");
var messages = proto_buf.sf.protocols.daemon;


var MockConnection = function MockConnection() {
  this.send_args = ["flushed"];
  this.handlers  = {};

  // Simulate connection.
  this._init();
};

MockConnection.prototype._init = function _init() {
  var _this = this;
  process.nextTick(function() {
    _this.emit("connected");
  });
};

MockConnection.prototype.emit = function emit(event, arg1) {
  var hs = this.handlers[event] || [];
  hs.forEach(function(handler) {
    handler(arg1);
  });
};

MockConnection.prototype.on = function on(event, handler) {
  this.handlers[event] = this.handlers[event] || [];
  this.handlers[event].push(handler);
};
MockConnection.prototype.once = MockConnection.prototype.on;

MockConnection.prototype.removeListener = function(event, handler) {
  var hs  = this.handlers[event] || [];
  var idx = hs.indexOf(handler);
  if (idx !== -1) {
    hs.splice(idx, 1);
  }
};

MockConnection.prototype.send = function send() {
  var _this = this;
  process.nextTick(function() {
    _this.emit.apply(_this, _this.send_args);
  });
};


var FailingConnection = function FailingConnection(host, port) {
  MockConnection.call(this, host, port);
};
util.inherits(FailingConnection, MockConnection);

FailingConnection.prototype._init = function _init() {
  var _this = this;
  process.nextTick(function() {
    _this.emit("error", new Error(42));
  });
};


suite("Pool", function() {
  setup(function() {
    this.pool = new Pool("localhost", 2341, 1, MockConnection);
  });

  suite("connections", function() {
    setup(function() {
      return this.pool.request(null);
    });

    test("are discarded on error", function() {
      var pool = this.pool;
      pool._instances[0].send_args = ["error", new Error(42)];

      return pool.request(null).then(function() {
        assert(false, "Should not fulfill promise");

      }).catch(function(err) {
        assert.equal(42, err.message);
        assert.equal(0, pool._total_connections);
        assert.equal(0, pool._instances.length);
      });
    });

    test("are discarded on out-of-request error", function() {
      this.pool._instances[0].emit("error", new Error(42));
      assert.equal(0, this.pool._total_connections);
      assert.equal(0, this.pool._instances.length);
    });

    test("are created", function() {
      assert.equal(1, this.pool._total_connections);
    });

    test("are re-used", function() {
      var pool = this.pool;
      return this.pool.request(null).then(function() {
        assert.equal(1, pool._total_connections);
      });
    });

    test("are returned when done", function() {
      assert.equal(1, this.pool._instances.length);
    });

    test("reject promises on error", function() {
      var pool = new Pool("a", 1, 1, FailingConnection);
      var request = pool.request(null);

      return request.then(function() {
        assert(false, "Should not fulfill promise");
      }).catch(function(err) {
        assert.equal(42, err.message);
      });
    });
  });

  suite("requestResponse", function() {
    setup(function() {
      return this.pool.request(null);
    });

    test("connections are returned after a response", function() {
      var pool = this.pool;
      pool._instances[0].send_args = ["message", 42];

      return pool.requestResponse(null).then(function(response) {
        assert.equal(42, response);
        assert.equal(1,  pool._instances.length);
      });
    });

    test("errors cause the promise to fail", function() {
      var error = new messages.Message();
      var info  = new messages.Error();
      error.code = messages.Message.Code.Error;
      error.set(".sf.protocols.daemon.Error.msg", info);
      info.code = -1;
      info.message = "test";

      var pool = this.pool;
      pool._instances[0].send_args = ["message", error];

      return pool.requestResponse(null).catch(function(ex) {
        assert(ex instanceof exceptions.HTTPError, "Not HTTP Error");
        assert.equal(-1, ex.code);
        assert.equal("test", ex.message);

        return true;
      }).then(function(from_error_handler) {
        // If the promise was successfull because of the catch
        // handler passing return now.
        if (from_error_handler === true) {
          return;
        }

        // Otherwise raise a failure.
        throw new Error("Should not resolve request");
      });
    });
  });

  suite("requestAck", function() {
    //
  });
});
