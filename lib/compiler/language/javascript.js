function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

let javascript = {
  silence: 'silence',
  boolParams: 'boolParams',
  failed: 'peg$FAILED',
  currPos: 'peg$currPos',
  savedPos: 'peg$savedPos',
  maxFailExpected: 'peg$maxFailExpected',
  maxFailPos: 'peg$maxFailPos',
  inputLength: 'input.length',
  assertionSuccess: 'void 0',
  consumeInputChar: 'input.charAt(peg$currPos++)',
  result: 'peg$result',
  actionArgPrefix: '',

  regName(index) {
    return `r${index}`;
  },

  posRegName(index) {
    return `p${index}`;
  },

  getRegType(regName) {
    return regName.charAt(0);
  },

  ruleFuncName(name, discard, iterable) {
    if (iterable) {
      return 'peg$stream' + name;
    } else if (discard) {
      return 'peg$discard' + name;
    } else {
      return 'peg$parse' + name;
    }
  },

  ruleFuncCall(name, args) {
    return `${name}(${args.join(', ')})`;
  },

  ruleFuncDeclaration(funcName, args, body) {
    return `function ${funcName}(${args.join(', ')}) {\n${body}\n}`;
  },

  streamFuncDeclaration(funcName, args, body) {
    return `function* ${funcName}(${args.join(', ')}) {\n${body}\n}`;
  },

  varDeclaration(vars) {
    return [`var ${vars.join(',')};`];
  },

  expectationExpression(index) {
    return `peg$c${index}`;
  },

  expectationDeclaration(index, expression) {
    return `var peg$c${index} = ${expression};`;
  },

  actionDeclaration(index, argNames, code) {
    return `function peg$a${index}(${argNames.join(', ')}) {\n${code}\n}`;
  },

  actionCall(index, args) {
    return `peg$a${index}(${args.join(', ')})`;
  },

  libraryCall(name, args = []) {
    return `peg$${name}(${args.join(', ')})`;
  },

  paramArgName(name) {
    return `param_${name}`;
  },

  refParamArgDeclarator(name) {
    return `param_${name}`;
  },

  paramNameFromArg(argName) {
    let matches = /^param_(.*)$/.exec(argName);
    if (!matches) {
      throw new Error('Unexpected rule argument name: ' + argName);
    }
    return matches[1];
  },

  refParamValue(name) {
    return `param_${name}.value`;
  },

  newRef(value /*, index*/) {
    return `new peg$Reference(${value})`;
  },

  valueArgActionDeclarator(name) {
    return name;
  },

  refArgActionDeclarator(name) {
    return name;
  },

  inputSubstring(start, end) {
    return `input.substring(${start}, ${end})`;
  },

  blockStart(label) {
    return `${label}: {`;
  },

  blockEnd(label) {
    return `} // ${label}`;
  },

  gotoBlockEnd(label) {
    return `break ${label};`;
  },

  push(array, ...rest) {
    return `${array}.push(${rest.join(', ')});`;
  },

  arrayLength(expression) {
    return `${expression}.length`;
  },

  toBool(expression) {
    return `!!(${expression})`;
  },

  stringify(v) {
    return JSON.stringify(v)
      .replace(/[\x80-\xFF]/g, function(ch) { return '\\x'  + hex(ch); })
      .replace(/[\u0100-\u0FFF]/g,      function(ch) { return '\\u0' + hex(ch); })
      .replace(/[\u1000-\uFFFF]/g,      function(ch) { return '\\u'  + hex(ch); });
  },

  reduceCharacterClass(parts, options) {

    function escapeChar(char) {
      switch (char) {
        case '\\': return '\\\\';   // backslash
        case '\0': return '\\0';    // null
        case '\b': return '\\b';    // backspace
        case '\t': return '\\t';    // horizontal tab
        case '\f': return '\\f';    // form feed
        case '\n': return '\\n';    // line feed
        case '\r': return '\\r';    // carriage return
        case '\v': return '\\x0B';  // vertical tab
        default:
      }
      // Non-control characters in
      // Basic, Latin-1 Supplement, Latin Extended-A, & Latin Extended-B
      if (/^[!-~\xA1-\xAC\xAE-\u024F]/.test(char)) { return char; }
      if (char < '\x20') return '\\x0' + hex(char);
      if ((char >= '\x7F') && (char <= '\xFF'))  return '\\x'  + hex(char);
      if ((char > '\xFF') && (char <= '\u0FFF')) return '\\u0' + hex(char);
      if ( char > '\u0FFF') return '\\u' + hex(char);
      return char;
    }

    function escapeLiteralChar(char) {
      switch (char) {
        case '\\': return '\\\\';   // backslash
        case '\'': return '\\\'';   // single quote
        case '\"': return '\\\"';   // double quote
        default: return escapeChar(char);
      }
    }

    function escapeRegexChar(char) {
      switch (char) {
        case '\\': return '\\\\';   // backslash
        case '\/': return '\\/';    // closing slash
        case ']': return '\\]';     // closing bracket
        case '^': return '\\^';     // caret
        case '-': return '\\-';     // dash
        default: return escapeChar(char);
      }
    }

    let ranges = [];  // character-code ranges
    let i = 0;

    // convert parts to ranges
    parts.forEach((p) => {
      ranges.push(
        (p instanceof Array)
          ? {start:p[0], end:p[1]}
          : {start:p, end:p}
      );
    });

    // sort ranges
    ranges = ranges.sort( (a, b) => a.start.charCodeAt(0) - b.start.charCodeAt(0));

    // merge ranges
    let newRanges = [ranges[0]];
    for (i=1; i<ranges.length;i++) {
      let currRange = ranges[i];
      let topRange = newRanges[newRanges.length-1];
      if (currRange.start.charCodeAt(0) > topRange.end.charCodeAt(0) + 1) {
        newRanges.push(currRange); // no overlap
      } else {
        // overlap, update topRange.end
        if (topRange.end < currRange.end) topRange.end = currRange.end;
      }
    }
    ranges = newRanges;

    // expand ranges and then add to literalEscaped
    const MAX_LITERAL_LEN = 50;
    let literal = '';
    let literalEscaped = '';
    const addLiteralChar = (char) => {
      if (literal.indexOf(char,0) == -1) {
        literal += char;
        literalEscaped +=
          options.optimizeCodeSize
            ? escapeRegexChar(char)
            : escapeLiteralChar(char);
      }
    };

    let rangeEscaped = '';

    newRanges = [];
    if (!options.optimizeCodeSize) {
      for (i = 0; i < ranges.length; i++) {
        let currRange = ranges[i];
        let startCode = currRange.start.charCodeAt(0);
        let endCode = currRange.end.charCodeAt(0);
        if ((endCode - startCode < 3) ||
            (literal.length + endCode - startCode < MAX_LITERAL_LEN)) {
          for (let charCode = startCode; charCode <= endCode; charCode++) {
            let char = String.fromCharCode(charCode);
            if (options.ignoreCase) {
              addLiteralChar(char.toUpperCase());
              addLiteralChar(char.toLowerCase());
            } else {
              addLiteralChar(char);
            }
          }
        } else {
          newRanges.push(currRange);
        }
      } // for

      ranges = newRanges;
      if (ranges.length) {
        ranges.forEach( (el) => {
          rangeEscaped += escapeRegexChar(el.start) + '-' + escapeRegexChar(el.end);
        });
      }
    } else {
      for (i = 0; i < ranges.length; i++) {
        let currRange = ranges[i];
        let startCode = currRange.start.charCodeAt(0);
        let endCode = currRange.end.charCodeAt(0);
        if (endCode == startCode){
          rangeEscaped += escapeRegexChar(currRange.start);
        } else if (endCode - startCode == 1) {
          rangeEscaped += escapeRegexChar(currRange.start);
          rangeEscaped += escapeRegexChar(currRange.end);
        } else {
          rangeEscaped += escapeRegexChar(currRange.start);
          rangeEscaped += '-';
          rangeEscaped += escapeRegexChar(currRange.end);
        }
      }
    }

    return { literal: literalEscaped, ranges: rangeEscaped };
  },

  matchClass(node, reg, result) {
    if (node.parts.length === 0) {
      if (node.inverted) {
        // Same as .
        result.condition = 'peg$currPos < input.length';
        result.onSuccess([`${reg} = input.charAt(peg$currPos++);`]);
      } else {
        // Always fail
        result.condition = 'false';
      }
      return;
    }

    const OPTIMIZE_CODE_SIZE = false;
    const IGNORE_CASE = !!node.ignoreCase;
    const INVERTED = node.inverted;

    const parts = javascript.reduceCharacterClass(
      node.parts,
      { ignoreCase: IGNORE_CASE, optimizeCodeSize: OPTIMIZE_CODE_SIZE }
    );

    if (OPTIMIZE_CODE_SIZE)  {
      result.condition = '/^['
        + (INVERTED ? '^' : '')
        + parts.ranges
        + ']/'
        + (IGNORE_CASE ? 'i' : '')
        + `.test(${reg})`;
    } else {
      let test = '';
      if (parts.literal !== '') {
        // string.indexOf('') is always 0, so we have to check if it's
        // empty first to avoid infinite loop when we reach EOF
        test = `${reg} && "${parts.literal}".indexOf(${reg})` +
          (INVERTED ? ' == -1' : ' !== -1');
      }
      if (parts.ranges !== '') {
        let test2 = '/^['
          + (INVERTED ? '^' : '')
          + parts.ranges
          + ']/'
          + (IGNORE_CASE ? 'i' : '')
          + `.test(${reg})`;
        if (test !== '') {
          test = INVERTED?`(${test})&&(${test2})`:`(${test})||(${test2})`;
        } else {
          test = test2;
        }
      }
      result.condition = test;
    }

    result.block = [`${reg} = input.charAt(peg$currPos);`];
    result.onSuccess(['peg$currPos++;']);
  },

  matchLiteral(node, reg, result) {
    if (node.value.length === 1 && !node.ignoreCase) {
      result.condition = 'input.charCodeAt(peg$currPos) === ' + node.value.charCodeAt(0);
      result.onSuccess([[reg, ' = ', javascript.stringify(node.value), ';'].join('')]);
    } else {
      if (node.value.length === 1) {
        result.block.push([reg, ' = input.charAt(peg$currPos);'].join(''));
      } else {
        result.block.push([reg, ' = ',
          'input.substr(peg$currPos,', node.value.length, ');'].join(''));
      }
      if (node.ignoreCase) {
        result.condition = [reg, '.toLowerCase() === ',
          javascript.stringify(node.value.toLowerCase())].join('');
      } else {
        result.condition = [reg, ' === ',
          javascript.stringify(node.value)].join('');
      }
    }
    result.onSuccess([['peg$currPos += ', node.value.length, ';'].join('')]);
  },

  initCache(/*opts*/) {
    return 'var peg$resultsCache = {}';
  },

  generateCacheRule(opts) {
    let keyParts = [
      opts.variantIndex + opts.variantCount * ( opts.ruleIndex + opts.ruleCount ),
      opts.startPos
    ];
    if (opts.params.length) {
      keyParts = keyParts.concat(opts.params);
    }
    let key;
    if (keyParts.length === 1) {
      key = keyParts[0];
    } else {
      key = '[' + keyParts.join(', ') + '].map(String).join(":")';
    }
    return {
      start: [
        'var key = ' + key + ',',
        '    cached = peg$resultsCache[key];',
        '  if (cached) {',
        '    peg$currPos = cached.nextPos',
        opts.loadRefs,
        '    return cached.result;',
        '  }',
        opts.saveRefs,
      ].join('\n'),
      store: [
        'peg$resultsCache[key] = cached = {',
        '  nextPos: peg$currPos, ',
        `  result: ${opts.result}, `,
        '};',
        opts.storeRefs
      ].join('\n')
    };
  },

  cacheLoadRef(name) {
    let encName = javascript.stringify('$' + name);
    return `    if (cached.hasOwnProperty(${encName})) param_${name}.value = cached.$${name};`;
  },

  cacheStoreRef(name) {
    return `if (saved_${name} !== param_${name}.value) cached.$${name} = param_${name}.value;`;
  },

  /**
   * Get a block which saves ref values to a temporary variable for later
   * comparison in getCacheStoreRefs().
   */
  cacheSaveRef(name) {
    return `var saved_${name}=param_${name}.value;`;
  }
};

module.exports = javascript;
