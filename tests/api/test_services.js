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


    /**
     * Simulates a get request after adding a message to the response list.
     *
     * @param {!String} uri The URI to get.
     * @param {!Obect}  message The message to wrap.
     * @param {!String} code    The name of the message code to wrap.
     * @param {?String} message_type
     *   The name of the type of the mesage to wrap.
     *   By default this is the same as `code`.
     */
    this._get = function _get(uri, message, code, message_type) {
      var response = this._to_message(message, code, message_type);
      this.pool.addResponse(response);
      return this.supertest.get(uri);
    };

    /**
     * Wrpas a protocol buffer message into a generic message object.
     * @param {!Obect}  message The message to wrap.
     * @param {!String} code    The name of the message code to wrap.
     * @param {?String} message_type
     *   The name of the type of the mesage to wrap.
     *   By default this is the same as `code`.
     */
    this._to_message = function _to_message(message, code, message_type) {
      var full_message  = new messages.Message();
      full_message.code = messages.Message.Code[code];

      message_type = message_type || code;
      full_message.set(
        ".sf.protocols.daemon." + message_type + ".msg",
        message
      );

      return full_message;
    };
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

    // Make the request and assert on the response.
    var request = this._get("/services", mock_services, "ServiceList");

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

  test("/service.with.instances", function() {
    // Create mock response.
    var service_state = new messages.ServiceState();
    service_state.connector = "test";
    service_state.service = "service.with.instances";
    service_state.status = 2;
    service_state.version = "abc";

    var item = new messages.ServiceState.Instance();
    item.id = "a";
    item.status = -1;
    item.version = "abc";
    service_state.instances.push(item);

    item = new messages.ServiceState.Instance();
    item.id = "b";
    item.status = 1;
    item.version = "def";
    service_state.instances.push(item);

    // Make the request and assert on the response.
    var request = this._get(
      "/services/service.with.instances",
      service_state, "ServiceState"
    );

    return request.then(function(result) {
      var response = result.res;
      var expected = {
        connector: "test",
        service: "service.with.instances",
        status:  2,
        version: "abc",
        instances: [{
          id: "a",
          status: -1,
          version: "abc"
        }, {
          id: "b",
          status: 1,
          version: "def"
        }]
      };

      assert.equal(200, response.statusCode);
      assert.deepEqual(expected, response.body);
    });
  });

  test("/service.with.no.instances", function() {
    // Create mock response.
    var service_state = new messages.ServiceState();
    service_state.connector = "test";
    service_state.service = "service.with.no.instances";
    service_state.status = 2;
    service_state.version = "abc";

    // Make the request and assert on the response.
    var request = this._get(
      "/services/service.with.no.instances",
      service_state, "ServiceState"
    );

    return request.then(function(result) {
      var response = result.res;
      var expected = {
        connector: "test",
        instances: [],
        service: "service.with.no.instances",
        status:  2,
        version: "abc"
      };

      assert.equal(200, response.statusCode);
      assert.deepEqual(expected, response.body);
    });
  });
});

