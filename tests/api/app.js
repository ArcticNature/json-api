var api = module.exports = require("../../module/api/app");
var MockPool = require("./mock_pool");

api.pool = new MockPool();
api.injector.define("pool", api.pool, true);
