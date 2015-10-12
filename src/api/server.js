var express = require("express");

var api_utils = require("./utils/api");
var protos = require("../deps/protocols-daemon/protocols-daemon");
var messages = protos.sf.protocols.daemon;


/**
 * express.js router for /server endpoints.
 */
var router = module.exports = express.Router();


router.get("/state", function(req, res) {
  var message  = new messages.Message();
  message.code = messages.Message.Code.State;

  var promise  = req.context.pool.requestResponse(message);
  res._promise = promise.then(function(msg) {
    var precise = req.headers["x-precise64"] || false;
    var state   = msg.get(".sf.protocols.daemon.State.msg");
    var status_code = api_utils.int64(state.status_code, precise);
    var start_time  = api_utils.int64(state.start_time, precise);

    return {
      status: {
        code: status_code,
        message: state.status_message,
        "start-time": start_time
      },
      version: {
        "build-date": state.version_date,
        config: state.config_version,
        "snow-fox-daemon": state.version
      }
    };
  });
});
