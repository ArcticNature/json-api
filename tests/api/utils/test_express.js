var assert = require("assert");

var exceptions    = require("../../../module/exceptions");
var express_utils = require("../../../module/api/utils/express");


var Request = function Request() {
};


var Response = function Response() {
  this.data = null;
  this.http_status = 200;
  this.json_data = null;
};

Response.prototype.json = function json(data) {
  this.json_data = data;
  return this;
};

Response.prototype.send = function send(data) {
  this.data = data;
  return this;
};

Response.prototype.status = function status(code) {
  this.http_status = code;
  return this;
};


var StubPromise = function StubPromise(then, fail) {
  this._fail = fail || null;
  this._then = then || null;
};

StubPromise.prototype.then = function then(k) {
  if (this._then !== null) {
    k(this._then());
  }
  return this;
};

StubPromise.prototype.catch = function(k) {
  if (this._fail !== null) {
    k(this._fail());
  }
  return this;
};


suite("Express.js utils", function() {
  setup(function() {
    this.request  = new Request();
    this.response = new Response();
  });

  suite("errorHandler", function() {
    test("HTTPErrors are recognised", function() {
      var ex = new exceptions.HTTPError(530, "Abc");
      express_utils.errorHandler(ex, this.request, this.response);
  
      assert.equal(530, this.response.http_status);
      assert.equal("Abc", this.response.data);
    });
  
    test("Other Errors are recognised", function() {
      var ex = new exceptions.PoolExhausted();
      express_utils.errorHandler(ex, this.request, this.response);
  
      assert.equal(500, this.response.http_status);
      assert.equal(
        "Unable to recover from an error: Connection pool exhausted.",
        this.response.data
      );
    });
  });

  suite("promiseHandler", function() {
    test("completes succesfully", function() {
      this.response._promise = new StubPromise(function() {
        return 55;
      });
      express_utils.promiseHandler(
        this.request, this.response, function() {}
      );

      assert.equal(200, this.response.http_status);
      assert.equal(55, this.response.json_data);
    });

    test("completes with error", function() {
      this.response._promise = new StubPromise(null, function() {
        return new exceptions.HTTPError(403, "Noop");
      });
      express_utils.promiseHandler(
        this.request, this.response, function() {}
      );

      assert.equal(403, this.response.http_status);
      assert.equal("Noop", this.response.data);
      assert.equal(null, this.response.json_data);
    });
  });
});
