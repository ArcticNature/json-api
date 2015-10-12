var assert = require("assert");

var app_setup = require("../module/setup");
var Injector  = new require("../module/api/utils/injector");


suite("Setup", function() {
  setup(function() {
    this.configuration = {};
    this.configuration.port = 1840;
    this.injector = new Injector();
  });

  test("pool is injected", function() {
    app_setup(this.configuration, this.injector);

    var pool = this.injector.get("pool");
    assert(pool, "Pool not injected");
  });
});
