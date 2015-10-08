var assert = require("assert");
var buffer = require("buffer");
var events = require("events");
var util   = require("util");

var EventEmitter = events.EventEmitter;


// Assetrs that the byts in to buffers are the same.
var assert_buffers_equal = function(expected, actual) {
  assert.equal(expected.length, actual.length, "Buffers differ in length.");

  for (var idx=0; idx<expected.length; idx++) {
    assert.equal(
      expected[idx], actual[idx],
      "Buffers differ at index " + idx
    );
  }
};

// Emits an event in the next tick.
var delayed_emitter = function delayed_emitter(emitter, args) {
  process.nextTick(function() {
    emitter.emit.apply(emitter, args);
  });
};

// Executes a test continuation trapping exceptions.
var continue_test = function continue_test(_this, done, callback) {
  return function() {
    try {
      callback.apply(_this, arguments);
      done();
    } catch (ex) {
      done(ex);
    }
  };
};


// Mock socket behaviour.
var MockSocket = function MockSocket() {
  EventEmitter.call(this);
  this._sent_data = [];
};
util.inherits(MockSocket, EventEmitter);

// Creates net.connect like closure.
MockSocket.factory = function factory(mock) {
  return function(options, callback) {
    mock.callback = callback;
    mock.options  = options;
    mock.on("connect", callback);
    return mock;
  };
};

// Simulate connection close.
MockSocket.prototype.close_sock = function(has_errors) {
  delayed_emitter(this, ["close", has_errors]);
};

// Simulate connection success.
MockSocket.prototype.connect = function connect() {
  delayed_emitter(this, ["connect"]);
};

// Simulate incoming data.
MockSocket.prototype.data = function connect(chunk) {
  delayed_emitter(this, ["data", chunk]);
};

// Smulate error.
MockSocket.prototype.fail = function fail(ex) {
  delayed_emitter(this, ["error", ex]);
};

// Keep sent buffers for asserts.
MockSocket.prototype.send = function(send) {
  this._sent_data.push(send);
};


var proto_buf = require(
  "../module/deps/protocols-daemon/protocols-daemon"
).sf.protocols.daemon;
var Connection = require("../module/connection");

suite("Connection", function() {
  setup(function() {
    this.socket = new MockSocket();
    this.connection = new Connection(
      "localhost", 2341, MockSocket.factory(this.socket)
    );
  });

  suite("reads", function() {
    setup(function(done) {
      // Connect the socket.
      this.socket.connect();
      this.connection.on("connected", done);

      // Prepare the message.
      this.message = new proto_buf.Message();
      this.message.code = proto_buf.Message.Code.Stop;

      // Prepare length buffer.
      this.message_len = this.message.calculate();
      this.len_buffer = new buffer.Buffer(4);
      this.len_buffer.writeUInt32BE(this.message_len, 0);
    });

    test("a chuncked message", function(done) {
      // Split buffer.
      var buffers = [];
      var message_buffer = this.message.toBuffer();

      for (var idx = 0; idx < this.message_len; idx++) {
        buffers.push(message_buffer.slice(idx, idx+1));
      }

      // Send chunks.
      var socket = this.socket;
      socket.data(this.len_buffer);
      buffers.forEach(function(chunk) {
        socket.data(chunk);
      });

      // Attach listener.
      var k = function k(msg) {
        assert.equal(msg.code, proto_buf.Message.Code.Stop);
      };
      this.connection.on("message", continue_test(this, done, k));
    });

    test("a message", function(done) {
      // Send two chunks.
      this.socket.data(this.len_buffer);
      this.socket.data(this.message.toBuffer());

      // Attach listener.
      var k = function k(msg) {
        assert.equal(msg.code, proto_buf.Message.Code.Stop);
      };
      this.connection.on("message", continue_test(this, done, k));
    });

    test("a message in one buffer", function(done) {
      var send_buffer = buffer.Buffer.concat([
        this.len_buffer,
        this.message.toBuffer()
      ]);
      this.socket.data(send_buffer);

      // Attach listener.
      var k = function k(msg) {
        assert.equal(msg.code, proto_buf.Message.Code.Stop);
      };
      this.connection.on("message", continue_test(this, done, k));
    });

    test("multiple messages", function(done) {
      // Send message twice.
      this.socket.data(this.len_buffer);
      this.socket.data(this.message.toBuffer());
      this.socket.data(this.len_buffer);
      this.socket.data(this.message.toBuffer());

      // Attach listener and assertions.
      var _this = this;
      var messages = [];

      var assert_block = function() {
        assert.equal(2, messages.length);
        messages.forEach(function(msg) {
          assert.equal(msg.code, proto_buf.Message.Code.Stop);
        });
      };

      var handle_event = function(msg) {
        messages.push(msg);
        if (messages.length === 2) {
          var finish = continue_test(_this, done, assert_block);
          finish();
        }
      };
      this.connection.on("message", handle_event);
    });

    test("multiple messages interlieved", function(done) {
      // Build two chunks:
      //  - Len of M1 + 1 byte of M1.
      //  - Rest of M1 + len of M2 + M2.
      var message_buffer  = this.message.toBuffer();
      var send_buffer_one = buffer.Buffer.concat([
        this.len_buffer,
        message_buffer.slice(0, 1)
      ]);
      var send_buffer_two = buffer.Buffer.concat([
        message_buffer.slice(1),
        this.len_buffer,
        message_buffer
      ]);

      // Send data.
      this.socket.data(send_buffer_one);
      this.socket.data(send_buffer_two);

      // Attach listener and assertions.
      var _this = this;
      var messages = [];

      var assert_block = function() {
        assert.equal(2, messages.length);
        messages.forEach(function(msg) {
          assert.equal(msg.code, proto_buf.Message.Code.Stop);
        });
      };

      var handle_event = function(msg) {
        messages.push(msg);
        if (messages.length === 2) {
          var finish = continue_test(_this, done, assert_block);
          finish();
        }
      };
      this.connection.on("message", handle_event);
    });
  });

  suite("writes", function() {
    setup(function(done) {
      // Connect the socket.
      this.socket.connect();
      this.connection.on("connected", done);

      // Prepare the message.
      this.message = new proto_buf.Message();
      this.message.code = proto_buf.Message.Code.Stop;

      // Prepare length buffer.
      this.message_len = this.message.calculate();
      this.len_buffer = new buffer.Buffer(4);
      this.len_buffer.writeUInt32BE(this.message_len, 0);
    });

    test("writes length", function() {
      var sent = this.socket._sent_data;
      this.connection.send(this.message);

      assert(sent.length >= 1, "Message length not written.");
      assert_buffers_equal(this.len_buffer, sent[0]);
    });

    test("writes message", function() {
      var sent = this.socket._sent_data;
      this.connection.send(this.message);

      assert.equal(2, sent.length, "Message not written.");
      assert_buffers_equal(this.message.toBuffer(), sent[1]);
    });
  });

  test("attempts connection", function() {
    assert.deepEqual(this.socket.options, {
      host: "localhost",
      port: 2341
    });
  });

  test("fail if not connected", function() {
    var connection = this.connection;
    assert.throws(function() {
      connection.send(null);
    }, Error, /Connection not established/);
  });

  test("triggers closed event", function(done) {
    this.socket.close_sock();
    this.connection.on("closed", continue_test(this, done, function(has_err) {
      assert(!has_err, "Closed should be succesfull");
      assert(
        !this.connection._socket_connected,
        "Connection should be closed"
      );
    }));
  });

  test("triggers connected event", function(done) {
    this.socket.connect();
    this.connection.on("connected", done);
  });

  test("triggers error event", function(done) {
    var ex = new Error();
    this.socket.fail(ex);

    this.connection.on("error", continue_test(this, done, function(err) {
      assert.equal(ex, err);
      assert(
        !this.connection._socket_connected,
        "Connection should be closed"
      );
    }));
  });
});
