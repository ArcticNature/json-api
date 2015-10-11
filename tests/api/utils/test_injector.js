var assert = require("assert");

var Injector = require("../../../module/api/utils/injector");


suite("Injector", function() {
  setup(function() {
    this.injector = new Injector();
    this.injector.define("test", 42);
  });

  suite("definition", function() {
    test("adds a variable", function() {
      assert.deepEqual(this.injector._variables, {
        test: { ro: false, value: 42 }
      });
    });

    test("can be only done once", function() {
      var injector = this.injector;
      assert.throws(
        function() { injector.define("test", 42); },
        Injector.InvalidDefinition,
        "Variable 'test' already defined"
      );
    });
  });

  suite("getter", function() {
    test("fails on undefined variables", function() {
      var injector = this.injector;
      assert.throws(
        function() { injector.get("demo"); },
        Injector.UndefinedVariable
      );
    });

    test("returns defined variable", function() {
      var val = this.injector.get("test");
      assert.equal(42, val);
    });
  });

  suite("inject", function() {
    setup(function() {
      this.injector.define("a", 1, true);
      this.injector.define("b", 2);
      this.injector.define("c", { a: 1, b: 2 });
    });

    test("adds by name", function() {
      var context = {};
      this.injector.inject(context, { a: "a" });
      assert.deepEqual({ a: 1 }, context);
    });

    test("adds and re-name", function() {
      var context = {};
      this.injector.inject(context, { a: "b" });
      assert.deepEqual({ b: 1 }, context);
    });

    test("adds with identity flag", function() {
      var context = {};
      this.injector.inject(context, { a: null });
      assert.deepEqual({ a: 1 }, context);
    });

    test("support names array", function() {
      var context = {};
      this.injector.inject(context, ["a", "b", "c"]);

      var expected = {
        a: 1, b: 2, c: {
          a: 1, b: 2
        }
      };
      assert.deepEqual(expected, context);
    });
  });

  suite("setter", function() {
    test("can only update writable vars", function() {
      var injector = this.injector;
      injector.define("demo", 1, true);

      assert.throws(
        function() { injector.set("demo", 2); },
        Injector.InvalidDefinition
      );
    });

    test("requires variable to be defined", function() {
      var injector = this.injector;
      assert.throws(
        function() { injector.set("demo", 2); },
        Injector.UndefinedVariable
      );
    });

    test("updates the value", function() {
      this.injector.set("test", 2);
      assert.equal(2, this.injector.get("test"));
    });
  });
});
