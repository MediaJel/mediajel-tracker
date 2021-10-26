// @ts-nocheck
var xmlreqc = XMLHttpRequest
XMLHttpRequest = function () {
    try {
        this.xhr = new xmlreqc();
        return this;
    }
    catch (e) {
        alert(e.message);
        return null;
    }
};

XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
    try {
        console.log("Open: " + method + " " + url + " " + async + " " + user + " " + password);
        return this.xhr.open(method, url, async, user, password); // This will logs XHR Open (useless at this point)

    }
    catch (e) {
        alert(e.message);
        return null;
    }
};

XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
    try {
        this.xhr.setRequestHeader(header, value);
        console.log("Set Request Header: " + header + " " + value); // This will log XHR Request Headers
    }
    catch (e) {
        alert(e.message);
    }
};

XMLHttpRequest.prototype.send = function (postBody) {
    var myXHR = null;
    try {
        myXHR = this;
        this.xhr.onreadystatechange = function () { myXHR.onreadystatechangefunction(); };
        this.xhr.send(postBody);
        console.log("Post Body:" + postBody); // This will log XHR Post Body (Request)


    }
    catch (e) {
        alert(e.message);
    }
};

XMLHttpRequest.prototype.onreadystatechangefunction = function () {
    try {
        if (this.xhr.readyState == 4) {
            // This will logs XHR Responses
        }
        this.readyState = this.xhr.readyState;
        this.responseText = this.xhr.responseText;
        this.responseXML = this.xhr.responseXML;
        this.status = this.xhr.status;
        this.statusText = this.xhr.statusText;
    }
    catch (e) {
        alert(e.message);
    }
    this.onreadystatechange();
};