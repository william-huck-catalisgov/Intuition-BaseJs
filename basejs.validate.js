/* basejs.validate — vanilla client validation engine (WS3, ExpressiveAnnotations parity)
 *
 * WS3.1: eval-free expression evaluator. Replaces ExpressiveAnnotations'
 * ctxEval (new Function + eval) with a tokenizer -> recursive-descent parser
 * -> AST walker that applies the SAME JavaScript operators the old eval used,
 * so results match without eval (satisfies the strict-CSP "kill eval" gate).
 * Reuses EA's method library (ported jQuery-free).
 *
 * Public: window.basejsvalidate.evaluate(expression, model) -> value
 * Later steps (3.2-3.6) add the data-val-* binder, standard rules, error
 * display, and the .valid()/parse()/addMethod() API on this same object.
 */
window.basejsvalidate = (function () {
    'use strict';

    function trim(s) { return (s === null || s === undefined) ? s : String(s).replace(/^\s+|\s+$/g, ''); }
    function isArray(v) { return Object.prototype.toString.call(v) === '[object Array]'; }

    /* ---- EA method library (ported from EA toolchain; $.trim -> trim) ------- */
    var methods = {};
    function addMethod(name, func) {
        var old = methods[name];
        methods[name] = function () {
            if (func.length === arguments.length) { return func.apply(this, arguments); }
            if (typeof old === 'function') { return old.apply(this, arguments); }
            return func.apply(this, arguments);
        };
    }
    addMethod('Now', function () { return Date.now(); });
    addMethod('Today', function () { return new Date(new Date().setHours(0, 0, 0, 0)).getTime(); });
    addMethod('ToDate', function (dateString) { return Date.parse(dateString); });
    addMethod('Date', function (year, month, day) { return new Date(new Date(year, month - 1, day).setFullYear(year)).getTime(); });
    addMethod('Date', function (year, month, day, hour, minute, second) { return new Date(new Date(year, month - 1, day, hour, minute, second).setFullYear(year)).getTime(); });
    addMethod('TimeSpan', function (days, hours, minutes, seconds) { return seconds * 1e3 + minutes * 6e4 + hours * 36e5 + days * 864e5; });
    addMethod('Length', function (str) { return str !== null && str !== undefined ? str.length : 0; });
    addMethod('Trim', function (str) { return str !== null && str !== undefined ? trim(str) : null; });
    addMethod('Concat', function (a, b) { return [a, b].join(''); });
    addMethod('Concat', function (a, b, c) { return [a, b, c].join(''); });
    addMethod('CompareOrdinal', function (a, b) {
        if (a === b) { return 0; }
        if (a !== null && b === null) { return 1; }
        if (a === null && b !== null) { return -1; }
        return a > b ? 1 : -1;
    });
    addMethod('CompareOrdinalIgnoreCase', function (a, b) {
        a = (a !== null && a !== undefined) ? a.toLowerCase() : null;
        b = (b !== null && b !== undefined) ? b.toLowerCase() : null;
        return methods.CompareOrdinal(a, b);
    });
    addMethod('StartsWith', function (str, prefix) { return str !== null && str !== undefined && prefix !== null && prefix !== undefined && str.slice(0, prefix.length) === prefix; });
    addMethod('StartsWithIgnoreCase', function (str, prefix) {
        str = (str !== null && str !== undefined) ? str.toLowerCase() : null;
        prefix = (prefix !== null && prefix !== undefined) ? prefix.toLowerCase() : null;
        return methods.StartsWith(str, prefix);
    });
    addMethod('EndsWith', function (str, suffix) { return str !== null && str !== undefined && suffix !== null && suffix !== undefined && str.slice(-suffix.length) === suffix; });
    addMethod('EndsWithIgnoreCase', function (str, suffix) {
        str = (str !== null && str !== undefined) ? str.toLowerCase() : null;
        suffix = (suffix !== null && suffix !== undefined) ? suffix.toLowerCase() : null;
        return methods.EndsWith(str, suffix);
    });
    addMethod('Contains', function (str, substr) { return str !== null && str !== undefined && substr !== null && substr !== undefined && str.indexOf(substr) > -1; });
    addMethod('ContainsIgnoreCase', function (str, substr) {
        str = (str !== null && str !== undefined) ? str.toLowerCase() : null;
        substr = (substr !== null && substr !== undefined) ? substr.toLowerCase() : null;
        return methods.Contains(str, substr);
    });
    addMethod('IsNullOrWhiteSpace', function (str) { return str === null || str === undefined || !/\S/.test(str); });
    addMethod('IsDigitChain', function (str) { return /^[0-9]+$/.test(str); });
    addMethod('IsNumber', function (str) { return /^[+-]?(?:(?:[0-9]+)|(?:[0-9]+[eE][+-]?[0-9]+)|(?:[0-9]*\.[0-9]+(?:[eE][+-]?[0-9]+)?))$/.test(str); });
    addMethod('IsEmail', function (str) { return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(str); });
    addMethod('IsPhone', function (str) { return /^(\+\s?)?((?!\+.*)\(\+?\d+([\s\-\.]?\d+)?\)|\d+)([\s\-\.]?(\(\d+([\s\-\.]?\d+)?\)|\d+))*(\s?(x|ext\.?)\s?\d+)?$/.test(str); });
    addMethod('IsRegexMatch', function (str, regex) { return str !== null && str !== undefined && regex !== null && regex !== undefined && new RegExp(regex).test(str); });
    addMethod('Min', function (values) {
        if (arguments.length === 1 && isArray(values)) { return Math.min.apply(null, values); }
        return Math.min.apply(null, arguments);
    });
    addMethod('Max', function (values) {
        if (arguments.length === 1 && isArray(values)) { return Math.max.apply(null, values); }
        return Math.max.apply(null, arguments);
    });
    addMethod('Sum', function (values) {
        var sum = 0, i, l, arr = (arguments.length === 1 && isArray(values)) ? values : arguments;
        for (i = 0, l = arr.length; i < l; i++) { sum += parseFloat(arr[i]); }
        return sum;
    });
    addMethod('Average', function (values) {
        var arr = (arguments.length === 1 && isArray(values)) ? values : Array.prototype.slice.call(arguments);
        return methods.Sum(arr) / arr.length;
    });

    /* ---- Tokenizer ---------------------------------------------------------- */
    var PUNCT = ['===', '!==', '==', '!=', '<=', '>=', '&&', '||', '<', '>', '+', '-', '*', '/', '%', '!', '(', ')', '[', ']', ',', '.', '?', ':'];
    function tokenize(src) {
        var toks = [], i = 0, n = src.length, c, j, m, k;
        function isIdStart(ch) { return /[A-Za-z_$]/.test(ch); }
        function isIdPart(ch) { return /[A-Za-z0-9_$]/.test(ch); }
        while (i < n) {
            c = src[i];
            if (/\s/.test(c)) { i++; continue; }
            if (c === '"' || c === "'") {
                var quote = c, buf = '', esc = false; i++;
                while (i < n) {
                    var ch = src[i++];
                    if (esc) { buf += (ch === 'n' ? '\n' : ch === 't' ? '\t' : ch); esc = false; }
                    else if (ch === '\\') { esc = true; }
                    else if (ch === quote) { break; }
                    else { buf += ch; }
                }
                toks.push({ t: 'str', v: buf }); continue;
            }
            if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1]))) {
                m = /^[0-9]*\.?[0-9]+(?:[eE][+-]?[0-9]+)?/.exec(src.slice(i));
                toks.push({ t: 'num', v: parseFloat(m[0]) }); i += m[0].length; continue;
            }
            if (isIdStart(c)) {
                j = i + 1; while (j < n && isIdPart(src[j])) { j++; }
                var word = src.slice(i, j); i = j;
                if (word === 'true') { toks.push({ t: 'bool', v: true }); }
                else if (word === 'false') { toks.push({ t: 'bool', v: false }); }
                else if (word === 'null') { toks.push({ t: 'null', v: null }); }
                else { toks.push({ t: 'id', v: word }); }
                continue;
            }
            var matched = null;
            for (k = 0; k < PUNCT.length; k++) { if (src.substr(i, PUNCT[k].length) === PUNCT[k]) { matched = PUNCT[k]; break; } }
            if (matched) { toks.push({ t: 'op', v: matched }); i += matched.length; continue; }
            throw 'EA parse error: unexpected character "' + c + '" at ' + i;
        }
        toks.push({ t: 'eof', v: null });
        return toks;
    }

    /* ---- Parser (recursive descent) ---------------------------------------- */
    function parse(toks) {
        var p = 0;
        function peek() { return toks[p]; }
        function next() { return toks[p++]; }
        function isOp(v) { return toks[p].t === 'op' && toks[p].v === v; }
        function eat(v) { if (!isOp(v)) { throw 'EA parse error: expected "' + v + '" but found "' + toks[p].v + '"'; } return next(); }

        function parseExpression() { return parseTernary(); }
        function parseTernary() {
            var c = parseOr();
            if (isOp('?')) { next(); var a = parseExpression(); eat(':'); var b = parseTernary(); return { k: 'cond', c: c, a: a, b: b }; }
            return c;
        }
        function binL(sub, ops) {
            return function () {
                var left = sub();
                while (toks[p].t === 'op' && ops.indexOf(toks[p].v) !== -1) { var op = next().v; left = { k: 'bin', op: op, l: left, r: sub() }; }
                return left;
            };
        }
        function parseUnary() {
            if (toks[p].t === 'op' && (toks[p].v === '!' || toks[p].v === '-' || toks[p].v === '+')) { var op = next().v; return { k: 'un', op: op, x: parseUnary() }; }
            return parsePostfix();
        }
        var parseMul = binL(parseUnary, ['*', '/', '%']);
        var parseAdd = binL(parseMul, ['+', '-']);
        var parseRel = binL(parseAdd, ['<', '<=', '>', '>=']);
        var parseEq = binL(parseRel, ['==', '!=', '===', '!==']);
        var parseAnd = binL(parseEq, ['&&']);
        var parseOr = binL(parseAnd, ['||']);
        function parsePostfix() {
            var node = parsePrimary();
            while (true) {
                if (isOp('.')) { next(); var name = next(); if (name.t !== 'id') { throw 'EA parse error: expected identifier after "."'; } node = { k: 'member', o: node, p: name.v }; }
                else if (isOp('[')) { next(); var idx = parseExpression(); eat(']'); node = { k: 'index', o: node, i: idx }; }
                else if (isOp('(')) { next(); var args = []; if (!isOp(')')) { args.push(parseExpression()); while (isOp(',')) { next(); args.push(parseExpression()); } } eat(')'); node = { k: 'call', callee: node, args: args }; }
                else { break; }
            }
            return node;
        }
        function parsePrimary() {
            var tk = peek();
            if (tk.t === 'num' || tk.t === 'str' || tk.t === 'bool') { next(); return { k: 'lit', v: tk.v }; }
            if (tk.t === 'null') { next(); return { k: 'lit', v: null }; }
            if (tk.t === 'id') { next(); return { k: 'id', v: tk.v }; }
            if (isOp('(')) { next(); var e = parseExpression(); eat(')'); return e; }
            if (isOp('[')) { next(); var els = []; if (!isOp(']')) { els.push(parseExpression()); while (isOp(',')) { next(); els.push(parseExpression()); } } eat(']'); return { k: 'arr', els: els }; }
            throw 'EA parse error: unexpected token "' + tk.v + '"';
        }
        var ast = parseExpression();
        if (peek().t !== 'eof') { throw 'EA parse error: unexpected trailing token "' + peek().v + '"'; }
        return ast;
    }

    /* ---- Evaluator (applies real JS operators => matches old eval) ---------- */
    function evalNode(node, ctx) {
        switch (node.k) {
            case 'lit': return node.v;
            case 'id': return ctx[node.v];
            case 'arr': return node.els.map(function (e) { return evalNode(e, ctx); });
            case 'member': var o = evalNode(node.o, ctx); return (o === null || o === undefined) ? undefined : o[node.p];
            case 'index': var oi = evalNode(node.o, ctx); var ix = evalNode(node.i, ctx); return (oi === null || oi === undefined) ? undefined : oi[ix];
            case 'call':
                var fn = evalNode(node.callee, ctx);
                if (typeof fn !== 'function') { throw 'EA eval error: attempted to call a non-function'; }
                return fn.apply(null, node.args.map(function (a) { return evalNode(a, ctx); }));
            case 'un':
                var x = evalNode(node.x, ctx);
                return node.op === '!' ? !x : node.op === '-' ? -x : +x;
            case 'cond': return evalNode(node.c, ctx) ? evalNode(node.a, ctx) : evalNode(node.b, ctx);
            case 'bin':
                if (node.op === '&&') { var la = evalNode(node.l, ctx); return la ? evalNode(node.r, ctx) : la; }
                if (node.op === '||') { var lo = evalNode(node.l, ctx); return lo ? lo : evalNode(node.r, ctx); }
                var l = evalNode(node.l, ctx), r = evalNode(node.r, ctx);
                switch (node.op) {
                    case '==': return l == r; case '!=': return l != r;
                    case '===': return l === r; case '!==': return l !== r;
                    case '<': return l < r; case '<=': return l <= r; case '>': return l > r; case '>=': return l >= r;
                    case '+': return l + r; case '-': return l - r; case '*': return l * r; case '/': return l / r; case '%': return l % r;
                }
        }
        throw 'EA eval error: unknown node ' + node.k;
    }

    function buildContext(model) {
        var ctx = {}, k;
        for (k in methods) { if (methods.hasOwnProperty(k)) { ctx[k] = methods[k]; } }
        for (k in model) { if (model.hasOwnProperty(k)) { ctx[k] = model[k]; } } // field wins on name conflict
        return ctx;
    }

    /* ======================================================================
     * WS3.2: data-val-* binder + standard rule validators
     * Semantics mirror jquery.validate + MVC unobtrusive:
     *  - a field that is empty AND not required is "optional" => every
     *    non-required rule passes (matches jquery.validate .optional()).
     *  - required trims text; regex is a FULL-string match; email/phone/number
     *    use the same regexes .NET/jquery.validate use.
     * ==================================================================== */

    var EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    var PHONE_RE = /^(\+\s?)?((?!\+.*)\(\+?\d+([\s\-\.]?\d+)?\)|\d+)([\s\-\.]?(\(\d+([\s\-\.]?\d+)?\)|\d+))*(\s?(x|ext\.?)\s?\d+)?$/;
    var NUMBER_RE = /^(?:-?\d+|-?\d{1,3}(?:,\d{3})+)?(?:\.\d+)?$/;

    function byName(scope, name) {
        return Array.prototype.slice.call((scope || document).querySelectorAll('[name="' + name.replace(/"/g, '\\"') + '"]'));
    }
    function isBlank(value) { return value === null || value === undefined || trim(String(value)).length === 0; }
    function getValue(element, scope) {
        var type = (element.type || '').toLowerCase();
        if (type === 'checkbox') { return element.checked ? (element.value || 'true') : ''; }
        if (type === 'radio') {
            var group = byName(scope, element.name), i;
            for (i = 0; i < group.length; i++) { if (group[i].checked) { return group[i].value; } }
            return '';
        }
        return element.value;
    }
    function resolveOtherName(element, other) {
        if (other && other.indexOf('*.') === 0) {
            var name = element.name || '', dot = name.lastIndexOf('.');
            return (dot >= 0 ? name.substring(0, dot + 1) : '') + other.substring(2);
        }
        return other;
    }

    var num = function (v) { return v == null ? null : parseFloat(v); };
    // each rule: (value, params, element, scope) -> bool. Only invoked for
    // non-empty values (except required), per the optional() contract above.
    var RULES = {
        required: function (value) { return !isBlank(value); },
        length: function (value, p) { var n = value.length; return (p.min == null || n >= num(p.min)) && (p.max == null || n <= num(p.max)); },
        minlength: function (value, p) { return value.length >= num(p.min); },
        maxlength: function (value, p) { return value.length <= num(p.max); },
        range: function (value, p) { var v = parseFloat(value); return v >= num(p.min) && v <= num(p.max); },
        min: function (value, p) { return parseFloat(value) >= num(p.min); },
        max: function (value, p) { return parseFloat(value) <= num(p.max); },
        number: function (value) { return NUMBER_RE.test(value); },
        regex: function (value, p) { var m = new RegExp(p.pattern).exec(value); return !!m && m.index === 0 && m[0].length === value.length; },
        email: function (value) { return EMAIL_RE.test(value); },
        phone: function (value) { return PHONE_RE.test(value); },
        equalto: function (value, p, element, scope) {
            var others = byName(scope, resolveOtherName(element, p.other));
            return value === (others.length ? getValue(others[0], scope) : '');
        }
    };
    // order determines which message wins when several rules fail at once
    var RULE_ORDER = ['required', 'length', 'minlength', 'maxlength', 'range', 'min', 'max', 'number', 'regex', 'email', 'phone', 'equalto'];

    // parse an element's data-val-* attributes into { ruleName: { message, ...params } }
    function readRules(element) {
        var rules = {}, attrs = element.attributes, i, a, name, rest, dash, rule, param;
        for (i = 0; i < attrs.length; i++) {
            a = attrs[i]; name = a.name;
            if (name.indexOf('data-val-') !== 0) { continue; }
            rest = name.substring(9); // after 'data-val-'
            dash = rest.indexOf('-');
            if (dash === -1) { rules[rest] = rules[rest] || {}; rules[rest].message = a.value; }
            else { rule = rest.substring(0, dash); param = rest.substring(dash + 1); rules[rule] = rules[rule] || {}; rules[rule][param] = a.value; }
        }
        return rules;
    }

    // validate a single element; returns { valid, rule?, message? }.
    // EA rules (requiredif/assertthat) are collected but evaluated in WS3.3.
    function validateField(element, scope) {
        scope = scope || element.form || document;
        var rules = readRules(element);
        var value = getValue(element, scope);
        var required = !!rules.required; // conditional (requiredif) required is layered in WS3.3
        if (isBlank(value) && !required) { return { valid: true }; }
        for (var i = 0; i < RULE_ORDER.length; i++) {
            var rn = RULE_ORDER[i];
            if (!rules[rn] || !RULES[rn]) { continue; }
            if (rn !== 'required' && isBlank(value)) { continue; }
            if (!RULES[rn](value, rules[rn], element, scope)) { return { valid: false, rule: rn, message: rules[rn].message || '' }; }
        }
        return { valid: true };
    }

    // validate every [data-val="true"] field within a container/form.
    function validateContainer(container) {
        container = container || document;
        var scope = (container.tagName === 'FORM') ? container : document;
        var fields = Array.prototype.slice.call(container.querySelectorAll('[data-val="true"]'));
        var results = [], allValid = true, seenRadio = {}, i, el, r;
        for (i = 0; i < fields.length; i++) {
            el = fields[i];
            if (el.name && (el.type || '').toLowerCase() === 'radio') { if (seenRadio[el.name]) { continue; } seenRadio[el.name] = true; }
            r = validateField(el, el.form || scope);
            results.push({ element: el, name: el.name, valid: r.valid, rule: r.rule, message: r.message });
            if (!r.valid) { allValid = false; }
        }
        return { valid: allValid, results: results };
    }

    return {
        // WS3.1 — expression evaluator
        evaluate: function (expression, model) { return evalNode(parse(tokenize(expression)), buildContext(model || {})); },
        addMethod: function (name, func) { addMethod(name, func); },   // custom EA methods (ea.addMethod parity)
        methods: methods,
        // WS3.2 — data-val-* binder + standard rule validators
        validateField: validateField,        // (element, scope?) -> { valid, rule?, message? }
        validateContainer: validateContainer, // (container?) -> { valid, results:[...] }
        readRules: readRules,                 // (element) -> { rule: { message, ...params } }
        getValue: getValue,                   // (element, scope?) -> string
        rules: RULES,                         // rule-name -> validator fn (extensible; WS3.3 adds EA rules)
        // exposed for the test harness / later steps:
        tokenize: tokenize,
        parse: parse
    };
})();
