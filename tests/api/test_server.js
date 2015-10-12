var assert = require("assert");

var api = require("../../module/api/app");
var protos = require("../../module/deps/protocols-daemon/protocols-daemon");
var messages = protos.sf.protocols.daemon;

var MockPool = require("./mock_pool");
var Request  = require("./request");


suite("API /server", function() {
  setup(function() {
    // Increase test timeout as the RaspberryPi running Jenkins needs more time.
    this.timeout(10 * 1000);

    this.app = api.app;
    this.injector = api.injector;

    this.pool = new MockPool();
    this.supertest = new Request(this.app);

    this.injector.define("pool", this.pool, true);
  });

  test("/state", function() {
    // Create mock response.
    var mock_state = new messages.State();
    mock_state.config_version = "not-applicable";
    mock_state.status_code = 4;
    mock_state.status_message = "Up and running";
    mock_state.start_time = 33;
    mock_state.version = "0.0.0-8296ad5";
    mock_state.version_date = "2015-10-11 20:49:30";

    var mock_response = new messages.Message();
    mock_response.code = messages.Message.Code.State;
    mock_response.set(".sf.protocols.daemon.State.msg", mock_state);

    // Make the request and check the result.
    this.pool.addResponse(mock_response);
    var request = this.supertest.get("/server/state");

    // Wait for it to finish and run assertions.
    return request.then(function(result) {
      var response = result.res;
      var expected = {
        status: {
          code: 4,
          message: "Up and running",
          "start-time": 33
        },
        version: {
          "build-date": "2015-10-11 20:49:30",
          config: "not-applicable",
          "snow-fox-daemon": "0.0.0-8296ad5"
        }
      };

      assert.equal(200, response.statusCode);
      assert.deepEqual(expected, response.body);
    });
  });
});

