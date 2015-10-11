var util = require("util");


/**
 * @class Injector
 * Inject variables dinamically.
 *
 * Injector instances keep mappings of variable defined
 * at run time and add them to contexts that would otherwise
 * have to "find" these dependencies.
 */
var Injector = module.exports = function Injector() {
  this._variables = {};
};

/**
 * Defines a new variable.
 * Variables can only be defined once, to update the value
 * use the `set` method.
 *
 * @param {!String} name  The name of the defined varaible.
 * @param {!Any}    value The value of the defined variable.
 * @param {?bool}   ro     Defines a read-only variable.
 */
Injector.prototype.define = function define(name, value, ro) {
  // Check for definition conflicts.
  if (name in this._variables) {
    throw new Injector.InvalidDefinition(
      "Variable '" + name + "' already defined"
    );
  }

  this._variables[name] = {
    ro: ro || false,
    value: value
  };
};

/**
 * Fetches a variable, if possible.
 *
 * @param {!String} name The name of the variable to find.
 * @returns {!Any} the requested variable.
 * @throws {Injector.UndefinedVariable} If the variable is not defined.
 */
Injector.prototype.get = function get(name) {
  if (!this._variables.hasOwnProperty(name)) {
    throw new Injector.UndefinedVariable(name);
  }
  return this._variables[name].value;
};

/**
 * Sets the value of a defined variable.
 * @param {!String} name  The name of the variable to set.
 * @param {!Any}    value The value to set the variable to.
 * @throws {Injector.InvalidDefinition} If the variable is read only.
 * @throws {Injector.UndefinedVariable} If the variable is not defined.
 */
Injector.prototype.set = function set(name, value) {
  if (!this._variables.hasOwnProperty(name)) {
    throw new Injector.UndefinedVariable(name);
  }

  if (this._variables[name].ro) {
    throw new Injector.InvalidDefinition(
      "Cannot update read-only variable"
    );
  }

  this._variables[name].value = value;
  return value;
};

/**
 * Injects variables onto a context.
 * Note that this method does not try to avoid name clashing and
 * could cause variables on the context to be overwritten.
 *
 * @param {!Object} context
 *    The context onto which the variables should be attached.
 * @param {!Array.<String>|!Object.<String, ?String>} variables
 *    Variables to inject.
 *
 *    If this argument is a map from string to string the
 *    variables name by the keys of the map will be injected
 *    onto the context with the name they map to.
 *    If the mapped value is `null` the name is kept the same.
 *
 *    If this argument is an array of strings it is interpredted
 *    as an identity map and the named variables are injected
 *    without rename.
 */
Injector.prototype.inject = function inject(context, variables) {
  var _this = this;
  var extention = {};

  // Normalise variables map.
  if (Array.isArray(variables)) {
    var names = variables;
    variables = {};
    names.forEach(function(name) {
      variables[name] = name;
    });

  } else {
    Object.keys(variables).forEach(function(name) {
      variables[name] = variables[name] || name;
    });
  }

  // Collect new context.
  // This prevents a polluted context if any name is not found.
  Object.keys(variables).forEach(function(name) {
    extention[variables[name]] = _this.get(name);
  });

  // Finally update the context.
  Object.keys(extention).forEach(function(name) {
    context[name] = extention[name];
  });
};


Injector.InvalidDefinition = function InvalidDefinition(message) {
  // Call super constructor.
  Error.call(this, message);
  Error.captureStackTrace(this, Injector.InvalidDefinition);
};
util.inherits(Injector.InvalidDefinition, Error);

Injector.UndefinedVariable = function UndefinedVariable(name) {
  // Call super constructor.
  Error.call(this, "Undefined variable '" + name + "'");
  Error.captureStackTrace(this, Injector.UndefinedVariable);
};
util.inherits(Injector.UndefinedVariable, Error);
