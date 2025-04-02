import { datalayerSource } from "../sources/google-datalayer-source";
import { xhrRequestSource, formatXhrPayload } from "../sources/xhr-request-source";
import {  xhrResponseSource } from "../sources/xhr-response-source";
import { fetchSource } from "../sources/fetch-source";
import { createLogger } from "../logger";

export const datasourceLogger = (): void => {
    const logger = createLogger("DataSourceLogger");

    datalayerSource((data) => {
        logger.info("DataLayer Source Data:", data);
    });

    xhrResponseSource((xhr) => {
        try {
            logger.info('xhr Response Source Data: ', xhr);
        } catch  (e) {}
    });

    xhrRequestSource((xhr) => {
        try {
            const sanitizedData = formatXhrPayload(xhr);
            logger.info('xhr Request Source Data: ', sanitizedData);
        } catch (e) {}
    });

    window.addEventListener("Event Listener Message1", (event) => logger.info('post message data',event), false);

    const postMessageSource = function(callback) {
        window.addEventListener("Post Message Data", callback, false);
      };
    
    postMessageSource((event) => logger.info('Post Message Data: ', event));

    fetchSource(
        (request) => {},
        (response, responseBody) => {
            try {
                logger.info('fetch response: ', responseBody);
            } catch (e) {}
        }
      );
}