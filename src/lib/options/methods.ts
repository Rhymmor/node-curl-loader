import { Curl, CurlOptionValueType } from 'node-libcurl';

type IUsedMethods = 'GET' | 'HEAD' | 'POST';
const usedMethodsOptions: Record<IUsedMethods | '__', (method?: string) => CurlOptionValueType> = {
    GET: () => ({}),
    HEAD: () => ({ [Curl.option.NOBODY]: true }),
    POST: () => ({ [Curl.option.POST]: true }),
    __: method => ({ [Curl.option.CUSTOMREQUEST]: method })
};

export function getCurlMethodOptions(method: string): CurlOptionValueType {
    return method in usedMethodsOptions
        ? usedMethodsOptions[method as IUsedMethods](method)
        : usedMethodsOptions.__(method);
}
