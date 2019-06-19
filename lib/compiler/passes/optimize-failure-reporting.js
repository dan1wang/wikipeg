"use strict";

var visitor        = require("../visitor"),
    asts           = require("../asts");

// Find rules that never report failures and silence them.
// A rule does not report failure if
//   A) it is a named rule and not a start rule
//   B) or it is called by A, or
//   C) or it is called by an epxression that always succeeds:
//      * an optional (?) expression, or
//      * a zero_or_more (*) expression
//   D) or it is called by an and (&) or not (!) expression
//   E) or it only contains epxressions that always succeed:
//      * an optional (?) expression,
//      * or a zero_or_more (*) expression,
//      * or an any (.) expression,
//      * or a sequence or choice containing only the aforementioned expressions

function optimizeFailureReporting(ast, options) {
  // Check for rules that always matches
  const RECURSION_LIMIT = 6;

  const alwaysMatch = function(node, result) {
    result.alwaysMatch = true;
    return result;
  };

  const maybeMatch = function(node, result) {
    result.alwaysMatch = false;
    return result;
  };

  const deferMatch = function(node, result) {
    result.recursion++;
    if (result.recursion >= RECURSION_LIMIT) {
      result.alwaysMatch = false;
    } else {
      checkAlwaysMatch(node.expression, result);
    }
    return result;
  };

  const ruleMatch = function(node, result) {
    if (!result) {
      result = {
        alwaysMatch: false,
        recursion: 0
      };
    }

    if (node.hasOwnProperty('alwaysMatch')) {
      result.alwaysMatch = node.alwaysMatch;
      return result;
    }

    result.recursion++;
    if (result.recursion >= RECURSION_LIMIT) {
      node.alwaysMatch = false;
      result.alwaysMatch = false;
    } else {
      checkAlwaysMatch(node.expression, result);
      node.alwaysMatch = result.alwaysMatch;
    }
    return result;
  };

  const checkAlwaysMatch = visitor.build ({
    rule: ruleMatch,
    named: ruleMatch,

    rule_ref: function(node, result) {
      const rule = asts.findRule( ast, node.name );
      checkAlwaysMatch(rule, result);
      return result;
    },

    choice: function(node, result) {
      let alwaysMatch = false;
      node.alternatives.forEach( (child) => {
        const subresult = Object.assign({}, result);
        alwaysMatch = checkAlwaysMatch(child, subresult).alwaysMatch || alwaysMatch;
      });

      result.alwaysMatch = alwaysMatch;
      return result;
    },

    sequence: function(node, result) {
      let alwaysMatch = true;
      node.elements.forEach( (child) => {
        const subresult = Object.assign({}, result);
        alwaysMatch = checkAlwaysMatch(child, subresult).alwaysMatch && alwaysMatch;
      });
      result.alwaysMatch = alwaysMatch;
      return result;
    },

    labeled: deferMatch,
    picked: deferMatch,
    text: deferMatch,
    simple_and: deferMatch,
    simple_not: deferMatch,
    action: deferMatch,

    optional: alwaysMatch,
    zero_or_more: alwaysMatch,
    any:  alwaysMatch,

    one_or_more: maybeMatch,
    class: maybeMatch,
    literal: function(node, result) {
      // Empty literal always match on any input
      result.alwaysMatch = node.value.length === 0 ? true : false;
      return result;
    },

    semantic_and:  maybeMatch,
    semantic_not:  maybeMatch,
    parameter_and: maybeMatch,
    parameter_not: maybeMatch,
    labeled_param: maybeMatch,
  });

  checkAlwaysMatch(ast);

  const startRules = options.allowedStartRules.concat(options.allowedStreamRules);

  // Disable failure reporting for rules by default
  ast.rules.forEach( node => {
    node.reportsFailure = false;
  });

  // Enable failure reporting for start rules
  const failReportingRules = startRules.map( name => {
    const rule = asts.findRule( ast, name );
    rule.reportsFailure = true;
    return rule;
  });

  // Selectively enable failure reporting for rules in start rules' call graph
  const check = visitor.build ({
    rule: function(node) {
      if (!node.alwaysMatch) check(node.expression);
    },

    // Break AST traversing because failure reporting is already disabled
    named: function() {},

    rule_ref: function(node) {
      const rule = asts.findRule(ast, node.name);
      // This function is only reached when the parent rule reports failures.
      // Recheck all rules called by the referenced rule.
      if ((!rule.reportsFailure ) && (!rule.alwaysMatch)) {
        rule.reportsFailure = true;
        failReportingRules.push( rule );
      }
    },

    // Never reports error, so break AST traversing
    simple_and: function() {},
    simple_not: function() {},

    // Always match, so break AST traversing
    optional: function() {},
    zero_or_more: function() {}
  });

  while (failReportingRules.length) {
    check(failReportingRules.shift(), []);
  }
}

module.exports = optimizeFailureReporting;

