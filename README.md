# Intuition-BaseJs
Intuition's BaseJs Repository

[Basic Functions](#basic-functions)
[Form Functions](#form-functions)
[Modal Functions](#modal-functions)

## Basic Functions
These functions can be used on pages and/or in other javascript files by calling basejs.XXX. Some are methods and some are properties.
- [Method] uniqueId() - Creates a unique identifier
- [Method] exists(a) - Determines if an element id exists.
- [Method] toCamel(a) - makes the string specified camel-cased. Used for data attributes that save data-basejs-example as dataBasejsExample
- [Method] toBool(a) - Converts a string to bool. If already bool, will return the boolean.
- [Method] isFunction(a) - verify that an object is a function
- [Method] isNodeList(nodes) - Checks to see if something is a node list.
- [Method] isArray(a) - verify that an object is an array
- [Method] isString(a) - verify that an object is a string
- [Method] isBoolean(a) - verify that an object is a boolean
- [Method] isElement(a) - verify that an element is an element (has a tag name and a node)
- [Method] isUri(a) - verify that a string is a URI
- [Method] isJson(a) - uses a JSON.parse() to verify if a string is json or not.
- [Method] isInput(a) - Determines if the element is an element and if it's an input or textarea control.
- [Method] eventSource(a) - Returns the DOM element that generated the event.
- [Method] getElement(a) - verifies that the id passed in is an element and then returns the DOM element.
- [Method] getElementBySelector(a, el) - uses a selector to pull the first element that matches
- [Method] getElementsBySelector(a, el) - uses a selector to pull all elements that match
- [Method] getElementValue(a) - verifies that the id passed in is an element and then returns the value of the DOM element.
- [Method] getElementUrl(element) - gets the first attribute of an element that matches a url.
- [Method] getFirstForm() - gets the first form element on the page
- [Method] getToken(form) - Gets a request verification token from within a form.
- [Method] show(el, display) - sets the element to display:block (or override with something else) and sets opacity to 1.
- [Method] hide(el) - sets the element to display:none.
- [Method] fadeOut(el) - fades an element out and sets display:none on it.
- [Method] fadeIn(el, display) - fades an element in
- [Method] setFieldValidations() - Loads all field validations on a page that have an error and applies an 'is-invalid' class to the calling inputs
- [Method] showBusy() - Makes a button show a busy animation and disabled
- [Method] showOriginal(button, busy) - Returns a button back to the original data.
- [Method] createFormData(form) - Creates new instance of FormData();
- [Method] getDataFromTag(element, dataTag) - Gets basejs attribute from form element.
- [Method] clearValidationSummary() - Clear validation summary errors inside of a form element
- [Method] postForm(uri, formData, successFunction, errorFunction, completeFunction, methodType) - posts (or get if needed) a form to the uri specified with the formData.
- [Method] postAndReplace(ev, uri, replaceElementId, successFunction, errorFunction, completeFunction) - posts data to uri specified from form onsubmit event and replaces the data coming back with the replaceElementId
- [Method] initValidations() - initialize all validations so that once you start typing it will clear out errors
- [Method] clearError(ev) - The clear part of initValidations() routine. Once a user starts to type into a field, the errors are cleared
- [Method] copyInputField(ev, sourceId, targetId) - Copies input value from one input control to another. Can be set up using tags on the button or manually via a source and target id.
- [Method] initForms() - automatically load forms on the page without requiring the onsubmit routine on each one.
- [Method] initButtons() - automatically loads buttons to copy data from one field to another field
- [Method] on(target, event, fn) - direct event binding for any event type (target = element or id). Generalizes onClick/onChange.
- [Method] delegate(event, selector, fn, root) - ONE delegated listener at root (document by default) that fires fn when an event bubbles from an element matching selector. jQuery `$(root).on(event, selector, fn)` equivalent; CSP-safe replacement for inline on* handlers. fn is called as fn.call(matchedElement, ev, matchedElement).
- [Method] resolveElement(target) - returns target if it is already an element, otherwise getElement(target).
- [Method] addClass(target, className) / removeClass(target, className) - add/remove one or more (space-separated) classes.
- [Method] toggleClass(target, className, force) - toggle a class; optional boolean force to set/unset.
- [Method] hasClass(target, className) - true if the element has the class.
- [Method] val(target[, value]) - get (1 arg) or set (2 args) an element's .value.
- [Method] attr(target, name[, value]) - get (2 args) or set (3 args) an attribute.
- [Method] html(target[, value]) - get (1 arg) or set (2 args) innerHTML.
- [Method] text(target[, value]) - get (1 arg) or set (2 args) textContent.
- [Method] init() - initialize anything on the page that is needed.


## Form Functions
The following are tags that can be applied to form tags in order for the AJAX form posts to automatically be applied using BaseJs.
### [Required] posturl (data-basejs-posturl) 
The URL that the AJAX call will post to. In order for the AJAX call to automatically be applied to the form, this indicator must be present, otherwise, a manual call to postForm() or postAndReplace() is required from the onsubmit event.
```
<form id="testForm" data-basejs-posturl="/Test/Url">
...
</form>
```

### [Optional] updatetarget (data-basejs-updatetarget) 
Once a post has occurred, if this indicator is present and the response is 200 OK, it will replace the HTML there with what is returned from the response. In code, this should return a partial if successful, but could contain text content if desired.

```
<form id="testForm" ... data-basejs-updatetarget="myUpdatedDiv">
...
</form>
```

### [Optional] updatetargeterror (data-basejs-updatetargeterror) 
Once a post has occurred, if this indicator is present and the response is NOT a 200 OK, it will replace the HTML there with what is returned from the response. In code, this should return a partial if NOT successful, but could contain text content if desired.

```
<form id="testForm" ... data-basejs-updatetargeterror="myErrorDiv">
...
</form>
```

### [Optional] cleartargetonerror (data-basejs-cleartargetonerror) 
If the response of a post is an error, and this property is set to true, it will clear the updatetarget. This is especially useful in search forms. You may search for 'abc' which will produce a result. Then search for 'abcd' which would produce an error. Without this set, the old response would still show, even if you received an error. This puts a little control on the developer how they would like it to work.

```
<form id="testForm" ... data-basejs-cleartargetonerror="true">
...
</form>
```

## Modal Functions


## Full Examples

### Basic Form Post
**Main Razor Code**
```
@model Intuition.BaseJs.Models.RequiredPerson
<form id="frmBasicFormPost" data-basejs-posturl="/Home/FormFunctionsBasicFormPost" data-basejs-updatetarget="frmBasicFormPost">
    @await Html.PartialAsync("_FormFunctionsBasicFormPost")
</form>
```

**\_FormFunctionsBasicFormPost Partial**
```
@model Intuition.BaseJs.Models.RequiredPerson
@Html.AntiForgeryToken()
@if (Model.IsSuccess)
{
    <div class="alert alert-success">
        Successfully submitted <strong>'@Model.Name'</strong>!
    </div>
}
<div class="row mb-3">
    <div class="col">
        @Html.LabelFor(m => m.Name)
        @Html.TextBoxFor(m => m.Name, new { @class="form-control"})
        @Html.ValidationMessageFor(m => m.Name)
    </div>
</div>
<div class="row mb-3">
    <div class="col">
        @Html.LabelFor(m => m.Address)
        @Html.TextBoxFor(m => m.Address, new { @class="form-control"})
        @Html.ValidationMessageFor(m => m.Address)
    </div>
</div>
<button type="submit" class="btn btn-primary">Submit Form</button>
```

**Controller Code**
```
[HttpPost, ValidateAntiForgeryToken]
public IActionResult FormFunctionsBasicFormPost(RequiredPerson model)
{
    if (ModelState.IsValid)
    {
        model.IsSuccess = true;
        return PartialView("_FormFunctionsBasicFormPost", model);
    }
    Response.StatusCode = 400;
    return PartialView("_FormFunctionsBasicFormPost", model);
}
```
