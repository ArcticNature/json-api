var supertest = require("../../module/node_modules/supertest");
var Promise = require("../../module/node_modules/bluebird");


/**
 * @class Request
 * Helper class to promisify super-test calls.
 */
var Request = module.exports = function Request(app) {
  this.app = app;
  this.supertest = supertest(app);
};

// Proxy supertest.get
Request.prototype.get = function get() {
  var request = this.supertest.get.apply(this.supertest, arguments);
  return new Promise(function(resolve, reject) {
    request.end(function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

// Proxy supertest.put
Request.prototype.put = function put() {
  var request = this.supertest.put.apply(this.supertest, arguments);
  return new Promise(function(resolve, reject) {
    request.end(function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};
