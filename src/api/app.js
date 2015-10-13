var express = require("express");
var express_utils = require("./utils/express");
var Injector = require("./utils/injector");


// Routes.
var server   = require("./server");
var services = require("./services");


// Build application.
var app = express();
var injector = new Injector();

// Mount middleware.
app.use(Injector.express_inject(injector, ["pool"]));
app.use(express_utils.promiseHandler);
app.use(express_utils.errorHandler);

// Mount routes.
app.use("/server",   server);
app.use("/services", services);


// Module interface.
module.exports = {
  app: app,
  injector: injector
};
