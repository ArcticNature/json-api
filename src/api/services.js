var express = require("express");

//var api_utils = require("./utils/api");
var protos = require("../deps/protocols-daemon/protocols-daemon");
var messages = protos.sf.protocols.daemon;


/**
 * express.js router for /services endpoints.
 */
var router = module.exports = express.Router();


/**
 * Returns the list of services loaded by the daemon.
 * If a service is defined by no instances were ever started
 * or detected running that service will not be listed here.
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


/**
 * Returns information about a running service.
 */
router.get("/:service_id", function(req, res) {
  var message    = new messages.Message();
  var service_id = new messages.ServiceId();
  message.code   = messages.Message.Code.ServiceState;
  service_id.service_id = req.params.service_id;
  message.set(".sf.protocols.daemon.ServiceId.msg", service_id);

  var promise  = req.context.pool.requestResponse(message);
  res._promise = promise.then(function(msg) {
    var info = msg.get(".sf.protocols.daemon.ServiceState.msg");
    var instances = (info.instances || []).map(function(instance) {
      return {
        id: instance.id,
        status: instance.status,
        version: instance.version
      };
    });

    return {
      connector: info.connector,
      instances: instances,
      service: info.service,
      status:  info.status,
      version: info.version
    };
  });
});
