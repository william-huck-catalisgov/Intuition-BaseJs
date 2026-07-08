function domready(fn) {
    if (document.readyState != 'loading') {
        fn();
    } else if (document.addEventListener) {
        document.addEventListener('DOMContentLoaded', fn);
    } else {
        document.attachEvent('onreadystatechange', function () {
            if (document.readyState != 'loading') {
                fn();
            }
        });
    }
}

// This will contain all 'generic' methods.
// Keep all specific methods for specific functions out of this file
// Use basejs.custom.js for anything specific.
(function () {
    var uId = 0, busyBtnCss = 'spinner-border spinner-border-sm',
        // Creates an identifier that is unique for creating a DOM element ID
        uid = function () {
            var d = new Date(), s = 'iid_' + d.getTime() + '_' + uId++;
            return s;
        },

        // Checks to see if an object is not null and not undefined.
        exists = function (a) {
            if (a !== null && a !== undefined) {
                return true;
            }
            return false;
        },

        // makes the string specified camel-cased.  Used for data attributes that save data-basejs-example as dataBasejsExample
        toCamel = function (a) {
            if (isString(a)) {
                return a.replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
                    return index === 0 ? word.toLowerCase() : word.toUpperCase();
                }).replace(/\s+/g, '');
            }
            return a;
        },

        // converts a string to bool.  If already bool, will return the boolean.
        toBoolean = function (a) {
            if (exists(a)) {
                if (isBoolean(a)) {
                    return a;
                }
                if (isString(a)) {
                    return Boolean(a);
                }
            }
            return false;
        },

        // verify that an object is a function
        isFunction = function (a) {
            if (typeof a === 'function') {
                return true;
            }
            return false;
        },

        // Checks to see if something is a node list.
        // document.getElementsByName() returns a node list for example.
        isNodeList = function (nodes) {
            var stringRepr = Object.prototype.toString.call(nodes);

            return typeof nodes === 'object' &&
                /^\[object (HTMLCollection|NodeList|Object)\]$/.test(stringRepr) &&
                (typeof nodes.length === 'number') &&
                (nodes.length === 0 || (typeof nodes[0] === "object" && nodes[0].nodeType > 0));
        },

        // verify that an object is an array
        isArray = function (a) {
            if (exists(a)) {
                if (exists(a.pop) && exists(a.push) && exists(a.slice)) {
                    return true;
                }
            }
            return false;
        },

        // verify that an object is a string
        isString = function (a) {
            if (typeof a === 'string') {
                return true;
            }
            return false;
        },

        // verify that an object is a boolean
        isBoolean = function (a) {
            if (typeof a === 'boolean') {
                return true;
            }
            return false;
        },

        // verify that an element is an element (has a tag name and a node)
        isElement = function (a) {
            if (exists(a)) {
                if (exists(a.tagName) && exists(a.nodeName)) {
                    return true;
                }
            }
            return false;
        },

        // verify that a string is a URI
        isUri = function (a) {
            if (isString(a)) {
                if (a.indexOf('/') >= 0 || a.indexOf('\\') >= 0) {
                    return true;
                }
            }
            return false;
        },

        // uses a JSON.parse() to verify if a string is json or not.
        isJson = function (a) {
            try {
                var value = JSON.parse(a);
                return true;
            } catch (e) {
                return false;
            }
        },

        // Determines if the element is an element and if it's an input or textarea control.
        isInput = function (a) {
            if (isElement(a)) {
                if (a.tagName.toLowerCase() == 'input' || a.tagName.toLowerCase() == 'textarea') {
                    return true;
                }
            }
            return false;
        },

        // Returns the DOM element that generated the event.  
        eventSource = function (a) {
            return (exists(a) ? a.currentTarget || a.srcElement || a.originalTarget || a : null);
        },

        // verifies that the id passed in is an element and then returns the DOM element.
        getElement = function (a) {
            if (exists(a)) {
                return document.getElementById(a);
            }
            return null;
        },

        // uses a selector to pull the first element that matches (returns null when none)
        getElementBySelector = function (selector, el) {
            if (!isString(selector)) {
                return null;
            }
            return exists(el) ? el.querySelector(selector) : document.querySelector(selector);
        },

        // uses a selector to pull all elements that match (returns a NodeList, empty when none)
        getElementsBySelector = function (a, el) {
            if (!isString(a)) {
                return null;
            }
            return exists(el) ? el.querySelectorAll(a) : document.querySelectorAll(a);
        },

        // verifies that the id passed in is an element and then returns the value of the DOM element.
        getElementValue = function (a) {
            var el = getElement(a);
            if (exists(el)) {
                return el.value;
            }
        },

        // gets the first attribute of an element that matches a url.
        getElementUrl = function (element) {
            var a = (exists(element) ? element.attributes : null), x = 0, l = (exists(a) ? a.length : 0);
            for (x = 0; x < l; x++) {
                if (isUrlAttribute(a[x])) {
                    return a[x].value;
                }
            }
            return null;
        },

        // gets the first form element on the page
        getFirstForm = function () {
            var vforms = document.getElementsByTagName('form');
            if (exists(vforms) && vforms.length > 0) {
                return vforms[0];
            }
            return null;
        },

        // Gets a request verification token from within a form.
        // form: The form element to grab the request verification token from.
        getToken = function (form) {
            var vtokens = isElement(form) ? form.getElementsByName('__RequestVerificationToken') : document.getElementsByName('__RequestVerificationToken');
            if (isNodeList(vtokens)) {
                return vtokens[0];
            }
            return null;
        },

        // sets the element to display:block (or override with something else) and sets opacity to 1.
        // el: The element you would like to show.
        // display (Optional): sets the style display accordingly.  "block" is the default, override if you need something else.
        show = function (el, display) {
            if (isElement(el)) {
                el.style.opacity = 1;
                el.style.display = exists(display) ? display : "block";
            }
        },

        // sets the element to display:none.
        // el: The element you would like to hide.
        hide = function (el) {
            if (isElement(el)) {
                el.style.display = "none";
            }
        },

        // fades an element out and sets display:none on it.
        // el: The element to fade out.
        fadeOut = function (el, completeFunction, intervalSpeed) {
            if (isElement(el)) {
                var fadeEffect = setInterval(function () {
                    if (!el.style.opacity) {
                        el.style.opacity = 1;
                    }
                    if (el.style.opacity > 0) {
                        el.style.opacity -= 0.1;
                    } else {
                        clearInterval(fadeEffect);
                        if (isFunction(completeFunction)) {
                            completeFunction();
                        }
                    }
                }, exists(intervalSpeed) ? intervalSpeed : 25);
            }
        },

        // fades an element in
        // el: The element to fade in
        // display: (optional) set display:block by default or override with your own.
        fadeIn = function (el, completeFunction, intervalSpeed) {
            if (isElement(el)) {
                var fadeEffect = setInterval(function () {
                    if (!el.style.opacity) {
                        el.style.opacity = 1;
                    }
                    if (el.style.opacity < 1) {
                        el.style.opacity += 0.1;
                    } else {
                        clearInterval(fadeEffect);
                        if (isFunction(completeFunction)) {
                            completeFunction();
                        }
                    }
                }, exists(intervalSpeed) ? intervalSpeed : 25);
            }
        },

        // Loads all field validations on a page that have an error and applies an 'is-invalid' class to the calling inputs
        setFieldValidations = function () {
            var velements = document.getElementsByClassName('field-validation-error');
            for (var i = 0; i < velements.length; i++) {
                if (velements[i].innerHTML !== "") {
                    var e = document.getElementsByName(velements[i].dataset.valmsgFor);
                    if (exists(e) && isNodeList(e)) {
                        e[0].classList.add('is-invalid');
                    }
                }
            }

        },

        // Makes a button show a busy animation and disabled
        // Called like showBusy.apply(button, arguments);
        showBusy = function () {
            var a = null, b = uid(), c = this, d = c.innerHTML;
            //if (this.tagName === 'BUTTON') {
            c.innerHTML = c.innerHTML + '&nbsp;';
            c.setAttribute("disabled", "disabled");
            a = document.createElement('div');
            a.id = b;
            a.className = busyBtnCss;
            this.appendChild(a);
            //}
            return { 'id': b, 'html': d };
        },

        // Returns a button back to the original data.
        // Uses return data from showBusy() to put it back
        // button: the button element
        // busy: the result from showBusy() method
        showOriginal = function (button, busy) {
            if (exists(busy)) {
                var vtempDiv = getElement(busy.id);
                if (exists(vtempDiv)) {
                    button.removeChild(vtempDiv);
                    button.innerHTML = busy.html;
                    button.removeAttribute("disabled");
                }
            }
        },

        // Creates new instance of FormData();
        // form:    Optional, if form is specified, will use it to hydrate new data.  
        //          if none specified, will create a new instance and apply token from page.
        createFormData = function (form) {
            if (isElement(form)) {
                return new FormData(form);
            }
            var vformData = new FormData();
            var vtoken = getToken();
            if (exists(vtoken)) {
                vformData.append(vtoken.name, vtoken.value);
            }
            return vformData;
        },

        // Gets basejs attribute from form element.
        getDataFromTag = function (element, dataTag) {
            if (isElement(element) && isString(dataTag)) {
                return element.dataset[toCamel('basejs ' + dataTag)];
            }
            return null;
        },

        // Clear validation summary errors inside of a form element
        clearValidationSummary = function (formElement) {
            if (exists(formElement)) {
                var vsummaryElements = document.getElementsByClassName('validation-summary-errors');
                if (exists(vsummaryElements)) {
                    for (var i = 0; i < vsummaryElements.length; i++) {
                        vsummaryElements[i].remove();
                    }
                }
            }
        },
        // posts (or get if needed) a form to the uri specified with the formData.
        // uri: the location where the post or get will occur i.e. /Home/PostData
        // formData: default functionality is using FormData to collect elements inside of a form. Can be overridden.
        // successFunction: the function to perform if the post has succeeded.
        // errorFunction: the function to perform if the post has failed.
        // completeFunction: the function to perform once the post has completed (failed or success)
        // methodType: default functionality is 'POST' but can be overridden with 'GET' (or anything else)
        postForm = function (uri, formData, successFunction, errorFunction, completeFunction, methodType) {
            var vrequest = new XMLHttpRequest(), vresult = {};
            vrequest.open(exists(methodType) ? methodType : 'POST', uri, true);
            vrequest.onreadystatechange = function () {
                if (this.readyState == XMLHttpRequest.DONE) {
                    vresult['response'] = vrequest.responseText;
                    vresult['statusCode'] = vrequest.status;
                    if (this.status == 200) {
                        //console.log('succeed');
                        if (isFunction(successFunction)) {
                            successFunction(vresult);
                        }
                    }
                    else {
                        //console.log('server error');
                        if (isFunction(errorFunction)) {
                            errorFunction(vresult);
                        }
                    }
                    //alert('1st complete done');
                    if (isFunction(completeFunction)) {
                        completeFunction();
                    }
                }
            };

            vrequest.send(formData);
        },

        // posts data to uri specified from form onsubmit event and replaces the data coming back with the replaceElementId
        // ev: the event in which triggered the post (default functionality is adding onsubmit event to the form element)
        // uri: the location where the post will occur  i.e. /Home/PostData
        // formId: the form id to gather elements from
        // replaceElementId: after the post, it will return a partial. replace this element's inner html with the partial
        // successFunction (optional) - will execute after successful post and the replacement is done.
        // errorFunction (optional) - will execute after a failed post and errors placed.
        // completeFunction (optional) - will execute after a post has succeeded or failed and after complete function
        postAndReplace = function (ev, uri, replaceElementId, successFunction, errorFunction, completeFunction, closeModalElementId) {
            var f = eventSource(ev),                        // grab form from the event passed in
                vform = exists(f) ? f : getFirstForm(),     // if no form matches, grab first form
                vbusy = null,                               // busy text of the button (vbusy.id for the ID name, vbusy.html to get it back)
                vcurrentButton = null,                      // submit button of the form
                vuri = exists(uri) ? uri :                  // Gets the uri from what is passed in or from the form tag
                    getDataFromTag(vform, 'posturl'),
                vreplaceId = exists(replaceElementId) ?     // Gets the replacement element id from what is passed in or from the form tag.
                    replaceElementId :
                    getDataFromTag(vform, 'updatetarget'),
                vcloseModalElementId = exists(closeModalElementId) ?  // Gets close modal element.   This is the element it will attempt to close a bs modal for.
                    closeModalElementId :
                    getDataFromTag(vform, 'closemodaltarget'),
                vsuccessFunction = exists(successFunction) ?
                    successFunction:
                    getDataFromTag(vform, 'successfunction'),
                verrorFunction = exists(errorFunction) ?
                    errorFunction:
                    getDataFromTag(vform, 'errorfunction'),
                vcompleteFunction = exists(completeFunction) ?
                    completeFunction:
                    getDataFromTag(vform, 'completefunction'),
                vformData = null;                           // FormData for posting

            // success method
            var vsuccess = function (data) {
                // clear validation summary on success
                clearValidationSummary(vform);
                var dr = data.response;

                // check to see if it's a redirect response
                if (isJson(dr)) {
                    const jr = JSON.parse(dr);
                    if (jr.type === "redirect") {
                        location.href = jr.url;
                    }
                }
                else {
                    var e = getElement(vreplaceId);

                    // trust boundary: server-rendered partial HTML — do not accept untrusted content on this path
                    if (exists(e)) {
                        e.innerHTML = data.response;
                    }

                    // check to see if modal exists and/or needs to close
                    if (exists(basejs.modals) && isString(vcloseModalElementId)) {
                        var vmodal = bootstrap.Modal.getInstance(basejs.getElement(vcloseModalElementId));
                        vmodal.hide();
                    }

                    // external success callback — resolved by function ref or dotted-name string, never eval
                    invokeCallback(vsuccessFunction);
                }
            };

            // error method
            var verror = function (data) {
                var verrorTarget = getDataFromTag(vform, 'updatetargeterror');
                var vclearOnError = getDataFromTag(vform, 'cleartargetonerror');

                // check to see if the element should be cleared out
                if (exists(vclearOnError) && toBoolean(vclearOnError) === true) {
                    var el = getElement(vreplaceId);
                    el.innerHTML = '';
                }

                // check to see if there's an error target and if not, use the success replacement
                var e = exists(verrorTarget) ? getElement(verrorTarget) : getElement(vreplaceId);

                // load errors to page
                if (exists(e)) {
                    if (data.statusCode >= 500) {
                        // 500s often return full ASP.NET error pages with stack traces / config
                        // details — never write raw server response into the DOM. Log for devs,
                        // show a safe generic message in the error target instead.
                        console.error('basejs: server error', data.statusCode, data.response);
                        e.innerHTML = '<div class="alert alert-danger" role="alert">An unexpected error occurred. Please try again.</div>';
                    }
                    else {
                        // trust boundary: server-rendered partial HTML — do not accept untrusted content on this path
                        e.innerHTML = data.response;
                    }
                }

                // external error callback — resolved by function ref or dotted-name string, never eval
                invokeCallback(verrorFunction);
            };

            // after success or failures, we will run complete
            var vcomplete = function () {
                // put the button back like it was
                showOriginal(vcurrentButton, vbusy);

                // external complete callback — resolved by function ref or dotted-name string, never eval
                invokeCallback(vcompleteFunction);

                // initialize everything on the page again.
                init();

            };

            // checks to see if we have a form to post
            if (exists(vform)) {
                // if submission is a button and not a form, find the form.
                if (vform.tagName.toLowerCase() === "button") {
                    vcurrentButton = vform;
                    vformData = createFormData();
                }
                else {
                    // prevent regular button/form submit.
                    ev.preventDefault();
                    // grabs the submit button based inside of the current form
                    vcurrentButton = getElementBySelector('button[type="submit"]', vform);
                    // get FormData based on current form.
                    vformData = createFormData(vform);
                }
                // set busy indicator on the submit button
                vbusy = showBusy.apply(vcurrentButton, arguments);

                // get all data-basejs-param-{x} items from the form tag
                var vdataset = [].filter.call(vform.attributes, function (at) { return /^data-basejs-param-/.test(at.name); });
                if (isArray(vdataset)) {
                    // add all data-basejs-param-{x} items to the FormData object
                    for (let i = 0; i < vdataset.length; i++) {
                        var vname = vdataset[i].name.replace('data-basejs-param-', '').toLowerCase(), vvalue = vdataset[i].value;
                        vformData.append(vname, vvalue);
                    }
                }

                // submits the form
                postForm(
                    vuri,           // url of the post
                    vformData,      // data of the form
                    vsuccess,       // success function
                    verror,         // error function
                    vcomplete       // complete function
                );
            }
            else {
                // throw error if no forms to submit?
                // alert('no form to submit');
            }
            return false;
        },
        getFunctionFromString = function (string) {
            if (!isString(string)) return null;
            var scope = window;
            var scopeSplit = string.split('.');
            for (var i = 0; i < scopeSplit.length - 1; i++) {
                scope = scope[scopeSplit[i]];

                if (scope == undefined) return;
            }

            return scope[scopeSplit[scopeSplit.length - 1]];
        },

        // Resolves a callback (function reference or dotted-name string) and invokes it.
        // Used in place of eval() for data-basejs-*function callbacks — never trust
        // strings as executable code.
        invokeCallback = function (cb) {
            if (!exists(cb)) return;
            var fn = isFunction(cb) ? cb : (isString(cb) ? getFunctionFromString(cb) : null);
            if (isFunction(fn)) fn();
        },
        // initialize all validations so that once you start typing it will clear out errors
        // form: The form element to initialize.
        initValidations = function () {

            var vinputs = document.getElementsByClassName('input-validation-error');
            if (exists(vinputs)) {
                for (var i = 0; i < vinputs.length; i++) {
                    vinputs[i].addEventListener('input', clearError);
                }
            }

        },

        // The clear part of initValidations() routine.  Once a user starts to type into a field, the errors are cleared
        // ev: The event to use to clear the validations.
        clearError = function (ev) {
            var vinput = eventSource(ev);
            if (isElement(vinput)) {
                vinput.classList.remove('is-invalid');
                vinput.classList.remove('input-validation-error');
                var verrorSpan = document.querySelectorAll("[data-valmsg-for='" + vinput.name + "']");
                if (exists(verrorSpan)) {
                    for (var i = 0; i < verrorSpan.length; i++) {
                        verrorSpan[i].innerHTML = "";
                    }
                }
            }
        },

        // Copies input value from one input control to another. Can be set up using tags on the button or manually via a source and target id.
        copyInputField = function (ev, sourceId, targetId) {
            var vbutton = eventSource(ev), vdataCopySourceId = null, vdataCopyTargetId = null, vsourceEl = null, vtargetEl = null;
            if (isElement(vbutton)) {
                vdataCopySourceId = getDataFromTag(vbutton, 'copyfieldsourceid');
                vdataCopyTargetId = getDataFromTag(vbutton, 'copyfieldtargetid');
                if (exists(vdataCopySourceId) && exists(vdataCopyTargetId)) {
                    vsourceEl = getElement(vdataCopySourceId);
                    vtargetEl = getElement(vdataCopyTargetId);
                }
            }
            else {
                vsourceEl = getElement(sourceId);
                vtargetEl = getElement(targetId);
            }
            if (isInput(vsourceEl) && isInput(vtargetEl)) {
                vtargetEl.value = vsourceEl.value;
            }
        },

        // Ported from intuition.js (vanilla equivalents of $-based helpers)

        // returns true for null, undefined, non-string, or whitespace-only string
        isEmpty = function (a) {
            if (exists(a) && isString(a) && a.trim().length > 0) {
                return false;
            }
            return true;
        },

        // accepts element ids (strings) or DOM elements; false if ANY is empty
        hasObjectValue = function () {
            for (var i = 0; i < arguments.length; i++) {
                var arg = arguments[i], el = null;
                if (isString(arg)) {
                    el = getElement(arg);
                } else if (isElement(arg)) {
                    el = arg;
                }
                if (isElement(el) && isEmpty(el.value)) {
                    return false;
                }
            }
            return true;
        },

        copyValue = function (srcId, tgtId) {
            var src = getElement(srcId), tgt = getElement(tgtId);
            if (isElement(src) && isElement(tgt)) {
                tgt.value = src.value;
            }
        },

        // each argument is a [srcId, tgtId] pair
        copyValues = function () {
            for (var i = 0; i < arguments.length; i++) {
                var pair = arguments[i];
                if (isArray(pair) && pair.length === 2) {
                    copyValue(pair[0], pair[1]);
                }
            }
        },

        onClick = function (id, fn) {
            var el = getElement(id);
            if (isElement(el) && isFunction(fn)) {
                el.addEventListener('click', fn);
            }
        },

        onChange = function (id, fn) {
            var el = getElement(id);
            if (isElement(el) && isFunction(fn)) {
                el.addEventListener('change', fn);
            }
        },

        // alias for onChange, preserved for API compatibility with intuition.js
        linkInputToFunction = function (id, fn) {
            onChange(id, fn);
        },

        linkButtonToChange = function (checkboxId, targetId) {
            var checkbox = getElement(checkboxId), target = getElement(targetId);
            if (isElement(checkbox) && isElement(target)) {
                checkbox.addEventListener('change', function () {
                    target.disabled = !checkbox.checked;
                });
            }
        },

        // Resolve a target that may already be an element or an element id string.
        resolveElement = function (target) {
            return isElement(target) ? target : getElement(target);
        },

        // Direct event binding for any event type. Generalizes onClick/onChange.
        // target may be an element or an element id. jQuery equivalent: $(el).on(event, fn).
        on = function (target, event, fn) {
            var el = resolveElement(target);
            if (isElement(el) && isString(event) && isFunction(fn)) {
                el.addEventListener(event, fn);
            }
        },

        // Generic delegated event handler: ONE listener at root (document by default)
        // fires fn whenever an event bubbles from an element matching selector.
        // jQuery equivalent: $(root).on(event, selector, fn). CSP-safe replacement for
        // inline on* handlers. fn is invoked as fn.call(matchedElement, ev, matchedElement).
        delegate = function (event, selector, fn, root) {
            var scope = exists(root) ? resolveElement(root) : document;
            if (!isString(event) || !isString(selector) || !isFunction(fn)) {
                return;
            }
            if (scope !== document && !isElement(scope)) {
                return;
            }
            scope.addEventListener(event, function (ev) {
                var src = ev.target,
                    match = (exists(src) && isFunction(src.closest)) ? src.closest(selector) : null;
                if (match && (scope === document || scope.contains(match))) {
                    fn.call(match, ev, match);
                }
            });
        },

        // classList helpers — target may be an element or id. className may be space-separated.
        addClass = function (target, className) {
            var el = resolveElement(target), names;
            if (isElement(el) && isString(className)) {
                names = className.split(/\s+/).filter(Boolean);
                if (names.length) { el.classList.add.apply(el.classList, names); }
            }
        },
        removeClass = function (target, className) {
            var el = resolveElement(target), names;
            if (isElement(el) && isString(className)) {
                names = className.split(/\s+/).filter(Boolean);
                if (names.length) { el.classList.remove.apply(el.classList, names); }
            }
        },
        toggleClass = function (target, className, force) {
            var el = resolveElement(target);
            if (isElement(el) && isString(className)) {
                return isBoolean(force) ? el.classList.toggle(className, force) : el.classList.toggle(className);
            }
            return false;
        },
        hasClass = function (target, className) {
            var el = resolveElement(target);
            return (isElement(el) && isString(className)) ? el.classList.contains(className) : false;
        },

        // get (1 arg) or set (2 args) an element's .value
        val = function (target, value) {
            var el = resolveElement(target);
            if (!isElement(el)) { return null; }
            if (arguments.length > 1) { el.value = value; return value; }
            return el.value;
        },
        // get (2 args) or set (3 args) an attribute
        attr = function (target, name, value) {
            var el = resolveElement(target);
            if (!isElement(el) || !isString(name)) { return null; }
            if (arguments.length > 2) { el.setAttribute(name, value); return value; }
            return el.getAttribute(name);
        },
        // get (1 arg) or set (2 args) innerHTML
        html = function (target, value) {
            var el = resolveElement(target);
            if (!isElement(el)) { return null; }
            if (arguments.length > 1) { el.innerHTML = value; return value; }
            return el.innerHTML;
        },
        // get (1 arg) or set (2 args) textContent
        text = function (target, value) {
            var el = resolveElement(target);
            if (!isElement(el)) { return null; }
            if (arguments.length > 1) { el.textContent = value; return value; }
            return el.textContent;
        },

        // thin ej2 DatePicker wrapper — ej2 is already vanilla, no jQuery needed
        datepicker = function (id, max, min, dateFormat) {
            var el = getElement(id);
            if (!isElement(el) || exists(el.ej2_instances)) return;
            new ej.calendars.DatePicker({
                min: exists(min) ? min : null,
                max: exists(max) ? max : null,
                format: exists(dateFormat) ? dateFormat : "MM/dd/yyyy",
                placeholder: "MM/DD/YYYY"
            }).appendTo('#' + id);
        },

        datepickerSet = function (id, date) {
            var el = getElement(id);
            if (isElement(el) && exists(el.ej2_instances)) {
                el.ej2_instances[0].value = new Date(date);
            }
        },

        // Builds a plain object model from one or more input collections (NodeLists
        // or arrays of DOM elements). Handles checkbox/radio/file/other input types.
        // Prepends the anti-forgery token if a form containing one exists on the page.
        createModel = function () {
            var model = {}, token = getToken();
            if (exists(token) && exists(token.value)) {
                model[token.name] = token.value;
            }
            for (var argIdx = 0; argIdx < arguments.length; argIdx++) {
                var collection = arguments[argIdx];
                if (!exists(collection)) continue;
                for (var i = 0; i < collection.length; i++) {
                    var el = collection[i];
                    if (!isElement(el)) continue;
                    var id = el.id, name = el.name;
                    if (el.type === 'checkbox') {
                        model[id] = el.checked;
                        if (isString(name) && name.indexOf('.') > 0) {
                            model[name] = el.checked;
                        }
                    } else if (el.type === 'radio') {
                        if (el.checked) {
                            if (!isEmpty(name) && name !== id) {
                                model[name] = el.value;
                            } else if (!isEmpty(id)) {
                                model[id] = el.value;
                            }
                        }
                    } else if (el.type === 'file') {
                        if (el.files.length === 1) {
                            model[id] = el.files[0];
                        } else {
                            for (var j = 0; j < el.files.length; j++) {
                                model[id + '[' + j + ']'] = el.files[j];
                            }
                        }
                    } else {
                        if (!isEmpty(name) && name !== id && !isEmpty(id)) {
                            model[name] = el.value;
                        } else if (!isEmpty(id)) {
                            model[id] = el.value;
                        }
                    }
                }
            }
            return model;
        },

        getFormModel = function (formId) {
            var form = getElement(formId);
            if (!isElement(form)) return null;
            return createModel(
                form.querySelectorAll('input'),
                form.querySelectorAll('select'),
                form.querySelectorAll('textarea')
            );
        },

        getFormJson = function (formId) {
            var model = getFormModel(formId);
            return exists(model) ? JSON.stringify(model) : '';
        },

        // Reads data-basejs-param-{name} attrs into an object. data-basejs-form=formId
        // pulls in that form's model. data-basejs-target-property=propName uses the
        // element's own value under propName. Prefix is data-basejs-* (playbook §5).
        getElementModel = function (element) {
            var model = {}, token = getToken();
            if (!isElement(element)) return model;
            var attrs = element.attributes, paramPrefix = 'data-basejs-param-';
            for (var i = 0; i < attrs.length; i++) {
                var attr = attrs[i], name = attr.name;
                if (name.indexOf(paramPrefix) === 0) {
                    var key = name.substring(paramPrefix.length);
                    if (key.length > 0) {
                        model[key] = attr.value;
                    }
                } else if (name === 'data-basejs-form') {
                    var formModel = getFormModel(attr.value);
                    for (var p in formModel) {
                        model[p] = formModel[p];
                    }
                } else if (name === 'data-basejs-target-property') {
                    model[attr.value] = element.value;
                }
            }
            if (exists(token) && exists(token.value)) {
                model[token.name] = token.value;
            }
            return model;
        },

        // Full-page POST via a dynamically-created hidden form (not AJAX).
        // Used for flows that navigate rather than replacing an inline element.
        submitModel = function (url, model) {
            var form = document.createElement('form');
            form.setAttribute('method', 'post');
            form.setAttribute('action', url);
            for (var key in model) {
                if (exists(model[key])) {
                    var input = document.createElement('input');
                    input.setAttribute('type', 'hidden');
                    input.setAttribute('name', key);
                    input.setAttribute('value', model[key]);
                    form.appendChild(input);
                }
            }
            document.body.appendChild(form);
            form.submit();
        },

        // find the first auto focus entry and set it as the current field (only when returning from an ajax request)
        autoFocus = function () {
            var velement = getElementBySelector('[autofocus=autofocus],[autofocus=true]');
            if (exists(velement)) {
                velement.focus();
            }
        },

        // automatically load forms on the page without requiring the onsubmit routine on each one.
        // These will only load one way though, so if customization is needed, call it directly.
        // Will call postAndReplace
        // Required on form: 
        //      data-basejs-posturl: 
        //          The location of the post
        //      data-basejs-updatetarget:
        //          The element in which to replace the data coming back from the form.
        initForms = function () {
            var vforms = document.getElementsByTagName('form'), vdataUrl = null, vupdateTargetId = null, vlistener = null;
            if (exists(vforms)) {
                for (var vform = 0; vform < vforms.length; vform++) {
                    vdataUrl = getDataFromTag(vforms[vform], 'posturl');
                    vupdateTargetId = getDataFromTag(vforms[vform], 'updatetarget');
                    vlistener = getDataFromTag(vforms[vform], 'listener');
                    if (!exists(vlistener) && exists(vdataUrl) && isUri(vdataUrl)) {
                        if (exists(vupdateTargetId) && isString(vupdateTargetId)) {
                            vforms[vform].addEventListener('submit', postAndReplace);
                            vforms[vform].dataset.basejsListener = true;
                        }
                    }
                    vdataUrl = null;
                    vupdateTargetId = null;
                }
            }
        },

        // automatically loads buttons to copy data from one field to another field
        // 
        initButtons = function () {
            var vbuttons = document.getElementsByTagName('button'), vdataCopySourceId = null, vdataCopyTargetId = null, vlistener = null;
            if (exists(vbuttons)) {
                for (var vbutton = 0; vbutton < vbuttons.length; vbutton++) {
                    vdataCopySourceId = getDataFromTag(vbuttons[vbutton], 'copyfieldsourceid');
                    vdataCopyTargetId = getDataFromTag(vbuttons[vbutton], 'copyfieldtargetid');
                    vlistener = getDataFromTag(vbuttons[vbutton], 'listener');
                    if (!exists(vlistener) && exists(vdataCopySourceId) && exists(vdataCopyTargetId)) {
                        vbuttons[vbutton].addEventListener('click', copyInputField);
                        vbuttons[vbutton].dataset.basejsListener = true;
                    }
                    vdataCopySourceId = null;
                    vdataCopyTargetId = null;
                }
            }
        },
        // Route activation of a [data-basejs-posturl] element:
        //   WITH data-basejs-updatetarget -> in-place AJAX replace (postAndReplace)
        //   WITHOUT one                    -> navigate via a full-page POST (submitModel)
        // The navigate case restores the PostLink "go to a page" behaviour (a role=button
        // element posting to a URL whose action returns a full View, not a partial).
        handleDelegatedPost = function (el) {
            if (exists(getDataFromTag(el, 'updatetarget'))) {
                // synthetic event so eventSource(ev) inside postAndReplace finds the element via currentTarget
                postAndReplace({ currentTarget: el, preventDefault: function () {} });
            } else {
                submitModel(getDataFromTag(el, 'posturl'), getElementModel(el));
            }
        },
        // Delegated activation for [data-basejs-posturl] elements. One document-level
        // listener replaces per-element inline onclick handlers, enabling strict CSP.
        initDelegatedButtonPost = function () {
            if (initDelegatedButtonPost.attached) return;
            initDelegatedButtonPost.attached = true;
            document.addEventListener('click', function (ev) {
                var el = ev.target.closest('[data-basejs-posturl]');
                if (!el || el.tagName === 'FORM') return;  // forms handled by initForms via submit
                ev.preventDefault();
                handleDelegatedPost(el);
            });
            // Keyboard activation for role=button PostLinks (e.g. <span tabindex="0">) — WCAG 2.1.1.
            // Native button/a/input already fire a click on Enter/Space, so skip them here.
            document.addEventListener('keydown', function (ev) {
                if (ev.key !== 'Enter' && ev.key !== ' ' && ev.key !== 'Spacebar') return;
                var el = ev.target.closest('[data-basejs-posturl]');
                if (!el || el.tagName === 'FORM') return;
                var tag = el.tagName.toLowerCase();
                if (tag === 'button' || tag === 'a' || tag === 'input') return;
                ev.preventDefault();  // Space would otherwise scroll the page
                handleDelegatedPost(el);
            });
        },
        initInputFilters = function () {
            if (exists(basejsinputfilter) && isFunction(basejsinputfilter.init)) {
                basejsinputfilter.init();
            }
        },
        executeDeferredFunctions = function () {
            var a = window.deferredFunctions, x = 0, l = (isArray(a) ? a.length : 0);
            // Run-once across ALL executors on the page. A host page may have a legacy
            // executor that also drains window.deferredFunctions (e.g. intuition.js during
            // the GlobalCAP BS5 migration); without this guard the deferred setup binds
            // twice and can swallow the first form submit. Flag is shared on the array so
            // execution order does not matter.
            if (isArray(a)) {
                if (a.executed) { return; }
                a.executed = true;
            }
            for (x = 0; x < l; x++) {
                if (isFunction(a[x])) {
                    a[x]();
                }
            }
        },
        // initialize anything on the page that is needed.
        init = function () {
            initForms();
            setFieldValidations();
            initValidations();
            initButtons();
            initDelegatedButtonPost();
            autoFocus();
            initInputFilters();
            executeDeferredFunctions();
        },

        app = {}
        ;
    // this is where you make any methods "public"
    // adding here will allow you to do basejs.methodName();
    app['uniqueId'] = uid;
    app['exists'] = exists;
    app['toCamel'] = toCamel;
    app['toBoolean'] = toBoolean;
    app['isFunction'] = isFunction;
    app['isNodeList'] = isNodeList;
    app['isArray'] = isArray;
    app['isString'] = isString;
    app['isBoolean'] = isBoolean;
    app['isElement'] = isElement;
    app['isUri'] = isUri;
    app['isJson'] = isJson;
    app['isInput'] = isInput;
    app['eventSource'] = eventSource;
    app['getElement'] = getElement;
    app['getElementBySelector'] = getElementBySelector;
    app['getElementsBySelector'] = getElementsBySelector;
    app['getElementValue'] = getElementValue;
    app['getElementUrl'] = getElementUrl;
    app['getFirstForm'] = getFirstForm;
    app['getToken'] = getToken;
    app['show'] = show;
    app['hide'] = hide;
    app['fadeOut'] = fadeOut;
    app['fadeIn'] = fadeIn;
    app['setFieldValidations'] = setFieldValidations;
    app['showBusy'] = showBusy;
    app['showOriginal'] = showOriginal;
    app['createFormData'] = createFormData;
    app['getDataFromTag'] = getDataFromTag;
    app['clearValidationSummary'] = clearValidationSummary;
    app['postForm'] = postForm;
    app['postAndReplace'] = postAndReplace;
    app['initValidations'] = initValidations;
    app['copyInputField'] = copyInputField;
    app['isEmpty'] = isEmpty;
    app['hasObjectValue'] = hasObjectValue;
    app['copyValue'] = copyValue;
    app['copyValues'] = copyValues;
    app['onClick'] = onClick;
    app['onChange'] = onChange;
    app['on'] = on;
    app['delegate'] = delegate;
    app['linkInputToFunction'] = linkInputToFunction;
    app['linkButtonToChange'] = linkButtonToChange;
    app['resolveElement'] = resolveElement;
    app['addClass'] = addClass;
    app['removeClass'] = removeClass;
    app['toggleClass'] = toggleClass;
    app['hasClass'] = hasClass;
    app['val'] = val;
    app['attr'] = attr;
    app['html'] = html;
    app['text'] = text;
    app['datepicker'] = datepicker;
    app['datepickerSet'] = datepickerSet;
    app['getFormModel'] = getFormModel;
    app['getFormJson'] = getFormJson;
    app['getElementModel'] = getElementModel;
    app['submitModel'] = submitModel;
    app['autoFocus'] = autoFocus;
    app['initForms'] = initForms;
    app['initInputFilters'] = initInputFilters;
    app['initButtons'] = initButtons;
    app['initDelegatedButtonPost'] = initDelegatedButtonPost;
    app['executeDeferredFunctions'] = executeDeferredFunctions;
    app['init'] = init;
    window['basejs'] = app;
    domready(init);
})();