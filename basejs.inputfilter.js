(function () {
    var vna = 'a-zA-Z\-\'\ ', van = 'a-zA-Z0-9', va = 'a-zA-Z', ve = 'a-zA-Z0-9\-\.\@\!\'\*\+\#\$\%\&\/\=\?\^\_\`\{\|\}\~', vad = 'a-zA-Z0-9\-\'\.\#\, ', vc = 'a-zA-Z\-\'\.\, ', vnu = '0-9', vd = '0-9\.\,',
        // filters input based on the information provided.
        inputFilter = function (ev) {
            var el = basejs.eventSource(ev), r = null;
            switch (el.dataset.filtertype) {
                case 'name':
                    r = vna;
                    break;
                case 'alphanumeric':
                    r = van;
                    break;
                case 'alpha':
                    r = va;
                    break;
                case 'mi':
                    r = va;
                    break;
                case 'address':
                    r = vad;
                    break;
                case 'city':
                    r = vc;
                    break;
                case 'email':
                    r = ve;
                    break;
                case 'numeric':
                    r = vnu;
                    break;
                case 'decimal':
                    r = vd;
                    break;
                default:
                    break;
            }
            if (basejs.isString(r)) {
                el.value = removeChars(r, el.value);
            }
        },
        // initialize all filters on the page based on the class name provided
        initFilter = function (c, f) {
            var a = document.getElementsByClassName(c), l = a.length, x = 0;
            for (x; x < l; x++) {
                a[x].addEventListener('input', f);
                a[x].dataset.filtertype = c.split('-')[1];
            }
        },
        // initialize all initFilters
        initInputFilters = function () {
            initFilter('filter-name', inputFilter);
            initFilter('filter-alphanumeric', inputFilter);
            initFilter('filter-mi', inputFilter);
            initFilter('filter-alpha', inputFilter);
            initFilter('filter-address', inputFilter);
            initFilter('filter-city', inputFilter);
            initFilter('filter-email', inputFilter);
            initFilter('filter-numeric', inputFilter);
            initFilter('filter-decimal', inputFilter);
        },

        // numeric-only: vanilla replacement for jquery.numeric. Restricts input to
        // digits + a single decimal point; on type=number fields also normalizes to
        // two decimals on blur.
        numericOnlyInput = function (ev) {
            var el = basejs.eventSource(ev), v, i;
            if (!el) { return; }
            v = el.value.replace(/[^0-9.]/g, '');
            i = v.indexOf('.');
            if (i !== -1) { v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, ''); }
            if (v !== el.value) { el.value = v; }
        },
        numericOnlyBlur = function (ev) {
            var el = basejs.eventSource(ev), n;
            if (!el) { return; }
            n = parseFloat(el.value);
            if (isNaN(n)) { n = 0; }
            el.value = n.toFixed(2);
        },
        initNumericOnly = function () {
            var els = document.getElementsByClassName('numeric-only'), x, el, type;
            for (x = 0; x < els.length; x++) {
                el = els[x];
                if (el.dataset.numericonlyinit) { continue; }
                el.dataset.numericonlyinit = '1';
                el.addEventListener('input', numericOnlyInput);
                type = (el.getAttribute('type') || '').toLowerCase();
                if (type === 'number') { el.addEventListener('blur', numericOnlyBlur); }
            }
        },
        // force-uppercase: uppercase a text input's value as the user types.
        forceUppercaseInput = function (ev) {
            var el = basejs.eventSource(ev);
            if (el) { el.value = el.value.toUpperCase(); }
        },
        initForceUppercase = function () {
            var els = document.getElementsByClassName('force-uppercase'), x, el;
            for (x = 0; x < els.length; x++) {
                el = els[x];
                if (el.dataset.forceupperinit) { continue; }
                el.dataset.forceupperinit = '1';
                el.addEventListener('input', forceUppercaseInput);
            }
        },

        // remove characters based on the regex provided
        removeChars = function (validChars, inputString) {
            var regex = new RegExp('[^' + validChars + ']', 'g');
            return inputString.replace(regex, '');
        },

        // ---- Formatted input masks (vanilla replacement for jquery.mask) ----
        // Class-keyed to the exact .mask-* classes GlobalCAP already uses, so the
        // views/scripts keep their markup and just drop the jQuery init call.
        // Template masks: '0'/'9'/'#' = a digit slot, everything else is a literal
        // inserted automatically (jquery.mask semantics for these fixed patterns).
        // Numeric masks: reverse fill (cents first), optional thousands grouping.
        maskConfigs = {
            'mask-phone': { pattern: '(000) 000-0000' },
            'mask-ssn': { pattern: '000-00-0000' },
            'mask-fein': { pattern: '00-0000000' },
            'mask-zip': { pattern: '00000-0000' },
            'mask-date': { pattern: '00/00/0000' },
            'mask-date-monthyearonly': { pattern: '00/0000' },
            'mask-money': { numeric: true, decimals: 2, grouping: true },
            'mask-decimal': { numeric: true, decimals: 2, grouping: false },
            'mask-numbers-only': { digits: true }
        },
        // format digits into a fixed template; stops emitting once digits run out
        // so no trailing literals are shown (e.g. 3 phone digits -> "(123").
        applyTemplateMask = function (pattern, value) {
            var digits = value.replace(/\D/g, ''), out = '', di = 0, pi = 0, pc;
            for (pi = 0; pi < pattern.length && di < digits.length; pi++) {
                pc = pattern.charAt(pi);
                if (pc === '0' || pc === '9' || pc === '#') {
                    out += digits.charAt(di++);
                } else {
                    out += pc;
                }
            }
            return out;
        },
        // add thousands separators to an integer string of digits
        addGrouping = function (intDigits) {
            return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        },
        // reverse numeric mask: last `decimals` digits become the fraction.
        applyNumericMask = function (value, decimals, grouping) {
            var digits = value.replace(/\D/g, ''), intPart, decPart;
            if (digits === '') { return ''; }
            if (decimals > 0) {
                while (digits.length <= decimals) { digits = '0' + digits; }
                intPart = digits.slice(0, digits.length - decimals).replace(/^0+(?=\d)/, '');
                decPart = digits.slice(digits.length - decimals);
                return (grouping ? addGrouping(intPart) : intPart) + '.' + decPart;
            }
            intPart = digits.replace(/^0+(?=\d)/, '');
            return grouping ? addGrouping(intPart) : intPart;
        },
        // input handler: reformat the field's value against its mask config
        maskHandler = function (ev) {
            var el = basejs.eventSource(ev), cfg, formatted;
            if (!el) { return; }
            cfg = maskConfigs[el.dataset.maskkey];
            if (!cfg) { return; }
            if (cfg.numeric) {
                formatted = applyNumericMask(el.value, cfg.decimals, cfg.grouping);
            } else if (cfg.digits) {
                formatted = el.value.replace(/\D/g, '');
            } else {
                formatted = applyTemplateMask(cfg.pattern, el.value);
            }
            if (formatted !== el.value) {
                el.value = formatted;
                // caret to end (correct while typing forward and for reverse fill)
                if (el.setSelectionRange) {
                    try { el.setSelectionRange(formatted.length, formatted.length); } catch (e) { }
                }
            }
        },
        // wire every .mask-* element on the page (idempotent — safe to re-call
        // after AJAX content loads, mirroring the old sharedmodals re-masking).
        initMasks = function () {
            var key, els, x;
            for (key in maskConfigs) {
                if (maskConfigs.hasOwnProperty(key)) {
                    els = document.getElementsByClassName(key);
                    for (x = 0; x < els.length; x++) {
                        if (!els[x].dataset.maskinit) {
                            els[x].dataset.maskkey = key;
                            els[x].dataset.maskinit = '1';
                            els[x].addEventListener('input', maskHandler);
                            // format any server-rendered pre-populated value
                            maskHandler({ currentTarget: els[x] });
                        }
                    }
                }
            }
        },

        // initialize anything on the page that is needed.
        init = function () {
            initInputFilters();
            initMasks();
            initNumericOnly();
            initForceUppercase();
        },
        app = {};
        app['init'] = init;
        app['initMasks'] = initMasks;
        app['initNumericOnly'] = initNumericOnly;
        app['initForceUppercase'] = initForceUppercase;
        window['basejsinputfilter'] = app;
    domready(init);
})();