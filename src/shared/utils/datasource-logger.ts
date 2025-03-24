import { datalayerSource } from "../sources/google-datalayer-source";
import { xhrRequestSource } from "../sources/xhr-request-source";
import {  xhrResponseSource } from "../sources/xhr-response-source";
import { fetchSource } from "../sources/fetch-source";
import Logger from "../logger";

export const datasourceLogger = (): void => {
    datalayerSource((data) => {
        Logger.info("DataLayer Source Data:", data);
    });

    xhrResponseSource((xhr) => {
        try {
            Logger.info('xhr Response Source Data: ', xhr);
        } catch  (e) {}
    });

    xhrRequestSource((xhr) => { // DUN FORGET TO ADD parseMsgToString FROM THE LOGGER FILE
        try {
            Logger.info('xhr Request Source Data: ', xhr);
        } catch (e) {}
    });

    window.addEventListener("Event Listener Message1", (event) => Logger.info('post message data',event), false);

    const postMessageSource = function(callback) {
        window.addEventListener("Post Message Data", callback, false);
      };
    
    postMessageSource((event) => Logger.info('Post Message Data: ', event));

    fetchSource(
        (request) => {},
        (response, responseBody) => {
            try {
                Logger.info('fetch response: ', responseBody);
            } catch (e) {}
        }
      );
}