(function () {
    var targetEID = 'sharedmodals', loadingModalHtml = null, failureModalHtml = null, failureResponseHtml = null,

        // happens when a modal is shown.  used to post to server and pull back a partial view
        onShowModal = function (event) {
            // Document-delegated (see initModals): the modal element is event.target, not
            // eventSource(event) which would be `document` under delegation.
            var veventSource = event.target, vbutton = event.relatedTarget, vdataUrl = (vbutton ? basejs.getDataFromTag(vbutton, 'posturl') : null), vformData = null;
            if (basejs.exists(vdataUrl)) {
                // we only want to use this if the posturl is present.  This allows bootstrap to be used normally as well.
                setLoadingModal(veventSource);
                // Mark so onHideModal only resets modals WE populated (not static modals).
                if (veventSource && veventSource.dataset) { veventSource.dataset.basejsDynamic = '1'; }
                vformData = basejs.createFormData();
                // get data-basejs- objects from element
                var vdataset = [].filter.call(vbutton.attributes, function (at) { return /^data-basejs-param-/.test(at.name); });
                if (basejs.isArray(vdataset)) {
                    for (let i = 0; i < vdataset.length; i++) {
                        var vname = vdataset[i].name.replace('data-basejs-param-', '').toLowerCase(), vvalue = vdataset[i].value;
                        vformData.append(vname, vvalue);
                    }
                }
                // if we can post, let's do it
                if (basejs.isUri(vdataUrl)) {
                    var vsuccess = function (data) {
                        veventSource.innerHTML = data.response;
                        basejs.initForms();
                        basejs.initInputFilters();
                        basejs.executeDeferredFunctions();
                    };
                    var vfailed = function (data) {
                        if (basejs.exists(data)) {
                            //if (data.statusCode >= 500) {
                            //    document.write(data.response);
                            //}
                            //else {
                            setFailureModal(veventSource, data);
                            //}
                        }
                        else {
                            setFailureModal(veventSource);
                        }
                    };
                    var vcomplete = function () {

                    };
                    basejs.postForm(vdataUrl, vformData, vsuccess, vfailed, vcomplete);
                } else {
                    setFailureModal(veventSource);
                };
            }
        },

        // happens when a modal is hidden
        onHideModal = function (event) {
            // Only reset modals that WE populated via onShowModal (data-basejs-dynamic),
            // so static modals keep their content across open/close.
            var veventSource = event.target;
            if (veventSource && veventSource.dataset && veventSource.dataset.basejsDynamic) {
                setLoadingModal(veventSource);
                // Dispose the BS5 instance so the next open reconstructs against the fresh
                // .modal-dialog. BS5 caches this._dialog at construction; our innerHTML swaps
                // would otherwise leave it pointing at a detached node on reopen.
                if (window.bootstrap && window.bootstrap.Modal) {
                    var vinst = window.bootstrap.Modal.getInstance(veventSource);
                    if (vinst) { vinst.dispose(); }
                }
            }
        },

        // modal to use when loading a modal
        loadModal = function () {
            var a = arguments, l = a.length;
            switch (l) {
                case 0:
                    return loadingModalHtml;
                default:
                    if (basejs.isString(a[0])) {
                        loadingModalHtml = a[0];
                    }
            }
        },

        // modal to use when a failure occurs.
        failModal = function () {
            var a = arguments, l = a.length;
            switch (l) {
                case 0:
                    return failureModalHtml;
                default:
                    if (basejs.isString(a[0])) {
                        failureModalHtml = a[0];
                    }
            }
        },

        // property to get/set the failure response html. By default, this text will go before the failure data
        failModalResponse = function () {
            var a = arguments, l = a.length;
            switch (l) {
                case 0:
                    return failureResponseHtml;
                default:
                    if (basejs.isString(a[0])) {
                        failureResponseHtml = a[0];
                    }
            }
        },

        // Sets the current failure modal to the element provided with response from server.
        // Input:
        //      {responseData}:
        //          [Required] Replaces the string literal with the response from the server in the modal
        //      {responseText}:
        //          [Optional] Replaces the string literal with the text assigned to failureResponseHtml
        setFailureModal = function (element, responseData) {
            if (basejs.isElement(element)) {
                var vhtml = failureModalHtml.replace('{responseText}', (basejs.exists(responseData) ? failureResponseHtml : ''));
                vhtml = vhtml.replace('{responseData}', (basejs.exists(responseData) ? responseData.response : ''));
                element.innerHTML = vhtml;
            }
        },

        // Sets the current loading modal to the element provided.
        // Input:
        //      element:
        //          [Required] Replaces the element with the loadingModalHtml
        setLoadingModal = function (element) {
            if (basejs.isElement(element)) {
                element.innerHTML = loadingModalHtml;
            }
        },

        // Initialize default modals.  Can be done 3 different ways.
        //  1. If nothing supplied, uses the hard-coded modals supplied in the javascript
        //  2. Specify hidden element(s) on the page with the following information for each type of response. None are required.
        //      a. LoadingModal - Html for the loading modal.
        //      b. FailureModal - Html for the failure modal.
        //          i.  Replacement value {responseData} is required.
        //          ii. Replacement value {responseText} is optional.
        //      c. FailureModalResponse - Html for the text used in the FailureModal for {responseText} variable.
        //  3. Specify, per page, the 3 properties for a specific modal type. Same as #2 above.
        //      a. loadingModal
        //          i.  In javascript: basejs.modals.loadingModal = 'your html'
        //      b. failureModal
        //          i. In javascript: basejs.modals.failureModal = 'your html'
        //      c. failureResponseHtml
        //          i. In javascript: basejs.modals.failureResponse = 'your html'
        initDefaultModals = function () {
            var vloading = basejs.getElement('LoadingModal'), vfailure = basejs.getElement('FailureModal'), vfailureModalResponse = basejs.getElement('FailureModalResponse');
            if (basejs.isElement(vloading)) {
                loadModal(vloading.value);
            }
            if (basejs.isElement(vfailure)) {
                failModal(vfailure.value);
            }
            if (basejs.isElement(vfailureModalResponse)) {
                failModalResponse(vfailureModalResponse.value);
            }
            // default response text before the data (optional)
            if (!basejs.isString(failureResponseHtml)) {
                failModalResponse('Response:<br />');
            }

            // default failure modal if none exist yet
            if (!basejs.isString(failureModalHtml)) {
                failModal(
                    '   <div class="modal-dialog modal-xl">'
                    + '     <div class="modal-content">'
                    + '         <div class="modal-header modal-header-color">'
                    + '             <h5 class="modal-title" id="sharedmodalslabel">Error</h4>'
                    + '             <button type="button" class="btn-close" data-bs-dismiss="modal"aria-label="Close"></button>'
                    + '         </div>'
                    + '         <div class="modal-body text-center">'
                    + '             There was a problem loading the content for this dialog<br />'
                    + '             {responseText}{responseData}'
                    + '         </div>'
                    + '         <div class="modal-footer modal-footer-color">'
                    + '             <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>'
                    + '         </div>'
                    + '     </div>'
                    + ' </div>');
            }

            // default loading modal if none exist yet
            if (!basejs.isString(loadingModalHtml)) {
                loadModal(
                    '   <div class="modal-dialog">'
                    + '     <div class="modal-content">'
                    + '         <div class="modal-header modal-header-color">'
                    + '             <h5 class="modal-title" id="sharedmodalslabel">Loading...</h4>'
                    + '             <button type="button" class="btn-close" data-bs-dismiss="modal"aria-label="Close"></button>'
                    + '         </div>'
                    + '         <div class="modal-body text-center">'
                    + '             <div class="spinner-grow" style="width: 3rem; height: 3rem;" role="status">'
                    + ''
                    + '             </div>'
                    + '         </div>'
                    + '         <div class="modal-footer modal-footer-color">'
                    + '             <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>'
                    + '         </div>'
                    + '     </div>'
                    + ' </div>');
            }
        },
        initModals = function () {
            // Document-level delegation (BS5 modal events bubble). Robust to modals added
            // to the DOM after init (e.g. #sharedmodals, which sharedmodals.js appends at
            // ready) — per-element binding at init time would miss those.
            document.addEventListener('shown.bs.modal', onShowModal);
            document.addEventListener('hidden.bs.modal', onHideModal);
        },

        // Programmatically open a Bootstrap 5 modal by id or element. Thin wrapper
        // over the BS5 Modal API so app code (sharedmodals.js, page scripts) need
        // not repeat bootstrap.Modal.getOrCreateInstance(el).show() everywhere.
        openModal = function (target) {
            var el = basejs.resolveElement(target);
            if (basejs.isElement(el) && window.bootstrap && window.bootstrap.Modal) {
                window.bootstrap.Modal.getOrCreateInstance(el).show();
            }
        },
        // Programmatically close/hide a Bootstrap 5 modal by id or element.
        closeModal = function (target) {
            var el = basejs.resolveElement(target), instance;
            if (basejs.isElement(el) && window.bootstrap && window.bootstrap.Modal) {
                instance = window.bootstrap.Modal.getOrCreateInstance(el);
                if (instance) { instance.hide(); }
            }
        },
        //initButtons = function () {
        //    var vbuttons = basejs.getElementsBySelector('button[data-basejs-posturl]');
        //    if (basejs.exists(vbuttons)) {
        //        for (let i = 0; i < vbuttons.length; i++) {
        //            vbuttons[i].addEventListener('click', onSaveAndReplace);
        //        }
        //    }
        //},
        // initialize anything on the page that is needed.
        init = function () {
            initModals();
            //initButtons();
            initDefaultModals();
        },
        app = {}
        ;
    app['init'] = init;
    app['failureModal'] = failModal;
    app['failureModalResponse'] = failModalResponse;
    app['setFailureModal'] = setFailureModal;
    app['loadingModal'] = loadModal;
    app['open'] = openModal;
    app['close'] = closeModal;
    basejs['modals'] = app;
    domready(init);
})();