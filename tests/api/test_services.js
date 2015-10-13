var assert = require("assert");

var api = require("./app");
var protos = require("../../module/deps/protocols-daemon/protocols-daemon");
var messages = protos.sf.protocols.daemon;
var Request  = require("./request");


suite("API /services", function() {
  setup(function() {
    // Increase test timeout as the RaspberryPi running Jenkins needs more time.
    this.timeout(10 * 1000);

    this.app = api.app;
    this.injector = api.injector;
    this.pool = api.pool;

    this.supertest = new Request(this.app);
  });

  test("/", function() {
    // Create mock response.
    var mock_services = new messages.ServiceList();
    var item = new messages.ServiceList.Item();
    item.id = "abc";
    item.status = 1;
    item.version = "def";
    mock_services.items.push(item);

    item = new messages.ServiceList.Item();
    item.id = "123";
    item.status = 2;
    item.version = "456";
    mock_services.items.push(item);

    var mock_response = new messages.Message();
    mock_response.code = messages.Message.Code.ServiceList;
    mock_response.set(".sf.protocols.daemon.ServiceList.msg", mock_services);

    // Make the request and check the result.
    this.pool.addResponse(mock_response);
    var request = this.supertest.get("/services");

    // Wait for it to finish and run assertions.
    return request.then(function(result) {
      var response = result.res;
      var expected = [{
        id: "abc",
        status:  1,
        version: "def"
      }, {
        id: "123",
        status:  2,
        version: "456"
      }];

      assert.equal(200, response.statusCode);
      assert.deepEqual(expected, response.body);
    });
  });
});

