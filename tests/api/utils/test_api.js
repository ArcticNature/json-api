var assert = require("assert");
var api_utils = require("../../../module/api/utils/api");


suite("API utils", function() {
  suite("int64", function() {
    test("converts to number", function() {
      var start = { low: 4, high: 0, unsigned: false };
      var converted = api_utils.int64(start);
      assert.strictEqual(4, converted);
    });

    test("converts precise zero to number", function() {
      var start = { low: 0, high: 0, unsigned: false };
      var converted = api_utils.int64(start);
      assert.strictEqual(0, converted);
    });

    test("converts number to precise", function() {
      var expected  = { low: 4, high: 0, unsigned: false };
      var converted = api_utils.int64(4, true);
      assert.deepEqual(expected, converted);
    });

    test("converts string to precise", function() {
      var converted = api_utils.int64("42");
      assert.strictEqual(42, converted);
    });

    test("fails for non valid string", function() {
      assert.throws(function() {
        api_utils.int64("£123");
      });
    });

    test("returns unchanged if precise", function() {
      var start = { low: 4, high: 0, unsigned: false };
      var converted = api_utils.int64(start, true);
      assert.deepEqual(start, converted);
    });

    test("returns unchanged if not precise", function() {
      var converted = api_utils.int64(4);
      assert.deepEqual(4, converted);
    });
  });
});
