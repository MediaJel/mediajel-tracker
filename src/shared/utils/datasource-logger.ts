import { datalayerSource } from "../sources/google-datalayer-source";
import { xhrRequestSource } from "../sources/xhr-request-source";
import {  xhrResponseSource } from "../sources/xhr-response-source";
import { fetchSource } from "../sources/fetch-source";

export const datasourceLogger = (): void => {
    datalayerSource((data) => {
        console.log("DataLayer Source Data:", data);
    });

    xhrResponseSource((xhr) => {
        try {
            console.log('xhr Response Source Data: ', xhr);
        } catch  (e) {}
    });

    xhrRequestSource((xhr) => {
        try {
            console.log('xhr Request Source Data: ', xhr);
        } catch (e) {}
    });

    window.addEventListener("Event Listener Message1", (event) => console.log('post message data',event), false);

    const postMessageSource = function(callback) {
        window.addEventListener("Post Message Data", callback, false);
      };
    
    postMessageSource((event) => console.log('Post Message Data: ', event));

    fetchSource(
        (request) => {},
        (response, responseBody) => {
            try {
                console.log('fetch response: ', responseBody);
            } catch (e) {}
        }
      );
}