var express = require("express");

//var api_utils = require("./utils/api");
var protos = require("../deps/protocols-daemon/protocols-daemon");
var messages = protos.sf.protocols.daemon;


/**
 * express.js router for /services endpoints.
 */
var router = module.exports = express.Router();


/**
 * Returns the state of the SnowFox daemon.
 */
router.get("/", function(req, res) {
  var message  = new messages.Message();
  message.code = messages.Message.Code.ServiceList;

  var promise  = req.context.pool.requestResponse(message);
  res._promise = promise.then(function(msg) {
    var services = msg.get(".sf.protocols.daemon.ServiceList.msg");
    return services.items.map(function(item) {
      return {
        id: item.id,
        status:  item.status,
        version: item.version
      };
    });
  });
});
