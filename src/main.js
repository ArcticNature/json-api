var api = require("./api/app");
var app_setup = require("./setup");


// System configuration.
var configuration = {
  port: 1840
};


// Start the server.
app_setup(configuration, api.injector);
var server = api.app.listen(configuration.port, function() {
  var port = server.address().port;
  console.log("JSON API server ready on port " + port);
});
