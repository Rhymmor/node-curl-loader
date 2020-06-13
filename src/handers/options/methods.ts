import { Curl, CurlOptionValueType } from 'node-libcurl';

type IUsedMethods = 'GET' | 'HEAD' | 'POST' | 'PUT';

const usedMethodsOptions: Record<IUsedMethods | '__', (method?: string) => CurlOptionValueType> = {
    GET: () => ({ [Curl.option.HTTPGET]: true }),
    HEAD: () => ({ [Curl.option.NOBODY]: true }),
    POST: () => ({ [Curl.option.POST]: true }),
    PUT: () => ({ [Curl.option.UPLOAD]: true }),
    __: method => ({ [Curl.option.CUSTOMREQUEST]: method }),
};

export function getCurlMethodOptions(method: string): CurlOptionValueType {
    return method in usedMethodsOptions
        ? usedMethodsOptions[method as IUsedMethods](method)
        : usedMethodsOptions.__(method);
}
