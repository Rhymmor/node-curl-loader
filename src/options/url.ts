import { ExtendedEasy } from '../handers/easy';
import { IConfigUrl } from '../config/types';
import { Curl } from 'node-libcurl';
import { getCurlMethodOptions } from './methods';

export function setHandleUrlOptions(handle: ExtendedEasy, urlConfig: IConfigUrl) {
    handle.setOpt(Curl.option.URL, urlConfig.url);
    const methodOpts = getCurlMethodOptions(urlConfig.method);
    for (const [key, value] of Object.entries(methodOpts)) {
        // TODO: Type properly
        handle.setOpt(key as any, value as any);
    }
    if (urlConfig.headers) {
        const headersList: string[] = Object.entries(urlConfig.headers).map(([key, value]) => `${key}: ${value}`);
        handle.setOpt(Curl.option.HTTPHEADER, headersList);
    }
}
