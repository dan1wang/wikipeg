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

function analyzeFailureReporting(ast, options) {
  const alwaysMatch = function(node) {
    // console.log(`always (${node.type}):` + JSON.stringify(node.location.start));
    checkAlwaysMatch(node.expression);
    node.alwaysMatch = true;
    return true;
  };

  const maybeMatch = function(node) {
    // console.log(`maybe (${node.type}):` + JSON.stringify(node.location.start));
    checkAlwaysMatch(node.expression);
    node.alwaysMatch = false;
    return false;
  };

  const deferMatch = function(node) {
    // console.log(`defer (${node.type}):` + JSON.stringify(node.location.start));
    node.alwaysMatch = checkAlwaysMatch(node.expression);
    return node.alwaysMatch;
  };

  // Check for rules that always matches
  const checkAlwaysMatch = visitor.build ({
    rule: deferMatch,
    named: deferMatch,
    labeled: deferMatch,
    picked: deferMatch,
    text: deferMatch,
    simple_and: deferMatch,
    simple_not: deferMatch,

    choice: function(node) {
      // console.log('choice:' + JSON.stringify(node.location.start));
      node.alwaysMatch = false;
      node.alternatives.forEach( (child) => {
        node.alwaysMatch = checkAlwaysMatch(child) || node.alwaysMatch;
      });
      return node.alwaysMatch;
    },
    sequence: function(node) {
      // console.log('seq:' + JSON.stringify(node.location.start));
      node.alwaysMatch = true;
      node.elements.forEach( (child) => {
        node.alwaysMatch = checkAlwaysMatch(child) && node.alwaysMatch;
      });
      return node.alwaysMatch;
    },

    optional: alwaysMatch,
    zero_or_more: alwaysMatch,
    action: alwaysMatch,
    any:  function() { return true; },

    one_or_more: maybeMatch,

    rule_ref: function() { return false; },
    literal: function() { return false; },
    class: function() { return false; },
  });

  ast.rules.forEach( node => checkAlwaysMatch(node) );

  const startRules = options.allowedStartRules.concat(options.allowedStreamRules);

  // Disable failure reporting for rules by default
  ast.rules.forEach( node => {
    node.failureReporting = false;
  });

  // Enable failure reporting for start rules
  const failReportingRules = startRules.map( name => {
    const rule = asts.findRule( ast, name );
    rule.failureReporting = true;
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
      if ( ! rule.failureReporting ) {
        rule.failureReporting = true;
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

module.exports = analyzeFailureReporting;

