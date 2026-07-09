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
        var type = (element.type || '').toLowerCase(), same, i;
        if (type === 'checkbox') {
            if (element.checked) { return element.value || 'true'; }
            // MVC CheckBoxFor renders a same-name hidden fallback (value "false"). When
            // present, the field ALWAYS has a value, so an unchecked box is not "blank"
            // — return the hidden's value. This matches server model-binding and the old
            // jquery-validate behavior (a bool checkbox is not "must be checked"; genuine
            // consent boxes use AssertThat, not required). A standalone checkbox with no
            // hidden fallback still reports blank so required means "must check".
            same = byName(scope || element.form || document, element.name);
            for (i = 0; i < same.length; i++) { if ((same[i].type || '').toLowerCase() === 'hidden') { return same[i].value; } }
            return '';
        }
        if (type === 'radio') {
            var group = byName(scope, element.name), j;
            for (j = 0; j < group.length; j++) { if (group[j].checked) { return group[j].value; } }
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
        regexwithoptions: function (value, p) { var m = new RegExp(p.pattern, p.flags).exec(value); return !!m && m.index === 0 && m[0].length === value.length; },
        email: function (value) { return EMAIL_RE.test(value); },
        phone: function (value) { return PHONE_RE.test(value); },
        equalto: function (value, p, element, scope) {
            var others = byName(scope, resolveOtherName(element, p.other));
            return value === (others.length ? getValue(others[0], scope) : '');
        }
    };
    // order determines which message wins when several rules fail at once
    var RULE_ORDER = ['required', 'length', 'minlength', 'maxlength', 'range', 'min', 'max', 'number', 'regex', 'regexwithoptions', 'email', 'phone', 'equalto'];

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

    /* ---- WS3.3: EA conditional rules (requiredif / assertthat) ------------- */
    function evalExpr(expr, model) { return evalNode(parse(tokenize(expr)), buildContext(model || {})); }
    function isNum(v) { return typeof v === 'number' && !isNaN(v); }
    // value parsers by declared type (ported from EA typeHelper, jQuery-free)
    var typeParse = {
        string: function (v) { return v === null || v === undefined ? null : String(v); },
        bool: function (v) { if (typeof v === 'boolean') { return v; } if (typeof v === 'string') { var s = trim(v).toLowerCase(); if (s === 'true' || s === 'false') { return s === 'true'; } } return { error: true }; },
        number: function (v) { var n = parseFloat(v); return (isNum(n) && isFinite(v)) ? n : { error: true }; },
        datetime: function (v) { if (v instanceof Date) { return v.getTime(); } if (typeof v === 'string') { var ms = Date.parse(v); if (isNum(ms)) { return ms; } } return { error: true }; },
        guid: function (v) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? String(v).toUpperCase() : { error: true }; },
        object: function (v) { try { return JSON.parse(v); } catch (e) { return { error: true }; } }
    };
    function parseByType(value, type) { var f = typeParse.hasOwnProperty(type) ? typeParse[type] : typeParse.object; return f(value); }
    function getPrefix(name) { return (name !== undefined && name !== null) ? name.substr(0, name.lastIndexOf('.') + 1) : ''; }
    // read one referenced field's current value from the form, parsed to its declared type
    function extractModelValue(scope, fieldName, type) {
        var els = byName(scope, fieldName);
        if (!els.length) { return null; }
        var t = (els[0].type || '').toLowerCase(), raw, i;
        if (t === 'checkbox') { raw = els[0].checked; }
        else if (t === 'radio') { raw = ''; for (i = 0; i < els.length; i++) { if (els[i].checked) { raw = els[i].value; break; } } }
        else { raw = els[0].value; }
        if (raw === null || raw === undefined || raw === '') { return null; }
        var parsed = parseByType(raw, type);
        return (parsed && parsed.error) ? null : parsed;
    }
    // set a possibly-nested/array field (name like "a.b" or "a[0].b") on the model object
    function buildField(fieldName, fieldValue, obj) {
        var props = fieldName.split('.'), parent = obj, i, m, arrPat = /^([a-z_0-9]+)\[([0-9]+)\]$/i, fn;
        for (i = 0; i < props.length - 1; i++) {
            fn = props[i]; m = arrPat.exec(fn);
            if (m) { fn = m[1]; if (!parent.hasOwnProperty(fn)) { parent[fn] = {}; } parent[fn][m[2]] = parent[fn][m[2]] || {}; parent = parent[fn][m[2]]; }
            else { if (!parent.hasOwnProperty(fn)) { parent[fn] = {}; } parent = parent[fn]; }
        }
        fn = props[props.length - 1]; m = arrPat.exec(fn);
        if (m) { parent[m[1]] = parent[m[1]] || []; parent[m[1]][m[2]] = fieldValue; }
        else { parent[fn] = fieldValue; }
    }
    function buildEAModel(scope, prefix, fieldsMap, constsMap, enumsMap) {
        var model = {}, name;
        for (name in fieldsMap) { if (fieldsMap.hasOwnProperty(name)) { buildField(name, extractModelValue(scope, prefix + name, fieldsMap[name]), model); } }
        for (name in constsMap) { if (constsMap.hasOwnProperty(name)) { buildField(name, constsMap[name], model); } }
        for (name in enumsMap) { if (enumsMap.hasOwnProperty(name)) { buildField(name, enumsMap[name], model); } } // enumsAsNumbers=true (values already numeric)
        return model;
    }
    function jsonParam(v) { if (v === undefined || v === null) { return undefined; } try { return JSON.parse(v); } catch (e) { return v; } }
    // evaluate one EA rule for a field. kind = 'assertthat' | 'requiredif'. Mirrors
    // EA computeAssertThat/computeRequiredIf: assertthat is checked only when the
    // field has a value; requiredif requires the field when it's empty AND the
    // condition evaluates true. optimize=on (default) => condition computed lazily.
    function evalEARule(kind, params, element, scope, fieldValue) {
        var expression = jsonParam(params.expression);
        var model = buildEAModel(scope, getPrefix(element.name || ''), jsonParam(params.fieldsmap) || {}, jsonParam(params.constsmap) || {}, jsonParam(params.enumsmap) || {});
        var v = ((element.type || '').toLowerCase() === 'checkbox') ? element.checked : fieldValue; // EA adjustGivenValue
        if (kind === 'assertthat') {
            if (v !== undefined && v !== null && v !== '') { return { valid: !!evalExpr(expression, model) }; }
            return { valid: true };
        }
        var allowEmpty = jsonParam(params.allowempty) === true;
        var empty = (v === undefined || v === null || v === '' || (typeof v === 'string' && !/\S/.test(v) && !allowEmpty));
        if (empty) { return { valid: !evalExpr(expression, model) }; }
        return { valid: true };
    }

    // validate a single element; returns { valid, rule?, message? }.
    // Order: requiredif (conditional required) -> required/optional -> standard
    // rules (present value) -> assertthat. Matches jquery.validate + EA behavior.
    function validateField(element, scope) {
        scope = scope || element.form || document;
        var rules = readRules(element), value = getValue(element, scope), key, i, rn, r;
        for (key in rules) {
            if (rules.hasOwnProperty(key) && key.indexOf('requiredif') === 0) {
                r = evalEARule('requiredif', rules[key], element, scope, value);
                if (!r.valid) { return { valid: false, rule: key, message: rules[key].message || '' }; }
            }
        }
        var blank = isBlank(value);
        if (blank && rules.required) { return { valid: false, rule: 'required', message: rules.required.message || '' }; }
        if (!blank) {
            for (i = 0; i < RULE_ORDER.length; i++) {
                rn = RULE_ORDER[i];
                if (rn === 'required' || !rules[rn] || !RULES[rn]) { continue; }
                if (!RULES[rn](value, rules[rn], element, scope)) { return { valid: false, rule: rn, message: rules[rn].message || '' }; }
            }
        }
        // assertthat runs regardless of "blank": for a checkbox, unchecked is a real
        // value (false) the assertion must see. evalEARule skips genuinely-empty text.
        for (key in rules) {
            if (rules.hasOwnProperty(key) && key.indexOf('assertthat') === 0) {
                r = evalEARule('assertthat', rules[key], element, scope, value);
                if (!r.valid) { return { valid: false, rule: key, message: rules[key].message || '' }; }
            }
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

    /* ======================================================================
     * WS3.5: error display, summary, and triggers
     * is-invalid + aria-invalid on the control (BS5-correct; the old BS4
     * .form-group highlight is moot post-WS4 which renamed form-group->mb-3).
     * Message goes into the MVC ValidationMessageFor span ([data-valmsg-for]);
     * we also tag it invalid-feedback/d-block so BS5 shows it (final display
     * styling confirmed at WS6). Summary uses the MVC [data-valmsg-summary] span.
     * ==================================================================== */
    function messageSpan(scope, name) { return name ? (scope || document).querySelector('[data-valmsg-for="' + name.replace(/"/g, '\\"') + '"]') : null; }
    function showFieldError(element, message, scope) {
        element.classList.add('is-invalid'); element.setAttribute('aria-invalid', 'true');
        var span = messageSpan(scope || element.form, element.name);
        if (span) {
            span.classList.remove('field-validation-valid'); span.classList.add('field-validation-error', 'invalid-feedback', 'd-block');
            if (span.getAttribute('data-valmsg-replace') !== 'false') { span.textContent = message || ''; }
        }
    }
    function clearFieldError(element, scope) {
        element.classList.remove('is-invalid'); element.setAttribute('aria-invalid', 'false');
        var span = messageSpan(scope || element.form, element.name);
        if (span) {
            span.classList.remove('field-validation-error', 'd-block'); span.classList.add('field-validation-valid');
            if (span.getAttribute('data-valmsg-replace') !== 'false') { span.textContent = ''; }
        }
    }
    function updateSummary(form, messages) {
        var summary = form.querySelector('[data-valmsg-summary="true"]') || form.querySelector('.validation-summary-valid, .validation-summary-errors');
        if (!summary) { return; }
        var ul = summary.querySelector('ul'), i, li;
        if (messages && messages.length) {
            summary.classList.remove('validation-summary-valid'); summary.classList.add('validation-summary-errors', 'alert', 'alert-danger');
            if (ul) { ul.innerHTML = ''; for (i = 0; i < messages.length; i++) { li = document.createElement('li'); li.textContent = messages[i]; ul.appendChild(li); } }
        } else {
            summary.classList.remove('validation-summary-errors', 'alert', 'alert-danger'); summary.classList.add('validation-summary-valid');
            if (ul) { ul.innerHTML = '<li style="display:none"></li>'; }
        }
    }
    // validate a form and render every field + the summary. Returns { valid, results }.
    function validateAndRender(form) {
        var res = validateContainer(form), i, r, msgs = [];
        for (i = 0; i < res.results.length; i++) {
            r = res.results[i];
            if (r.valid) { clearFieldError(r.element, form); }
            else { showFieldError(r.element, r.message, form); if (r.message) { msgs.push(r.message); } }
        }
        updateSummary(form, msgs);
        return res;
    }
    function focusFirstInvalid(res) {
        for (var i = 0; i < res.results.length; i++) { if (!res.results[i].valid && res.results[i].element && res.results[i].element.focus) { try { res.results[i].element.focus(); } catch (e) { } return; } }
    }
    // wire submit + per-field triggers on a form (idempotent). On invalid submit:
    // block, focus first invalid, and dispatch 'basejs-invalid-form' (the hook the
    // app's submit-button disable/re-enable logic listens to instead of jquery
    // validate's 'invalid-form.validate').
    function attachForm(form) {
        if (!form || form.dataset.basejsValidateBound) { return; }
        form.dataset.basejsValidateBound = '1';
        form.addEventListener('submit', function (e) {
            var res = validateAndRender(form);
            if (!res.valid) { e.preventDefault(); focusFirstInvalid(res); form.dispatchEvent(new CustomEvent('basejs-invalid-form', { bubbles: true, detail: res })); }
        });
        var fields = Array.prototype.slice.call(form.querySelectorAll('[data-val="true"]'));
        fields.forEach(function (el) {
            var run = function () { var r = validateField(el, form); if (r.valid) { clearFieldError(el, form); } else { showFieldError(el, r.message, form); } };
            el.addEventListener('blur', run);
            el.addEventListener('input', function () { if (el.classList.contains('is-invalid')) { run(); } }); // clear as the user fixes it
        });
    }
    function attachAll(scope) { var forms = (scope || document).getElementsByTagName('form'), i; for (i = 0; i < forms.length; i++) { attachForm(forms[i]); } }

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
        rules: RULES,                         // rule-name -> validator fn (extensible)
        // WS3.5 — error display + triggers
        validate: validateAndRender,          // (form) -> { valid, results }; renders field + summary errors
        showFieldError: showFieldError,       // (element, message, scope?)
        clearFieldError: clearFieldError,     // (element, scope?)
        updateSummary: updateSummary,         // (form, messages[])
        attachForm: attachForm,               // (form) wire submit + per-field triggers (idempotent)
        attachAll: attachAll,                 // (scope?) attach every form
        // exposed for the test harness / later steps:
        tokenize: tokenize,
        parse: parse
    };
})();

/* ==========================================================================
 * WS3.6: self-init + jQuery/EA compatibility bridge
 * Runs only when this file is bundled (the WS3.6 flip). Attaches validation to
 * every form on ready, and routes the legacy validation API the app still calls
 * — .valid() (~19 sites via able.getObject().valid()), $.validator.unobtrusive
 * .parse() (~17), $.validator.addMethod / ea.* (a few) — to basejs.validate.
 * This bridges without rewriting those call sites or the able-core wrapper (#16)
 * while jQuery is still loaded (jQuery leaves at the WS5 tail).
 * ======================================================================== */
(function () {
    var bv = window.basejsvalidate;
    // --- shims installed SYNCHRONOUSLY at load (jQuery is already loaded by now,
    // it renders before this bundle) so any later ready-handler calling .valid() /
    // unobtrusive.parse() / ea.* is covered. Only attachAll waits for DOM ready.
    if (window.jQuery) {
        var $ = window.jQuery;
        // $(x).valid(): validate the whole form (x is a form) or a single field
        $.fn.valid = function () {
            if (!this.length) { return true; }
            var el = this[0], form = (el.tagName === 'FORM') ? el : (el.form || (el.closest ? el.closest('form') : null));
            if (el.tagName === 'FORM') { return bv.validate(el).valid; }
            if (!form) { return true; }
            var r = bv.validateField(el, form);
            if (r.valid) { bv.clearFieldError(el, form); } else { bv.showFieldError(el, r.message, form); }
            return r.valid;
        };
        $.validator = $.validator || {};
        $.validator.methods = $.validator.methods || {};
        $.validator.setDefaults = $.validator.setDefaults || function () { };
        $.validator.addMethod = function (name, fn) { bv.addMethod(name, fn); };
        $.validator.unobtrusive = $.validator.unobtrusive || {};
        $.validator.unobtrusive.adapters = $.validator.unobtrusive.adapters || { add: function () { }, addBool: function () { }, addSingleVal: function () { }, addMinMax: function () { } };
        // parse(container): (re)attach validation to dynamically-added content
        $.validator.unobtrusive.parse = function (container) {
            var c = (container && container.jquery) ? container[0] : container;
            if (!c) { bv.attachAll(document); return; }
            if (c.tagName === 'FORM') { bv.attachForm(c); }
            bv.attachAll(c);
        };
    }
    // EA client removed — compat stub for ea.settings / ea.addMethod callers
    // (e.g. _EnrollmentLayout's inline ea.settings.dependencyTriggers).
    window.ea = window.ea || {};
    window.ea.settings = window.ea.settings || {};
    if (typeof window.ea.settings.apply !== 'function') { window.ea.settings.apply = function () { }; }
    window.ea.addMethod = function (n, f) { bv.addMethod(n, f); };
    window.ea.addValueParser = window.ea.addValueParser || function () { };
    // attach validation to all forms once the DOM is ready
    function ready() { bv.attachAll(document); }
    if (typeof domready === 'function') { domready(ready); }
    else if (document.readyState !== 'loading') { ready(); }
    else { document.addEventListener('DOMContentLoaded', ready); }
})();
