var Pool = require("./pool");


// Setup function.
module.exports = function setup(configuration, injector) {
  var server = configuration.server || {};
  var host   = server.host || "localhost";
  var port   = server.port || 2341;

  var pool = new Pool(host, port);
  injector.define("pool", pool, true);
};
