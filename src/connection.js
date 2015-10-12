var buffer = require("buffer");
var events = require("events");
var net  = require("net");
var util = require("util");

var EventEmitter = events.EventEmitter;

var logging = require("./logging");
var protos = require("./deps/protocols-daemon/protocols-daemon");
var proto_buf = protos.sf.protocols.daemon;


/*!
 * @class Connection
 * Wraps a TCP connection into a Protocol Buffer generating
 * EventEmitter.
 *
 * The `send` method sends Protocol Buffer messages over the
 * connection prefixed with a unsigned 32 bits integer that
 * represents the length of the message.
 *
 * When a response is received from the other end of the
 * connection the length of the message is decoded and the full
 * message is read from the channel.
 * Once the full message is read it is decoded as a
 * Protocol Buffer and is passed as an argument to the `message`
 * event.
 *
 * If anything wrong happens an `error` event is emitted.
 *
 * The connection to the server is attempted on creation.
 * Once the connection is established a `connected` event is
 * triggered.
 *
 * @param {!String} host The host to connect to.
 * @param {!String} port The port to connect to.
 * @param {?Function} connector Function to create a socket.
 *                              Defaults to `net.connect`.
 */
var Connection = module.exports = function Connection(
    host, port, connector
) {
  EventEmitter.call(this); 

  // Server details.
  this._connector = connector || net.connect;
  this._host = host;
  this._port = port;

  // Connection state.
  this._socket = null;
  this._socket_connected = false;

  // Message buffering.
  this._message_buffer = null;
  this._message_length = -1;
  this._read_length = 0;

  // Initialise connection.
  this._connect();
};
util.inherits(Connection, EventEmitter);


/*! Handles a TCP connection close. */
Connection.prototype._closed = function _closed(has_errors) {
  logging.info("Closing TCP connection with the server.");
  this._socket_connected = false;
  this._socket.destroy();
  this.emit("closed", has_errors);
};

/*! Opens socket to the server and registers listeners on it. */
Connection.prototype._connect = function _connect() {
  // Connections are single use objects.
  if (this._socket) {
    throw new Error("Connection already configured.");
  }

  // Create TCP socket.
  this._socket = this._connector({
    host: this._host,
    port: this._port
  }, this._connected.bind(this));

  // Attach essential handlers.
  this._socket.on("close", this._closed.bind(this));
  this._socket.on("error", this._socket_error.bind(this));
};

/*! TCP connection ready, finish setup. */
Connection.prototype._connected = function _connected() {
  logging.info("TCP connection established.");
  this._socket_connected = true;
  this._socket.on("data", this._socket_data.bind(this));
  this.emit("connected");
};

/*! Handles incoming data. */
Connection.prototype._socket_data = function _socket_data(chunk) {
  // Temporary bookkeeping.
  var left_in_chunck = chunk.length;
  var read_offset = 0;

  var count = 0;
  while (left_in_chunck > 0) {
    // Look for message length at the start of new messages.
    var len_size = this._socket_data_len(chunk, read_offset);
    read_offset += len_size;
    left_in_chunck -= len_size;

    // Append data to the message buffer.
    var data_size = this._socket_data_msg(chunk, left_in_chunck, read_offset);
    left_in_chunck -= data_size;
    read_offset = data_size;
    this._read_length += data_size;

    // Decode and emit if possible.
    this._socket_data_end();

    count += 1;
  }
};

// If the message is complete decode it, emit it and reset buffer.
Connection.prototype._socket_data_end = function _socket_data_end() {
  // Is the message complete?
  if (this._message_length === this._read_length) {
    var message = proto_buf.Message.decode(this._message_buffer);
    this.emit("message", message);

    // Reset buffer state.
    this._message_buffer = null;
    this._message_length = -1;
    this._read_length = 0;
  }
};

// If no message is being read, start with the length of a new one.
Connection.prototype._socket_data_len = function _socket_data_len(
  chunk, read_offset
) {
  if (this._message_length === -1) {
    this._message_length = chunk.readUInt32BE(read_offset);
    this._message_buffer = new buffer.Buffer(this._message_length);
    return 4;
  }
  return 0;
};

// Append data to the message buffer.
Connection.prototype._socket_data_msg = function _socket_data_msg(
  chunk, left_in_chunck, read_offset
) {
  if (left_in_chunck > 0) {
    var left_in_message = this._message_length - this._read_length;
    var source_end = Math.min(left_in_chunck, left_in_message);

    chunk.copy(
      this._message_buffer, this._read_length,
      read_offset, read_offset + source_end
    );

    return source_end;
  }
  return 0;
};

// Handles a socket error event.
Connection.prototype._socket_error = function _socket_error(err) {
  logging.debug("Recieved TCP error: ", err);

  // Terminate connection if needed.
  if (this._socket_connected) {
    this._socket_connected = false;
    this._socket.destroy();
  }

  // Forward TCP error.
  this.emit("error", err, true);
};

// Sends a protocol buffer message to the server.
Connection.prototype.send = function send(message) {
  if (!this._socket_connected) {
    throw new Error("Connection not established");
  }

  // Prepare length buffer.
  var message_len = message.calculate();
  var len_buffer  = new buffer.Buffer(4);
  len_buffer.writeUInt32BE(message_len, 0);

  // Send length and data.
  var _this = this;
  this._socket.write(len_buffer);
  this._socket.write(message.toBuffer(), function() {
    _this.emit("flushed");
  });
};
