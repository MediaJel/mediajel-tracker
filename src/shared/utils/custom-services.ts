import logger from 'src/shared/logger';
import { QueryStringContext } from '../types';
import getContext from './get-context';
import { getCustomTags } from './get-custom-tags';
import { datasourceLogger } from './datasource-logger';
import { getAppIdTags } from './get-appId-tags';

export const customServices = () => {
    const context: QueryStringContext = getContext();

    // Validations
    if (!context.appId) throw new Error("appId is required");
    if (context.debug && context.debug === "true") {
      datasourceLogger();
    }

    getCustomTags();
    getAppIdTags();
};